const mongoose = require('mongoose');

// A plant in the shared library. companions / antagonists hold the names of
// other plants (case-insensitive match) so the harmony engine can score a bed.
const plantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    family: { type: String, required: true, trim: true, maxlength: 60 },
    category: {
      type: String,
      enum: ['vegetable', 'herb', 'flower', 'fruit', 'legume'],
      required: true,
    },
    daysToMaturity: { type: Number, required: true, min: 7, max: 365 },
    // Water need: 1 = drought-tolerant, 2 = moderate, 3 = thirsty.
    waterNeed: { type: Number, enum: [1, 2, 3], required: true },
    sun: { type: String, enum: ['full', 'partial', 'shade'], default: 'full' },
    spacingCm: { type: Number, required: true, min: 5, max: 200 },
    season: { type: String, enum: ['cool', 'warm', 'all'], default: 'all' },
    companions: { type: [String], default: [] },
    antagonists: { type: [String], default: [] },
    // Bauhaus geometry for the seed card: shape + primary colour.
    shape: { type: String, enum: ['circle', 'triangle', 'square', 'semicircle'], default: 'circle' },
    colour: { type: String, enum: ['red', 'blue', 'yellow', 'green'], default: 'green' },
    notes: { type: String, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plant', plantSchema);
