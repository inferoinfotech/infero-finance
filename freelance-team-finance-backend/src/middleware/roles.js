// Simple role guard: allow only selected roles
function allow(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(403).json({ error: 'Forbidden.' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient role.' });
    }
    next();
  };
}

module.exports = { allow };
