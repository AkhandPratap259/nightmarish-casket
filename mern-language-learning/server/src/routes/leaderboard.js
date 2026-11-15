const express = require('express');
const mongoose = require('mongoose');
const XpEvent = require('../models/XpEvent');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Weekly leaderboard: real aggregation over XP events from the last 7 days.
router.get('/weekly', optionalAuth, async (req, res) => {
  const since = new Date(Date.now() - WEEK_MS);
  const rows = await XpEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$user', weeklyXp: { $sum: '$xp' } } },
    { $sort: { weeklyXp: -1 } },
    { $limit: 20 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        name: '$user.name',
        level: '$user.level',
        streak: '$user.streak',
        weeklyXp: 1,
      },
    },
  ]);
  const board = rows.map((r, i) => ({ rank: i + 1, ...r }));
  let me = null;
  if (req.user) {
    const found = board.find((r) => String(r.userId) === String(req.user._id));
    if (found) {
      me = found;
    } else {
      const mine = await XpEvent.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.user._id), createdAt: { $gte: since } } },
        { $group: { _id: null, weeklyXp: { $sum: '$xp' } } },
      ]);
      me = {
        rank: null,
        userId: req.user._id,
        name: req.user.name,
        level: req.user.level,
        streak: req.user.streak,
        weeklyXp: mine.length ? mine[0].weeklyXp : 0,
      };
    }
  }
  return res.json({ board, me });
});

// The signed-in learner's own XP per day for the last 7 days, for the
// dashboard's weekly bar chart. Days with no activity report 0.
router.get('/my-week', auth, async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await XpEvent.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.user._id), createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        xp: { $sum: '$xp' },
      },
    },
  ]);
  const byDay = Object.fromEntries(rows.map((r) => [r._id, r.xp]));
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, label: d.toLocaleDateString('en-GB', { weekday: 'short' }), xp: byDay[key] || 0 });
  }
  return res.json({ days });
});

// All-time leaderboard: total XP, highest first.
router.get('/all-time', optionalAuth, async (req, res) => {
  const users = await User.find({ role: 'learner' })
    .sort({ xp: -1 })
    .limit(20)
    .select('name level streak xp')
    .lean();
  const board = users.map((u, i) => ({
    rank: i + 1,
    userId: u._id,
    name: u.name,
    level: u.level,
    streak: u.streak,
    weeklyXp: u.xp,
  }));
  return res.json({ board });
});

module.exports = router;
