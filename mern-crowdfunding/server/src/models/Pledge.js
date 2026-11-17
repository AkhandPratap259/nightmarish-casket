const mongoose = require('mongoose');

const pledgeSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    backer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    rewardTitle: { type: String, default: '' },
    rewardId: { type: String, default: '' },
    anonymous: { type: Boolean, default: false },
    paymentStatus: { type: String, default: 'mock-paid' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pledge', pledgeSchema);
