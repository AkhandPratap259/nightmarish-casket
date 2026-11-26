const express = require('express');
const Garden = require('../models/Garden');
const Bed = require('../models/Bed');
const Planting = require('../models/Planting');
const { auth, requireRole } = require('../middleware/auth');
const { bedHarmony, ACTIVE } = require('../utils/garden');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const gardens = await Garden.find({
    $or: [{ coordinator: req.user._id }, { members: req.user._id }],
  })
    .populate('coordinator', 'name email')
    .sort({ createdAt: -1 });
  return res.json({ gardens });
});

router.post('/', auth, async (req, res) => {
  const { name, location, description, rings } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Garden name is required' });
  const garden = await Garden.create({
    name: String(name).trim(),
    location: location || '',
    description: description || '',
    rings: rings ? Number(rings) : 2,
    coordinator: req.user._id,
    members: [req.user._id],
  });
  return res.status(201).json({ garden });
});

router.get('/:id', auth, async (req, res) => {
  const garden = await Garden.findById(req.params.id).populate('coordinator', 'name email').populate('members', 'name email role');
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  const beds = await Bed.find({ garden: garden._id }).sort({ ring: 1, angle: 1 });
  const plantings = await Planting.find({ bed: { $in: beds.map((b) => b._id) } }).populate('plant').populate('gardener', 'name');
  const byBed = {};
  for (const bed of beds) {
    const inBed = plantings.filter((p) => String(p.bed) === String(bed._id));
    byBed[String(bed._id)] = {
      bed,
      plantings: inBed,
      usedSlots: inBed.filter((p) => ACTIVE.includes(p.status)).reduce((n, p) => n + p.quantity, 0),
      harmony: bedHarmony(inBed),
    };
  }
  return res.json({ garden, beds: beds.map((b) => byBed[String(b._id)]) });
});

router.put('/:id', auth, async (req, res) => {
  const garden = await Garden.findById(req.params.id);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  const isCoordinator = String(garden.coordinator) === String(req.user._id);
  if (!isCoordinator && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the garden coordinator can edit it' });
  }
  for (const key of ['name', 'location', 'description', 'rings']) {
    if (req.body[key] !== undefined) garden[key] = req.body[key];
  }
  await garden.save();
  return res.json({ garden });
});

router.delete('/:id', auth, async (req, res) => {
  const garden = await Garden.findById(req.params.id);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  const isCoordinator = String(garden.coordinator) === String(req.user._id);
  if (!isCoordinator && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the garden coordinator can delete it' });
  }
  const beds = await Bed.find({ garden: garden._id });
  await Planting.deleteMany({ bed: { $in: beds.map((b) => b._id) } });
  await Bed.deleteMany({ garden: garden._id });
  await garden.deleteOne();
  return res.json({ ok: true });
});

// Join a garden as a member (any signed-in gardener).
router.post('/:id/join', auth, async (req, res) => {
  const garden = await Garden.findById(req.params.id);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  if (!garden.members.some((m) => String(m) === String(req.user._id))) {
    garden.members.push(req.user._id);
    await garden.save();
  }
  return res.json({ garden });
});

module.exports = router;
