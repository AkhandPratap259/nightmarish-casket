const express = require('express');
const Session = require('../models/Session');
const PersonalRecord = require('../models/PersonalRecord');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { weekStreak, startOfWeek } = require('../utils/fitness');

const router = express.Router();

const DAY = 24 * 60 * 60 * 1000;

router.get(
  '/overview',
  auth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const completed = await Session.find({ user: userId, status: 'completed' })
      .populate('exercises.exercise', 'muscleGroup')
      .sort({ finishedAt: -1 })
      .lean();

    const totalSessions = completed.length;
    const totalVolume = completed.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
    const totalMinutes = Math.round(
      completed.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60
    );
    const streak = weekStreak(completed.map((s) => s.finishedAt));

    // Weekly volume for the last 8 calendar weeks, oldest first.
    const weeks = [];
    const thisWeek = startOfWeek(new Date());
    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(thisWeek.getTime() - i * 7 * DAY);
      const end = new Date(start.getTime() + 7 * DAY);
      const inWeek = completed.filter((s) => {
        const t = new Date(s.finishedAt);
        return t >= start && t < end;
      });
      weeks.push({
        weekStart: start.toISOString().slice(0, 10),
        sessions: inWeek.length,
        volume: Math.round(inWeek.reduce((sum, s) => sum + (s.totalVolume || 0), 0)),
      });
    }

    // Muscle-group split by completed sets.
    const splitMap = {};
    for (const s of completed) {
      for (const ex of s.exercises) {
        const group = ex.exercise?.muscleGroup || 'other';
        const sets = (ex.sets || []).filter((set) => set.completed !== false).length;
        splitMap[group] = (splitMap[group] || 0) + sets;
      }
    }
    const muscleSplit = Object.entries(splitMap)
      .map(([muscleGroup, sets]) => ({ muscleGroup, sets }))
      .sort((a, b) => b.sets - a.sets);

    const recordCount = await PersonalRecord.countDocuments({ user: userId });

    return res.json({
      totals: { totalSessions, totalVolume: Math.round(totalVolume), totalMinutes, recordCount },
      streak,
      weeks,
      muscleSplit,
    });
  })
);

module.exports = router;
