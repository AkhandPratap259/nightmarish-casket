const express = require('express');
const User = require('../models/User');
const Language = require('../models/Language');
const Lesson = require('../models/Lesson');
const XpEvent = require('../models/XpEvent');
const Progress = require('../models/Progress');
const ReviewItem = require('../models/ReviewItem');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  const [users, learners, instructors, lessons, languages, progress, reviewItems] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'learner' }),
    User.countDocuments({ role: 'instructor' }),
    Lesson.countDocuments(),
    Language.countDocuments(),
    Progress.countDocuments({ status: 'completed' }),
    ReviewItem.countDocuments(),
  ]);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const xpToday = await XpEvent.aggregate([
    { $match: { createdAt: { $gte: dayAgo } } },
    { $group: { _id: null, total: { $sum: '$xp' } } },
  ]);
  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(8).select('name email role xp level streak createdAt').lean();
  const topLearners = await User.find({ role: 'learner' })
    .sort({ xp: -1 })
    .limit(5)
    .select('name email xp level streak lessonsCompleted')
    .lean();
  return res.json({
    counts: {
      users,
      learners,
      instructors,
      lessons,
      languages,
      lessonsCompleted: progress,
      reviewItems,
      xpToday: xpToday.length ? xpToday[0].total : 0,
    },
    recentUsers,
    topLearners,
  });
});

module.exports = router;
