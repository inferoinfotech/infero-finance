const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const auth = req.header('Authorization');
  if (!auth) return res.status(401).json({ error: 'No token, authorization denied.' });

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, name, email }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid.' });
  }
};
