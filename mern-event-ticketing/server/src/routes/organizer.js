const express = require('express');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');
const { auth, requireRole } = require('../middleware/auth');
const { totalSeats } = require('../utils/seats');

const router = express.Router();

// Organizer's own events with live occupancy.
router.get('/events', auth, requireRole('organizer'), async (req, res) => {
  const events = await Event.find({ organizer: req.user._id }).sort({ date: 1 });
  const out = [];
  for (const e of events) {
    const confirmed = await Booking.find({ event: e._id, status: 'confirmed' }).lean();
    const held = await Booking.find({ event: e._id, status: 'held' }).lean();
    const now = new Date();
    const sold = confirmed.reduce((n, b) => n + b.seats.length, 0);
    const heldCount = held
      .filter((b) => !b.holdExpiresAt || new Date(b.holdExpiresAt) > now)
      .reduce((n, b) => n + b.seats.length, 0);
    const total = totalSeats(e);
    out.push({
      id: e._id,
      title: e.title,
      category: e.category,
      city: e.city,
      venue: e.venue,
      description: e.description,
      date: e.date,
      durationMinutes: e.durationMinutes,
      zones: e.zones,
      status: e.status,
      totalSeats: total,
      sold,
      held: heldCount,
      available: total - sold - heldCount,
      revenue: confirmed.reduce((n, b) => n + (b.totalAmount || 0), 0),
    });
  }
  return res.json({ events: out });
});

// Per-event sales analytics for the organizer's own events.
router.get('/analytics', auth, requireRole('organizer'), async (req, res) => {
  const events = await Event.find({ organizer: req.user._id });
  const perEvent = [];
  let revenue = 0;
  let ticketsSold = 0;
  for (const e of events) {
    const confirmed = await Booking.find({ event: e._id, status: 'confirmed' }).lean();
    const sold = confirmed.reduce((n, b) => n + b.seats.length, 0);
    const eventRevenue = confirmed.reduce((n, b) => n + (b.totalAmount || 0), 0);
    const total = totalSeats(e);
    revenue += eventRevenue;
    ticketsSold += sold;
    perEvent.push({
      event: e.title,
      eventId: e._id,
      date: e.date,
      city: e.city,
      total,
      sold,
      revenue: eventRevenue,
      occupancy: total ? Math.round((sold / total) * 100) : 0,
      bookings: confirmed.length,
    });
  }
  perEvent.sort((a, b) => b.revenue - a.revenue);
  const waiting = await Waitlist.countDocuments({
    event: { $in: events.map((e) => e._id) },
    status: 'waiting',
  });
  return res.json({
    totals: { events: events.length, ticketsSold, revenue, waiting },
    perEvent,
  });
});

// Every booking across the organizer's own events, newest first.
router.get('/bookings', auth, requireRole('organizer'), async (req, res) => {
  const events = await Event.find({ organizer: req.user._id }).select('_id title');
  const ids = events.map((e) => e._id);
  const titleById = new Map(events.map((e) => [String(e._id), e.title]));
  const bookings = await Booking.find({ event: { $in: ids } })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  return res.json({
    bookings: bookings.map((b) => ({
      id: b._id,
      event: { id: b.event, title: titleById.get(String(b.event)) || '' },
      user: b.user,
      seats: b.seats,
      status: b.status,
      totalAmount: b.totalAmount,
      tickets: b.tickets,
      holdExpiresAt: b.holdExpiresAt,
      createdAt: b.createdAt,
    })),
  });
});

module.exports = router;
