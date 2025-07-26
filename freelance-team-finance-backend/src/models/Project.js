const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  clientName:     { type: String, required: true },
  platform:       { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },
  currency:       { type: String, required: true }, // "USD"
  status:         { type: String, enum: ['pending', 'working', 'completed', 'extended', 'paused'], default: 'pending' },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date },
  priceType:      { type: String, enum: ['fixed', 'hourly'], required: true },
  hourlyRate:     { type: Number },
  fixedPrice:     { type: Number },
  budget:         { type: Number, required: true }, // Total project budget
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
