const express = require('express');
const Bed = require('../models/Bed');
const Plant = require('../models/Plant');
const Planting = require('../models/Planting');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');
const { emitToGarden } = require('../utils/notify');
const {
  ACTIVE, scoreAgainst, growthStage, daysUntilHarvest, nextWateringDate, wateringDue,
} = require('../utils/garden');

const router = express.Router();

function enrich(p) {
  const obj = p.toObject ? p.toObject() : p;
  const plant = obj.plant || {};
  return {
    ...obj,
    stage: growthStage(obj, plant),
    daysUntilHarvest: daysUntilHarvest(obj, plant),
    nextWatering: nextWateringDate(obj, plant),
    wateringDue: wateringDue(obj, plant),
  };
}

// Plantings in one bed, with computed stage / watering state.
router.get('/beds/:bedId/plantings', auth, async (req, res) => {
  const plantings = await Planting.find({ bed: req.params.bedId })
    .populate('plant')
    .populate('gardener', 'name')
    .sort({ createdAt: -1 });
  return res.json({ plantings: plantings.map(enrich) });
});

// My plantings across all gardens.
router.get('/mine', auth, async (req, res) => {
  const plantings = await Planting.find({ gardener: req.user._id })
    .populate('plant')
    .populate({ path: 'bed', populate: { path: 'garden', select: 'name' } })
    .sort({ sownDate: -1 });
  return res.json({ plantings: plantings.map(enrich) });
});

// Sow a plant into a bed. The harmony engine runs first:
// - antagonist neighbour -> 409 naming the conflicting plant (nothing sown)
// - full bed -> 409
// - companion neighbours -> 201 with boosts listed, harmony returned
router.post('/beds/:bedId/plantings', auth, async (req, res) => {
  const { plantId, quantity, sownDate, notes } = req.body || {};
  if (!plantId) return res.status(400).json({ error: 'plantId is required' });
  const bed = await Bed.findById(req.params.bedId).populate('garden');
  if (!bed) return res.status(404).json({ error: 'Bed not found' });
  const plant = await Plant.findById(plantId);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });

  const neighbours = await Planting.find({ bed: bed._id, status: { $in: ACTIVE } }).populate('plant');
  const used = neighbours.reduce((n, p) => n + p.quantity, 0);
  const qty = quantity ? Number(quantity) : 1;
  if (used + qty > bed.slots) {
    return res.status(409).json({ error: `This bed has ${bed.slots - used} free slot(s) — ${qty} will not fit` });
  }

  const check = scoreAgainst(plant, neighbours.map((p) => p.plant));
  if (check.conflicts.length > 0) {
    return res.status(409).json({
      error: `${plant.name} does not grow well next to ${check.conflicts.join(', ')} in this bed`,
      conflicts: check.conflicts,
      harmony: check.score,
    });
  }

  // One active row per plant per bed: sowing the same plant twice is a
  // quantity change, not a second row. Refuse it cleanly instead of
  // letting the unique index throw (an uncaught throw kills the process).
  const existing = neighbours.find((p) => String(p.plant._id) === String(plant._id));
  if (existing) {
    return res.status(409).json({
      error: `${plant.name} is already growing in this bed (×${existing.quantity}) — harvest it or sow it in another bed`,
    });
  }

  let planting;
  try {
    planting = await Planting.create({
      bed: bed._id,
      plant: plant._id,
      gardener: req.user._id,
      quantity: qty,
      sownDate: sownDate ? new Date(sownDate) : new Date(),
      notes: notes || '',
    });
  } catch (err) {
    // Race backstop: two gardeners sowing the same plant at once.
    if (err && err.code === 11000) {
      return res.status(409).json({ error: `${plant.name} is already growing in this bed` });
    }
    throw err;
  }
  const populated = await Planting.findById(planting._id).populate('plant').populate('gardener', 'name');
  // A watering task appears automatically on the planting's first due date.
  await Task.create({
    garden: bed.garden._id,
    planting: planting._id,
    bed: bed._id,
    kind: 'water',
    title: `Water ${plant.name} in ${bed.name}`,
    dueDate: nextWateringDate(populated, plant),
    createdBy: req.user._id,
    assignee: req.user._id,
  });
  emitToGarden(bed.garden._id, 'planting:sown', { planting: enrich(populated), harmony: check.score, boosts: check.boosts });
  return res.status(201).json({ planting: enrich(populated), harmony: check.score, boosts: check.boosts });
});

