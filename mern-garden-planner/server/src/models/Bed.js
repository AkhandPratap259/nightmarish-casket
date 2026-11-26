const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema(
  {
    garden: { type: mongoose.Schema.Types.ObjectId, ref: 'Garden', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Orbit position: ring 1 is closest to the hub, angle in degrees.
    ring: { type: Number, required: true, min: 1, max: 4 },
    angle: { type: Number, required: true, min: 0, max: 359 },
    // Planting capacity in slots; each planting takes one slot.
    slots: { type: Number, required: true, min: 1, max: 24, default: 6 },
    soil: { type: String, enum: ['loam', 'sandy', 'clay', 'compost-rich'], default: 'loam' },
    sunHours: { type: Number, min: 0, max: 14, default: 6 },
  },
  { timestamps: true }
);

bedSchema.index({ garden: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Bed', bedSchema);
