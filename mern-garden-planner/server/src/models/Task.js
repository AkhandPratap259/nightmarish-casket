const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    garden: { type: mongoose.Schema.Types.ObjectId, ref: 'Garden', required: true },
    planting: { type: mongoose.Schema.Types.ObjectId, ref: 'Planting', default: null },
    bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', default: null },
    kind: { type: String, enum: ['water', 'weed', 'harvest', 'feed', 'prune', 'other'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['open', 'done', 'skipped'], default: 'open' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

taskSchema.index({ garden: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
