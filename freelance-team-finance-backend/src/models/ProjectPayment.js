const mongoose = require('mongoose');

const projectPaymentSchema = new mongoose.Schema({
  project:           { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  amount:            { type: Number, required: true },      // Original payment amount (project currency)
  platformCharge:    { type: Number, required: true },      // ABSOLUTE value, not percent
  conversionRate:    { type: Number, required: true },      // E.g. USD -> INR
  amountInINR:       { type: Number, required: true },      // Calculated: (amount - platformCharge) * conversionRate
  // Wallet Step
  platformWallet:    { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  walletStatus:      { type: String, enum: [ 'on_hold', 'released'], default: 'on_hold' },
  walletReceivedDate:{ type: Date },
  // Bank Step
  bankAccount:       { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  bankStatus:        { type: String, enum: ['pending', 'received'], default: 'pending' },
  bankTransferDate:  { type: Date },
  // For hourly projects
  hoursBilled:       { type: Number },
  hourlyWorkEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HourlyWork' }],
  paymentDate:       { type: Date, required: true },
  notes:             { type: String },
  createdAt:         { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectPayment', projectPaymentSchema);
