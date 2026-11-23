const mongoose = require('mongoose');

const SPORTS = ['Football', 'Futsal', 'Hockey'];
const CLAY_COLOURS = ['pink', 'mint', 'sky', 'butter', 'lilac', 'peach'];

const leagueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 90 },
    sport: { type: String, enum: SPORTS, required: true },
    season: { type: String, required: true, trim: true, maxlength: 40 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    colour: { type: String, enum: CLAY_COLOURS, default: 'pink' },
    pointsWin: { type: Number, default: 3, min: 1, max: 5 },
    pointsDraw: { type: Number, default: 1, min: 0, max: 2 },
    status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fixturesGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

leagueSchema.index({ sport: 1, status: 1 });
leagueSchema.index({ organizer: 1 });

module.exports = mongoose.model('League', leagueSchema);
module.exports.SPORTS = SPORTS;
module.exports.CLAY_COLOURS = CLAY_COLOURS;
