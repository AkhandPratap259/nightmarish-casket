const express = require('express');
const Contractor = require('../models/Contractor');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const q = {};
  if (req.query.trade) q.trade = new RegExp(req.query.trade, 'i');
  res.json(await Contractor.find(q).sort({ rating: -1, name: 1 }));
});

router.post('/', async (req, res) => {
  try { res.status(201).json(await Contractor.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', async (req, res) => {
  const c = await Contractor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!c) return res.status(404).json({ message: 'Contractor not found' });
  res.json(c);
});

router.delete('/:id', async (req, res) => {
  const c = await Contractor.findByIdAndDelete(req.params.id);
  if (!c) return res.status(404).json({ message: 'Contractor not found' });
  res.json({ message: 'Contractor deleted' });
});

module.exports = router;
