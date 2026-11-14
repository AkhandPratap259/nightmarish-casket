const express = require('express');
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const { auth } = require('../middleware/auth');
const { publicAuction } = require('../utils/auctions');

const router = express.Router();

// GET /api/bids/mine — my bid history, newest first, with whether each bid
// is still the winning bid on its lot.
router.get('/mine', auth, async (req, res) => {
  const bids = await Bid.find({ bidder: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate({ path: 'auction', populate: { path: 'seller', select: 'name' } });
  const rows = bids
    .filter((b) => b.auction)
    .map((b) => {
      const a = b.auction;
      const winning = a.bidsCount > 0 && a.currentBid === b.amount && a.status === 'live';
      const won = a.status === 'ended' && String(a.winner) === String(req.user._id);
      return {
        id: b._id,
        amount: b.amount,
        createdAt: b.createdAt,
        status: won ? 'won' : winning ? 'winning' : a.status === 'ended' ? 'lost' : 'outbid',
        auction: publicAuction(a),
      };
    });
  return res.json({ bids: rows });
});

module.exports = router;
