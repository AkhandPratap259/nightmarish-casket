const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
    },
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
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '', maxlength: 600 },
  },
  { timestamps: true }
);

reviewSchema.index({ provider: 1, createdAt: -1 });
reviewSchema.index({ offering: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
