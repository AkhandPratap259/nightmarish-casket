const mongoose = require('mongoose');

const ACTIVITY_CATEGORIES = ['sightseeing', 'food', 'transport', 'stay', 'other'];

const activitySchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    dayIndex: { type: Number, required: true, min: 0 },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: ACTIVITY_CATEGORIES, default: 'sightseeing' },
    // 24-hour "HH:MM" times; the pair is checked for overlaps server-side.
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    cost: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
    // Manual ordering within a day; drag-and-drop reorders persist here.
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Two activities overlap when their [start, end) intervals intersect.
// Touching endpoints (one ends exactly when the next starts) are fine.
activitySchema.statics.overlaps = async function (tripId, dayIndex, startTime, endTime, excludeId) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (end <= start) return { invalid: true, reason: 'End time must be after start time' };
  const query = { trip: tripId, dayIndex };
  if (excludeId) query._id = { $ne: excludeId };
  const others = await this.find(query);
  const clash = others.find((a) => start < toMinutes(a.endTime) && toMinutes(a.startTime) < end);
  if (clash) {
    return {
      invalid: true,
      reason: `Overlaps with "${clash.title}" (${clash.startTime}–${clash.endTime})`,
    };
  }
  return { invalid: false };
};

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIVITY_CATEGORIES = ACTIVITY_CATEGORIES;
