const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../models/User');
const { logHistory } = require('../utils/historyLogger');

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

    // Log user creation
    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'User',
      entityId: user._id,
      newValue: { name: user.name, email: user.email, role: user.role },
      description: `Admin created user: ${user.name} (${user.email}) with role ${user.role}`
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

    // Get old value before save
    const oldUser = {
      name: user.name,
      email: user.email,
      role: user.role
    };

    await user.save();

    // Log user update
    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'User',
      entityId: id,
      oldValue: oldUser,
      newValue: { name: user.name, email: user.email, role: user.role },
      description: `Admin updated user: ${user.name} (${user.email})`
    });

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

    // Log user deletion
    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'User',
      entityId: id,
      oldValue: { name: user.name, email: user.email, role: user.role },
      description: `Admin deleted user: ${user.name} (${user.email})`
    });

    await User.deleteOne({ _id: id });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
};


exports.adminListUsers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const q = search
      ? { $or: [
          { name:  { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { role:  { $regex: search, $options: 'i' } },
        ] }
      : {};

    const skip = (Math.max(Number(page), 1) - 1) * Math.max(Number(limit), 1);
    const [items, total] = await Promise.all([
      User.find(q, { password: 0 }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(q),
    ]);

    res.json({ users: items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.adminGetUser = async (req, res, next) => {
  try {
    const u = await User.findById(req.params.id, { password: 0 });
    if (!u) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: u });
  } catch (err) {
    next(err);
  }
};

