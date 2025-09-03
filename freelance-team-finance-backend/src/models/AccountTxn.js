// models/AccountTxn.js
const mongoose = require('mongoose');

const accountTxnSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  account:       { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  // 'credit' = money IN to this account; 'debit' = money OUT of this account
  type:          { type: String, enum: ['credit', 'debit'], required: true },
  amount:        { type: Number, required: true },           // always positive
  delta:         { type: Number, required: true },           // +amount or -amount (applied to Account.balance)
  balanceAfter:  { type: Number, required: true },           // closing balance after this txn
  // what caused it
  refType:       { type: String, enum: ['payment','expense','manual','transfer','reversal'], required: true },
  refId:         { type: mongoose.Schema.Types.ObjectId, required: false }, // e.g. ProjectPayment/Expense id
  remark:        { type: String }, // e.g. "Payment #123 wallet on-hold", "Payment #123 released to bank", etc.
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('AccountTxn', accountTxnSchema);
