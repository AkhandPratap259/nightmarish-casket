const express = require('express');
const Offering = require('../models/Offering');
const { AREAS } = require('../models/Offering');
const Service = require('../models/Service');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');
const { getProviderStats, computeMatchScore } = require('../utils/providerStats');

const router = express.Router();

function median(numbers) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Attach match scores to a list of populated offerings. Scores are computed
// per service: the price part compares against the median price of all
// active offerings for that same service.
async function withScores(offerings, customerArea) {
  const byService = {};
  for (const o of offerings) {
    const key = String(o.service._id || o.service);
    byService[key] = byService[key] || [];
    byService[key].push(o.price);
  }
  const providerIds = [...new Set(offerings.map((o) => String(o.provider._id || o.provider)))];
  const statsByProvider = {};
  await Promise.all(
    providerIds.map(async (id) => {
      statsByProvider[id] = await getProviderStats(id);
    })
  );
  return offerings.map((o) => {
    const providerId = String(o.provider._id || o.provider);
    const serviceId = String(o.service._id || o.service);
    const stats = statsByProvider[providerId];
    const servesArea = customerArea ? o.areas.includes(customerArea) : null;
    const match = computeMatchScore(stats, o.price, median(byService[serviceId]), servesArea);
    return { ...o, providerStats: stats, matchScore: match.score, matchParts: match.parts };
  });
}

// GET /api/offerings?service=&category=&area=&q=&sort=match|price-asc|price-desc
// Sorted by match score by default — the marketplace's ranking engine.
router.get('/', optionalAuth, async (req, res) => {
  const { service, category, area, q, sort } = req.query;
  const filter = { active: true };
  if (service) filter.service = service;
  if (area) filter.areas = area;
  let offerings = await Offering.find(filter)
    .populate('service')
    .populate('provider', 'name bio yearsExperience city avatarColor')
    .lean();
  if (category) {
    offerings = offerings.filter((o) => o.service && o.service.category === category);
  }
  if (q) {
    const needle = String(q).toLowerCase();
    offerings = offerings.filter(
      (o) =>
        (o.service && o.service.name.toLowerCase().includes(needle)) ||
        (o.provider && o.provider.name.toLowerCase().includes(needle)) ||
        (o.bio && o.bio.toLowerCase().includes(needle))
    );
  }
  const customerArea = area || (req.user ? req.user.city : null);
  const scored = await withScores(offerings, customerArea);
  if (sort === 'price-asc') scored.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') scored.sort((a, b) => b.price - a.price);
  else scored.sort((a, b) => b.matchScore - a.matchScore);
  res.json({ offerings: scored, areas: AREAS });
});

// The signed-in provider's own offerings (including inactive ones).
router.get('/mine', auth, requireRole('provider'), async (req, res) => {
  const offerings = await Offering.find({ provider: req.user._id })
    .populate('service')
    .sort({ createdAt: -1 })
    .lean();
  const stats = await getProviderStats(req.user._id);
  res.json({ offerings, providerStats: stats });
});

router.get('/:id', optionalAuth, async (req, res) => {
  const offering = await Offering.findById(req.params.id)
    .populate('service')
    .populate('provider', 'name bio yearsExperience city avatarColor phone')
    .lean();
  if (!offering) return res.status(404).json({ error: 'Offering not found' });
  const [scored] = await withScores([offering], req.query.area || (req.user ? req.user.city : null));
  res.json({ offering: scored });
});

router.post('/', auth, requireRole('provider'), async (req, res) => {
  const { service, price, durationMin, areas, bio } = req.body || {};
  if (!service || price === undefined || !durationMin) {
    return res.status(400).json({ error: 'Service, price and duration are required' });
  }
  const found = await Service.findById(service);
  if (!found) return res.status(404).json({ error: 'Service not found' });
  if (Number(price) < 0 || Number(durationMin) < 15) {
    return res.status(400).json({ error: 'Price and duration are not valid' });
  }
  const cleanAreas = Array.isArray(areas) ? areas.filter((a) => AREAS.includes(a)) : [];
  const offering = await Offering.create({
    provider: req.user._id,
    service,
    price: Number(price),
    durationMin: Number(durationMin),
    areas: cleanAreas,
    bio: bio ? String(bio).trim() : '',
  });
  const populated = await offering.populate('service');
  res.status(201).json({ offering: populated });
});

router.put('/:id', auth, requireRole('provider'), async (req, res) => {
  const offering = await Offering.findById(req.params.id);
  if (!offering) return res.status(404).json({ error: 'Offering not found' });
  if (String(offering.provider) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Only the offering owner can edit it' });
  }
  const { price, durationMin, areas, bio, active } = req.body || {};
  if (price !== undefined) offering.price = Number(price);
  if (durationMin !== undefined) offering.durationMin = Number(durationMin);
  if (Array.isArray(areas)) offering.areas = areas.filter((a) => AREAS.includes(a));
  if (bio !== undefined) offering.bio = String(bio).trim();
  if (active !== undefined) offering.active = Boolean(active);
  await offering.save();
  const populated = await offering.populate('service');
  res.json({ offering: populated });
});

router.delete('/:id', auth, requireRole('provider', 'admin'), async (req, res) => {
  const offering = await Offering.findById(req.params.id);
  if (!offering) return res.status(404).json({ error: 'Offering not found' });
  if (req.user.role === 'provider' && String(offering.provider) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Only the offering owner can delete it' });
  }
  await offering.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
