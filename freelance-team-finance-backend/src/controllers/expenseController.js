const Expense = require('../models/Expense');

// Add expense (general or personal)
exports.createExpense = async (req, res, next) => {
  try {
    const { type, name, amount, currency, date, withdrawAccount, reminder, notes } = req.body;
    const expense = await Expense.create({
      type, name, amount, currency, date, withdrawAccount, reminder, notes,
      createdBy: req.user.userId
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
    const updated = await Expense.findOneAndUpdate(
      { _id: expenseId, createdBy: req.user.userId },
      updates,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
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
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};
