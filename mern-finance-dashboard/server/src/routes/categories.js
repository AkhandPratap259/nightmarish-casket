const express = require('express');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const filter = { user: req.userId };
  if (req.query.kind) filter.kind = req.query.kind;
  const categories = await Category.find(filter).sort({ kind: 1, name: 1 });
  res.json(categories);
});

router.post('/', async (req, res) => {
  try {
    const { name, kind, colour, icon } = req.body || {};
    if (!name || !kind) return res.status(400).json({ error: 'name and kind are required' });
    if (!['income', 'expense'].includes(kind)) {
      return res.status(400).json({ error: 'kind must be income or expense' });
    }
    const category = await Category.create({
      user: req.userId,
      name,
      kind,
      colour: colour || '#0f3d2e',
      icon: icon || '•',
    });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Category already exists' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
