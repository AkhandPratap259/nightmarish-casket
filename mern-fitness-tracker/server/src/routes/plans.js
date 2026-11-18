const express = require('express');
const mongoose = require('mongoose');
const Plan = require('../models/Plan');
const Template = require('../models/Template');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get(
  '/mine',
  auth,
  asyncHandler(async (req, res) => {
    const filter =
      req.user.role === 'trainer'
        ? { $or: [{ trainer: req.user._id }, { assignedTo: req.user._id }] }
        : { assignedTo: req.user._id };
    const plans = await Plan.find(filter)
      .populate('trainer', 'name email')
      .populate('weeks.templateIds', 'name')
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ items: plans });
  })
);

router.post(
  '/',
  auth,
  requireRole('trainer', 'admin'),
  asyncHandler(async (req, res) => {
    const { title, description, weeks } = req.body || {};
    if (!title) return res.status(400).json({ error: 'A title is required' });
    const cleanWeeks = Array.isArray(weeks)
      ? weeks
          .filter((w) => w && Number.isInteger(Number(w.weekNumber)))
          .map((w) => ({
            weekNumber: Number(w.weekNumber),
            templateIds: Array.isArray(w.templateIds)
              ? w.templateIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
              : [],
          }))
      : [];
    if (cleanWeeks.length > 0) {
      const allIds = cleanWeeks.flatMap((w) => w.templateIds);
      const found = await Template.countDocuments({ _id: { $in: allIds } });
      if (found !== new Set(allIds.map(String)).size) {
        return res.status(400).json({ error: 'One or more templates do not exist' });
      }
    }
    const plan = await Plan.create({
      trainer: req.user._id,
      title: String(title).trim(),
      description: typeof description === 'string' ? description.trim() : '',
      weeks: cleanWeeks,
    });
    return res.status(201).json({ plan });
  })
);

router.post(
  '/:id/assign',
  auth,
  requireRole('trainer', 'admin'),
  asyncHandler(async (req, res) => {
    const { userId } = req.body || {};
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (req.user.role === 'trainer' && String(plan.trainer) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the plan owner can assign it' });
    }
    const member = await User.findById(userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!plan.assignedTo.some((id) => String(id) === String(userId))) {
      plan.assignedTo.push(userId);
      await plan.save();
    }
    await plan.populate('assignedTo', 'name email');
    return res.json({ plan });
  })
);

router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const plan = await Plan.findById(req.params.id)
      .populate('trainer', 'name email')
      .populate('weeks.templateIds', 'name description')
      .populate('assignedTo', 'name email')
      .lean();
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const isTrainer = String(plan.trainer?._id || plan.trainer) === String(req.user._id);
    const isAssigned = (plan.assignedTo || []).some(
      (u) => String(u._id || u) === String(req.user._id)
    );
    if (!isTrainer && !isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'This plan is not assigned to you' });
    }
    return res.json({ plan });
  })
);

module.exports = router;
