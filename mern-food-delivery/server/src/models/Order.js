const mongoose = require('mongoose');

const STATUSES = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    items: [
      {
        name: String,
        price: Number,
        qty: { type: Number, min: 1 },
      },
    ],
    subtotal: Number,
    discount: Number,
    deliveryFee: Number,
    gst: Number,
    total: Number,
    promoCode: { type: String, default: '' },
    paymentMethod: { type: String, enum: ['mock_upi', 'mock_card', 'cod'], default: 'cod' },
    deliveryAddress: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'placed' },
    statusHistory: [{ status: String, at: Date }],
    etaMinutes: { type: Number, default: 35 },
    courierName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = { Order: mongoose.model('Order', orderSchema), STATUSES };
