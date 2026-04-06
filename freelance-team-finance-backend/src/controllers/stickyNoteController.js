const StickyNote = require('../models/StickyNote');

exports.getStickyNotes = async (req, res, next) => {
  try {
    const notes = await StickyNote.find({ user: req.user.userId }).sort({ order: 1, createdAt: 1 });
    res.json({ notes });
  } catch (err) {
    next(err);
  }
};

exports.createStickyNote = async (req, res, next) => {
  try {
    const { title, content, color, pinned } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const last = await StickyNote.findOne({ user: req.user.userId }).sort({ order: -1 }).select('order');
    const nextOrder = (last?.order || 0) + 1000;
    const note = await StickyNote.create({
      user: req.user.userId,
      title: String(title || '').trim(),
      content: String(content).trim(),
      color: String(color || 'yellow').trim() || 'yellow',
      pinned: Boolean(pinned),
      order: nextOrder,
    });

    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
};

exports.updateStickyNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, color, pinned } = req.body;

    const update = {};
    if (title !== undefined) update.title = String(title || '').trim();
    if (content !== undefined) update.content = String(content).trim();
    if (color !== undefined) update.color = String(color || '').trim();
    if (pinned !== undefined) update.pinned = Boolean(pinned);

    if (update.content !== undefined && !update.content) {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }

    const note = await StickyNote.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      { $set: update },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ note });
  } catch (err) {
    next(err);
  }
};

exports.deleteStickyNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await StickyNote.findOneAndDelete({ _id: id, user: req.user.userId });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.reorderStickyNotes = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: id, user: req.user.userId },
        update: { $set: { order: (idx + 1) * 1000 } },
      },
    }));

    await StickyNote.bulkWrite(bulkOps, { ordered: false });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

