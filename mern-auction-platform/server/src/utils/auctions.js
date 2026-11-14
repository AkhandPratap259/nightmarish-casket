const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const { emitToAll, emitToUser } = require('./notify');

// Anti-sniping window: a bid placed inside the final 60 seconds extends
// the auction by 60 seconds, so nobody wins by sniping the last second.
const ANTI_SNIPE_WINDOW_MS = 60 * 1000;
const ANTI_SNIPE_EXTENSION_MS = 60 * 1000;

function publicAuction(auction, extra = {}) {
  const a = typeof auction.toObject === 'function' ? auction.toObject() : auction;
  const seller = a.seller && typeof a.seller === 'object' ? { id: a.seller._id, name: a.seller.name } : a.seller;
  const winner = a.winner && typeof a.winner === 'object' ? { id: a.winner._id, name: a.winner.name } : a.winner;
  return {
    id: a._id,
    title: a.title,
    description: a.description,
    category: a.category,
    condition: a.condition,
    city: a.city,
    startingBid: a.startingBid,
    minIncrement: a.minIncrement,
    currentBid: a.currentBid,
    bidsCount: a.bidsCount,
    minNextBid: a.bidsCount === 0 ? a.startingBid : a.currentBid + a.minIncrement,
    seller,
    status: a.status,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    winner,
    winningBid: a.winningBid,
    createdAt: a.createdAt,
    ...extra,
  };
}

// Close every live auction whose end time has passed: record the winner
// from the highest bid and broadcast the result.
async function closeExpired() {
  const now = new Date();
  const expired = await Auction.find({ status: 'live', endsAt: { $lte: now } });
  for (const auction of expired) {
    const top = await Bid.findOne({ auction: auction._id }).sort({ amount: -1, createdAt: 1 });
    auction.status = 'ended';
    if (top) {
      auction.winner = top.bidder;
      auction.winningBid = top.amount;
    }
    await auction.save();
    const payload = publicAuction(auction);
    emitToAll('auction:ended', payload);
    if (top) {
      emitToUser(top.bidder, 'auction:won', {
        auctionId: auction._id,
        title: auction.title,
        amount: top.amount,
      });
    }
  }
  return expired.length;
}

module.exports = { publicAuction, closeExpired, ANTI_SNIPE_WINDOW_MS, ANTI_SNIPE_EXTENSION_MS };
