const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['Paint', 'Tiles', 'Flooring', 'Wood & Ply', 'Cement & Putty', 'Electrical', 'Plumbing', 'Hardware', 'Other'], default: 'Other' },
  unit: { type: String, required: true, trim: true },
  unitPrice: { type: Number, required: true, min: 0 },
  coverage: { type: Number, default: null },
  coverageBasis: { type: String, enum: ['wall', 'floor', 'none'], default: 'none' },
  wastePct: { type: Number, default: 10, min: 0 },
  isSample: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);
