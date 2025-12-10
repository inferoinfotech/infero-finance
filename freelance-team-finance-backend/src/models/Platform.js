const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema({
  name:            { type: String, required: true, unique: true }, // "Upwork", "Fiverr"
  chargePercentage: { type: Number, min: 0, max: 100, default: 0 }, // Platform charge percentage (0-100)
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('Platform', platformSchema);
