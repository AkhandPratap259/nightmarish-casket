const express = require('express');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');
const { allSeats, totalSeats, validateZones } = require('../utils/seats');
const { activeBookings } = require('../utils/notify');

const router = express.Router();

const CATEGORIES = ['Music', 'Tech', 'Comedy', 'Theatre', 'Sports', 'Food & Culture'];

function publicEvent(e, occupancy) {
  return {
    id: e._id,
    title: e.title,
    category: e.category,
    city: e.city,
    venue: e.venue,
    description: e.description,
    date: e.date,
    durationMinutes: e.durationMinutes,
    organizer: e.organizer ? { id: e.organizer._id, name: e.organizer.name } : null,
    zones: e.zones.map((z) => ({ name: z.name, price: z.price, rows: z.rows })),
    status: e.status,
    demo: e.demo,
    totalSeats: occupancy ? occupancy.total : totalSeats(e),
    sold: occupancy ? occupancy.sold : 0,
    held: occupancy ? occupancy.held : 0,
    available: occupancy ? occupancy.available : totalSeats(e),
    createdAt: e.createdAt,
  };
}

// Occupancy for a list of events, computed from real bookings.
async function occupancyFor(events) {
  const ids = events.map((e) => e._id);
  const bookings = await Booking.find({
    event: { $in: ids },
    status: { $in: ['held', 'confirmed'] },
  }).lean();
  const now = new Date();
  const map = new Map();
  for (const e of events) {
    map.set(String(e._id), { total: totalSeats(e), sold: 0, held: 0, available: totalSeats(e) });
  }
  for (const b of bookings) {
    if (b.status === 'held' && b.holdExpiresAt && new Date(b.holdExpiresAt) <= now) continue;
    const occ = map.get(String(b.event));
    if (!occ) continue;
    if (b.status === 'confirmed') occ.sold += b.seats.length;
    else occ.held += b.seats.length;
    occ.available = occ.total - occ.sold - occ.held;
  }
  return map;
}

// Browse events: ?category&city&date=YYYY-MM-DD&search
router.get('/', async (req, res) => {
  const { category, city, date, search } = req.query;
  const query = { status: 'published' };
  if (category && CATEGORIES.includes(category)) query.category = category;
  if (city) query.city = new RegExp(city.trim(), 'i');
  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    if (!Number.isNaN(start.getTime())) query.date = { $gte: start, $lte: end };
  }
  if (search) {
    const rx = new RegExp(search.trim(), 'i');
    query.$or = [{ title: rx }, { venue: rx }, { city: rx }];
  }
  const events = await Event.find(query).populate('organizer', 'name').sort({ date: 1 });
  const occ = await occupancyFor(events);
  return res.json({ events: events.map((e) => publicEvent(e, occ.get(String(e._id)))) });
});

router.get('/:id', async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name');
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const occ = await occupancyFor([event]);
  return res.json({ event: publicEvent(event, occ.get(String(event._id))) });
});

// Live seat states for the seat map. Marks the caller's own holds when
// signed in; everyone else's holds just show as held.
router.get('/:id/seats', optionalAuth, async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const active = await activeBookings(event._id);
  const stateBySeat = new Map();
  for (const b of active) {
    for (const s of b.seats) {
      stateBySeat.set(s, {
        state: b.status === 'confirmed' ? 'booked' : 'held',
        mine: req.user ? String(b.user) === String(req.user._id) : false,
      });
    }
  }
  const seats = allSeats(event).map((s) => {
    const taken = stateBySeat.get(s.id);
    return {
      ...s,
      state: taken ? taken.state : 'available',
      mine: taken ? taken.mine : false,
    };
  });
  const total = seats.length;
  const sold = seats.filter((s) => s.state === 'booked').length;
  const held = seats.filter((s) => s.state === 'held').length;
  return res.json({
    eventId: event._id,
    total,
    sold,
    held,
    available: total - sold - held,
    seats,
  });
});

// Organizer creates an event. Zones carry the tiered pricing and layout;
// prices are validated server-side and never trusted from the client at
// booking time (totals are recomputed from the stored zones).
router.post('/', auth, requireRole('organizer'), async (req, res) => {
  const { title, category, city, venue, description, date, durationMinutes, zones } = req.body || {};
  if (!title || !category || !city || !venue || !date) {
    return res.status(400).json({ error: 'Title, category, city, venue and date are required' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });
  }
  const when = new Date(date);
  if (Number.isNaN(when.getTime())) return res.status(400).json({ error: 'Date is not valid' });
  if (when <= new Date()) return res.status(400).json({ error: 'Event date must be in the future' });
  const zoneError = validateZones(zones);
  if (zoneError) return res.status(400).json({ error: zoneError });
  const event = await Event.create({
    title: title.trim(),
    category,
    city: city.trim(),
    venue: venue.trim(),
    description: (description || '').trim(),
    date: when,
    durationMinutes: Number(durationMinutes) > 0 ? Number(durationMinutes) : 120,
    organizer: req.user._id,
    zones,
  });
  const occ = await occupancyFor([event]);
  return res.status(201).json({ event: publicEvent(event, occ.get(String(event._id))) });
});

// Organizer edits their own event. Zones (pricing/layout) are fixed once
// created so existing bookings can never be repriced; other fields can be
// edited only while no confirmed bookings exist.
router.patch('/:id', auth, requireRole('organizer'), async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (String(event.organizer) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Only the event organizer can edit it' });
  }
  const confirmed = await Booking.countDocuments({ event: event._id, status: 'confirmed' });
  if (confirmed > 0) {
    return res.status(400).json({ error: 'This event already has confirmed bookings, so it can no longer be edited' });
  }
  const { title, category, city, venue, description, date, durationMinutes, status } = req.body || {};
  if (title !== undefined) event.title = title.trim();
  if (category !== undefined) {
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Unknown category' });
    event.category = category;
  }
  if (city !== undefined) event.city = city.trim();
  if (venue !== undefined) event.venue = venue.trim();
  if (description !== undefined) event.description = description.trim();
  if (date !== undefined) {
    const when = new Date(date);
    if (Number.isNaN(when.getTime()) || when <= new Date()) {
      return res.status(400).json({ error: 'Event date must be a valid future date' });
    }
    event.date = when;
  }
  if (durationMinutes !== undefined && Number(durationMinutes) > 0) event.durationMinutes = Number(durationMinutes);
  if (status !== undefined) {
    if (!['published', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Unknown status' });
    event.status = status;
  }
  await event.save();
  const occ = await occupancyFor([event]);
  return res.json({ event: publicEvent(event, occ.get(String(event._id))) });
});

// Organizer (owner) or admin sees every booking for one event.
router.get('/:id/bookings', auth, async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const isOwner = String(event.organizer) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the event organizer can see its bookings' });
  }
  const bookings = await Booking.find({ event: event._id })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  return res.json({
    bookings: bookings.map((b) => ({
      id: b._id,
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
