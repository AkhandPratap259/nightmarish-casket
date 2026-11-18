const mongoose = require('mongoose');

const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'cardio',
  'full-body',
];

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    muscleGroup: { type: String, enum: MUSCLE_GROUPS, required: true },
    equipment: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    instructions: [{ type: String, trim: true }],
    isCustom: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

exerciseSchema.index({ name: 'text' });
exerciseSchema.index({ muscleGroup: 1, difficulty: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);
module.exports.MUSCLE_GROUPS = MUSCLE_GROUPS;
