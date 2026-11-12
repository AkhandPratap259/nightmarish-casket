const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, required: true, min: 0 },
    travellers: { type: Number, default: 1, min: 1 },
    notes: { type: String, default: '' },
    // Visual cover style for the trip header (a flat colour band, not a photo).
    coverStyle: {
      type: String,
      enum: ['heritage', 'mountain', 'coast', 'city', 'forest'],
      default: 'city',
    },
    status: {
      type: String,
      enum: ['planning', 'upcoming', 'ongoing', 'completed'],
      default: 'planning',
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: { type: [collaboratorSchema], default: [] },
    // True for the seeded demo trips; user-created trips are not demo data.
    demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A trip's day count is derived from its date range (inclusive).
tripSchema.methods.dayCount = function () {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const days = Math.round((end - start) / 86400000) + 1;
  return Math.max(1, days);
};

tripSchema.methods.dayDate = function (dayIndex) {
  const d = new Date(this.startDate);
  d.setDate(d.getDate() + dayIndex);
  return d;
};

module.exports = mongoose.model('Trip', tripSchema);
