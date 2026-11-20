const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Activity = require('../models/Activity');
const { auth } = require('../middleware/auth');
const { loadGroup } = require('../middleware/group');
const { computeBalances, round2 } = require('../utils/balances');

// Mounted at /api: defines /api/groups/:id/analytics and /api/dashboard.
const router = express.Router();

router.get('/groups/:id/analytics', auth, loadGroup, async (req, res) => {
  const expenses = await Expense.find({ group: req.group._id }).sort({ date: 1 });
  const memberCount = req.group.members.length || 1;
  const totalSpent = round2(expenses.reduce((sum, e) => sum + e.amount, 0));

  const byCategoryMap = {};
  const byMonthMap = {};
  for (const expense of expenses) {
    const cat = expense.category || 'Misc';
    byCategoryMap[cat] = byCategoryMap[cat] || { category: cat, total: 0, count: 0 };
    byCategoryMap[cat].total = round2(byCategoryMap[cat].total + expense.amount);
    byCategoryMap[cat].count += 1;
    const month = new Date(expense.date).toISOString().slice(0, 7);
    byMonthMap[month] = round2((byMonthMap[month] || 0) + expense.amount);
  }

  return res.json({
    byCategory: Object.values(byCategoryMap).sort((a, b) => b.total - a.total),
    byMonth: Object.entries(byMonthMap)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    totalSpent,
    expenseCount: expenses.length,
    avgPerPerson: round2(totalSpent / memberCount),
  });
});

router.get('/dashboard', auth, async (req, res) => {
  const groups = await Group.find({ 'members.user': req.user._id })
    .populate('members.user', 'name avatarColor')
    .sort({ updatedAt: -1 });

  const summaries = [];
  let totalYouOwe = 0;
  let totalYouAreOwed = 0;
  let totalSpent = 0;

  for (const group of groups) {
    const [expenses, settlements] = await Promise.all([
      Expense.find({ group: group._id }),
      Settlement.find({ group: group._id }),
    ]);
    const spent = round2(expenses.reduce((sum, e) => sum + e.amount, 0));
    const nets = computeBalances(expenses, settlements, group.members.map((m) => (m.user && m.user._id) || m.user));
    const myNet = round2(nets[String(req.user._id)] || 0);
    const youOwe = myNet < 0 ? round2(-myNet) : 0;
    const youAreOwed = myNet > 0 ? myNet : 0;
    totalYouOwe = round2(totalYouOwe + youOwe);
    totalYouAreOwed = round2(totalYouAreOwed + youAreOwed);
    totalSpent = round2(totalSpent + spent);
    summaries.push({
      id: group._id,
      name: group.name,
      currency: group.currency,
      memberCount: group.members.length,
      totalSpent: spent,
      youOwe,
      youAreOwed,
    });
  }

  const groupIds = groups.map((g) => g._id);
  const recentActivity = await Activity.find({ group: { $in: groupIds } })
    .populate('actor', 'name avatarColor')
    .populate('group', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  return res.json({
    groups: summaries,
    totals: { youOwe: totalYouOwe, youAreOwed: totalYouAreOwed, totalSpent },
    recentActivity,
  });
});

module.exports = router;
