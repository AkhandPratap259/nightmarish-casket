const express = require('express');
const Goal = require('../models/Goal');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const goals = await Goal.find({ user: req.userId }).sort({ createdAt: 1 });
  res.json(goals);
});

router.post('/', async (req, res) => {
  try {
    const { name, targetAmount, savedAmount, deadline, colour } = req.body || {};
    const target = Number(targetAmount);
    if (!name || !target || target <= 0) {
      return res.status(400).json({ error: 'name and a positive targetAmount are required' });
    }
    const goal = await Goal.create({
      user: req.userId,
      name,
      targetAmount: target,
      savedAmount: Math.max(0, Number(savedAmount) || 0),
      deadline: deadline ? new Date(deadline) : undefined,
      colour: colour || '#c9a227',
    });
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add money to a goal, capped at the target amount.
router.post('/:id/contribute', async (req, res) => {
  try {
    const amount = Number((req.body || {}).amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'a positive amount is required' });
    const goal = await Goal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    goal.savedAmount = Math.min(goal.targetAmount, goal.savedAmount + amount);
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  res.json({ deleted: true });
});

module.exports = router;
