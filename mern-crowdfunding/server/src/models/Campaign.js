const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: '', trim: true },
  // null = unlimited quantity.
  quantity: { type: Number, default: null },
  claimed: { type: Number, default: 0, min: 0 },
});

const stretchGoalSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },
    story: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['technology', 'arts', 'community', 'environment', 'food', 'games', 'education', 'health'],
    },
    goal: { type: Number, required: true, min: 100 },
    minimumPledge: { type: Number, default: 5, min: 1 },
    pledgedTotal: { type: Number, default: 0, min: 0 },
    backerCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'live', 'funded', 'failed', 'fulfilled'],
      default: 'draft',
    },
    endsAt: { type: Date, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rewards: { type: [rewardSchema], default: [] },
    stretchGoals: { type: [stretchGoalSchema], default: [] },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
