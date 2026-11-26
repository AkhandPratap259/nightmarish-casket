const express = require('express');
const Plant = require('../models/Plant');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public library: anyone signed in can browse plants.
router.get('/', auth, async (req, res) => {
  const { q, category, season, search } = req.query;
  const term = (q || search || '').trim();
  const filter = {};
  if (category) filter.category = category;
  if (season) filter.season = season;
  if (term) {
    filter.$or = [
      { name: new RegExp(term, 'i') },
      { family: new RegExp(term, 'i') },
    ];
  }
  const plants = await Plant.find(filter).sort({ name: 1 });
  return res.json({ plants });
});

router.get('/:id', auth, async (req, res) => {
  const plant = await Plant.findById(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  return res.json({ plant });
});

// Companion lookup: who likes this plant, who fights it.
router.get('/:id/companions', auth, async (req, res) => {
  const plant = await Plant.findById(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  const names = [...plant.companions, ...plant.antagonists];
  const others = await Plant.find({ name: { $in: names } }).sort({ name: 1 });
  const byName = new Map(others.map((p) => [p.name.toLowerCase(), p]));
  const companions = plant.companions.map((n) => byName.get(n.toLowerCase())).filter(Boolean);
  const antagonists = plant.antagonists.map((n) => byName.get(n.toLowerCase())).filter(Boolean);
  return res.json({ plant, companions, antagonists });
});

router.post('/', auth, requireRole('coordinator', 'admin'), async (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.family || !body.category || body.daysToMaturity == null || !body.waterNeed || !body.spacingCm) {
    return res.status(400).json({ error: 'Name, family, category, days to maturity, water need and spacing are required' });
  }
  const existing = await Plant.findOne({ name: new RegExp(`^${String(body.name).trim()}$`, 'i') });
  if (existing) return res.status(409).json({ error: 'A plant with this name is already in the library' });
  const plant = await Plant.create({
    name: String(body.name).trim(),
    family: String(body.family).trim(),
    category: body.category,
    daysToMaturity: Number(body.daysToMaturity),
    waterNeed: Number(body.waterNeed),
    sun: body.sun || 'full',
    spacingCm: Number(body.spacingCm),
    season: body.season || 'all',
    companions: Array.isArray(body.companions) ? body.companions : [],
    antagonists: Array.isArray(body.antagonists) ? body.antagonists : [],
    shape: body.shape || 'circle',
    colour: body.colour || 'green',
    notes: body.notes || '',
  });
  return res.status(201).json({ plant });
});

router.put('/:id', auth, requireRole('coordinator', 'admin'), async (req, res) => {
  const plant = await Plant.findById(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  const updatable = ['name', 'family', 'category', 'daysToMaturity', 'waterNeed', 'sun', 'spacingCm', 'season', 'companions', 'antagonists', 'shape', 'colour', 'notes'];
  for (const key of updatable) {
    if (req.body[key] !== undefined) plant[key] = req.body[key];
  }
  await plant.save();
  return res.json({ plant });
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  const plant = await Plant.findByIdAndDelete(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  return res.json({ ok: true });
});

module.exports = router;
