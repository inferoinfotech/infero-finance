const Asset = require('../models/Asset')
const Account = require('../models/Account')
const { postAccountTxn } = require('../utils/ledger')
const { logHistory } = require('../utils/historyLogger')

function toNumberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeAssetFields(body) {
  // Map API payload field names to schema field names.
  // Frontend sends: accountId, accountType, ...
  const mapped = { ...body }
  if ('accountId' in mapped) {
    mapped.account = mapped.accountId
    delete mapped.accountId
  }
  return mapped
}

// POST /api/assets
exports.createAsset = async (req, res, next) => {
  try {
    const { name, type, accountType, accountId, note, amount, currentValue } = req.body

    const amt = toNumberOrNull(amount)
    const curVal = toNumberOrNull(currentValue)
    if (!name?.trim()) return res.status(400).json({ error: 'Asset name is required' })
    if (!type?.trim()) return res.status(400).json({ error: 'Asset type is required' })
    if (!accountId) return res.status(400).json({ error: 'Account selection is required' })
    if (!accountType) return res.status(400).json({ error: 'Account type is required' })
    if (amt === null || amt <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' })
    if (curVal === null || curVal < 0) return res.status(400).json({ error: 'Current value must be >= 0' })

    const account = await Account.findOne({ _id: accountId, type: accountType })
    if (!account) return res.status(404).json({ error: 'Selected account not found' })

    const asset = await Asset.create({
      createdBy: req.user.userId,
      name: name.trim(),
      type: type.trim(),
      accountType,
      account: accountId,
      note: note || '',
      amount: amt,
      currentValue: curVal,
    })

    // Ledger integration: debit the selected account by `amount`
    await postAccountTxn({
      userId: req.user.userId,
      accountId,
      type: 'debit',
      amount: amt,
      refType: 'expense', // shows as an expense-like debit in account statements
      refId: asset._id,
      remark: `Asset (${type.trim()}): ${name.trim()}`,
    })

    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'Asset',
      entityId: asset._id,
      newValue: asset.toObject(),
      description: `Created Asset: ${asset.name}`,
    })

    const populated = await Asset.findById(asset._id).populate('account', 'name type balance')
    res.status(201).json({ asset: populated || asset })
  } catch (err) {
    next(err)
  }
}

// GET /api/assets
exports.getAssets = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user.userId }

    const assets = await Asset.find(query)
      .populate('account', 'name type balance')
      .sort({ createdAt: -1 })

    res.json({ assets })
  } catch (err) {
    next(err)
  }
}

// GET /api/assets/summary
exports.getAssetsSummary = async (req, res, next) => {
  try {
    const match = req.user.role === 'admin' ? {} : { createdBy: req.user.userId }

    const summary = await Asset.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAssets: { $sum: 1 },
          totalInvestment: { $sum: '$amount' },
          totalCurrentValue: { $sum: '$currentValue' },
        },
      },
    ])

    const row = summary[0] || { totalAssets: 0, totalInvestment: 0, totalCurrentValue: 0 }
    const netValue = Number(row.totalCurrentValue) - Number(row.totalInvestment)

    res.json({
      totalAssets: row.totalAssets || 0,
      totalInvestment: row.totalInvestment || 0,
      totalCurrentValue: row.totalCurrentValue || 0,
      netValue,
    })
  } catch (err) {
    next(err)
  }
}

// PUT /api/assets/:assetId
exports.updateAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params
    const updates = normalizeAssetFields(req.body)

    const query = req.user.role === 'admin'
      ? { _id: assetId }
      : { _id: assetId, createdBy: req.user.userId }

    const oldAsset = await Asset.findOne(query)
    if (!oldAsset) return res.status(404).json({ error: 'Asset not found' })

    const hasAmount = 'amount' in updates
    const hasAccount = 'account' in updates

    const newAmount = hasAmount ? toNumberOrNull(updates.amount) : oldAsset.amount
    if (hasAmount && (newAmount === null || newAmount <= 0)) {
      return res.status(400).json({ error: 'Amount must be greater than 0' })
    }

    const amountChanged = hasAmount && Number(updates.amount) !== oldAsset.amount
    const accountChanged = hasAccount && String(updates.account) !== String(oldAsset.account)

    // Validate target account when account changed
    if (accountChanged) {
      const targetAccountType = updates.accountType || oldAsset.accountType
      const account = await Account.findOne({ _id: updates.account, type: targetAccountType })
      if (!account) return res.status(404).json({ error: 'Selected account not found' })
    }

    const updated = await Asset.findByIdAndUpdate(assetId, updates, { new: true })
      .populate('account', 'name type balance')

    const updatedAccountId = updated?.account?._id || updated?.account

    // Ledger adjustments (same logic as `Expense.updateExpense`)
    if (accountChanged) {
      // Refund old account: credit back old amount
      await postAccountTxn({
        userId: req.user.userId,
        accountId: oldAsset.account,
        type: 'credit',
        amount: oldAsset.amount,
        refType: 'reversal',
        refId: oldAsset._id,
        remark: `Asset account change refund (${oldAsset.name})`,
      })

      // Debit new account with the new amount
      await postAccountTxn({
        userId: req.user.userId,
        accountId: updatedAccountId,
        type: 'debit',
        amount: newAmount,
        refType: 'expense',
        refId: updated._id,
        remark: `Asset moved (${updated.name})`,
      })
    } else if (amountChanged) {
      // Adjust the delta on the same account
      const diff = Number(newAmount) - oldAsset.amount
      if (diff > 0) {
        await postAccountTxn({
          userId: req.user.userId,
          accountId: oldAsset.account,
          type: 'debit',
          amount: diff,
          refType: 'expense',
          refId: updated._id,
          remark: `Asset increase (${updated.name})`,
        })
      } else if (diff < 0) {
        await postAccountTxn({
          userId: req.user.userId,
          accountId: oldAsset.account,
          type: 'credit',
          amount: Math.abs(diff),
          refType: 'reversal',
          refId: updated._id,
          remark: `Asset decrease (${updated.name})`,
        })
      }
    }

    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'Asset',
      entityId: assetId,
      oldValue: oldAsset.toObject(),
      newValue: updated.toObject(),
      description: `Updated asset: ${updated.name}`,
    })

    res.json({ asset: updated })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/assets/:assetId
exports.deleteAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params

    const query = req.user.role === 'admin'
      ? { _id: assetId }
      : { _id: assetId, createdBy: req.user.userId }

    const deleted = await Asset.findOneAndDelete(query)
    if (!deleted) return res.status(404).json({ error: 'Asset not found' })

    // Refund account: credit back the original asset amount
    await postAccountTxn({
      userId: req.user.userId,
      accountId: deleted.account,
      type: 'credit',
      amount: deleted.amount,
      refType: 'reversal',
      refId: deleted._id,
      remark: `Asset deleted (${deleted.name})`,
    })

    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'Asset',
      entityId: assetId,
      oldValue: deleted.toObject(),
      description: `Deleted asset: ${deleted.name}`,
    })

    res.json({ message: 'Asset deleted' })
  } catch (err) {
    next(err)
  }
}

