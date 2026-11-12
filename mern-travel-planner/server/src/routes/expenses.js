const express = require('express');
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
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
  const expenses = await Expense.find({ trip: trip._id }).sort({ dayIndex: 1, createdAt: 1 });
  return res.json({ expenses });
});

router.post('/', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const { dayIndex, title, category, amount, activity, notes } = req.body || {};
  if (title === undefined || amount === undefined || dayIndex === undefined) {
    return res.status(400).json({ error: 'Day, title and amount are required' });
  }
  const day = Number(dayIndex);
  if (!Number.isInteger(day) || day < 0 || day >= trip.dayCount()) {
    return res.status(400).json({ error: 'That day is outside this trip' });
  }
  if (Number(amount) < 0) return res.status(400).json({ error: 'Amount cannot be negative' });
  const expense = await Expense.create({
    trip: trip._id,
    dayIndex: day,
    title: title.trim(),
    category: category || 'other',
    amount: Number(amount),
    activity: activity || null,
    notes: notes || '',
    createdBy: req.user._id,
  });
  emitTrip(trip._id, 'expense:created', { expense });
  return res.status(201).json({ expense });
});

router.patch('/:expenseId', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const expense = await Expense.findOne({ _id: req.params.expenseId, trip: trip._id });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  if (req.body.title !== undefined) expense.title = req.body.title.trim();
  if (req.body.category) expense.category = req.body.category;
  if (req.body.amount !== undefined) {
    if (Number(req.body.amount) < 0) return res.status(400).json({ error: 'Amount cannot be negative' });
    expense.amount = Number(req.body.amount);
  }
  if (req.body.dayIndex !== undefined) {
    const day = Number(req.body.dayIndex);
    if (!Number.isInteger(day) || day < 0 || day >= trip.dayCount()) {
      return res.status(400).json({ error: 'That day is outside this trip' });
    }
    expense.dayIndex = day;
  }
  if (req.body.notes !== undefined) expense.notes = req.body.notes;
  await expense.save();
  emitTrip(trip._id, 'expense:updated', { expense });
  return res.json({ expense });
});

router.delete('/:expenseId', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const expense = await Expense.findOneAndDelete({ _id: req.params.expenseId, trip: trip._id });
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  emitTrip(trip._id, 'expense:deleted', { expenseId: expense._id });
  return res.json({ ok: true });
});

module.exports = router;
