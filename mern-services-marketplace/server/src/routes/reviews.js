const express = require('express');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { auth, requireRole } = require('../middleware/auth');
const { getProviderStats } = require('../utils/providerStats');

const router = express.Router();

// A customer reviews one of their own completed bookings, once per booking.
router.post('/', auth, requireRole('customer'), async (req, res) => {
  const { bookingId, rating, comment } = req.body || {};
  if (!bookingId || rating === undefined) {
    return res.status(400).json({ error: 'Booking and rating are required' });
  }
  const n = Number(rating);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' });
  }
  const booking = await Booking.findById(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (String(booking.customer) !== String(req.user._id)) {
    return res.status(403).json({ error: 'You can only review your own bookings' });
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({ error: 'Only completed bookings can be reviewed' });
  }
  const existing = await Review.findOne({ booking: bookingId });
  if (existing) {
    return res.status(409).json({ error: 'This booking already has a review' });
  }
  const review = await Review.create({
    booking: bookingId,
    customer: req.user._id,
    provider: booking.provider,
    offering: booking.offering,
    rating: n,
    comment: comment ? String(comment).trim() : '',
  });
  const stats = await getProviderStats(booking.provider);
  res.status(201).json({ review, providerStats: stats });
});

router.get('/provider/:providerId', async (req, res) => {
  const reviews = await Review.find({ provider: req.params.providerId })
    .populate('customer', 'name avatarColor')
    .populate('offering', 'price')
    .sort({ createdAt: -1 })
    .lean();
  const stats = await getProviderStats(req.params.providerId);
  res.json({ reviews, providerStats: stats });
});

router.get('/offering/:offeringId', async (req, res) => {
  const reviews = await Review.find({ offering: req.params.offeringId })
    .populate('customer', 'name avatarColor')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ reviews });
});

module.exports = router;
