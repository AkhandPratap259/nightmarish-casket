const express = require('express');
const User = require('../models/User');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  const [users, live, ended, bids, volumeAgg, byCategory, recentBids] = await Promise.all([
    User.countDocuments(),
    Auction.countDocuments({ status: 'live' }),
    Auction.countDocuments({ status: 'ended' }),
    Bid.countDocuments(),
    Auction.aggregate([
      { $match: { status: 'ended', winningBid: { $ne: null } } },
      { $group: { _id: null, total: { $sum: '$winningBid' } } },
    ]),
    Auction.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, bids: { $sum: '$bidsCount' } } },
      { $sort: { count: -1 } },
    ]),
    Bid.find().sort({ createdAt: -1 }).limit(10).populate('bidder', 'name').populate('auction', 'title'),
  ]);
  return res.json({
    users,
    liveAuctions: live,
    endedAuctions: ended,
    totalBids: bids,
    totalVolume: volumeAgg[0] ? volumeAgg[0].total : 0,
    byCategory: byCategory.map((c) => ({ category: c._id, auctions: c.count, bids: c.bids })),
    recentBids: recentBids.map((b) => ({
      id: b._id,
      amount: b.amount,
      bidder: b.bidder ? b.bidder.name : 'Bidder',
      auctionTitle: b.auction ? b.auction.title : 'Lot',
      createdAt: b.createdAt,
    })),
  });
});

module.exports = router;
