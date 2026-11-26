const mongoose = require('mongoose');

const plantingSchema = new mongoose.Schema(
  {
    bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    plant: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true },
    gardener: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sownDate: { type: Date, required: true, default: Date.now },
    quantity: { type: Number, required: true, min: 1, max: 50, default: 1 },
    status: {
      type: String,
      enum: ['sown', 'sprouted', 'growing', 'ready', 'harvested', 'lost'],
      default: 'sown',
    },
    lastWatered: { type: Date, default: null },
    notes: { type: String, maxlength: 400, default: '' },
  },
  { timestamps: true }
);

// One planting row per plant per bed: two rows of the same plant share a bed
// only through quantity, which keeps the harmony engine simple and honest.
plantingSchema.index({ bed: 1, plant: 1, status: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['sown', 'sprouted', 'growing', 'ready'] } } });

module.exports = mongoose.model('Planting', plantingSchema);
