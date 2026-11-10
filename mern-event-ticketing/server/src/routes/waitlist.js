const express = require('express');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');
const { auth, requireRole } = require('../middleware/auth');
const { totalSeats } = require('../utils/seats');

const router = express.Router();

function publicEntry(w) {
  return {
    id: w._id,
    user: w.user,
    event: w.event,
    status: w.status,
    createdAt: w.createdAt,
  };
}

// Join an event's waitlist. Only when the event is sold out — if seats
// are still available, book one instead.
router.post('/', auth, requireRole('attendee'), async (req, res) => {
  const { eventId } = req.body || {};
  if (!eventId) return res.status(400).json({ error: 'An event is required' });
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status !== 'published') return res.status(400).json({ error: 'This event is not open' });
  const existing = await Waitlist.findOne({ user: req.user._id, event: eventId, status: 'waiting' });
  if (existing) return res.status(409).json({ error: 'You are already on the waitlist for this event' });

  const now = new Date();
  const active = await Booking.find({ event: eventId, status: { $in: ['held', 'confirmed'] } }).lean();
  let taken = 0;
  for (const b of active) {
    if (b.status === 'held' && b.holdExpiresAt && new Date(b.holdExpiresAt) <= now) continue;
    taken += b.seats.length;
  }
  if (taken < totalSeats(event)) {
    return res.status(400).json({ error: 'Seats are still available for this event — book one instead of joining the waitlist' });
  }
  const entry = await Waitlist.create({ user: req.user._id, event: eventId });
  return res.status(201).json({ waitlist: publicEntry(entry) });
});

router.get('/mine', auth, requireRole('attendee'), async (req, res) => {
  const entries = await Waitlist.find({ user: req.user._id })
    .populate('event', 'title city venue date')
    .sort({ createdAt: -1 });
  return res.json({ waitlist: entries.map(publicEntry) });
});

// Organizer sees who is waiting for their own events.
router.get('/for-organizer', auth, requireRole('organizer'), async (req, res) => {
  const myEvents = await Event.find({ organizer: req.user._id }).select('_id');
  const ids = myEvents.map((e) => e._id);
  const entries = await Waitlist.find({ event: { $in: ids }, status: 'waiting' })
    .populate('user', 'name email')
    .populate('event', 'title date')
    .sort({ createdAt: 1 });
  return res.json({ waitlist: entries.map(publicEntry) });
});

router.patch('/:id/leave', auth, requireRole('attendee'), async (req, res) => {
  const entry = await Waitlist.findById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Waitlist entry not found' });
  if (String(entry.user) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not your waitlist entry' });
  }
  if (entry.status !== 'waiting') return res.status(400).json({ error: `This entry is already ${entry.status}` });
  entry.status = 'left';
  await entry.save();
  return res.json({ waitlist: publicEntry(entry) });
});

module.exports = router;
