const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    cuisine: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    emoji: { type: String, default: '🍽️' },
    rating: { type: Number, default: 4.2, min: 0, max: 5 },
    deliveryMinutes: { type: Number, default: 35 },
    priceLevel: { type: String, enum: ['₹', '₹₹', '₹₹₹'], default: '₹₹' },
    isOpen: { type: Boolean, default: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
