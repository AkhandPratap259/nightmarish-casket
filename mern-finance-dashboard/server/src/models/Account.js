const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['cash', 'bank', 'wallet'], default: 'bank' },
    balance: { type: Number, required: true, default: 0 },
    colour: { type: String, default: '#0f3d2e' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
