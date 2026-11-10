// Shared Socket.io + notification helper. server.js registers the io
// instance; routes call notify() to persist a notification and push it
// live, and emitSeats() to broadcast fresh seat availability.
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const { totalSeats } = require('./seats');

let io = null;

function setIo(instance) {
  io = instance;
}

// Broadcast to every connected client (live booking ticker, stats).
function broadcast(name, payload) {
  if (io) io.emit(name, payload);
}

async function notify(userId, message, kind = 'info', bookingId = null) {
  const note = await Notification.create({
    user: userId,
    message,
    kind,
    booking: bookingId || undefined,
  });
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      id: note._id,
      message: note.message,
      kind: note.kind,
      createdAt: note.createdAt,
    });
  }
  return note;
}

// Active bookings (held, not expired, or confirmed) for one event.
async function activeBookings(eventId) {
  const now = new Date();
  const bookings = await Booking.find({
    event: eventId,
    status: { $in: ['held', 'confirmed'] },
  }).lean();
  return bookings.filter((b) => b.status === 'confirmed' || !b.holdExpiresAt || new Date(b.holdExpiresAt) > now);
}

// Broadcast fresh seat counts for an event to everyone watching it.
async function emitSeats(eventId) {
  if (!io) return;
  try {
    const event = await Event.findById(eventId).lean();
    if (!event) return;
    const active = await activeBookings(eventId);
    const taken = new Set();
    let sold = 0;
    for (const b of active) {
      for (const s of b.seats) taken.add(s);
      if (b.status === 'confirmed') sold += b.seats.length;
    }
    const total = totalSeats(event);
    io.to(`event:${eventId}`).emit('seats-updated', {
      eventId: String(eventId),
      total,
      taken: taken.size,
      available: total - taken.size,
      sold,
    });
    io.emit('stats', { eventId: String(eventId), title: event.title, sold, total });
  } catch {
    /* a failed broadcast must never break the request that triggered it */
  }
}

// Release holds that expired more than 5 minutes after creation. Runs on a
// 60-second interval from server.js and before every new hold attempt.
async function releaseExpiredHolds(eventId = null) {
  const now = new Date();
  const query = { status: 'held', holdExpiresAt: { $lte: now } };
  if (eventId) query.event = eventId;
  const expired = await Booking.find(query).lean();
  if (!expired.length) return 0;
  await Booking.updateMany(query, { $set: { status: 'cancelled' } });
  const eventIds = [...new Set(expired.map((b) => String(b.event)))];
  for (const id of eventIds) await emitSeats(id);
  return expired.length;
}

module.exports = { setIo, broadcast, notify, activeBookings, emitSeats, releaseExpiredHolds };
