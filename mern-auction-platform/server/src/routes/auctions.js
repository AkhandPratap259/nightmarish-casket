const express = require('express');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Watchlist = require('../models/Watchlist');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');
const { publicAuction, ANTI_SNIPE_WINDOW_MS, ANTI_SNIPE_EXTENSION_MS } = require('../utils/auctions');
const { emitToAll, emitToUser } = require('../utils/notify');

const router = express.Router();

function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
}

// GET /api/auctions — browse lots with search, category, status and sort.
// sort: ending (ends soonest first) | newest | price-asc | price-desc | most-bids
router.get('/', optionalAuth, async (req, res) => {
  const { q, category, city, status } = req.query;
  const { page, limit, skip } = parsePagination(req);
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (city) filter.city = new RegExp(city, 'i');
  if (status === 'live') filter.status = 'live';
  else if (status === 'ended') filter.status = 'ended';
  else if (status === 'all') filter.status = { $in: ['live', 'ended'] };
  else filter.status = { $in: ['live', 'ended'] };

  const sortMap = {
    ending: { endsAt: 1 },
    newest: { createdAt: -1 },
    'price-asc': { currentBid: 1 },
    'price-desc': { currentBid: -1 },
    'most-bids': { bidsCount: -1, endsAt: 1 },
  };
  const sort = sortMap[req.query.sort] || sortMap.ending;

  const [total, auctions] = await Promise.all([
    Auction.countDocuments(filter),
    Auction.find(filter).sort(sort).skip(skip).limit(limit).populate('seller', 'name').populate('winner', 'name'),
  ]);

  let watchedIds = new Set();
  if (req.user) {
    const watched = await Watchlist.find({ user: req.user._id, auction: { $in: auctions.map((a) => a._id) } });
    watchedIds = new Set(watched.map((w) => String(w.auction)));
  }

  return res.json({
    auctions: auctions.map((a) => publicAuction(a, { watched: watchedIds.has(String(a._id)) })),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
});

// GET /api/auctions/mine — the signed-in seller's lots.
router.get('/mine', auth, requireRole('seller', 'admin'), async (req, res) => {
  const auctions = await Auction.find({ seller: req.user._id })
    .sort({ createdAt: -1 })
    .populate('winner', 'name');
  return res.json({ auctions: auctions.map((a) => publicAuction(a)) });
});

// GET /api/auctions/:id — one lot with its recent bids.
router.get('/:id', optionalAuth, async (req, res) => {
  const auction = await Auction.findById(req.params.id).populate('seller', 'name').populate('winner', 'name');
  if (!auction) return res.status(404).json({ error: 'Lot not found' });
  const bids = await Bid.find({ auction: auction._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('bidder', 'name');
  let watched = false;
  if (req.user) {
    watched = Boolean(await Watchlist.findOne({ user: req.user._id, auction: auction._id }));
  }
  return res.json({
    auction: publicAuction(auction, { watched }),
    bids: bids.map((b) => ({
      id: b._id,
      amount: b.amount,
      bidder: b.bidder ? b.bidder.name : 'Bidder',
      bidderId: b.bidder ? b.bidder._id : null,
      createdAt: b.createdAt,
    })),
  });
});

// POST /api/auctions — list a new lot (seller or admin).
router.post('/', auth, requireRole('seller', 'admin'), async (req, res) => {
  const { title, description, category, condition, city, startingBid, minIncrement, endsAt } = req.body || {};
  if (!title || !description || !category || !city || startingBid == null || !endsAt) {
    return res.status(400).json({ error: 'Title, description, category, city, starting bid and end time are required' });
  }
  const start = Number(startingBid);
  if (!Number.isFinite(start) || start < 1) {
    return res.status(400).json({ error: 'Starting bid must be at least ₹1' });
  }
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime()) || end <= new Date()) {
    return res.status(400).json({ error: 'End time must be in the future' });
  }
  const auction = await Auction.create({
    title: title.trim(),
    description: description.trim(),
    category,
    condition: condition || 'used',
    city: city.trim(),
    startingBid: start,
    minIncrement: minIncrement != null ? Math.max(10, Number(minIncrement) || 100) : 100,
    currentBid: start,
    bidsCount: 0,
    seller: req.user._id,
    endsAt: end,
  });
  const populated = await auction.populate('seller', 'name');
  emitToAll('auction:created', publicAuction(populated));
  return res.status(201).json({ auction: publicAuction(populated) });
});

// DELETE /api/auctions/:id — cancel a lot that has no bids yet (owner or admin).
router.delete('/:id', auth, async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) return res.status(404).json({ error: 'Lot not found' });
  const isOwner = String(auction.seller) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the seller can cancel this lot' });
  }
  if (auction.bidsCount > 0) {
    return res.status(400).json({ error: 'A lot with bids cannot be cancelled' });
  }
  if (auction.status !== 'live') {
    return res.status(400).json({ error: 'This lot is already closed' });
  }
  auction.status = 'cancelled';
  await auction.save();
  emitToAll('auction:cancelled', { id: auction._id });
  return res.json({ ok: true });
});

