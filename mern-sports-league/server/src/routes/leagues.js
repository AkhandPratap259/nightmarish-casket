const express = require('express');
const League = require('../models/League');
const Team = require('../models/Team');
const Match = require('../models/Match');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');
const { roundRobin, fixtureDates } = require('../utils/fixtures');
const { computeStandings, topScorers, goalsPerMatchweek } = require('../utils/standings');
const { emitToLeague } = require('../utils/notify');

const router = express.Router();

function leaguePublic(league, counts) {
  return {
    id: league._id,
    name: league.name,
    sport: league.sport,
    season: league.season,
    city: league.city,
    description: league.description,
    colour: league.colour,
    pointsWin: league.pointsWin,
    pointsDraw: league.pointsDraw,
    status: league.status,
    fixturesGenerated: league.fixturesGenerated,
    organizer: league.organizer && league.organizer.name ? { id: league.organizer._id, name: league.organizer.name } : null,
    teamCount: counts ? counts.teams : undefined,
    matchCount: counts ? counts.matches : undefined,
    createdAt: league.createdAt,
  };
}

async function loadLeague(req, res, next) {
  const league = await League.findById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  req.league = league;
  return next();
}

function isOrganizer(req) {
  return req.user && (req.user.role === 'admin' || String(req.league.organizer) === String(req.user._id));
}

// List leagues with search / sport / status filters and sorting.
router.get('/', optionalAuth, async (req, res) => {
  const { q, sport, status, sort = 'newest' } = req.query;
  const filter = {};
  if (sport) filter.sport = sport;
  if (status) filter.status = status;
  if (q) filter.name = { $regex: q.trim(), $options: 'i' };
  const leagues = await League.find(filter).populate('organizer', 'name').sort(sort === 'name' ? { name: 1 } : { createdAt: -1 }).lean();
  const ids = leagues.map((l) => l._id);
  const teamCounts = await Team.aggregate([{ $match: { league: { $in: ids } } }, { $group: { _id: '$league', n: { $sum: 1 } } }]);
  const matchCounts = await Match.aggregate([{ $match: { league: { $in: ids } } }, { $group: { _id: '$league', n: { $sum: 1 } } }]);
  const teamMap = new Map(teamCounts.map((c) => [String(c._id), c.n]));
  const matchMap = new Map(matchCounts.map((c) => [String(c._id), c.n]));
  return res.json({ leagues: leagues.map((l) => leaguePublic(l, { teams: teamMap.get(String(l._id)) || 0, matches: matchMap.get(String(l._id)) || 0 })) });
});

router.post('/', auth, requireRole('organizer', 'admin'), async (req, res) => {
  const { name, sport, season, city, description, colour, pointsWin, pointsDraw } = req.body || {};
  if (!name || !sport || !season || !city) {
    return res.status(400).json({ error: 'League name, sport, season and city are required' });
  }
  if (!['Football', 'Futsal', 'Hockey'].includes(sport)) {
    return res.status(400).json({ error: 'Sport must be Football, Futsal or Hockey' });
  }
  const league = await League.create({
    name: name.trim(), sport, season: season.trim(), city: city.trim(),
    description: (description || '').trim(), colour: colour || 'pink',
    pointsWin: pointsWin || 3, pointsDraw: pointsDraw === undefined ? 1 : pointsDraw,
    organizer: req.user._id,
  });
  return res.status(201).json({ league: leaguePublic(league, { teams: 0, matches: 0 }) });
});

router.get('/:id', optionalAuth, loadLeague, async (req, res) => {
  const teams = await Team.countDocuments({ league: req.league._id });
  const matches = await Match.countDocuments({ league: req.league._id });
  return res.json({ league: leaguePublic(req.league, { teams, matches }), canManage: isOrganizer(req) });
});

router.put('/:id', auth, loadLeague, async (req, res) => {
  if (!isOrganizer(req)) return res.status(403).json({ error: 'Only the league organizer can edit it' });
  const { name, season, city, description, colour, status, pointsWin, pointsDraw } = req.body || {};
  if (name !== undefined) req.league.name = name.trim();
  if (season !== undefined) req.league.season = season.trim();
  if (city !== undefined) req.league.city = city.trim();
  if (description !== undefined) req.league.description = description.trim();
  if (colour !== undefined) req.league.colour = colour;
  if (status !== undefined && ['draft', 'active', 'completed'].includes(status)) req.league.status = status;
  if (pointsWin !== undefined) req.league.pointsWin = pointsWin;
  if (pointsDraw !== undefined) req.league.pointsDraw = pointsDraw;
  await req.league.save();
  return res.json({ league: leaguePublic(req.league) });
});

