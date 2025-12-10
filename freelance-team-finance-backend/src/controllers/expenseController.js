const Expense = require('../models/Expense');
const Account = require('../models/Account');
const { postAccountTxn } = require('../utils/ledger');
const { logHistory } = require('../utils/historyLogger');

// Add expense (general or personal)
exports.createExpense = async (req, res, next) => {
  try {
    const { type, name, amount, date, category, withdrawAccount, toUser, reminder, reminderDate, notes } = req.body;

    const expense = await Expense.create({
      type, name, amount, date, category, withdrawAccount, toUser, reminder, reminderDate, notes,
      createdBy: req.user.userId
    });

    await postAccountTxn({
      userId: req.user.userId,
      accountId: withdrawAccount,
      type: 'debit',
      amount: amount,
      refType: 'expense',
      refId: expense._id,
      remark: `${type} expense: ${name}`
    });

    // Log expense creation
    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'Expense',
      entityId: expense._id,
      newValue: expense.toObject(),
      description: `Created ${type} expense: ${name} (${amount})`
    });

    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
};

// Get all expenses (you can also filter by type/user)
exports.getExpenses = async (req, res, next) => {
  try {
    // Admin and Owner see all expenses, others see only their own
    const query = (req.user.role === 'admin' || req.user.role === 'owner')
      ? {}
      : { createdBy: req.user.userId };
    
    // Optional: filter by type, month, etc. via query params
    const expenses = await Expense.find(query)
      .populate('withdrawAccount', 'name type')
      .populate('category', 'name description')
      .populate('createdBy', 'name email')
      .populate('toUser', 'name email')
      .sort({ date: -1 });
    res.json({ expenses });
  } catch (err) {
    next(err);
  }
};

// Update expense
exports.updateExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const updates = req.body;

    // Admin and Owner can update any expense, others only their own
    const query = (req.user.role === 'admin' || req.user.role === 'owner')
      ? { _id: expenseId }
      : { _id: expenseId, createdBy: req.user.userId };

    const oldExpense = await Expense.findOne(query);
    if (!oldExpense) return res.status(404).json({ error: 'Expense not found' });

    const newAmount = 'amount' in updates ? Number(updates.amount) : oldExpense.amount;
    const accountChanged = updates.withdrawAccount && String(updates.withdrawAccount) !== String(oldExpense.withdrawAccount);
    const amountChanged = 'amount' in updates && Number(updates.amount) !== oldExpense.amount;

    const updated = await Expense.findByIdAndUpdate(expenseId, updates, { new: true })
      .populate('withdrawAccount', 'name type')
      .populate('category', 'name description')
      .populate('createdBy', 'name email')
      .populate('toUser', 'name email');

    // Handle account transactions
    if (accountChanged) {
      // Account changed: refund old account, debit new account
      // Refund old account (CREDIT)
      await postAccountTxn({
        userId: req.user.userId,
        accountId: oldExpense.withdrawAccount,
        type: 'credit',
        amount: oldExpense.amount,
        refType: 'reversal',
        refId: oldExpense._id,
        remark: `Expense account change refund (${oldExpense.name})`
      });
      // Debit new account
      await postAccountTxn({
        userId: req.user.userId,
        accountId: updates.withdrawAccount,
        type: 'debit',
        amount: newAmount,
        refType: 'expense',
        refId: updated._id,
        remark: `Expense moved (${updated.name})`
      });
    } else if (amountChanged) {
      // Amount changed on same account: adjust the difference
      const diff = newAmount - oldExpense.amount;
      if (diff > 0) {
        // Amount increased: more debit
        await postAccountTxn({
          userId: req.user.userId,
          accountId: oldExpense.withdrawAccount,
          type: 'debit',
          amount: diff,
          refType: 'expense',
          refId: updated._id,
          remark: `Expense increase (${updated.name})`
        });
      } else if (diff < 0) {
        // Amount decreased: credit back the difference
        await postAccountTxn({
          userId: req.user.userId,
          accountId: oldExpense.withdrawAccount,
          type: 'credit',
          amount: Math.abs(diff),
          refType: 'reversal',
          refId: updated._id,
          remark: `Expense decrease (${updated.name})`
        });
      }
    }

    // Log expense update
    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'Expense',
      entityId: expenseId,
      oldValue: oldExpense.toObject(),
      newValue: updated.toObject(),
      description: `Updated expense: ${updated.name}`
    });

    res.json({ expense: updated });
  } catch (err) {
    next(err);
  }
};



// Delete expense
exports.deleteExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    // Admin and Owner can delete any expense, others only their own
    const query = (req.user.role === 'admin' || req.user.role === 'owner')
      ? { _id: expenseId }
      : { _id: expenseId, createdBy: req.user.userId };
    
    const deleted = await Expense.findOneAndDelete(query);
    if (!deleted) return res.status(404).json({ error: 'Expense not found' });

    await postAccountTxn({
      userId: req.user.userId,
      accountId: deleted.withdrawAccount,
      type: 'credit',
      amount: deleted.amount,
      refType: 'reversal',
      refId: deleted._id,
      remark: `Expense deleted (${deleted.name})`
    });

    // Log expense deletion
    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'Expense',
      entityId: expenseId,
      oldValue: deleted.toObject(),
      description: `Deleted expense: ${deleted.name}`
    });

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

