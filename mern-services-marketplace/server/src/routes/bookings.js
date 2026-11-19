const express = require('express');
const Booking = require('../models/Booking');
const { ACTIVE_STATUSES, SLOTS } = require('../models/Booking');
const Offering = require('../models/Offering');
const { auth, requireRole } = require('../middleware/auth');
const { computePriceBreakdown } = require('../utils/pricing');
const { emitToUser } = require('../utils/notify');

const router = express.Router();

// Allowed transitions. The server is the only authority on the lifecycle:
// illegal moves are rejected, never silently applied.
const TRANSITIONS = {
  requested: ['accepted', 'declined', 'cancelled_by_customer'],
  accepted: ['in_progress', 'cancelled_by_customer', 'cancelled_by_provider'],
  in_progress: ['completed', 'cancelled_by_provider'],
  completed: [],
  declined: [],
  cancelled_by_customer: [],
  cancelled_by_provider: [],
};

const PROVIDER_ACTIONS = {
  accepted: 'accept',
  declined: 'decline',
  in_progress: 'start',
  completed: 'complete',
};

function populateBooking(query) {
  return query
    .populate('offering')
    .populate('provider', 'name phone city avatarColor bio yearsExperience')
    .populate('customer', 'name phone city');
}

function next7Days() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// Booked slots for one offering's provider on one date — powers the
// slot picker, which disables slots that are already taken. Public: it
// reveals only which hours are taken, no personal data.
router.get('/slots', async (req, res) => {
  const { offeringId, date } = req.query;
  if (!offeringId || !date) {
    return res.status(400).json({ error: 'offeringId and date are required' });
  }
  const offering = await Offering.findById(offeringId).lean();
  if (!offering) return res.status(404).json({ error: 'Offering not found' });
  const taken = await Booking.find({
    provider: offering.provider,
    date,
    status: { $in: ACTIVE_STATUSES },
  })
    .select('slot')
    .lean();
  res.json({
    date,
    slots: SLOTS,
    booked: taken.map((b) => b.slot),
    days: next7Days(),
  });
});

// Create a booking. Price is always computed server-side from the offering,
// date and slot — the client never sends a price.
router.post('/', auth, requireRole('customer'), async (req, res) => {
  const { offeringId, date, slot, address, area, notes } = req.body || {};
  if (!offeringId || !date || !slot || !address || !area) {
    return res
      .status(400)
      .json({ error: 'Offering, date, slot, address and area are required' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !next7Days().includes(date)) {
    return res.status(400).json({ error: 'Date must be within the next 7 days' });
  }
  if (!SLOTS.includes(slot)) {
    return res.status(400).json({ error: 'Slot is not a valid time slot' });
  }
  const offering = await Offering.findById(offeringId).populate('service').populate('provider');
  if (!offering) return res.status(404).json({ error: 'Offering not found' });
  if (!offering.active) return res.status(400).json({ error: 'This offering is not active' });
  if (!offering.provider.active) {
    return res.status(400).json({ error: 'This provider is not active' });
  }
  if (!offering.areas.includes(area)) {
    return res.status(400).json({ error: 'This provider does not serve that area' });
  }
  // Conflict check: the same provider cannot hold two active bookings in
  // one slot. The partial unique index on Booking enforces this too.
  const clash = await Booking.findOne({
    provider: offering.provider._id,
    date,
    slot,
    status: { $in: ACTIVE_STATUSES },
  }).lean();
  if (clash) {
    return res.status(409).json({ error: 'That slot is already booked for this provider' });
  }
  const breakdown = computePriceBreakdown(offering.price, date, slot);
  const priceBreakdown = {
    base: breakdown.base,
    peakSurcharge: breakdown.peakSurcharge,
    platformFee: breakdown.platformFee,
    gst: breakdown.gst,
    total: breakdown.total,
  };
  let booking;
  try {
    booking = await Booking.create({
      customer: req.user._id,
      provider: offering.provider._id,
      offering: offering._id,
      serviceName: offering.service.name,
      serviceCategory: offering.service.category,
      date,
      slot,
      address: String(address).trim(),
      area: String(area).trim(),
      notes: notes ? String(notes).trim() : '',
      status: 'requested',
      priceBreakdown,
      timeline: [{ status: 'requested', at: new Date() }],
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'That slot is already booked for this provider' });
    }
    throw err;
  }
  const full = await populateBooking(Booking.findById(booking._id)).lean();
  emitToUser(offering.provider._id, 'booking:updated', { booking: full });
  res.status(201).json({ booking: full });
});

// The signed-in user's bookings: customers see theirs, providers see jobs
// assigned to them, admins see everything.
router.get('/mine', auth, async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (req.user.role === 'customer') filter.customer = req.user._id;
  else if (req.user.role === 'provider') filter.provider = req.user._id;
  if (status) filter.status = status;
  const bookings = await populateBooking(Booking.find(filter).sort({ date: 1, slot: 1 })).lean();
  res.json({ bookings });
});

router.get('/:id', auth, async (req, res) => {
  const booking = await populateBooking(Booking.findById(req.params.id)).lean();
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const isParty =
    String(booking.customer._id) === String(req.user._id) ||
    String(booking.provider._id) === String(req.user._id) ||
    req.user.role === 'admin';
  if (!isParty) return res.status(403).json({ error: 'Not your booking' });
  res.json({ booking });
});

// Move a booking through the lifecycle. Providers accept/decline/start/
// complete their own jobs; customers cancel while requested or accepted.
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body || {};
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isProvider = String(booking.provider) === String(req.user._id);
  const isCustomer = String(booking.customer) === String(req.user._id);
  const allowed = TRANSITIONS[booking.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Cannot move a ${booking.status} booking to ${status || 'nothing'}`,
    });
  }
  if (status === 'cancelled_by_customer' && !isCustomer) {
    return res.status(403).json({ error: 'Only the customer can cancel this booking' });
  }
  if (status === 'cancelled_by_provider' && !isProvider) {
    return res.status(403).json({ error: 'Only the provider can cancel this booking' });
  }
  if (['accepted', 'declined', 'in_progress', 'completed'].includes(status) && !isProvider) {
    return res
      .status(403)
      .json({ error: 'Only the assigned provider can make this change' });
  }
  booking.status = status;
  booking.timeline.push({ status, at: new Date() });
  await booking.save();
  const full = await populateBooking(Booking.findById(booking._id)).lean();
  emitToUser(booking.customer, 'booking:updated', { booking: full });
  emitToUser(booking.provider, 'booking:updated', { booking: full });
  res.json({ booking: full, action: PROVIDER_ACTIONS[status] || status });
});

module.exports = router;
