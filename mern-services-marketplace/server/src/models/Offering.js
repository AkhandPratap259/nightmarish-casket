const mongoose = require('mongoose');

// Localities served by providers. Kept as a fixed list so area matching
// (used by the match-score engine) is exact, never free text.
const AREAS = [
  'Azamgarh',
  'Civil Lines',
  'Jiyanpur',
  'Mubarakpur',
  'Phoolpur',
  'Saraimeer',
  'Nizamabad',
  'Atraulia',
  'Bilariaganj',
];

const offeringSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    // The provider's own price for this service (INR).
    price: { type: Number, required: true, min: 0 },
    durationMin: { type: Number, required: true, min: 15, max: 480 },
    areas: [{ type: String, enum: AREAS }],
    bio: { type: String, trim: true, default: '', maxlength: 500 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

offeringSchema.index({ provider: 1, service: 1 });
offeringSchema.index({ service: 1, active: 1 });

module.exports = mongoose.model('Offering', offeringSchema);
module.exports.AREAS = AREAS;
