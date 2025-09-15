const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'No token, authorization denied.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid Authorization header.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded expected: { userId, name, email, role, iat, exp }
    req.user = {
      userId: decoded.userId,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };
    req.userId = decoded.userId; // shortcut
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid.' });
  }
};
