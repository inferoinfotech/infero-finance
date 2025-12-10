const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  type:            { type: String, enum: ['general', 'personal'], required: true },
  name:            { type: String, required: true },
  amount:          { type: Number, required: true },
  date:            { type: Date, required: true },
  category:        { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory' },
  withdrawAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For personal expenses - which owner withdrew
  reminder:        { type: String },
  reminderDate:     { type: Date }, // Date when reminder notification should be shown
  notes:           { type: String },
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);