router.get('/:id', auth, async (req, res) => {
  const planting = await Planting.findById(req.params.id)
    .populate('plant')
    .populate('gardener', 'name')
    .populate({ path: 'bed', populate: { path: 'garden', select: 'name' } });
  if (!planting) return res.status(404).json({ error: 'Planting not found' });
  const neighbours = await Planting.find({ bed: planting.bed._id, status: { $in: ACTIVE }, _id: { $ne: planting._id } }).populate('plant');
  const harmony = scoreAgainst(planting.plant, neighbours.map((p) => p.plant));
  return res.json({ planting: enrich(planting), neighbours: neighbours.map(enrich), harmony });
});

// Water a planting: stamps lastWatered and re-schedules its watering task.
router.post('/:id/water', auth, async (req, res) => {
  const planting = await Planting.findById(req.params.id).populate('plant').populate('bed');
  if (!planting) return res.status(404).json({ error: 'Planting not found' });
  if (!ACTIVE.includes(planting.status)) {
    return res.status(409).json({ error: 'Only a growing planting can be watered' });
  }
  planting.lastWatered = new Date();
  await planting.save();
  await Task.updateMany(
    { planting: planting._id, kind: 'water', status: 'open' },
    { $set: { status: 'done' } }
  );
  await Task.create({
    garden: planting.bed.garden,
    planting: planting._id,
    bed: planting.bed._id,
    kind: 'water',
    title: `Water ${planting.plant.name} in ${planting.bed.name}`,
    dueDate: nextWateringDate(planting, planting.plant),
    createdBy: req.user._id,
    assignee: req.user._id,
  });
  emitToGarden(planting.bed.garden, 'planting:watered', { planting: enrich(planting) });
  return res.json({ planting: enrich(planting) });
});

// Harvest: closes the planting and records the yield in notes.
router.post('/:id/harvest', auth, async (req, res) => {
  const planting = await Planting.findById(req.params.id).populate('plant').populate('bed');
  if (!planting) return res.status(404).json({ error: 'Planting not found' });
  if (!ACTIVE.includes(planting.status)) {
    return res.status(409).json({ error: 'This planting is already finished' });
  }
  planting.status = 'harvested';
  if (req.body && req.body.notes) planting.notes = req.body.notes;
  await planting.save();
  await Task.updateMany({ planting: planting._id, status: 'open' }, { $set: { status: 'done' } });
  emitToGarden(planting.bed.garden, 'planting:harvested', { planting: enrich(planting) });
  return res.json({ planting: enrich(planting) });
});

router.post('/:id/lost', auth, async (req, res) => {
  const planting = await Planting.findById(req.params.id).populate('plant').populate('bed');
  if (!planting) return res.status(404).json({ error: 'Planting not found' });
  if (!ACTIVE.includes(planting.status)) {
    return res.status(409).json({ error: 'This planting is already finished' });
  }
  planting.status = 'lost';
  await planting.save();
  await Task.updateMany({ planting: planting._id, status: 'open' }, { $set: { status: 'skipped' } });
  emitToGarden(planting.bed.garden, 'planting:lost', { planting: enrich(planting) });
  return res.json({ planting: enrich(planting) });
});

router.delete('/:id', auth, async (req, res) => {
  const planting = await Planting.findById(req.params.id).populate('bed');
  if (!planting) return res.status(404).json({ error: 'Planting not found' });
  const isOwner = String(planting.gardener) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the gardener who sowed it can remove it' });
  }
  await Task.deleteMany({ planting: planting._id });
  await planting.deleteOne();
  emitToGarden(planting.bed.garden, 'planting:removed', { plantingId: planting._id });
  return res.json({ ok: true });
});

module.exports = router;
