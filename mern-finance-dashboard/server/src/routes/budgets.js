const express = require('express');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const filter = { user: req.userId };
    if (req.query.month) filter.month = req.query.month;
    const budgets = await Budget.find(filter).populate('category', 'name kind colour icon');
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert by user + month + category.
async function upsertBudget(req, res) {
  try {
    const { month, category, limit } = req.body || {};
    const value = Number(limit);
    if (!month || !category || value === undefined || value === null || value < 0) {
      return res.status(400).json({ error: 'month, category and a non-negative limit are required' });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month must be YYYY-MM' });
    const budget = await Budget.findOneAndUpdate(
      { user: req.userId, month, category },
      { limit: value },
      { new: true, upsert: true, runValidators: true }
    ).populate('category', 'name kind colour icon');
    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/', upsertBudget);
router.put('/', upsertBudget);

router.delete('/:id', async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!budget) return res.status(404).json({ error: 'Budget not found' });
  res.json({ deleted: true });
});

module.exports = router;
