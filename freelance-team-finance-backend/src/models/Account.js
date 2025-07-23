const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['bank', 'wallet'], required: true },
  name:      { type: String, required: true }, // "HDFC", "Upwork"
  details:   { type: Object },                 // e.g. { accNo: "xxx" }
  balance:   { type: Number, default: 0 },     // not used for accounting, just summary
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Account', accountSchema);
