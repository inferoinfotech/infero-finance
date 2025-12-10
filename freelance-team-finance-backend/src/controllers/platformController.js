const Platform = require('../models/Platform');
const { logHistory } = require('../utils/historyLogger');

// Create new platform
exports.createPlatform = async (req, res, next) => {
  try {
    const { name, chargePercentage } = req.body;
    const exists = await Platform.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (exists) return res.status(400).json({ error: 'Platform already exists' });
    const platform = await Platform.create({ 
      name,
      chargePercentage: chargePercentage ? Number(chargePercentage) : 0
    });

    // Log platform creation (use req.user.userId if available, otherwise system)
    await logHistory({
      userId: req.user?.userId || null,
      action: 'create',
      entityType: 'Platform',
      entityId: platform._id,
      newValue: platform.toObject(),
      description: `Created platform: ${name}`
    });

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

// Update platform
exports.updatePlatform = async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const { name, chargePercentage } = req.body;
    
    // Get old value
    const oldPlatform = await Platform.findById(platformId);
    if (!oldPlatform) return res.status(404).json({ error: 'Platform not found' });
    
    const updateData = { name };
    if (chargePercentage !== undefined) {
      updateData.chargePercentage = Number(chargePercentage);
    }
    
    const updated = await Platform.findByIdAndUpdate(
      platformId,
      updateData,
      { new: true }
    );

    // Log platform update
    await logHistory({
      userId: req.user?.userId || null,
      action: 'update',
      entityType: 'Platform',
      entityId: platformId,
      oldValue: oldPlatform.toObject(),
      newValue: updated.toObject(),
      description: `Updated platform: ${updated.name}`
    });

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

    // Log platform deletion
    await logHistory({
      userId: req.user?.userId || null,
      action: 'delete',
      entityType: 'Platform',
      entityId: platformId,
      oldValue: deleted.toObject(),
      description: `Deleted platform: ${deleted.name}`
    });

    res.json({ message: 'Platform deleted' });
  } catch (err) {
    next(err);
  }
};
