const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  propertyType: { type: String, enum: ['1BHK Flat', '2BHK Flat', '3BHK Flat', 'Independent House', 'Villa', 'Shop', 'Office', 'Other'], default: '2BHK Flat' },
  address: { type: String, default: '' },
  totalBudget: { type: Number, required: true, min: 0 },
  startDate: { type: Date },
  targetDate: { type: Date },
  status: { type: String, enum: ['planning', 'in-progress', 'on-hold', 'completed'], default: 'planning' },
  isSample: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
