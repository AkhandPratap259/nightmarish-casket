const mongoose = require('mongoose');

const gardenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, maxlength: 600, default: '' },
    coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Orbit layout: beds sit on numbered rings around a central hub.
    rings: { type: Number, default: 2, min: 1, max: 4 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Garden', gardenSchema);
