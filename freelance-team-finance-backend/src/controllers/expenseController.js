const Expense = require('../models/Expense');
const Account = require('../models/Account');

// Add expense (general or personal)
exports.createExpense = async (req, res, next) => {
  try {
    const { type, name, amount, date, withdrawAccount, reminder, notes } = req.body;
    // 1. Create expense
    const expense = await Expense.create({
      type, name, amount, date, withdrawAccount, reminder, notes,
      createdBy: req.user.userId
    });

    // 2. Decrement balance in account
    await Account.findByIdAndUpdate(
      withdrawAccount,
      { $inc: { balance: -Math.abs(Number(amount)) } } // Always subtract
    );

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
    // Find old expense (for old amount/account)
    const oldExpense = await Expense.findOne({ _id: expenseId, createdBy: req.user.userId });
    if (!oldExpense) return res.status(404).json({ error: 'Expense not found' });

    const updated = await Expense.findByIdAndUpdate(
      expenseId,
      updates,
      { new: true }
    );
    // If account or amount changed, adjust balance(s)
    if (updates.withdrawAccount && updates.withdrawAccount !== String(oldExpense.withdrawAccount)) {
      // 1. Refund old account
      await Account.findByIdAndUpdate(
        oldExpense.withdrawAccount,
        { $inc: { balance: +oldExpense.amount } }
      );
      // 2. Deduct from new account
      await Account.findByIdAndUpdate(
        updates.withdrawAccount,
        { $inc: { balance: -Math.abs(Number(updates.amount)) } }
      );
    } else if ('amount' in updates && Number(updates.amount) !== oldExpense.amount) {
      // Only amount changed (same account)
      const diff = Number(updates.amount) - oldExpense.amount;
      // If diff > 0, decrease; if < 0, increase
      await Account.findByIdAndUpdate(
        oldExpense.withdrawAccount,
        { $inc: { balance: -diff } }
      );
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
    // Refund account
    await Account.findByIdAndUpdate(
      deleted.withdrawAccount,
      { $inc: { balance: +deleted.amount } }
    );
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

