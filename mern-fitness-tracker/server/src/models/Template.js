const mongoose = require('mongoose');

const templateItemSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    targetSets: { type: Number, required: true, min: 1, max: 12 },
    targetReps: { type: Number, required: true, min: 1, max: 100 },
    targetWeight: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const templateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    items: { type: [templateItemSchema], default: [] },
    isPublic: { type: Boolean, default: false },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', templateSchema);
