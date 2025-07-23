const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  type:            { type: String, enum: ['general', 'personal'], required: true },
  name:            { type: String, required: true },           // "Rent", "Software Subscription", etc.
  amount:          { type: Number, required: true },
  currency:        { type: String, required: true, default: 'INR' },
  date:            { type: Date, required: true },
  withdrawAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reminder:        { type: String }, // e.g., "monthly", "weekly" (optional, for notification)
  notes:           { type: String },
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('Expense', expenseSchema);
