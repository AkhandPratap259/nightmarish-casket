const express = require('express');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Session = require('../models/Session');
const Template = require('../models/Template');
const Challenge = require('../models/Challenge');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get(
  '/overview',
  auth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const [users, exercises, sessions, completedSessions, templates, challenges] =
      await Promise.all([
        User.countDocuments(),
        Exercise.countDocuments(),
        Session.countDocuments(),
        Session.countDocuments({ status: 'completed' }),
        Template.countDocuments(),
        Challenge.countDocuments(),
      ]);
    const roleBreakdown = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select('name email role createdAt')
      .lean();
    return res.json({
      totals: { users, exercises, sessions, completedSessions, templates, challenges },
      roleBreakdown,
      recentUsers,
    });
  })
);

module.exports = router;
