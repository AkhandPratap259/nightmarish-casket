const express = require('express');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Activity = require('../models/Activity');
const { auth } = require('../middleware/auth');
const { loadGroup } = require('../middleware/group');
const { emitToGroup } = require('../utils/notify');
const { computeSplits, round2 } = require('../utils/balances');

// Mounted under /api/groups/:id — mergeParams keeps :id available.
const router = express.Router({ mergeParams: true });

const CATEGORIES = ['Food', 'Stay', 'Transport', 'Activities', 'Shopping', 'Utilities', 'Misc'];

function expenseView(expense) {
  return {
    id: expense._id,
    group: expense.group,
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    paidBy: expense.paidBy && expense.paidBy.name
      ? { id: expense.paidBy._id, name: expense.paidBy.name, avatarColor: expense.paidBy.avatarColor }
      : expense.paidBy,
    splitType: expense.splitType,
    splits: (expense.splits || []).map((s) => ({
      user: s.user && s.user.name
        ? { id: s.user._id, name: s.user.name, avatarColor: s.user.avatarColor }
        : s.user,
      amount: s.amount,
      percentage: s.percentage,
      shares: s.shares,
    })),
    date: expense.date,
    notes: expense.notes,
    createdBy: expense.createdBy,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

router.get('/expenses', auth, loadGroup, async (req, res) => {
  const { category, q } = req.query;
  const filter = { group: req.group._id };
  if (category && CATEGORIES.includes(category)) filter.category = category;
  if (q) filter.title = { $regex: String(q).trim(), $options: 'i' };
  const expenses = await Expense.find(filter)
    .populate('paidBy', 'name avatarColor')
    .populate('splits.user', 'name avatarColor')
    .sort({ date: -1, createdAt: -1 });
  return res.json({ expenses: expenses.map(expenseView) });
});

router.post('/expenses', auth, loadGroup, async (req, res) => {
  const { title, amount, category, paidBy, splitType, splits, date, notes } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Expense title is required' });
  }
  const total = Number(amount);
  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }
  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  if (!paidBy || !mongoose.Types.ObjectId.isValid(paidBy)) {
    return res.status(400).json({ error: 'A payer is required' });
  }
  if (!req.group.isMember(paidBy)) {
    return res.status(400).json({ error: 'The payer must be a member of this group' });
  }

  // Split members must all belong to the group.
  const memberIds = req.group.members.map((m) => String(m.user));
  const splitUsers = Array.isArray(splits) ? splits.map((s) => String(s.user)) : [];
  for (const userId of splitUsers) {
    if (!memberIds.includes(userId)) {
      return res.status(400).json({ error: 'Every person in the split must be a group member' });
    }
  }

  let computed;
  try {
    computed = computeSplits(total, splitType || 'equal', splits, req.group.members.map((m) => m.user));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const expense = await Expense.create({
    group: req.group._id,
    title: String(title).trim(),
    amount: round2(total),
    category: category || 'Misc',
    paidBy,
    splitType: splitType || 'equal',
    splits: computed,
    date: date ? new Date(date) : new Date(),
    notes: notes ? String(notes).trim() : '',
    createdBy: req.user._id,
  });
  await Activity.create({
    group: req.group._id,
    type: 'expense',
    actor: req.user._id,
    text: `${req.user.name} added “${expense.title}” (${req.group.currency}${expense.amount.toFixed(2)})`,
    meta: { expenseId: expense._id, amount: expense.amount, category: expense.category },
  });
  await expense.populate('paidBy', 'name avatarColor');
  await expense.populate('splits.user', 'name avatarColor');
  emitToGroup(req.group._id, 'expense:added', { groupId: req.group._id, expense: expenseView(expense) });
  emitToGroup(req.group._id, 'balance:updated', { groupId: req.group._id });
  return res.status(201).json({ expense: expenseView(expense) });
});

// Only the payer or the group creator can delete an expense.
router.delete('/expenses/:expenseId', auth, loadGroup, async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.expenseId, group: req.group._id });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  const isPayer = String(expense.paidBy) === String(req.user._id);
  const isCreator = req.group.memberRole(req.user._id) === 'creator';
  if (!isPayer && !isCreator) {
    return res.status(403).json({ error: 'Only the payer or the group creator can delete this expense' });
  }
  await expense.deleteOne();
  await Activity.create({
    group: req.group._id,
    type: 'expense',
    actor: req.user._id,
    text: `${req.user.name} removed the expense “${expense.title}”`,
    meta: { expenseId: expense._id, amount: expense.amount },
  });
  emitToGroup(req.group._id, 'balance:updated', { groupId: req.group._id });
  return res.json({ ok: true });
});

module.exports = router;