// POST /api/auctions/:id/bids — place a bid. Atomic: the update only lands
// if the current bid is still the one the bidder saw, so two bids racing
// each other cannot both win. A bid inside the final 60 seconds extends
// the auction by 60 seconds (anti-sniping).
router.post('/:id/bids', auth, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    return res.status(400).json({ error: 'Enter a bid amount of at least ₹1' });
  }
  const now = new Date();
  const auction = await Auction.findById(req.params.id);
  if (!auction) return res.status(404).json({ error: 'Lot not found' });
  if (String(auction.seller) === String(req.user._id)) {
    return res.status(400).json({ error: 'You cannot bid on your own lot' });
  }
  if (!auction.isLive(now)) {
    return res.status(400).json({ error: 'This auction has ended' });
  }
  const minBid = auction.minNextBid();
  if (amount < minBid) {
    return res.status(400).json({ error: `Your bid must be at least ₹${minBid.toLocaleString('en-IN')}` });
  }

  const extend = auction.endsAt.getTime() - now.getTime() <= ANTI_SNIPE_WINDOW_MS;
  const update = { $set: { currentBid: amount }, $inc: { bidsCount: 1 } };
  if (extend) update.$set.endsAt = new Date(auction.endsAt.getTime() + ANTI_SNIPE_EXTENSION_MS);

  // Atomic guard: only update if the bid we read is still the current one
  // and the auction is still live.
  const updated = await Auction.findOneAndUpdate(
    { _id: auction._id, currentBid: auction.currentBid, status: 'live', endsAt: { $gt: now } },
    update,
    { new: true }
  ).populate('seller', 'name');
  if (!updated) {
    return res.status(409).json({ error: 'Another bid landed just before yours — check the new price and try again' });
  }

  const previousTop = await Bid.findOne({ auction: auction._id }).sort({ amount: -1, createdAt: 1 });
  const bid = await Bid.create({ auction: auction._id, bidder: req.user._id, amount });
  const payload = {
    id: bid._id,
    auctionId: auction._id,
    amount,
    bidder: req.user.name,
    bidderId: req.user._id,
    createdAt: bid.createdAt,
    currentBid: updated.currentBid,
    bidsCount: updated.bidsCount,
    endsAt: updated.endsAt,
    extended: extend,
  };
  // Broadcast each event exactly once. Emitting the same event to the lot
  // room AND to everyone would deliver it twice to bidders on the lot page
  // and show the new bid twice in the feed.
  emitToAll('bid:new', payload);
  if (previousTop && String(previousTop.bidder) !== String(req.user._id)) {
    emitToUser(previousTop.bidder, 'bid:outbid', {
      auctionId: auction._id,
      title: auction.title,
      amount,
    });
  }
  if (extend) {
    emitToAll('auction:extended', {
      auctionId: auction._id,
      endsAt: updated.endsAt,
    });
  }
  return res.status(201).json({ bid: payload, auction: publicAuction(updated) });
});

// GET /api/auctions/:id/bids — full bid history for a lot.
router.get('/:id/bids', async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) return res.status(404).json({ error: 'Lot not found' });
  const bids = await Bid.find({ auction: auction._id }).sort({ createdAt: -1 }).populate('bidder', 'name');
  return res.json({
    bids: bids.map((b) => ({
      id: b._id,
      amount: b.amount,
      bidder: b.bidder ? b.bidder.name : 'Bidder',
      bidderId: b.bidder ? b.bidder._id : null,
      createdAt: b.createdAt,
    })),
  });
});

module.exports = router;
