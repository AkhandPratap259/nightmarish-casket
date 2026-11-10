const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    status: { type: String, enum: ['waiting', 'promoted', 'left', 'expired'], default: 'waiting' },
  },
  { timestamps: true }
);

waitlistSchema.index({ user: 1, event: 1, status: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
