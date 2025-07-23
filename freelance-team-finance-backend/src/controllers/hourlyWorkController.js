const HourlyWork = require('../models/HourlyWork');
const Project = require('../models/Project');

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
    const updated = await HourlyWork.findOneAndUpdate(
      { _id: logId, user: req.user.userId },
      { hours },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Log not found' });
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
    res.json({ message: 'Log deleted' });
  } catch (err) {
    next(err);
  }
};
