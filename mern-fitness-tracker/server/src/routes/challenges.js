const express = require('express');
const Challenge = require('../models/Challenge');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

function publicChallenge(c) {
  return {
    _id: c._id,
    title: c.title,
    description: c.description,
    type: c.type,
    target: c.target,
    unit: c.unit,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    participants: c.participants,
    createdAt: c.createdAt,
  };
}

router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const { all } = req.query;
    const filter = all === 'true' ? {} : { endsAt: { $gte: now } };
    const challenges = await Challenge.find(filter)
      .populate('participants.user', 'name')
      .sort({ startsAt: -1 })
      .lean();
    return res.json({
      items: challenges.map((c) => ({
        ...publicChallenge(c),
        myProgress:
          c.participants.find((p) => String(p.user?._id || p.user) === String(req.user._id)) ||
          null,
      })),
    });
  })
);

router.post(
  '/',
  auth,
  requireRole('trainer', 'admin'),
  asyncHandler(async (req, res) => {
    const { title, description, type, target, unit, startsAt, endsAt } = req.body || {};
    if (!title || !type || !target || !unit || !startsAt || !endsAt) {
      return res.status(400).json({ error: 'Title, type, target, unit and dates are required' });
    }
    if (!['sessions', 'volume', 'streak'].includes(type)) {
      return res.status(400).json({ error: 'Unknown challenge type' });
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      return res.status(400).json({ error: 'End date must be after the start date' });
    }
    const challenge = await Challenge.create({
      title: String(title).trim(),
      description: typeof description === 'string' ? description.trim() : '',
      type,
      target: Math.max(1, parseInt(target, 10) || 1),
      unit: String(unit).trim(),
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      createdBy: req.user._id,
    });
    return res.status(201).json({ challenge: publicChallenge(challenge) });
  })
);

router.post(
  '/:id/join',
  auth,
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    const now = new Date();
    if (now < challenge.startsAt || now > challenge.endsAt) {
      return res.status(409).json({ error: 'This challenge is not open right now' });
    }
    const already = challenge.participants.some(
      (p) => String(p.user) === String(req.user._id)
    );
    if (already) return res.status(409).json({ error: 'You already joined this challenge' });
    challenge.participants.push({ user: req.user._id, progress: 0 });
    await challenge.save();
    return res.json({ challenge: publicChallenge(challenge) });
  })
);

router.get(
  '/:id/leaderboard',
  auth,
  asyncHandler(async (req, res) => {
    const challenge = await Challenge.findById(req.params.id)
      .populate('participants.user', 'name')
      .lean();
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    const rows = [...challenge.participants]
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .map((p, index) => ({
        rank: index + 1,
        name: p.user?.name || 'Member',
        userId: p.user?._id,
        progress: p.progress || 0,
        completed: Boolean(p.completedAt),
      }));
    return res.json({ challenge: publicChallenge(challenge), leaderboard: rows });
  })
);

module.exports = router;
