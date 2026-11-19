const express = require('express');
const Service = require('../models/Service');
const { CATEGORIES } = require('../models/Service');

const router = express.Router();

// Public catalogue of service categories and services.
router.get('/', async (req, res) => {
  const { category } = req.query;
  const filter = {};
  if (category) filter.category = category;
  const services = await Service.find(filter).sort({ category: 1, name: 1 }).lean();
  res.json({ services, categories: CATEGORIES });
});

router.get('/:id', async (req, res) => {
  const service = await Service.findById(req.params.id).lean();
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json({ service });
});

module.exports = router;
