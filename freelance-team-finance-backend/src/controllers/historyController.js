const History = require('../models/History');
const { logHistory } = require('../utils/historyLogger');

// Legacy function for backward compatibility
exports.addHistory = async ({ user, action, entityType, entityId, oldValue, newValue, description, metadata }) => {
  await logHistory({
    userId: user,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    description,
    metadata
  });
};

// Get all history logs (filter by user/entity type/action if needed)
exports.getHistory = async (req, res, next) => {
  try {
    const query = {};
    
    // Filter by user
    if (req.query.user) query.user = req.query.user;
    
    // Filter by entity type
    if (req.query.entityType) query.entityType = req.query.entityType;
    
    // Filter by action
    if (req.query.action) query.action = req.query.action;
    
    // Filter by entity ID
    if (req.query.entityId) query.entityId = req.query.entityId;
    
    // Date range filters
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) query.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.timestamp.$lte = new Date(req.query.endDate);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const logs = await History.find(query)
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await History.countDocuments(query);

    // Format response for frontend
    const formattedLogs = logs.map(log => ({
      _id: log._id,
      action: log.action,
      entity: log.entityType,
      entityId: log.entityId,
      description: log.description,
      changes: log.changes || {},
      user: log.user,
      timestamp: log.timestamp,
      metadata: log.metadata
    }));

    res.json(formattedLogs);
  } catch (err) {
    next(err);
  }
};
