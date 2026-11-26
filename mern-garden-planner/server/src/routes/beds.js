const express = require('express');
const Garden = require('../models/Garden');
const Bed = require('../models/Bed');
const Planting = require('../models/Planting');
const { auth } = require('../middleware/auth');
const { bedHarmony, ACTIVE } = require('../utils/garden');

const router = express.Router();

async function canManageGarden(req, gardenId) {
  const garden = await Garden.findById(gardenId);
  if (!garden) return { error: 404 };
  const isMember = garden.members.some((m) => String(m) === String(req.user._id));
  const isCoordinator = String(garden.coordinator) === String(req.user._id);
  if (!isMember && req.user.role !== 'admin') return { error: 403 };
  return { garden, isCoordinator };
}

// Beds of one garden, with live harmony and slot use.
router.get('/gardens/:gardenId/beds', auth, async (req, res) => {
  const check = await canManageGarden(req, req.params.gardenId);
  if (check.error) return res.status(check.error).json({ error: check.error === 404 ? 'Garden not found' : 'You are not a member of this garden' });
  const beds = await Bed.find({ garden: req.params.gardenId }).sort({ ring: 1, angle: 1 });
  const plantings = await Planting.find({ bed: { $in: beds.map((b) => b._id) } }).populate('plant');
  const out = beds.map((bed) => {
    const inBed = plantings.filter((p) => String(p.bed) === String(bed._id));
    return {
      bed,
      plantings: inBed,
      usedSlots: inBed.filter((p) => ACTIVE.includes(p.status)).reduce((n, p) => n + p.quantity, 0),
      harmony: bedHarmony(inBed),
    };
  });
  return res.json({ beds: out });
});

router.post('/gardens/:gardenId/beds', auth, async (req, res) => {
  const check = await canManageGarden(req, req.params.gardenId);
  if (check.error) return res.status(check.error).json({ error: check.error === 404 ? 'Garden not found' : 'You are not a member of this garden' });
  if (!check.isCoordinator && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the garden coordinator adds beds' });
  }
  const { name, ring, angle, slots, soil, sunHours } = req.body || {};
  if (!name || ring == null || angle == null) {
    return res.status(400).json({ error: 'Bed name, ring and angle are required' });
  }
  const existing = await Bed.findOne({ garden: req.params.gardenId, name: String(name).trim() });
  if (existing) return res.status(409).json({ error: 'A bed with this name already exists in this garden' });
  const bed = await Bed.create({
    garden: req.params.gardenId,
    name: String(name).trim(),
    ring: Number(ring),
    angle: Number(angle),
    slots: slots ? Number(slots) : 6,
    soil: soil || 'loam',
    sunHours: sunHours != null ? Number(sunHours) : 6,
  });
  return res.status(201).json({ bed });
});

router.delete('/:id', auth, async (req, res) => {
  const bed = await Bed.findById(req.params.id);
  if (!bed) return res.status(404).json({ error: 'Bed not found' });
  const check = await canManageGarden(req, bed.garden);
  if (check.error) return res.status(check.error).json({ error: 'Garden not found' });
  if (!check.isCoordinator && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the garden coordinator removes beds' });
  }
  const active = await Planting.countDocuments({ bed: bed._id, status: { $in: ACTIVE } });
  if (active > 0) return res.status(409).json({ error: 'This bed still has growing plants — harvest or remove them first' });
  await Planting.deleteMany({ bed: bed._id });
  await bed.deleteOne();
  return res.json({ ok: true });
});

module.exports = router;
