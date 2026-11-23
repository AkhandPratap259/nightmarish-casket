const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    position: { type: String, trim: true, maxlength: 30, default: '' },
    number: { type: Number, min: 1, max: 99, default: null },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
    name: { type: String, required: true, trim: true, maxlength: 70 },
    shortName: { type: String, required: true, trim: true, uppercase: true, maxlength: 4, minlength: 2 },
    colour: { type: String, enum: ['pink', 'mint', 'sky', 'butter', 'lilac', 'peach'], default: 'sky' },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    players: { type: [playerSchema], default: [] },
  },
  { timestamps: true }
);

teamSchema.index({ league: 1, name: 1 }, { unique: true });
teamSchema.index({ league: 1, shortName: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
