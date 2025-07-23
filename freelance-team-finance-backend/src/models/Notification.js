const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, required: true },   // e.g., 'expense_reminder', 'payment_received'
  message:   { type: String, required: true },
  read:      { type: Boolean, default: false },
  data:      { type: Object },                   // Any extra info (e.g., link, entityId)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
