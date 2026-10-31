const express = require('express');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public: list with search, category filter, sort and pagination.
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(24, Math.max(1, parseInt(req.query.limit || '12', 10)));
    const filter = {};
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
    if (req.query.category && req.query.category !== 'All') filter.category = req.query.category;
    const sortMap = { 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, newest: { createdAt: -1 }, rating: { rating: -1 } };
    const sort = sortMap[req.query.sort] || { createdAt: -1 };
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    const categories = await Product.distinct('category');
    return res.json({ products, total, page, pages: Math.ceil(total / limit), categories: ['All', ...categories.sort()] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  return res.json({ product });
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    return res.status(201).json({ product });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  return res.json({ product });
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  return res.json({ message: 'Product deleted' });
});

module.exports = router;
