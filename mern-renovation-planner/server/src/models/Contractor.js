const mongoose = require('mongoose');

const contractorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  trade: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  isSample: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Contractor', contractorSchema);
