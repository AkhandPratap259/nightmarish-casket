const express = require('express');
const Match = require('../models/Match');
const League = require('../models/League');
const Team = require('../models/Team');
const { EVENT_TYPES } = require('../models/Match');
const { auth, optionalAuth } = require('../middleware/auth');
const { emitToLeague, emitToMatch } = require('../utils/notify');

const router = express.Router();

function matchPublic(m) {
  return {
    id: m._id,
    league: m.league && m.league._id ? { id: m.league._id, name: m.league.name, sport: m.league.sport } : m.league,
    homeTeam: m.homeTeam && m.homeTeam.name ? { id: m.homeTeam._id, name: m.homeTeam.name, shortName: m.homeTeam.shortName, colour: m.homeTeam.colour } : m.homeTeam,
    awayTeam: m.awayTeam && m.awayTeam.name ? { id: m.awayTeam._id, name: m.awayTeam.name, shortName: m.awayTeam.shortName, colour: m.awayTeam.colour } : m.awayTeam,
    matchweek: m.matchweek,
    scheduledAt: m.scheduledAt,
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    events: (m.events || []).map((e) => ({
      id: e._id, minute: e.minute, type: e.type,
      team: e.team && e.team.shortName ? { id: e.team._id, name: e.team.name, shortName: e.team.shortName } : e.team,
      player: e.player, note: e.note, createdAt: e.createdAt,
    })).sort((a, b) => b.minute - a.minute || new Date(b.createdAt) - new Date(a.createdAt)),
    startedAt: m.startedAt,
    finishedAt: m.finishedAt,
  };
}

async function loadMatch(req, res, next) {
  const match = await Match.findById(req.params.id)
    .populate('league homeTeam awayTeam')
    .populate('events.team', 'name shortName');
  if (!match) return res.status(404).json({ error: 'Match not found' });
  req.match = match;
  return next();
}

// A scorer is the league organizer, an admin, or the captain of either team.
async function canScore(req) {
  if (!req.user) return false;
  if (req.user.role === 'admin') return true;
  if (String(req.match.league.organizer) === String(req.user._id)) return true;
  const home = req.match.homeTeam;
  const away = req.match.awayTeam;
  return (home.captain && String(home.captain) === String(req.user._id))
    || (away.captain && String(away.captain) === String(req.user._id));
}

function recomputeScore(match) {
  let home = 0;
  let away = 0;
  for (const e of match.events) {
    if (!['goal', 'penalty', 'own-goal'].includes(e.type)) continue;
    const teamId = String(e.team._id || e.team);
    const homeId = String(match.homeTeam._id || match.homeTeam);
    const countsForHome = e.type === 'own-goal' ? teamId !== homeId : teamId === homeId;
    if (countsForHome) home += 1;
    else away += 1;
  }
  match.homeScore = home;
  match.awayScore = away;
}

router.get('/leagues/:leagueId/matches', optionalAuth, async (req, res) => {
  const league = await League.findById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  const filter = { league: league._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.matchweek) filter.matchweek = Number(req.query.matchweek);
  if (req.query.team) filter.$or = [{ homeTeam: req.query.team }, { awayTeam: req.query.team }];
  const matches = await Match.find(filter)
    .populate('homeTeam awayTeam', 'name shortName colour')
    .populate('events.team', 'name shortName')
    .sort({ matchweek: 1, scheduledAt: 1 });
  return res.json({ matches: matches.map(matchPublic) });
});

// Live matches across all leagues, for the home page score strip.
router.get('/live', async (req, res) => {
  const matches = await Match.find({ status: 'live' })
    .populate('league', 'name sport')
    .populate('homeTeam awayTeam', 'name shortName colour')
    .populate('events.team', 'name shortName')
    .sort({ startedAt: -1 });
  return res.json({ matches: matches.map(matchPublic) });
});

router.get('/:id', optionalAuth, loadMatch, async (req, res) => {
  return res.json({ match: matchPublic(req.match), canScore: await canScore(req) });
});

router.post('/:id/start', auth, loadMatch, async (req, res) => {
  if (!(await canScore(req))) return res.status(403).json({ error: 'Only the organizer or a team captain can start this match' });
  if (req.match.status !== 'scheduled') return res.status(409).json({ error: 'Only a scheduled match can be started' });
  req.match.status = 'live';
  req.match.startedAt = new Date();
  await req.match.save();
  const payload = matchPublic(await Match.findById(req.match._id).populate('league homeTeam awayTeam').populate('events.team', 'name shortName'));
  emitToLeague(req.match.league._id, 'match:update', payload);
  emitToMatch(req.match._id, 'match:update', payload);
  return res.json({ match: payload });
});

router.post('/:id/finish', auth, loadMatch, async (req, res) => {
  if (!(await canScore(req))) return res.status(403).json({ error: 'Only the organizer or a team captain can finish this match' });
  if (req.match.status !== 'live') return res.status(409).json({ error: 'Only a live match can be finished' });
  req.match.status = 'finished';
  req.match.finishedAt = new Date();
  await req.match.save();
  const payload = matchPublic(await Match.findById(req.match._id).populate('league homeTeam awayTeam').populate('events.team', 'name shortName'));
  emitToLeague(req.match.league._id, 'match:update', payload);
  emitToMatch(req.match._id, 'match:update', payload);
  return res.json({ match: payload });
});

router.post('/:id/events', auth, loadMatch, async (req, res) => {
  if (!(await canScore(req))) return res.status(403).json({ error: 'Only the organizer or a team captain can log events' });
  if (req.match.status !== 'live') return res.status(409).json({ error: 'Events can only be logged while a match is live' });
  const { minute, type, team, player, note } = req.body || {};
  if (minute === undefined || minute < 0 || minute > 150) return res.status(400).json({ error: 'Minute must be between 0 and 150' });
  if (!EVENT_TYPES.includes(type)) return res.status(400).json({ error: `Event type must be one of: ${EVENT_TYPES.join(', ')}` });
  const homeId = String(req.match.homeTeam._id);
  const awayId = String(req.match.awayTeam._id);
  if (team !== homeId && team !== awayId) return res.status(400).json({ error: 'Event team must be one of the two teams in this match' });
  req.match.events.push({ minute: Number(minute), type, team, player: (player || '').trim(), note: (note || '').trim(), createdBy: req.user._id });
  recomputeScore(req.match);
  await req.match.save();
  const payload = matchPublic(await Match.findById(req.match._id).populate('league homeTeam awayTeam').populate('events.team', 'name shortName'));
  emitToLeague(req.match.league._id, 'match:update', payload);
  emitToMatch(req.match._id, 'match:update', payload);
  return res.status(201).json({ match: payload });
});

router.delete('/:id/events/:eventId', auth, loadMatch, async (req, res) => {
  if (!(await canScore(req))) return res.status(403).json({ error: 'Only the organizer or a team captain can remove events' });
  const event = req.match.events.id(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  event.deleteOne();
  recomputeScore(req.match);
  await req.match.save();
  const payload = matchPublic(await Match.findById(req.match._id).populate('league homeTeam awayTeam').populate('events.team', 'name shortName'));
  emitToLeague(req.match.league._id, 'match:update', payload);
  emitToMatch(req.match._id, 'match:update', payload);
  return res.json({ match: payload });
});

module.exports = router;
