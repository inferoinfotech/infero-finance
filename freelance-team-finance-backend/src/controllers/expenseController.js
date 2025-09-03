const Expense = require('../models/Expense');
const Account = require('../models/Account');
const { postAccountTxn } = require('../utils/ledger');

// Add expense (general or personal)
exports.createExpense = async (req, res, next) => {
  try {
    const { type, name, amount, date, withdrawAccount, reminder, notes } = req.body;

    const expense = await Expense.create({
      type, name, amount, date, withdrawAccount, reminder, notes,
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

    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
};

// Get all expenses (you can also filter by type/user)
exports.getExpenses = async (req, res, next) => {
  try {
    // Optional: filter by type, month, etc. via query params
    const expenses = await Expense.find()
      .populate('withdrawAccount', 'name type')
      .populate('createdBy', 'name email')
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

    const oldExpense = await Expense.findOne({ _id: expenseId, createdBy: req.user.userId });
    if (!oldExpense) return res.status(404).json({ error: 'Expense not found' });

    const updated = await Expense.findByIdAndUpdate(expenseId, updates, { new: true });

    // account changed?
    if (updates.withdrawAccount && String(updates.withdrawAccount) !== String(oldExpense.withdrawAccount)) {
      // refund old (CREDIT)
      await postAccountTxn({
        userId: req.user.userId,
        accountId: oldExpense.withdrawAccount,
        type: 'credit',
        amount: oldExpense.amount,
        refType: 'reversal',
        refId: oldExpense._id,
        remark: `Expense account change refund (${oldExpense.name})`
      });
      // debit new
      await postAccountTxn({
        userId: req.user.userId,
        accountId: updates.withdrawAccount,
        type: 'debit',
        amount: updates.amount ?? oldExpense.amount,
        refType: 'expense',
        refId: updated._id,
        remark: `Expense moved (${updated.name})`
      });
    } else if ('amount' in updates && Number(updates.amount) !== oldExpense.amount) {
      // diff on same account
      const diff = Number(updates.amount) - oldExpense.amount;
      if (diff > 0) {
        // more debit
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
        // credit back
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

    res.json({ expense: updated });
  } catch (err) {
    next(err);
  }
};



// Delete expense
exports.deleteExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const deleted = await Expense.findOneAndDelete({ _id: expenseId, createdBy: req.user.userId });
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

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

