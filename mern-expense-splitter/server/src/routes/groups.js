const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { loadGroup } = require('../middleware/group');
const { emitToGroup } = require('../utils/notify');
const { round2 } = require('../utils/balances');

const router = express.Router();

function memberView(member) {
  const user = member.user || {};
  return {
    userId: user._id || member.user,
    name: user.name || '',
    email: user.email || '',
    avatarColor: user.avatarColor || '#1f5c4d',
    role: member.role,
  };
}

function groupView(group, totalSpent) {
  return {
    id: group._id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    createdBy: group.createdBy,
    memberCount: group.members.length,
    members: group.members.map(memberView),
    totalSpent: round2(totalSpent || 0),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

// Groups I belong to, with member count and total spent.
router.get('/', auth, async (req, res) => {
  const groups = await Group.find({ 'members.user': req.user._id })
    .populate('members.user', 'name email avatarColor')
    .sort({ updatedAt: -1 });
  const totals = await Expense.aggregate([
    { $match: { group: { $in: groups.map((g) => g._id) } } },
    { $group: { _id: '$group', total: { $sum: '$amount' } } },
  ]);
  const totalByGroup = Object.fromEntries(totals.map((t) => [String(t._id), t.total]));
  return res.json({ groups: groups.map((g) => groupView(g, totalByGroup[String(g._id)] || 0)) });
});

router.post('/', auth, async (req, res) => {
  const { name, description, currency } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }
  const group = await Group.create({
    name: String(name).trim(),
    description: description ? String(description).trim() : '',
    currency: currency ? String(currency).trim() : '₹',
    members: [{ user: req.user._id, role: 'creator' }],
    createdBy: req.user._id,
  });
  await Activity.create({
    group: group._id,
    type: 'group',
    actor: req.user._id,
    text: `${req.user.name} created the group “${group.name}”`,
    meta: { groupId: group._id },
  });
  await group.populate('members.user', 'name email avatarColor');
  return res.status(201).json({ group: groupView(group, 0) });
});

router.get('/:id', auth, loadGroup, async (req, res) => {
  await req.group.populate('members.user', 'name email avatarColor');
  const spent = await Expense.aggregate([
    { $match: { group: req.group._id } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return res.json({ group: groupView(req.group, spent[0] ? spent[0].total : 0) });
});

// Any member may add an existing registered user by email.
router.post('/:id/members', auth, loadGroup, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.status(404).json({ error: 'No registered user with that email' });
  if (req.group.isMember(user._id)) {
    return res.status(409).json({ error: 'That person is already a member of this group' });
  }
  req.group.members.push({ user: user._id, role: 'member' });
  await req.group.save();
  await Activity.create({
    group: req.group._id,
    type: 'member',
    actor: req.user._id,
    text: `${req.user.name} added ${user.name} to the group`,
    meta: { addedUserId: user._id },
  });
  emitToGroup(req.group._id, 'balance:updated', { groupId: req.group._id });
  await req.group.populate('members.user', 'name email avatarColor');
  return res.status(201).json({ group: groupView(req.group, 0) });
});

// Creator only; the creator cannot be removed, and cannot remove themselves.
router.delete('/:id/members/:userId', auth, loadGroup, async (req, res) => {
  if (req.group.memberRole(req.user._id) !== 'creator') {
    return res.status(403).json({ error: 'Only the group creator can remove members' });
  }
  const targetId = req.params.userId;
  if (String(targetId) === String(req.group.createdBy)) {
    return res.status(400).json({ error: 'The group creator cannot be removed' });
  }
  if (String(targetId) === String(req.user._id)) {
    return res.status(400).json({ error: 'You cannot remove yourself from your own group' });
  }
  const member = req.group.members.find((m) => String(m.user) === String(targetId));
  if (!member) return res.status(404).json({ error: 'That person is not a member of this group' });
  const removed = await User.findById(targetId);
  req.group.members = req.group.members.filter((m) => String(m.user) !== String(targetId));
  await req.group.save();
  await Activity.create({
    group: req.group._id,
    type: 'member',
    actor: req.user._id,
    text: `${req.user.name} removed ${removed ? removed.name : 'a member'} from the group`,
    meta: { removedUserId: targetId },
  });
  emitToGroup(req.group._id, 'balance:updated', { groupId: req.group._id });
  await req.group.populate('members.user', 'name email avatarColor');
  return res.json({ group: groupView(req.group, 0) });
});

module.exports = router;
