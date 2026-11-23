const express = require('express');
const Team = require('../models/Team');
const League = require('../models/League');
const Match = require('../models/Match');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

async function loadLeagueForTeam(req, res, next) {
  const league = await League.findById(req.params.leagueId);
  if (!league) return res.status(404).json({ error: 'League not found' });
  req.league = league;
  return next();
}

function isOrganizer(req) {
  return req.user && (req.user.role === 'admin' || String(req.league.organizer) === String(req.user._id));
}

router.get('/leagues/:leagueId/teams', optionalAuth, loadLeagueForTeam, async (req, res) => {
  const teams = await Team.find({ league: req.league._id }).populate('captain', 'name').sort({ name: 1 });
  return res.json({
    teams: teams.map((t) => ({
      id: t._id, name: t.name, shortName: t.shortName, colour: t.colour,
      captain: t.captain ? { id: t.captain._id, name: t.captain.name } : null,
      players: t.players, playerCount: t.players.length,
    })),
  });
});

router.post('/leagues/:leagueId/teams', auth, loadLeagueForTeam, async (req, res) => {
  if (!isOrganizer(req)) return res.status(403).json({ error: 'Only the league organizer can add teams' });
  const { name, shortName, colour, players } = req.body || {};
  if (!name || !shortName) return res.status(400).json({ error: 'Team name and a short code (2–4 letters) are required' });
  if (req.league.fixturesGenerated) {
    return res.status(409).json({ error: 'Fixtures are already generated — delete them first before adding teams' });
  }
  try {
    const team = await Team.create({
      league: req.league._id,
      name: name.trim(),
      shortName: shortName.trim().toUpperCase(),
      colour: colour || 'sky',
      captain: req.user.role === 'captain' ? req.user._id : null,
      players: Array.isArray(players) ? players.filter((p) => p && p.name).map((p) => ({ name: p.name.trim(), position: p.position || '', number: p.number || null })) : [],
    });
    return res.status(201).json({ team: { id: team._id, name: team.name, shortName: team.shortName, colour: team.colour, players: team.players } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A team with this name or short code already exists in the league' });
    throw err;
  }
});

router.put('/:id', auth, async (req, res) => {
  const team = await Team.findById(req.params.id).populate('league');
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const league = team.league;
  const canEdit = req.user.role === 'admin' || String(league.organizer) === String(req.user._id) || (team.captain && String(team.captain) === String(req.user._id));
  if (!canEdit) return res.status(403).json({ error: 'Only the organizer or the team captain can edit this team' });
  const { name, shortName, colour, players, captain } = req.body || {};
  if (name !== undefined) team.name = name.trim();
  if (shortName !== undefined) team.shortName = shortName.trim().toUpperCase();
  if (colour !== undefined) team.colour = colour;
  if (Array.isArray(players)) team.players = players.filter((p) => p && p.name).map((p) => ({ name: p.name.trim(), position: p.position || '', number: p.number || null }));
  if (captain !== undefined) team.captain = captain || null;
  try {
    await team.save();
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'A team with this name or short code already exists in the league' });
    throw err;
  }
  return res.json({ team: { id: team._id, name: team.name, shortName: team.shortName, colour: team.colour, players: team.players } });
});

router.delete('/:id', auth, async (req, res) => {
  const team = await Team.findById(req.params.id).populate('league');
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const league = team.league;
  if (req.user.role !== 'admin' && String(league.organizer) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Only the league organizer can remove teams' });
  }
  const played = await Match.countDocuments({ league: league._id, $or: [{ homeTeam: team._id }, { awayTeam: team._id }], status: { $in: ['live', 'finished'] } });
  if (played > 0) return res.status(409).json({ error: 'This team has already played matches and cannot be removed' });
  await Match.deleteMany({ league: league._id, $or: [{ homeTeam: team._id }, { awayTeam: team._id }] });
  await team.deleteOne();
  return res.json({ ok: true });
});

module.exports = router;
