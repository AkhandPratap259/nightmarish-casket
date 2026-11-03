const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    player: { type: String, required: true, trim: true, maxlength: 30 },
    score: { type: Number, required: true, min: 0 },
    wave: { type: Number, required: true, min: 1 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Score', scoreSchema);
