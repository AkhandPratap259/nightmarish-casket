const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', required: true },
  amount: { type: Number, required: true, min: 0 },
  note: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Quote', quoteSchema);
