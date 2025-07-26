const Project = require('../models/Project');
const { addHistory } = require('./historyController'); // adjust path as needed

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

    // LOG TO HISTORY after update
    await addHistory({
      user: req.user.userId,
      action: 'update_project',
      entityType: 'Project',
      entityId: projectId,
      oldValue: previousProject ? previousProject.toObject() : null,
      newValue: project.toObject()
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

    // LOG TO HISTORY after delete
    await addHistory({
      user: req.user.userId,
      action: 'delete_project',
      entityType: 'Project',
      entityId: projectId,
      oldValue: deleted.toObject(),
      newValue: null
    });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};
