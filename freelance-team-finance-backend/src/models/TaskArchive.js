const mongoose = require('mongoose');
const { ROLES } = require('./User');

const taskArchiveSchema = new mongoose.Schema(
  {
    originalTaskId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'blocked', 'on_hold', 'in_review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: { type: Date },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedRole: { type: String, enum: Object.values(ROLES) },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    collaboratorRoles: [{ type: String, enum: Object.values(ROLES) }],
    isGlobal: { type: Boolean, default: false },
    subtasks: [
      {
        title: { type: String, required: true, trim: true },
        done: { type: Boolean, default: false },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    archivedAt: { type: Date, default: Date.now },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaskArchive', taskArchiveSchema);
