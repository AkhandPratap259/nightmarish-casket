const mongoose = require('mongoose');

const takeoffSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  coats: { type: Number, default: 1, min: 1 },
  basis: { type: String, enum: ['wall', 'floor'], required: true },
  areaUsed: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalCost: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Takeoff', takeoffSchema);
