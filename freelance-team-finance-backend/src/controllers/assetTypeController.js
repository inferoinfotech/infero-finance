const AssetType = require('../models/AssetType');
const Asset = require('../models/Asset');
const { logHistory } = require('../utils/historyLogger');

// GET /api/asset-types
exports.getAssetTypes = async (req, res, next) => {
  try {
    const types = await AssetType.find()
      .sort({ name: 1 })
      .lean();
    res.json({ types });
  } catch (err) {
    next(err);
  }
};

// POST /api/asset-types
exports.createAssetType = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Type name is required' });
    }

    const existing = await AssetType.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Type with this name already exists' });
    }

    const type = await AssetType.create({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user.userId,
    });

    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'AssetType',
      entityId: type._id,
      newValue: type.toObject(),
      description: `Created asset type: ${type.name}`,
    });

    res.status(201).json({ type });
  } catch (err) {
    next(err);
  }
};

// PUT /api/asset-types/:typeId
exports.updateAssetType = async (req, res, next) => {
  try {
    const { typeId } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Type name is required' });
    }

    const existing = await AssetType.findOne({ name: name.trim(), _id: { $ne: typeId } });
    if (existing) {
      return res.status(400).json({ error: 'Type with this name already exists' });
    }

    const oldType = await AssetType.findById(typeId);
    if (!oldType) return res.status(404).json({ error: 'Type not found' });

    const updated = await AssetType.findByIdAndUpdate(
      typeId,
      { name: name.trim(), description: description?.trim() || '', updatedAt: Date.now() },
      { new: true }
    );

    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'AssetType',
      entityId: typeId,
      oldValue: oldType.toObject(),
      newValue: updated.toObject(),
      description: `Updated asset type: ${updated.name}`,
    });

    res.json({ type: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/asset-types/:typeId
exports.deleteAssetType = async (req, res, next) => {
  try {
    const { typeId } = req.params;

    const deleted = await AssetType.findById(typeId);
    if (!deleted) return res.status(404).json({ error: 'Type not found' });

    const usedCount = await Asset.countDocuments({ type: deleted.name });
    if (usedCount > 0) {
      return res.status(400).json({
        error: `Cannot delete type. It is being used by ${usedCount} asset(s).`,
      });
    }

    await AssetType.findByIdAndDelete(typeId);

    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'AssetType',
      entityId: typeId,
      oldValue: deleted.toObject(),
      description: `Deleted asset type: ${deleted.name}`,
    });

    res.json({ message: 'Type deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/asset-types/:typeId
exports.getAssetType = async (req, res, next) => {
  try {
    const { typeId } = req.params;
    const type = await AssetType.findById(typeId).lean();
    if (!type) return res.status(404).json({ error: 'Type not found' });
    res.json({ type });
  } catch (err) {
    next(err);
  }
};

