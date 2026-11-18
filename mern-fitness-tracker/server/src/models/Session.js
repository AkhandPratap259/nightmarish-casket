const mongoose = require('mongoose');

const setSchema = new mongoose.Schema(
  {
    reps: { type: Number, required: true, min: 0, max: 500 },
    weight: { type: Number, required: true, min: 0, max: 2000 },
    completed: { type: Boolean, default: true },
  },
  { _id: true }
);

const sessionExerciseSchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    sets: { type: [setSchema], default: [] },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0, min: 0 },
    exercises: { type: [sessionExerciseSchema], default: [] },
    totalVolume: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, default: '' },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, status: 1, startedAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
