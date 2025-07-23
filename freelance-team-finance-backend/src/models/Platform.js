const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema({
  name:      { type: String, required: true, unique: true }, // "Upwork", "Fiverr"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Platform', platformSchema);
