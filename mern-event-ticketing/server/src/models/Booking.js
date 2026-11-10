const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true },
    code: { type: String, required: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Seat ids like "A1", "C7" — one entry per seat in the booking.
    seats: { type: [String], required: true },
    status: { type: String, enum: ['held', 'confirmed', 'cancelled'], default: 'held' },
    // Holds expire 5 minutes after creation; the sweeper releases them.
    holdExpiresAt: { type: Date, default: null },
    // Total in rupees, always computed server-side from zone prices.
    totalAmount: { type: Number, default: 0 },
    // Mock checkout only — no real payment is ever taken.
    paymentMethod: { type: String, default: '' },
    tickets: { type: [ticketSchema], default: [] },
    fromWaitlist: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Conflict-proof booking: a seat can appear in only one active (held or
// confirmed) booking per event. MongoDB expands the seats array, so the
// unique index covers every seat individually. Cancelled bookings free
// their seats again because the partial filter excludes them.
bookingSchema.index(
  { event: 1, seats: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['held', 'confirmed'] } },
  }
);

// Ticket codes are unique across all bookings so check-in by code is exact.
bookingSchema.index({ 'tickets.code': 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Booking', bookingSchema);
