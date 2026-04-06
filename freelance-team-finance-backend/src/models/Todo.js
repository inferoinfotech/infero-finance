const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
    order: { type: Number, default: () => Date.now(), index: true },
  },
  { timestamps: true }
);

TodoSchema.index({ user: 1, order: 1 });

module.exports = mongoose.model('Todo', TodoSchema);

