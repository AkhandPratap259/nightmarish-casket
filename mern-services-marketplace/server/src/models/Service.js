const mongoose = require('mongoose');

const CATEGORIES = [
  'Home Cleaning',
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Beauty & Salon',
  'Tutoring',
];

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, enum: CATEGORIES },
    description: { type: String, required: true, trim: true, maxlength: 600 },
    // Indicative starting price in INR for the category; each provider sets
    // their own price on their offering.
    basePrice: { type: Number, required: true, min: 0 },
    durationMin: { type: Number, required: true, min: 15, max: 480 },
    // Short key used by the frontend to pick a text glyph for the service.
    icon: { type: String, default: 'wrench', trim: true },
  },
  { timestamps: true }
);

serviceSchema.index({ category: 1, name: 1 });

module.exports = mongoose.model('Service', serviceSchema);
module.exports.CATEGORIES = CATEGORIES;
