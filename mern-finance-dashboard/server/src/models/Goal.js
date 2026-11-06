const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 1 },
    savedAmount: { type: Number, default: 0, min: 0 },
    deadline: { type: Date },
    colour: { type: String, default: '#c9a227' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Goal', goalSchema);