router.delete('/:id', auth, loadLeague, async (req, res) => {
  if (!isOrganizer(req)) return res.status(403).json({ error: 'Only the league organizer can delete it' });
  await Match.deleteMany({ league: req.league._id });
  await Team.deleteMany({ league: req.league._id });
  await req.league.deleteOne();
  return res.json({ ok: true });
});

// Generate the full season of fixtures with the round-robin circle method.
// Refuses when fixtures already exist unless ?regenerate=true is passed.
router.post('/:id/generate-fixtures', auth, loadLeague, async (req, res) => {
  if (!isOrganizer(req)) return res.status(403).json({ error: 'Only the league organizer can generate fixtures' });
  const existing = await Match.countDocuments({ league: req.league._id });
  if (existing > 0 && req.query.regenerate !== 'true') {
    return res.status(409).json({ error: 'Fixtures already exist for this league — pass ?regenerate=true to rebuild them' });
  }
  const teams = await Team.find({ league: req.league._id }).sort({ createdAt: 1 });
  if (teams.length < 2) return res.status(400).json({ error: 'Add at least 2 teams before generating fixtures' });
  const rounds = roundRobin(teams.map((t) => t._id));
  const firstDate = req.body && req.body.firstDate ? new Date(req.body.firstDate) : nextSaturday();
  const dates = fixtureDates(firstDate, rounds);
  if (existing > 0) await Match.deleteMany({ league: req.league._id });
  const docs = [];
  rounds.forEach((fixtures, i) => {
    fixtures.forEach(({ home, away }) => {
      docs.push({ league: req.league._id, homeTeam: home, awayTeam: away, matchweek: i + 1, scheduledAt: dates[i] });
    });
  });
  await Match.insertMany(docs);
  req.league.fixturesGenerated = true;
  if (req.league.status === 'draft') req.league.status = 'active';
  await req.league.save();
  emitToLeague(req.league._id, 'league:fixtures', { leagueId: String(req.league._id), matchCount: docs.length });
  return res.status(201).json({ matchCount: docs.length, matchweeks: rounds.length });
});

function nextSaturday() {
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  const add = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  return d;
}

// Standings table, computed live from finished matches.
router.get('/:id/standings', async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  const teams = await Team.find({ league: league._id });
  const matches = await Match.find({ league: league._id });
  return res.json({ standings: computeStandings(teams, matches, league.pointsWin, league.pointsDraw) });
});

// League analytics: top scorers, goals per matchweek, totals.
router.get('/:id/analytics', async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  const teams = await Team.find({ league: league._id });
  const matches = await Match.find({ league: league._id }).populate('homeTeam awayTeam', 'name shortName colour');
  const finished = matches.filter((m) => m.status === 'finished');
  const totalGoals = finished.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0);
  const scorers = topScorers(matches, 10).map((s) => {
    const team = teams.find((t) => String(t._id) === s.teamId);
    return { ...s, teamName: team ? team.name : 'Unknown team', teamColour: team ? team.colour : 'sky' };
  });
  const biggestWin = finished
    .map((m) => ({ match: m, margin: Math.abs(m.homeScore - m.awayScore) }))
    .sort((a, b) => b.margin - a.margin)[0];
  return res.json({
    totalGoals,
    finishedMatches: finished.length,
    totalMatches: matches.length,
    goalsPerMatch: finished.length ? Number((totalGoals / finished.length).toFixed(2)) : 0,
    topScorers: scorers,
    goalsPerMatchweek: goalsPerMatchweek(matches),
    biggestWin: biggestWin && biggestWin.margin > 0
      ? { home: biggestWin.match.homeTeam.name, away: biggestWin.match.awayTeam.name, homeScore: biggestWin.match.homeScore, awayScore: biggestWin.match.awayScore, margin: biggestWin.margin }
      : null,
  });
});

module.exports = router;
