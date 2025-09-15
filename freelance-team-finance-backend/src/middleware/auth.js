const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const auth = req.header('Authorization');
  if (!auth) return res.status(401).json({ error: 'No token, authorization denied.' });

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { userId, name, email, iat, exp }

    req.user = {
      userId: decoded.userId,  // MongoDB _id string
      name: decoded.name,
      email: decoded.email,
    };
    req.userId = decoded.userId; // shortcut for controllers

    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid.' });
  }
};
