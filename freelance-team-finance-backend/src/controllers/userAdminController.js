const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../models/User');

// Create user (admin only)
exports.adminCreateUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password are required.' });
    }
    if (role && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use.' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || ROLES.SALES,
    });

    res.status(201).json({
      message: 'User created.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// Update user (admin only)
exports.adminUpdateUser = async (req, res, next) => {
  try {
    const { id } = req.params; // userId to update
    const { name, email, password, role } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ error: 'Email already in use.' });
      user.email = email;
    }
    if (name) user.name = name;

    if (role) {
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ error: 'Invalid role.' });
      }

      // Optional safety: prevent removing the last admin
      if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
        const otherAdmins = await User.countDocuments({ _id: { $ne: user._id }, role: ROLES.ADMIN });
        if (otherAdmins === 0) {
          return res.status(400).json({ error: 'Cannot demote the last admin.' });
        }
      }
      user.role = role;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }

    await user.save();

    res.json({
      message: 'User updated.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// Delete user (admin only)
exports.adminDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Prevent deleting the last admin
    if (user.role === ROLES.ADMIN) {
      const otherAdmins = await User.countDocuments({ _id: { $ne: user._id }, role: ROLES.ADMIN });
      if (otherAdmins === 0) {
        return res.status(400).json({ error: 'Cannot delete the last admin.' });
      }
    }

    await User.deleteOne({ _id: id });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
};
