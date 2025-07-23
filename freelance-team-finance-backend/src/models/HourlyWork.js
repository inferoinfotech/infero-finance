const mongoose = require('mongoose');

const hourlyWorkSchema = new mongoose.Schema({
  project:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  weekStart:  { type: Date, required: true }, // First day of the week (e.g., Monday)
  hours:      { type: Number, required: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  billed:     { type: Boolean, default: false },
  payment:    { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectPayment' },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('HourlyWork', hourlyWorkSchema);
