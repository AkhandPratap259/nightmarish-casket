const express = require('express');
const Watchlist = require('../models/Watchlist');
const Auction = require('../models/Auction');
const { auth } = require('../middleware/auth');
const { publicAuction } = require('../utils/auctions');

const router = express.Router();

// GET /api/watchlist — lots I am watching.
router.get('/', auth, async (req, res) => {
  const rows = await Watchlist.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'auction', populate: { path: 'seller', select: 'name' } });
  return res.json({
    auctions: rows
      .filter((w) => w.auction)
      .map((w) => publicAuction(w.auction, { watched: true })),
  });
});

// POST /api/watchlist/:auctionId — watch a lot.
router.post('/:auctionId', auth, async (req, res) => {
  const auction = await Auction.findById(req.params.auctionId);
  if (!auction) return res.status(404).json({ error: 'Lot not found' });
  await Watchlist.updateOne(
    { user: req.user._id, auction: auction._id },
    { $setOnInsert: { user: req.user._id, auction: auction._id } },
    { upsert: true }
  );
  return res.status(201).json({ ok: true, watched: true });
});

// DELETE /api/watchlist/:auctionId — stop watching a lot.
router.delete('/:auctionId', auth, async (req, res) => {
  await Watchlist.deleteOne({ user: req.user._id, auction: req.params.auctionId });
  return res.json({ ok: true, watched: false });
});

module.exports = router;
