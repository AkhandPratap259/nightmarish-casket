const express = require('express');
const crypto = require('crypto');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');
const { auth, requireRole } = require('../middleware/auth');
const { seatMap, totalSeats } = require('../utils/seats');
const { notify, emitSeats, broadcast, releaseExpiredHolds } = require('../utils/notify');

const router = express.Router();

const HOLD_MINUTES = 5;
const MAX_SEATS_PER_BOOKING = 6;

function publicBooking(b) {
  return {
    id: b._id,
    event: b.event,
    seats: b.seats,
    status: b.status,
    holdExpiresAt: b.holdExpiresAt,
    totalAmount: b.totalAmount,
    paymentMethod: b.paymentMethod,
    tickets: b.tickets,
    fromWaitlist: b.fromWaitlist,
    createdAt: b.createdAt,
  };
}

async function uniqueTicketCode() {
  for (let i = 0; i < 5; i += 1) {
    const code = `GT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const exists = await Booking.exists({ 'tickets.code': code });
    if (!exists) return code;
  }
  return `GT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Hold seats for 5 minutes. The unique partial index on (event, seats)
// is the final guard: even if two holds race past the check, only one
// can be written.
router.post('/hold', auth, requireRole('attendee'), async (req, res) => {
  const { eventId, seatIds } = req.body || {};
  if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'Pick at least one seat' });
  }
  if (seatIds.length > MAX_SEATS_PER_BOOKING) {
    return res.status(400).json({ error: `At most ${MAX_SEATS_PER_BOOKING} seats per booking` });
  }
  const uniqueSeats = [...new Set(seatIds)];
  if (uniqueSeats.length !== seatIds.length) {
    return res.status(400).json({ error: 'Seat list contains duplicates' });
  }
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status !== 'published') return res.status(400).json({ error: 'This event is not open for booking' });
  if (new Date(event.date) <= new Date()) return res.status(400).json({ error: 'This event has already started' });

  const map = seatMap(event);
  const unknown = uniqueSeats.filter((s) => !map.has(s));
  if (unknown.length) return res.status(400).json({ error: `Unknown seats: ${unknown.join(', ')}` });

  // Drop any expired holds first so their seats are free again.
  await releaseExpiredHolds(eventId);

  const existing = await Booking.findOne({
    event: eventId,
    user: req.user._id,
    status: 'held',
  });
  if (existing) {
    return res.status(409).json({
      error: 'You already have an active hold for this event — confirm it or cancel it first',
      bookingId: existing._id,
    });
  }

  const clash = await Booking.findOne({
    event: eventId,
    status: { $in: ['held', 'confirmed'] },
    seats: { $in: uniqueSeats },
  }).lean();
  if (clash) {
    const taken = clash.seats.filter((s) => uniqueSeats.includes(s));
    return res.status(409).json({ error: `Seat${taken.length > 1 ? 's' : ''} ${taken.join(', ')} ${taken.length > 1 ? 'were' : 'was'} just taken — pick different seats` });
  }

  // Total is computed server-side from the stored zone prices.
  const totalAmount = uniqueSeats.reduce((sum, s) => sum + map.get(s).price, 0);
  let booking;
  try {
    booking = await Booking.create({
      event: eventId,
      user: req.user._id,
      seats: uniqueSeats,
      status: 'held',
      holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
      totalAmount,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'One of those seats was just taken — pick different seats' });
    }
    throw err;
  }
  await emitSeats(eventId);
  return res.status(201).json({ booking: publicBooking(booking), holdMinutes: HOLD_MINUTES });
});

