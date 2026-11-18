const express = require('express');
const Exercise = require('../models/Exercise');
const { MUSCLE_GROUPS } = require('../models/Exercise');
const { auth, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { muscleGroup, equipment, difficulty, q, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (muscleGroup && MUSCLE_GROUPS.includes(muscleGroup)) filter.muscleGroup = muscleGroup;
    if (equipment) filter.equipment = new RegExp(String(equipment).trim(), 'i');
    if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      filter.difficulty = difficulty;
    }
    if (q) filter.$text = { $search: String(q) };
    // Custom exercises are visible to their owner and to admins; the
    // built-in library is visible to everyone.
    if (!req.user) {
      filter.isCustom = false;
    } else if (req.user.role !== 'admin') {
      filter.$or = [{ isCustom: false }, { createdBy: req.user._id }];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const [items, total] = await Promise.all([
      Exercise.find(filter)
        .sort({ muscleGroup: 1, name: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Exercise.countDocuments(filter),
    ]);
    return res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  })
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const exercise = await Exercise.findById(req.params.id).lean();
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    if (
      exercise.isCustom &&
      (!req.user ||
        (req.user.role !== 'admin' && String(exercise.createdBy) !== String(req.user._id)))
    ) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    return res.json({ exercise });
  })
);

router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { name, muscleGroup, equipment, difficulty, instructions } = req.body || {};
    if (!name || !muscleGroup || !equipment) {
      return res.status(400).json({ error: 'Name, muscle group and equipment are required' });
    }
    if (!MUSCLE_GROUPS.includes(muscleGroup)) {
      return res.status(400).json({ error: 'Unknown muscle group' });
    }
    const exercise = await Exercise.create({
      name: String(name).trim(),
      muscleGroup,
      equipment: String(equipment).trim(),
      difficulty: ['beginner', 'intermediate', 'advanced'].includes(difficulty)
        ? difficulty
        : 'beginner',
      instructions: Array.isArray(instructions)
        ? instructions.map((s) => String(s).trim()).filter(Boolean)
        : [],
      isCustom: true,
      createdBy: req.user._id,
    });
    return res.status(201).json({ exercise });
  })
);

router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    const isOwner = exercise.createdBy && String(exercise.createdBy) === String(req.user._id);
    if (!exercise.isCustom || (!isOwner && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only custom exercises can be deleted' });
    }
    await exercise.deleteOne();
    return res.json({ ok: true });
  })
);

module.exports = router;
