const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:      { type: String, required: true }, // e.g., "create_project", "update_expense"
  entityType:  { type: String, required: true }, // "Project", "Expense", "Account", etc.
  entityId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  oldValue:    { type: Object }, // Before change
  newValue:    { type: Object }, // After change
  timestamp:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', historySchema);