// Confirm a hold with the mock checkout. No real payment is ever taken;
// paymentMethod must be 'demo'.
router.post('/:id/confirm', auth, requireRole('attendee'), async (req, res) => {
  const { paymentMethod } = req.body || {};
  if (paymentMethod !== 'demo') {
    return res.status(400).json({ error: 'Checkout is a mock in this demo — use the demo payment option' });
  }
  const booking = await Booking.findById(req.params.id).populate('event', 'title zones');
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (String(booking.user) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not your booking' });
  }
  if (booking.status === 'confirmed') return res.json({ booking: publicBooking(booking) });
  if (booking.status !== 'held') {
    return res.status(400).json({ error: `This booking is ${booking.status} and cannot be confirmed` });
  }
  if (booking.holdExpiresAt && new Date(booking.holdExpiresAt) <= new Date()) {
    booking.status = 'cancelled';
    await booking.save();
    await emitSeats(booking.event._id);
    return res.status(410).json({ error: 'Your 5-minute hold expired and the seats were released' });
  }
  // Recompute the total from zone prices at confirm time, too.
  const map = seatMap(booking.event);
  booking.totalAmount = booking.seats.reduce((sum, s) => sum + (map.get(s)?.price || 0), 0);
  booking.tickets = [];
  for (const seatId of booking.seats) {
    booking.tickets.push({ seatId, code: await uniqueTicketCode(), checkedIn: false });
  }
  booking.status = 'confirmed';
  booking.paymentMethod = 'demo';
  booking.holdExpiresAt = null;
  try {
    await booking.save();
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A seat in this booking was taken by another booking' });
    }
    throw err;
  }
  await emitSeats(booking.event._id);
  broadcast('booking-live', {
    eventId: String(booking.event._id),
    title: booking.event.title,
    seats: booking.seats.length,
    at: new Date().toISOString(),
  });
  await notify(req.user._id, `Booking confirmed for ${booking.event.title} — ${booking.seats.length} seat(s), ${booking.tickets.map((t) => t.code).join(', ')}.`, 'booking', booking._id);
  return res.json({ booking: publicBooking(booking) });
});

// My bookings, newest first, with event details.
router.get('/mine', auth, async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate('event', 'title category city venue date zones')
    .sort({ createdAt: -1 });
  return res.json({ bookings: bookings.map(publicBooking) });
});

// Cancel a booking: releases the seats, then promotes the first person on
// the event waitlist and notifies them that seats are open.
router.post('/:id/cancel', auth, async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('event', 'title');
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const isOwner = String(booking.user) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your booking' });
  }
  if (booking.status === 'cancelled') return res.json({ booking: publicBooking(booking), promoted: false });
  booking.status = 'cancelled';
  booking.holdExpiresAt = null;
  await booking.save();
  await emitSeats(booking.event._id);

  let promoted = false;
  const next = await Waitlist.findOne({ event: booking.event._id, status: 'waiting' }).sort({ createdAt: 1 });
  if (next) {
    next.status = 'promoted';
    await next.save();
    promoted = true;
    await notify(
      next.user,
      `Good news — seats opened up for ${booking.event.title}. You were first on the waitlist; book now before they go again.`,
      'waitlist',
      booking._id
    );
  }
  return res.json({ booking: publicBooking(booking), promoted });
});

// Check in a ticket by code. Organizers check in their own events; admins
// can check in any event.
router.post('/checkin', auth, requireRole('organizer', 'admin'), async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'A ticket code is required' });
  const booking = await Booking.findOne({ 'tickets.code': code.trim().toUpperCase(), status: 'confirmed' })
    .populate('event', 'title organizer date venue')
    .populate('user', 'name email');
  if (!booking) return res.status(404).json({ error: 'No confirmed ticket with that code' });
  if (req.user.role === 'organizer' && String(booking.event.organizer) !== String(req.user._id)) {
    return res.status(403).json({ error: 'That ticket belongs to another organizer’s event' });
  }
  const ticket = booking.tickets.find((t) => t.code === code.trim().toUpperCase());
  if (ticket.checkedIn) {
    return res.status(409).json({ error: `Ticket ${ticket.code} was already checked in`, booking: publicBooking(booking) });
  }
  ticket.checkedIn = true;
  ticket.checkedInAt = new Date();
  await booking.save();
  return res.json({ booking: publicBooking(booking), message: `Checked in seat ${ticket.seatId} for ${booking.event.title}` });
});

module.exports = router;
