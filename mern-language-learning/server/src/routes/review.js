const express = require('express');
const ReviewItem = require('../models/ReviewItem');
const { auth } = require('../middleware/auth');
const { XP_PER_REVIEW, awardXp, checkAchievements } = require('../utils/gamify');

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;

// Spaced-repetition rule: correct doubles the interval (1 -> 2 -> 4 -> 8
// -> 16 -> 30 days, capped at 30); wrong resets it to 1 day.
function nextInterval(current, correct) {
  if (!correct) return 1;
  return Math.min(30, Math.max(2, current * 2));
}

// Due review items (due now or earlier), oldest due first.
router.get('/', auth, async (req, res) => {
  const now = new Date();
  const items = await ReviewItem.find({ user: req.user._id, dueAt: { $lte: now } })
    .sort({ dueAt: 1 })
    .limit(20)
    .lean();
  const total = await ReviewItem.countDocuments({ user: req.user._id });
  return res.json({ due: items, dueCount: items.length, total });
});

// Answer one review item. Correct answers earn XP and push the item
// further into the future; wrong answers bring it back to tomorrow.
router.post('/answer', auth, async (req, res) => {
  const { itemId, correct } = req.body || {};
  const item = await ReviewItem.findOne({ _id: itemId, user: req.user._id });
  if (!item) return res.status(404).json({ error: 'Review item not found' });
  const isCorrect = correct === true;
  item.intervalDays = nextInterval(item.intervalDays, isCorrect);
  item.dueAt = new Date(Date.now() + item.intervalDays * DAY_MS);
  if (isCorrect) {
    item.correctCount += 1;
    req.user.reviewCorrect += 1;
    await req.user.save();
  } else {
    item.wrongCount += 1;
  }
  await item.save();
  let xpAwarded = 0;
  let leveledUp = false;
  if (isCorrect) {
    const result = await awardXp(req.user, XP_PER_REVIEW, 'review');
    xpAwarded = XP_PER_REVIEW;
    leveledUp = result.leveledUp;
  }
  const newAchievements = await checkAchievements(req.user);
  return res.json({
    correct: isCorrect,
    intervalDays: item.intervalDays,
    dueAt: item.dueAt,
    xpAwarded,
    leveledUp,
    newAchievements: newAchievements.map((a) => ({ key: a.key, title: a.title })),
    user: {
      xp: req.user.xp,
      level: req.user.level,
      streak: req.user.streak,
      dailyXp: req.user.dailyXp,
    },
  });
});

// Add a word to the review deck by hand (from the vocabulary bank).
router.post('/add', auth, async (req, res) => {
  const { word, translation, reading, languageCode } = req.body || {};
  if (!word || !translation || !languageCode) {
    return res.status(400).json({ error: 'Word, translation and language are required' });
  }
  const item = await ReviewItem.findOneAndUpdate(
    { user: req.user._id, word, languageCode },
    { $set: { translation, reading: reading || '', intervalDays: 1, dueAt: new Date() } },
    { upsert: true, new: true }
  );
  return res.status(201).json({ item });
});

module.exports = router;
