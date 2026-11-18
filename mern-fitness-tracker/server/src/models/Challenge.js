const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    progress: { type: Number, default: 0, min: 0 },
    joinedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // sessions: number of completed sessions in the window.
    // volume: total kilograms lifted (reps x weight) in the window.
    // streak: number of distinct training days in the window.
    type: { type: String, enum: ['sessions', 'volume', 'streak'], required: true },
    target: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: { type: [participantSchema], default: [] },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Challenge', challengeSchema);
