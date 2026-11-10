const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['waiting', 'promoted', 'expired', 'left'], default: 'waiting' },
  },
  { timestamps: true }
);

waitlistSchema.index({ patient: 1, doctor: 1, date: 1, status: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
