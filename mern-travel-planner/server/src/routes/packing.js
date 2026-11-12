const express = require('express');
const Trip = require('../models/Trip');
const PackingItem = require('../models/PackingItem');
const { PACKING_TEMPLATE } = require('../models/PackingItem');
const { auth } = require('../middleware/auth');
const { emitTrip } = require('../utils/notify');

const router = express.Router({ mergeParams: true });

async function loadTrip(req, res) {
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return null;
  }
  const isOwner = trip.owner.equals(req.user._id);
  const collab = trip.collaborators.find((c) => c.user.equals(req.user._id));
  if (!isOwner && !collab) {
    res.status(403).json({ error: 'This trip is not shared with you' });
    return null;
  }
  req.trip = trip;
  req.canEdit = isOwner || (collab && collab.role === 'editor');
  return trip;
}

function requireEdit(req, res) {
  if (!req.canEdit) {
    res.status(403).json({ error: 'Viewers cannot edit this trip' });
    return false;
  }
  return true;
}

router.get('/', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const items = await PackingItem.find({ trip: trip._id }).sort({ order: 1, createdAt: 1 });
  return res.json({ items });
});

router.post('/', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const { label, category } = req.body || {};
  if (!label) return res.status(400).json({ error: 'An item label is required' });
  const last = await PackingItem.findOne({ trip: trip._id }).sort({ order: -1 });
  const item = await PackingItem.create({
    trip: trip._id,
    label: label.trim(),
    category: category || 'other',
    order: (last ? last.order : -1) + 1,
  });
  emitTrip(trip._id, 'packing:updated', { item });
  return res.status(201).json({ item });
});

// Add the essentials template, skipping labels already on the list.
router.post('/template', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const existing = await PackingItem.find({ trip: trip._id });
  const have = new Set(existing.map((i) => i.label.toLowerCase()));
  const fresh = PACKING_TEMPLATE.filter((t) => !have.has(t.label.toLowerCase()));
  let order = existing.length ? Math.max(...existing.map((i) => i.order)) + 1 : 0;
  const created = [];
  for (const t of fresh) {
    created.push(await PackingItem.create({ trip: trip._id, label: t.label, category: t.category, order: order++ }));
  }
  const items = await PackingItem.find({ trip: trip._id }).sort({ order: 1, createdAt: 1 });
  emitTrip(trip._id, 'packing:updated', { items });
  return res.status(201).json({ items, added: created.length });
});

router.patch('/:itemId', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const item = await PackingItem.findOne({ _id: req.params.itemId, trip: trip._id });
  if (!item) return res.status(404).json({ error: 'Packing item not found' });
  if (req.body.label !== undefined) item.label = req.body.label.trim();
  if (req.body.category) item.category = req.body.category;
  if (req.body.checked !== undefined) item.checked = Boolean(req.body.checked);
  await item.save();
  emitTrip(trip._id, 'packing:updated', { item });
  return res.json({ item });
});

router.delete('/:itemId', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const item = await PackingItem.findOneAndDelete({ _id: req.params.itemId, trip: trip._id });
  if (!item) return res.status(404).json({ error: 'Packing item not found' });
  emitTrip(trip._id, 'packing:updated', { deletedId: item._id });
  return res.json({ ok: true });
});

module.exports = router;
