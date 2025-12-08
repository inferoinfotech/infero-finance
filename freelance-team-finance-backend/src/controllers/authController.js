const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ROLES } = require('../models/User');
const { logHistory } = require('../utils/historyLogger');

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password /* role optional, admin can set later */ } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use.' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: ROLES.SALES, // default role
    });

    const token = signToken(user);

    // Log registration
    await logHistory({
      userId: user._id,
      action: 'create',
      entityType: 'User',
      entityId: user._id,
      newValue: { name: user.name, email: user.email, role: user.role },
      description: `User registered: ${user.name} (${user.email})`,
      metadata: { ip: req.ip, userAgent: req.get('user-agent') }
    });

    res.status(201).json({
      message: 'User registered!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials.' });

    const token = signToken(user);

    // Log login
    await logHistory({
      userId: user._id,
      action: 'login',
      entityType: 'Login',
      entityId: null,
      description: `User logged in: ${user.name} (${user.email})`,
      metadata: { ip: req.ip, userAgent: req.get('user-agent') }
    });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};
