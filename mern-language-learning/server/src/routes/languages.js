const express = require('express');
const Language = require('../models/Language');
const Lesson = require('../models/Lesson');
const Progress = require('../models/Progress');
const { optionalAuth } = require('../middleware/auth');
const { lessonStates } = require('../utils/progress');

const router = express.Router();

// List languages with lesson counts and, when signed in, how many lessons
// the learner has completed in each.
router.get('/', optionalAuth, async (req, res) => {
  const languages = await Language.find().sort({ name: 1 }).lean();
  const counts = await Lesson.aggregate([
    { $group: { _id: '$languageCode', total: { $sum: 1 } } },
  ]);
  const totalByCode = Object.fromEntries(counts.map((c) => [c._id, c.total]));
  let doneByCode = {};
  if (req.user) {
    const done = await Progress.aggregate([
      { $match: { user: req.user._id, status: 'completed' } },
      {
        $lookup: {
          from: 'lessons',
          localField: 'lesson',
          foreignField: '_id',
          as: 'lessonDoc',
        },
      },
      { $unwind: '$lessonDoc' },
      { $group: { _id: '$lessonDoc.languageCode', total: { $sum: 1 } } },
    ]);
    doneByCode = Object.fromEntries(done.map((d) => [d._id, d.total]));
  }
  return res.json({
    languages: languages.map((l) => ({
      ...l,
      lessonCount: totalByCode[l.code] || 0,
      completedCount: doneByCode[l.code] || 0,
    })),
  });
});

// One language: its units and lessons with lock states, plus the full
// vocabulary bank (every word across its lessons, de-duplicated).
router.get('/:code', optionalAuth, async (req, res) => {
  const language = await Language.findOne({ code: req.params.code }).lean();
  if (!language) return res.status(404).json({ error: 'Language not found' });
  const states = req.user
    ? await lessonStates(req.user._id, language._id)
    : (await Lesson.find({ language: language._id }).sort({ unit: 1, order: 1 }).lean()).map(
        (lesson, i) => ({ lesson, status: i === 0 ? 'unlocked' : 'locked', bestScore: 0, attempts: 0 })
      );
  const unitsMap = new Map();
  for (const s of states) {
    if (!unitsMap.has(s.lesson.unit)) {
      unitsMap.set(s.lesson.unit, { unit: s.lesson.unit, title: s.lesson.unitTitle, lessons: [] });
    }
    unitsMap.get(s.lesson.unit).lessons.push({
      id: s.lesson._id,
      unit: s.lesson.unit,
      order: s.lesson.order,
      title: s.lesson.title,
      description: s.lesson.description,
      xpReward: s.lesson.xpReward,
      exerciseCount: s.lesson.exercises.length,
      status: s.status,
      bestScore: s.bestScore,
      attempts: s.attempts,
    });
  }
  const seen = new Set();
  const vocabulary = [];
  for (const s of states) {
    for (const w of s.lesson.words || []) {
      if (seen.has(w.word)) continue;
      seen.add(w.word);
      vocabulary.push(w);
    }
  }
  return res.json({
    language,
    units: [...unitsMap.values()],
    vocabulary,
  });
});

module.exports = router;
