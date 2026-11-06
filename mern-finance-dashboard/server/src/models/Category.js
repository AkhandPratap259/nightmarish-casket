const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['income', 'expense'], required: true },
    colour: { type: String, default: '#0f3d2e' },
    icon: { type: String, default: '•' },
  },
  { timestamps: true }
);

categorySchema.index({ user: 1, name: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
