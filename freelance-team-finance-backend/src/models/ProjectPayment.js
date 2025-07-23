const mongoose = require('mongoose');

const projectPaymentSchema = new mongoose.Schema({
  project:           { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },

  // Payment Details
  amount:            { type: Number, required: true },      // Original payment amount (project currency)
  currency:          { type: String, required: true },      // "USD", "INR", etc.
  amountInINR:       { type: Number, required: true },      // Converted to INR

  // Wallet Step
  platformWallet:    { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  walletStatus:      { type: String, enum: ['pending', 'on_hold', 'released'], default: 'pending' },
  walletReceivedDate:{ type: Date },

  // Bank Step
  bankAccount:       { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  bankStatus:        { type: String, enum: ['pending', 'released'], default: 'pending' },
  bankTransferDate:  { type: Date },

  // For hourly projects
  hoursBilled:       { type: Number },
  hourlyWorkEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HourlyWork' }],

  paymentDate:       { type: Date, required: true }, // When client released to wallet
  notes:             { type: String },
  createdAt:         { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectPayment', projectPaymentSchema);
