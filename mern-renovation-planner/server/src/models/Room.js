const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Dining', 'Balcony', 'Study', 'Utility', 'Other'], default: 'Other' },
  length: { type: Number, required: true, min: 0.5 },
  width: { type: Number, required: true, min: 0.5 },
  height: { type: Number, required: true, min: 2, default: 3 },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  colour: { type: String, default: '#FFD400' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

roomSchema.virtual('floorArea').get(function () { return +(this.length * this.width).toFixed(2); });
roomSchema.virtual('wallArea').get(function () { return +(2 * (this.length + this.width) * this.height).toFixed(2); });
roomSchema.virtual('volume').get(function () { return +(this.length * this.width * this.height).toFixed(2); });

module.exports = mongoose.model('Room', roomSchema);
