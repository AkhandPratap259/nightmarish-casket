const mongoose = require('mongoose');

const STATUSES = [
  'requested',
  'accepted',
  'in_progress',
  'completed',
  'declined',
  'cancelled_by_customer',
  'cancelled_by_provider',
];

// Statuses that hold a provider's slot. A new booking for the same
// provider + date + slot is rejected while any of these exist.
const ACTIVE_STATUSES = ['requested', 'accepted', 'in_progress'];

// Fixed hourly start times, 08:00 through 19:00 (last job ends 20:00).
const SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

const priceBreakdownSchema = new mongoose.Schema(
  {
    base: { type: Number, required: true, min: 0 },
    peakSurcharge: { type: Number, required: true, min: 0, default: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    gst: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    offering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offering',
      required: true,
    },
    // Snapshot of the service at booking time, so later price edits never
    // rewrite history.
    serviceName: { type: String, required: true, trim: true },
    serviceCategory: { type: String, required: true, trim: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    slot: { type: String, required: true, enum: SLOTS },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    area: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: '', maxlength: 500 },
    status: { type: String, enum: STATUSES, default: 'requested' },
    priceBreakdown: { type: priceBreakdownSchema, required: true },
    timeline: [
      {
        status: { type: String, enum: STATUSES, required: true },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

// Belt and braces for the conflict check: the database itself refuses a
// second active booking for the same provider, date and slot.
bookingSchema.index(
  { provider: 1, date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_STATUSES } } }
);
bookingSchema.index({ customer: 1, status: 1, date: 1 });
bookingSchema.index({ provider: 1, status: 1, date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.STATUSES = STATUSES;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
module.exports.SLOTS = SLOTS;
