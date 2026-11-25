const express = require('express');
const Material = require('../models/Material');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const q = {};
  if (req.query.category) q.category = req.query.category;
  if (req.query.search) q.name = new RegExp(req.query.search, 'i');
  res.json(await Material.find(q).sort({ category: 1, name: 1 }));
});

router.post('/', requireRole('admin'), async (req, res) => {
  try { res.status(201).json(await Material.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  const m = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!m) return res.status(404).json({ message: 'Material not found' });
  res.json(m);
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const m = await Material.findByIdAndDelete(req.params.id);
  if (!m) return res.status(404).json({ message: 'Material not found' });
  res.json({ message: 'Material deleted' });
});

module.exports = router;
