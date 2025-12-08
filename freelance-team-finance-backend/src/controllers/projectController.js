const Project = require('../models/Project');
const { logHistory } = require('../utils/historyLogger');

// Create new project
exports.createProject = async (req, res, next) => {
  try {
    const {
      name, clientName, platform, currency, status, startDate, endDate,
      priceType, hourlyRate, fixedPrice, budget
    } = req.body;

    if (priceType === 'hourly' && !hourlyRate) {
      return res.status(400).json({ error: 'Hourly projects must have hourlyRate' });
    }
    if (priceType === 'fixed' && !fixedPrice) {
      return res.status(400).json({ error: 'Fixed projects must have fixedPrice' });
    }

    const project = await Project.create({
      name, clientName, platform, currency,
      status: status || 'pending',
      startDate, endDate, priceType,
      hourlyRate: priceType === 'hourly' ? hourlyRate : undefined,
      fixedPrice: priceType === 'fixed' ? fixedPrice : undefined,
      budget,
      createdBy: req.user.userId
    });

    // Log project creation
    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'Project',
      entityId: project._id,
      newValue: project.toObject(),
      description: `Created project: ${name} (${clientName})`
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
};


// Get all projects for the logged-in user
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ createdBy: req.user.userId })
      .populate('platform', 'name')
      .sort({ createdAt: -1 });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

// Get project by ID (details)
exports.getProjectById = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ _id: projectId, createdBy: req.user.userId })
      .populate('platform', 'name');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) {
    next(err);
  }
};

// Update project (extend, change details)
exports.updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;

    // Get previous project for oldValue (for diff)
    const previousProject = await Project.findOne({ _id: projectId, createdBy: req.user.userId });

    const project = await Project.findOneAndUpdate(
      { _id: projectId, createdBy: req.user.userId },
      updates,
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Log project update
    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'Project',
      entityId: projectId,
      oldValue: previousProject ? previousProject.toObject() : null,
      newValue: project.toObject(),
      description: `Updated project: ${project.name}`
    });

    res.json({ project });
  } catch (err) {
    next(err);
  }
};


// Delete project (if needed)
exports.deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const deleted = await Project.findOneAndDelete({ _id: projectId, createdBy: req.user.userId });
    if (!deleted) return res.status(404).json({ error: 'Project not found' });

    // Log project deletion
    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'Project',
      entityId: projectId,
      oldValue: deleted.toObject(),
      description: `Deleted project: ${deleted.name}`
    });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};
