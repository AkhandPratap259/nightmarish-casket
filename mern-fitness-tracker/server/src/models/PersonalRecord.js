const mongoose = require('mongoose');

// One row per (user, exercise): the heaviest single set the user has ever
// logged, plus the Epley estimated one-rep max derived from it.
const personalRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    bestWeight: { type: Number, required: true, min: 0 },
    bestReps: { type: Number, required: true, min: 1 },
    estimatedOneRepMax: { type: Number, required: true, min: 0 },
    achievedAt: { type: Date, default: Date.now },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  },
  { timestamps: true }
);

personalRecordSchema.index({ user: 1, exercise: 1 }, { unique: true });

module.exports = mongoose.model('PersonalRecord', personalRecordSchema);
