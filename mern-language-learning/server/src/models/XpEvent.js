const mongoose = require('mongoose');

// One row per XP award. The weekly leaderboard is a real aggregation over
// these rows (XP earned in the last 7 days), not a stored counter.
const xpEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    xp: { type: Number, required: true },
    source: { type: String, default: 'lesson' },
  },
  { timestamps: true }
);

xpEventSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('XpEvent', xpEventSchema);
