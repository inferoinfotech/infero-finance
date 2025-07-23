const Platform = require('../models/Platform');

// Create new platform
exports.createPlatform = async (req, res, next) => {
  try {
    const { name } = req.body;
    const exists = await Platform.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (exists) return res.status(400).json({ error: 'Platform already exists' });
    const platform = await Platform.create({ name });
    res.status(201).json({ platform });
  } catch (err) {
    next(err);
  }
};

// Get all platforms
exports.getPlatforms = async (req, res, next) => {
  try {
    const platforms = await Platform.find().sort('name');
    res.json({ platforms });
  } catch (err) {
    next(err);
  }
};

// Update platform name
exports.updatePlatform = async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const { name } = req.body;
    const updated = await Platform.findByIdAndUpdate(
      platformId,
      { name },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Platform not found' });
    res.json({ platform: updated });
  } catch (err) {
    next(err);
  }
};

// Delete platform
exports.deletePlatform = async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const deleted = await Platform.findByIdAndDelete(platformId);
    if (!deleted) return res.status(404).json({ error: 'Platform not found' });
    res.json({ message: 'Platform deleted' });
  } catch (err) {
    next(err);
  }
};
