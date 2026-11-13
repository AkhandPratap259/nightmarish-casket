const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    filters: {
      city: { type: String, default: '' },
      type: { type: String, default: '' },
      minPrice: { type: Number, default: null },
      maxPrice: { type: Number, default: null },
      minBeds: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
