const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  clientName:     { type: String, required: true },
  platform:       { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },
  currency:       { type: String, required: true }, // "USD"
  status:         { type: String, enum: ['pending', 'working', 'completed', 'extended', 'paused'], default: 'pending' },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date }, // Can update/extend this
  priceType:      { type: String, enum: ['fixed', 'hourly'], required: true },
  hourlyRate:     { type: Number }, // required if hourly
  fixedPrice:     { type: Number }, // required if fixed
  platformCharge: { type: Number, required: true },
  conversionRate: { type: Number, required: true },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:      { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
