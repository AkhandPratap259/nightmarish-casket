const mongoose = require('mongoose');

const EVENT_TYPES = ['goal', 'penalty', 'own-goal', 'yellow', 'red', 'substitution', 'note'];

const eventSchema = new mongoose.Schema(
  {
    minute: { type: Number, required: true, min: 0, max: 150 },
    type: { type: String, enum: EVENT_TYPES, required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    player: { type: String, trim: true, maxlength: 60, default: '' },
    note: { type: String, trim: true, maxlength: 160, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const matchSchema = new mongoose.Schema(
  {
    league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
    homeTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    awayTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    matchweek: { type: Number, required: true, min: 1 },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'live', 'finished', 'postponed'], default: 'scheduled' },
    homeScore: { type: Number, default: 0, min: 0 },
    awayScore: { type: Number, default: 0, min: 0 },
    events: { type: [eventSchema], default: [] },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

matchSchema.index({ league: 1, matchweek: 1 });
matchSchema.index({ league: 1, status: 1 });
matchSchema.index({ homeTeam: 1 });
matchSchema.index({ awayTeam: 1 });

module.exports = mongoose.model('Match', matchSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
