const mongoose = require('mongoose');

const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  SALES: 'sales',
  DEVELOPER: 'developer',
};

const userSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true }, // hashed!
    role:      { type: String, enum: Object.values(ROLES), default: ROLES.SALES },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
