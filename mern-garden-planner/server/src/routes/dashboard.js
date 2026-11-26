const express = require('express');
const Garden = require('../models/Garden');
const Bed = require('../models/Bed');
const Planting = require('../models/Planting');
const Plant = require('../models/Plant');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');
const {
  ACTIVE, bedHarmony, growthStage, daysUntilHarvest, wateringDue,
} = require('../utils/garden');

const router = express.Router();

// Garden analytics, all computed from live data — no invented numbers.
// - beds: utilisation + harmony per bed
// - harvest: expected harvests in the next 14 / 30 days, by plant
// - watering: plantings due for water right now
// - tasks: open / overdue counts
router.get('/gardens/:gardenId', auth, async (req, res) => {
  const garden = await Garden.findById(req.params.gardenId);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  const beds = await Bed.find({ garden: garden._id });
  const plantings = await Planting.find({ bed: { $in: beds.map((b) => b._id) } }).populate('plant');
  const active = plantings.filter((p) => ACTIVE.includes(p.status));

  const bedStats = beds.map((bed) => {
    const inBed = plantings.filter((p) => String(p.bed) === String(bed._id));
    const used = inBed.filter((p) => ACTIVE.includes(p.status)).reduce((n, p) => n + p.quantity, 0);
    return {
      bedId: bed._id,
      name: bed.name,
      ring: bed.ring,
      slots: bed.slots,
      used,
      utilisation: bed.slots ? Math.round((used / bed.slots) * 100) : 0,
      harmony: bedHarmony(inBed),
      plants: inBed.filter((p) => ACTIVE.includes(p.status)).length,
    };
  });

  const now = Date.now();
  const harvestSoon = active
    .map((p) => ({ planting: p, days: daysUntilHarvest(p, p.plant) }))
    .filter((x) => x.days <= 30)
    .sort((a, b) => a.days - b.days)
    .map((x) => ({
      plantingId: x.planting._id,
      plant: x.planting.plant.name,
      bed: beds.find((b) => String(b._id) === String(x.planting.bed))?.name || '',
      days: x.days,
      stage: growthStage(x.planting, x.planting.plant),
    }));

  const wateringDueList = active
    .filter((p) => wateringDue(p, p.plant))
    .map((p) => ({
      plantingId: p._id,
      plant: p.plant.name,
      bed: beds.find((b) => String(b._id) === String(p.bed))?.name || '',
      lastWatered: p.lastWatered,
    }));

  const openTasks = await Task.countDocuments({ garden: garden._id, status: 'open' });
  const overdueTasks = await Task.countDocuments({
    garden: garden._id, status: 'open', dueDate: { $lt: new Date(now) },
  });

  const byCategory = {};
  for (const p of active) {
    const c = p.plant.category;
    byCategory[c] = (byCategory[c] || 0) + p.quantity;
  }

  return res.json({
    garden: { id: garden._id, name: garden.name },
    totals: {
      beds: beds.length,
      activePlantings: active.length,
      harvested: plantings.filter((p) => p.status === 'harvested').length,
      openTasks,
      overdueTasks,
    },
    bedStats,
    harvestSoon,
    wateringDue: wateringDueList,
    byCategory,
  });
});

// Personal dashboard: my gardens, my plantings, my open tasks.
router.get('/me', auth, async (req, res) => {
  const gardens = await Garden.find({
    $or: [{ coordinator: req.user._id }, { members: req.user._id }],
  }).sort({ createdAt: -1 });
  const gardenIds = gardens.map((g) => g._id);
  const beds = await Bed.find({ garden: { $in: gardenIds } });
  const myPlantings = await Planting.find({ gardener: req.user._id })
    .populate('plant')
    .populate({ path: 'bed', populate: { path: 'garden', select: 'name' } })
    .sort({ sownDate: -1 })
    .limit(12);
  const myTasks = await Task.find({ assignee: req.user._id, status: 'open' })
    .populate('bed', 'name')
    .sort({ dueDate: 1 })
    .limit(10);
  const plantCount = await Plant.countDocuments();
  return res.json({
    gardens,
    myPlantings: myPlantings.map((p) => ({
      ...p.toObject(),
      stage: growthStage(p, p.plant),
      daysUntilHarvest: daysUntilHarvest(p, p.plant),
      wateringDue: wateringDue(p, p.plant),
    })),
    myTasks,
    plantCount,
    bedCount: beds.length,
  });
});

module.exports = router;
