const HourlyWork = require('../models/HourlyWork');
const Project = require('../models/Project');
const { logHistory } = require('../utils/historyLogger');

// Add new weekly hour log
exports.addHourlyWork = async (req, res, next) => {
  try {
    const { project, weekStart, hours } = req.body;

    // Validate project belongs to user and is hourly
    const proj = await Project.findOne({ _id: project, createdBy: req.user.userId });
    if (!proj) return res.status(404).json({ error: 'Project not found or not yours' });
    if (proj.priceType !== 'hourly') return res.status(400).json({ error: 'Project is not hourly' });

    const hourlyWork = await HourlyWork.create({
      project,
      weekStart,
      hours,
      user: req.user.userId
    });

    // Log hourly work creation
    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'HourlyWork',
      entityId: hourlyWork._id,
      newValue: hourlyWork.toObject(),
      description: `Added ${hours} hours for week starting ${new Date(weekStart).toLocaleDateString()}`
    });

    res.status(201).json({ hourlyWork });
  } catch (err) {
    next(err);
  }
};

// Get all hourly work logs for a project
exports.getHourlyWorkForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const logs = await HourlyWork.find({ project: projectId })
      .populate('user', 'name email')
      .sort({ weekStart: 1 });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
};

// Update log (e.g., hours correction)
exports.updateHourlyWork = async (req, res, next) => {
  try {
    const { logId } = req.params;
    const { hours } = req.body;
    
    // Get old value
    const oldLog = await HourlyWork.findOne({ _id: logId, user: req.user.userId });
    if (!oldLog) return res.status(404).json({ error: 'Log not found' });
    
    const updated = await HourlyWork.findOneAndUpdate(
      { _id: logId, user: req.user.userId },
      { hours },
      { new: true }
    );

    // Log hourly work update
    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'HourlyWork',
      entityId: logId,
      oldValue: oldLog.toObject(),
      newValue: updated.toObject(),
      description: `Updated hours from ${oldLog.hours} to ${hours} for week starting ${new Date(updated.weekStart).toLocaleDateString()}`
    });

    res.json({ hourlyWork: updated });
  } catch (err) {
    next(err);
  }
};

// Delete log
exports.deleteHourlyWork = async (req, res, next) => {
  try {
    const { logId } = req.params;
    const deleted = await HourlyWork.findOneAndDelete({ _id: logId, user: req.user.userId });
    if (!deleted) return res.status(404).json({ error: 'Log not found' });

    // Log hourly work deletion
    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'HourlyWork',
      entityId: logId,
      oldValue: deleted.toObject(),
      description: `Deleted ${deleted.hours} hours for week starting ${new Date(deleted.weekStart).toLocaleDateString()}`
    });

    res.json({ message: 'Log deleted' });
  } catch (err) {
    next(err);
  }
};
