const mongoose = require('mongoose');

const planWeekSchema = new mongoose.Schema(
  {
    weekNumber: { type: Number, required: true, min: 1 },
    templateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    weeks: { type: [planWeekSchema], default: [] },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
