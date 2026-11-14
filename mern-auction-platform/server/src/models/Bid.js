const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

bidSchema.index({ auction: 1, createdAt: -1 });
bidSchema.index({ bidder: 1, createdAt: -1 });
bidSchema.index({ auction: 1, amount: -1 });

module.exports = mongoose.model('Bid', bidSchema);
