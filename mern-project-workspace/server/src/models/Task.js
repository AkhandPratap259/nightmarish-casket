const mongoose = require('mongoose');

// WIP (work-in-progress) limits: how many cards a column may hold at once.
// They are enforced server-side on every move/create, not just in the UI,
// so dragging a 5th card into "In Progress" is rejected with a clear error.
const WIP_LIMITS = { todo: null, 'in-progress': 4, review: 3, done: null };
const STATUSES = ['todo', 'in-progress', 'review', 'done'];

const checklistSchema = new mongoose.Schema(
  { text: { type: String, required: true }, done: { type: Boolean, default: false } },
  { _id: true }
);
const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: STATUSES, default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    labels: [{ type: String, trim: true }],
    dueDate: { type: Date, default: null },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    position: { type: Number, default: 0 },
    checklist: [checklistSchema],
    comments: [commentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

taskSchema.methods.checklistProgress = function checklistProgress() {
  if (!this.checklist.length) return null;
  const done = this.checklist.filter((c) => c.done).length;
  return Math.round((done / this.checklist.length) * 100);
};

module.exports = { Task: mongoose.model('Task', taskSchema), WIP_LIMITS, STATUSES };
