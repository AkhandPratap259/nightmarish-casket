const express = require('express');
const PersonalRecord = require('../models/PersonalRecord');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { suggestNextWeight } = require('../utils/fitness');

const router = express.Router();

router.get(
  '/mine',
  auth,
  asyncHandler(async (req, res) => {
    const records = await PersonalRecord.find({ user: req.user._id })
      .populate('exercise', 'name muscleGroup equipment')
      .sort({ estimatedOneRepMax: -1 })
      .lean();
    return res.json({ items: records });
  })
);

// Progressive-overload suggestions: for every exercise with a personal
// record, the next-session target weight (best + ~2.5%, plate-rounded).
router.get(
  '/suggestions',
  auth,
  asyncHandler(async (req, res) => {
    const records = await PersonalRecord.find({ user: req.user._id })
      .populate('exercise', 'name muscleGroup equipment')
      .sort({ achievedAt: -1 })
      .lean();
    const suggestions = records.map((r) => ({
      exercise: r.exercise,
      bestWeight: r.bestWeight,
      bestReps: r.bestReps,
      estimatedOneRepMax: r.estimatedOneRepMax,
      suggestedWeight: suggestNextWeight(r.bestWeight),
      achievedAt: r.achievedAt,
    }));
    return res.json({ items: suggestions });
  })
);

module.exports = router;
