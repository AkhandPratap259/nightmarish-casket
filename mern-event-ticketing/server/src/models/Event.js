const mongoose = require('mongoose');

const rowSchema = new mongoose.Schema(
  { label: { type: String, required: true }, count: { type: Number, required: true, min: 1, max: 30 } },
  { _id: false }
);

const zoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    rows: { type: [rowSchema], default: [] },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Music', 'Tech', 'Comedy', 'Theatre', 'Sports', 'Food & Culture'],
      required: true,
    },
    city: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // Start date/time of the event.
    date: { type: Date, required: true },
    durationMinutes: { type: Number, default: 120, min: 15 },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    zones: { type: [zoneSchema], default: [] },
    status: { type: String, enum: ['published', 'cancelled'], default: 'published' },
    // True for the seeded demo events; user-created events are not demo data.
    demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
