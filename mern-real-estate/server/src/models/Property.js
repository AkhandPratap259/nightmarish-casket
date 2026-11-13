const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['apartment', 'house', 'villa', 'plot', 'commercial'],
    },
    city: { type: String, required: true, trim: true },
    locality: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    beds: { type: Number, required: true, min: 0, default: 0 },
    baths: { type: Number, required: true, min: 0, default: 0 },
    areaSqft: { type: Number, required: true, min: 0 },
    amenities: [{ type: String, trim: true }],
    status: { type: String, enum: ['available', 'under-offer', 'sold'], default: 'available' },
    description: { type: String, default: '', trim: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    demo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

propertySchema.index({ title: 'text', locality: 'text', city: 'text' });

module.exports = mongoose.model('Property', propertySchema);
