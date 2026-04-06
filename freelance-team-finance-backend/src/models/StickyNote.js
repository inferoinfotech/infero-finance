const mongoose = require('mongoose');

const StickyNoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 60, default: '' },
    // content supports rich-text HTML from editor
    content: { type: String, required: true, trim: true, maxlength: 8000 },
    color: { type: String, trim: true, default: 'yellow' },
    pinned: { type: Boolean, default: false },
    order: { type: Number, default: () => Date.now(), index: true },
  },
  { timestamps: true }
);

StickyNoteSchema.index({ user: 1, order: 1 });

module.exports = mongoose.model('StickyNote', StickyNoteSchema);

