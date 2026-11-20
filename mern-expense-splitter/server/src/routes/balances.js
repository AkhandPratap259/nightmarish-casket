const express = require('express');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { loadGroup } = require('../middleware/group');
const { emitToGroup } = require('../utils/notify');
const { computeBalances, pairwiseDebts, simplifyDebts, round2 } = require('../utils/balances');

// Mounted under /api/groups/:id — mergeParams keeps :id available.
const router = express.Router({ mergeParams: true });

async function groupLedger(group) {
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: group._id }),
    Settlement.find({ group: group._id }),
  ]);
  const memberIds = group.members.map((m) => (m.user && m.user._id) || m.user);
  const nets = computeBalances(expenses, settlements, memberIds);
  return { expenses, settlements, nets };
}

function namedNets(group, nets) {
  const nameById = Object.fromEntries(
    group.members.map((m) => [String((m.user && m.user._id) || m.user), (m.user && m.user.name) || ''])
  );
  return group.members.map((m) => {
    const id = (m.user && m.user._id) || m.user;
    return {
      userId: id,
      name: (m.user && m.user.name) || nameById[String(id)] || '',
      avatarColor: (m.user && m.user.avatarColor) || '#1f5c4d',
      net: round2(nets[String(id)] || 0),
    };
  });
}

function namedDebts(debts, group) {
  const byId = {};
  for (const m of group.members) {
    const user = m.user || {};
    byId[String(user._id || m.user)] = { name: user.name || '', avatarColor: user.avatarColor || '#1f5c4d' };
  }
  return debts.map((d) => ({
    from: d.from,
    fromName: byId[String(d.from)] ? byId[String(d.from)].name : '',
    to: d.to,
    toName: byId[String(d.to)] ? byId[String(d.to)].name : '',
    amount: d.amount,
  }));
}

router.get('/balances', auth, loadGroup, async (req, res) => {
  await req.group.populate('members.user', 'name avatarColor');
  const { nets } = await groupLedger(req.group);
  const debts = pairwiseDebts(nets);
  const simplified = simplifyDebts(nets);
  return res.json({
    members: namedNets(req.group, nets),
    debts: namedDebts(debts, req.group),
    simplified: namedDebts(simplified, req.group),
  });
});

router.post('/settlements', auth, loadGroup, async (req, res) => {
  const { from, to, amount, note } = req.body || {};
  const value = Number(amount);
  if (!from || !to || !mongoose.Types.ObjectId.isValid(from) || !mongoose.Types.ObjectId.isValid(to)) {
    return res.status(400).json({ error: 'Both people in the settlement are required' });
  }
  if (String(from) === String(to)) {
    return res.status(400).json({ error: 'A settlement needs two different people' });
  }
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }
  if (!req.group.isMember(from) || !req.group.isMember(to)) {
    return res.status(400).json({ error: 'Both people must be members of this group' });
  }

  await req.group.populate('members.user', 'name avatarColor');
  const { nets } = await groupLedger(req.group);
  const owed = pairwiseDebts(nets).find(
    (d) => String(d.from) === String(from) && String(d.to) === String(to)
  );
  const owedAmount = owed ? owed.amount : 0;
  if (round2(value) > round2(owedAmount + 0.01)) {
    return res.status(400).json({
      error: `That is more than what is owed (${req.group.currency}${owedAmount.toFixed(2)})`,
    });
  }

  const settlement = await Settlement.create({
    group: req.group._id,
    from,
    to,
    amount: round2(value),
    note: note ? String(note).trim() : '',
    createdBy: req.user._id,
  });
  const fromUser = await User.findById(from);
  const toUser = await User.findById(to);
  await Activity.create({
    group: req.group._id,
    type: 'settlement',
    actor: req.user._id,
    text: `${fromUser ? fromUser.name : 'Someone'} paid ${toUser ? toUser.name : 'someone'} ${req.group.currency}${settlement.amount.toFixed(2)}`,
    meta: { settlementId: settlement._id, amount: settlement.amount },
  });
  await settlement.populate('from', 'name avatarColor');
  await settlement.populate('to', 'name avatarColor');
  emitToGroup(req.group._id, 'settlement:added', { groupId: req.group._id, settlement });
  emitToGroup(req.group._id, 'balance:updated', { groupId: req.group._id });
  return res.status(201).json({ settlement });
});

router.get('/settlements', auth, loadGroup, async (req, res) => {
  const settlements = await Settlement.find({ group: req.group._id })
    .populate('from', 'name avatarColor')
    .populate('to', 'name avatarColor')
    .sort({ createdAt: -1 });
  return res.json({ settlements });
});

router.get('/activity', auth, loadGroup, async (req, res) => {
  const activity = await Activity.find({ group: req.group._id })
    .populate('actor', 'name avatarColor')
    .sort({ createdAt: -1 })
    .limit(50);
  return res.json({ activity });
});

module.exports = router;
