const express = require('express');
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const { auth, requireRole } = require('../middleware/auth');
const { round2 } = require('../utils/balances');

const router = express.Router();

router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  const [users, groups, expenses, settlements, recentGroups] = await Promise.all([
    User.countDocuments(),
    Group.countDocuments(),
    Expense.countDocuments(),
    Settlement.countDocuments(),
    Group.find().populate('createdBy', 'name').sort({ createdAt: -1 }).limit(5),
  ]);
  const volume = await Expense.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return res.json({
    users,
    groups,
    expenses,
    settlements,
    totalVolume: round2(volume[0] ? volume[0].total : 0),
    recentGroups: recentGroups.map((g) => ({
      id: g._id,
      name: g.name,
      memberCount: g.members.length,
      createdBy: g.createdBy ? g.createdBy.name : '',
      createdAt: g.createdAt,
    })),
  });
});

module.exports = router;
