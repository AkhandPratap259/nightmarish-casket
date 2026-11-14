const mongoose = require('mongoose');

const CATEGORIES = ['watches', 'art', 'collectibles', 'tech', 'sneakers', 'memorabilia', 'vintage', 'home'];
const CONDITIONS = ['new', 'like-new', 'used', 'vintage'];

const auctionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    condition: { type: String, enum: CONDITIONS, default: 'used' },
    city: { type: String, required: true, trim: true },
    startingBid: { type: Number, required: true, min: 1 },
    minIncrement: { type: Number, default: 100, min: 10 },
    // currentBid starts at the starting bid; bidsCount tracks real bids.
    currentBid: { type: Number, required: true },
    bidsCount: { type: Number, default: 0 },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['live', 'ended', 'cancelled'], default: 'live' },
    startsAt: { type: Date, default: () => new Date() },
    endsAt: { type: Date, required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    winningBid: { type: Number, default: null },
  },
  { timestamps: true }
);

auctionSchema.index({ title: 'text', description: 'text' });
auctionSchema.index({ category: 1, endsAt: 1 });
auctionSchema.index({ status: 1, endsAt: 1 });
auctionSchema.index({ seller: 1, createdAt: -1 });

// The smallest amount the next bid may be. Before any bid lands, the
// starting bid itself is a valid first bid.
auctionSchema.methods.minNextBid = function minNextBid() {
  return this.bidsCount === 0 ? this.startingBid : this.currentBid + this.minIncrement;
};

auctionSchema.methods.isLive = function isLive(now = new Date()) {
  return this.status === 'live' && now >= this.startsAt && now < this.endsAt;
};

module.exports = mongoose.model('Auction', auctionSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.CONDITIONS = CONDITIONS;
