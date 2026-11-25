const express = require('express');
const Quote = require('../models/Quote');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/task/:taskId', async (req, res) => {
  const quotes = await Quote.find({ task: req.params.taskId }).populate('contractor', 'name trade phone rating').sort({ createdAt: -1 });
  res.json(quotes);
});

router.post('/', async (req, res) => {
  try {
    const { task, contractor, amount, note } = req.body;
    const found = await Task.findById(task);
    if (!found) return res.status(404).json({ message: 'Task not found' });
    const quote = await Quote.create({ task, contractor, amount, note });
    await quote.populate('contractor', 'name trade');
    req.io?.to(`project:${found.project}`).emit('quote-added', { taskId: task, amount, contractor: quote.contractor?.name, at: new Date() });
    req.io?.to(`project:${found.project}`).emit('activity', { type: 'quote-added', taskId: task, amount, contractor: quote.contractor?.name, at: new Date() });
    res.status(201).json(quote);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', async (req, res) => {
  const q = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!q) return res.status(404).json({ message: 'Quote not found' });
  res.json(q);
});

module.exports = router;
