const express = require('express');
const mongoose = require('mongoose');
const Template = require('../models/Template');
const Exercise = require('../models/Exercise');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && mongoose.Types.ObjectId.isValid(it.exercise))
    .map((it, index) => ({
      exercise: it.exercise,
      targetSets: Math.min(12, Math.max(1, parseInt(it.targetSets, 10) || 3)),
      targetReps: Math.min(100, Math.max(1, parseInt(it.targetReps, 10) || 10)),
      targetWeight: Math.max(0, Number(it.targetWeight) || 0),
      order: typeof it.order === 'number' ? it.order : index,
      notes: typeof it.notes === 'string' ? it.notes.trim() : '',
    }));
}

router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { mine } = req.query;
    const filter =
      mine === 'true'
        ? { user: req.user._id }
        : { $or: [{ user: req.user._id }, { isPublic: true }] };
    const templates = await Template.find(filter)
      .populate('items.exercise', 'name muscleGroup equipment difficulty')
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ items: templates });
  })
);

router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const template = await Template.findById(req.params.id)
      .populate('items.exercise', 'name muscleGroup equipment difficulty instructions')
      .lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const isOwner = String(template.user) === String(req.user._id);
    if (!isOwner && !template.isPublic) {
      return res.status(403).json({ error: 'This template is private' });
    }
    return res.json({ template });
  })
);

router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { name, description, items, isPublic } = req.body || {};
    if (!name) return res.status(400).json({ error: 'A name is required' });
    const cleaned = cleanItems(items);
    if (cleaned.length === 0) {
      return res.status(400).json({ error: 'Add at least one exercise' });
    }
    const found = await Exercise.countDocuments({ _id: { $in: cleaned.map((i) => i.exercise) } });
    if (found !== cleaned.length) {
      return res.status(400).json({ error: 'One or more exercises do not exist' });
    }
    const template = await Template.create({
      user: req.user._id,
      name: String(name).trim(),
      description: typeof description === 'string' ? description.trim() : '',
      items: cleaned,
      isPublic: Boolean(isPublic),
    });
    return res.status(201).json({ template });
  })
);

router.put(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (String(template.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the owner can edit this template' });
    }
    const { name, description, items, isPublic } = req.body || {};
    if (typeof name === 'string' && name.trim()) template.name = name.trim();
    if (typeof description === 'string') template.description = description.trim();
    if (Array.isArray(items)) {
      const cleaned = cleanItems(items);
      if (cleaned.length === 0) {
        return res.status(400).json({ error: 'A template needs at least one exercise' });
      }
      template.items = cleaned;
    }
    if (typeof isPublic === 'boolean') template.isPublic = isPublic;
    await template.save();
    await template.populate('items.exercise', 'name muscleGroup equipment difficulty');
    return res.json({ template });
  })
);

// Drag-to-reorder: the client sends the exercise item ids in their new
// order; the server re-numbers `order` so the order survives reloads.
router.put(
  '/:id/order',
  auth,
  asyncHandler(async (req, res) => {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (String(template.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the owner can reorder this template' });
    }
    const { itemIds } = req.body || {};
    if (!Array.isArray(itemIds) || itemIds.length !== template.items.length) {
      return res.status(400).json({ error: 'itemIds must list every item exactly once' });
    }
    const byId = new Map(template.items.map((it) => [String(it._id), it]));
    const reordered = [];
    for (const id of itemIds) {
      const item = byId.get(String(id));
      if (!item) return res.status(400).json({ error: 'Unknown item id in order list' });
      reordered.push(item);
    }
    reordered.forEach((item, index) => {
      item.order = index;
    });
    template.items = reordered;
    await template.save();
    return res.json({ template });
  })
);

router.post(
  '/:id/duplicate',
  auth,
  asyncHandler(async (req, res) => {
    const template = await Template.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const isOwner = String(template.user) === String(req.user._id);
    if (!isOwner && !template.isPublic) {
      return res.status(403).json({ error: 'This template is private' });
    }
    const copy = await Template.create({
      user: req.user._id,
      name: `${template.name} (copy)`,
      description: template.description,
      items: template.items.map((it) => ({
        exercise: it.exercise,
        targetSets: it.targetSets,
        targetReps: it.targetReps,
        targetWeight: it.targetWeight,
        order: it.order,
        notes: it.notes,
      })),
      isPublic: false,
    });
    return res.status(201).json({ template: copy });
  })
);

router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (String(template.user) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the owner can delete this template' });
    }
    await template.deleteOne();
    return res.json({ ok: true });
  })
);

module.exports = router;
