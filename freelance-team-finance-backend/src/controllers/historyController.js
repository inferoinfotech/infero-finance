const History = require('../models/History');

// Add an audit log (to be called from other modules/controllers after create/update/delete)
exports.addHistory = async ({ user, action, entityType, entityId, oldValue, newValue }) => {
  await History.create({
    user,
    action,
    entityType,
    entityId,
    oldValue,
    newValue
  });
};

// Get all history logs (filter by user/entity type if needed)
exports.getHistory = async (req, res, next) => {
  try {
    // Optional: filter by query (e.g., user, entityType, entityId)
    const query = {};
    if (req.query.user) query.user = req.query.user;
    if (req.query.entityType) query.entityType = req.query.entityType;
    if (req.query.entityId) query.entityId = req.query.entityId;

    const logs = await History.find(query)
      .populate('user', 'name email')
      .sort({ timestamp: -1 });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
};
