const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:      { type: String, required: true }, // "create", "update", "delete", "login"
  entityType:  { type: String, required: true }, // "Project", "Expense", "Account", "Lead", "Payment", "HourlyWork", "Category", "Platform", "User", "Login"
  entityId:    { type: mongoose.Schema.Types.ObjectId }, // Optional for login actions
  description: { type: String, required: true }, // Human-readable description
  changes:     { type: Object }, // Summary of changes (field: {old, new})
  metadata:   { type: Object }, // Additional info (IP, user agent, etc.)
  timestamp:   { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for faster queries
historySchema.index({ user: 1, timestamp: -1 });
historySchema.index({ entityType: 1, timestamp: -1 });
historySchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('History', historySchema);
