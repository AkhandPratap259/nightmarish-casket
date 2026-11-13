const express = require('express');
const SavedSearch = require('../models/SavedSearch');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const list = await SavedSearch.find({ user: req.user._id }).sort({ createdAt: -1 });
  return res.json({
    searches: list.map((s) => ({
      id: s._id,
      name: s.name,
      filters: s.filters,
      createdAt: s.createdAt,
    })),
  });
});

router.post('/', auth, async (req, res) => {
  const { name, filters } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Give the saved search a name' });
  const clean = {
    city: filters?.city ? String(filters.city).trim() : '',
    type: filters?.type ? String(filters.type) : '',
    minPrice: filters?.minPrice !== undefined && filters.minPrice !== '' ? Number(filters.minPrice) : null,
    maxPrice: filters?.maxPrice !== undefined && filters.maxPrice !== '' ? Number(filters.maxPrice) : null,
    minBeds: filters?.minBeds !== undefined && filters.minBeds !== '' ? Number(filters.minBeds) : null,
  };
  if ([clean.minPrice, clean.maxPrice, clean.minBeds].some((n) => n !== null && !Number.isFinite(n))) {
    return res.status(400).json({ error: 'Price and beds filters must be numbers' });
  }
  const search = await SavedSearch.create({ user: req.user._id, name: String(name).trim(), filters: clean });
  return res.status(201).json({
    search: { id: search._id, name: search.name, filters: search.filters, createdAt: search.createdAt },
  });
});

router.delete('/:id', auth, async (req, res) => {
  const search = await SavedSearch.findOne({ _id: req.params.id, user: req.user._id });
  if (!search) return res.status(404).json({ error: 'Saved search not found' });
  await search.deleteOne();
  return res.json({ deleted: true });
});

module.exports = router;
