const mongoose = require('mongoose')

const assetSchema = new mongoose.Schema({
  // Who created this asset entry
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Display name (e.g., "Laptop", "Printer")
  name: { type: String, required: true },

  // User-defined asset type/category (free text)
  type: { type: String, required: true },

  // The type of account used to debit this asset amount
  accountType: { type: String, enum: ['bank', 'wallet'], required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },

  note: { type: String },

  // Ledger amount that is debited from `account` on create,
  // adjusted on edit, and refunded on delete.
  amount: { type: Number, required: true },

  // Value displayed on the Assets page (not currently tied to ledger postings).
  currentValue: { type: Number, required: true },

  // Asset date (e.g., purchase/entry date) used for filtering/reporting
  date: { type: Date, default: Date.now },

  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Asset', assetSchema)

