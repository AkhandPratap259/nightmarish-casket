const express = require('express');
const User = require('../models/User');
const Offering = require('../models/Offering');
const { getProviderStats } = require('../utils/providerStats');

const router = express.Router();

// Public provider directory with live stats.
router.get('/', async (req, res) => {
  const providers = await User.find({ role: 'provider', active: true })
    .select('name bio yearsExperience city avatarColor')
    .sort({ name: 1 })
    .lean();
  const withStats = await Promise.all(
    providers.map(async (p) => ({ ...p, stats: await getProviderStats(p._id) }))
  );
  res.json({ providers: withStats });
});

router.get('/:id', async (req, res) => {
  const provider = await User.findOne({ _id: req.params.id, role: 'provider' })
    .select('name bio yearsExperience city avatarColor phone')
    .lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  const stats = await getProviderStats(provider._id);
  const offerings = await Offering.find({ provider: provider._id, active: true })
    .populate('service')
    .lean();
  res.json({ provider: { ...provider, stats }, offerings });
});

module.exports = router;
