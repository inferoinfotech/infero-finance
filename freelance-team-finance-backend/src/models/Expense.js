const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  type:            { type: String, enum: ['general', 'personal'], required: true },
  name:            { type: String, required: true },
  amount:          { type: Number, required: true },
  date:            { type: Date, required: true },
  withdrawAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reminder:        { type: String },
  notes:           { type: String },
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);
