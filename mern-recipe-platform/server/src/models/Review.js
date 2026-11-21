const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ recipe: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
