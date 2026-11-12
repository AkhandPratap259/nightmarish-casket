const express = require('express');
const Trip = require('../models/Trip');
const Activity = require('../models/Activity');
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

function validDay(trip, dayIndex) {
  return Number.isInteger(dayIndex) && dayIndex >= 0 && dayIndex < trip.dayCount();
}

router.get('/', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const activities = await Activity.find({ trip: trip._id }).sort({ dayIndex: 1, order: 1, startTime: 1 });
  return res.json({ activities });
});

router.post('/', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const { dayIndex, title, category, startTime, endTime, cost, notes } = req.body || {};
  if (title === undefined || startTime === undefined || endTime === undefined || dayIndex === undefined) {
    return res.status(400).json({ error: 'Day, title, start time and end time are required' });
  }
  if (!validDay(trip, Number(dayIndex))) {
    return res.status(400).json({ error: 'That day is outside this trip' });
  }
  const clash = await Activity.overlaps(trip._id, Number(dayIndex), startTime, endTime, null);
  if (clash.invalid) return res.status(409).json({ error: clash.reason });
  const maxOrder = await Activity.findOne({ trip: trip._id, dayIndex: Number(dayIndex) }).sort({ order: -1 });
  const activity = await Activity.create({
    trip: trip._id,
    dayIndex: Number(dayIndex),
    title: title.trim(),
    category: category || 'sightseeing',
    startTime,
    endTime,
    cost: Math.max(0, Number(cost) || 0),
    notes: notes || '',
    order: (maxOrder ? maxOrder.order : -1) + 1,
    createdBy: req.user._id,
  });
  emitTrip(trip._id, 'activity:created', { activity });
  return res.status(201).json({ activity });
});

router.patch('/:activityId', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const activity = await Activity.findOne({ _id: req.params.activityId, trip: trip._id });
  if (!activity) return res.status(404).json({ error: 'Activity not found' });
  const next = {
    dayIndex: req.body.dayIndex !== undefined ? Number(req.body.dayIndex) : activity.dayIndex,
    title: req.body.title !== undefined ? req.body.title.trim() : activity.title,
    category: req.body.category || activity.category,
    startTime: req.body.startTime || activity.startTime,
    endTime: req.body.endTime || activity.endTime,
    cost: req.body.cost !== undefined ? Math.max(0, Number(req.body.cost) || 0) : activity.cost,
    notes: req.body.notes !== undefined ? req.body.notes : activity.notes,
  };
  if (!validDay(trip, next.dayIndex)) {
    return res.status(400).json({ error: 'That day is outside this trip' });
  }
  const clash = await Activity.overlaps(trip._id, next.dayIndex, next.startTime, next.endTime, activity._id);
  if (clash.invalid) return res.status(409).json({ error: clash.reason });
  Object.assign(activity, next);
  await activity.save();
  emitTrip(trip._id, 'activity:updated', { activity });
  return res.json({ activity });
});

// Drag-and-drop reorder: the client sends the ordered activity ids for one day.
router.post('/reorder', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const { dayIndex, orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds) || !validDay(trip, Number(dayIndex))) {
    return res.status(400).json({ error: 'A day and an ordered list of activity ids are required' });
  }
  const ops = orderedIds.map((id, i) =>
    Activity.updateOne({ _id: id, trip: trip._id, dayIndex: Number(dayIndex) }, { order: i })
  );
  await Promise.all(ops);
  const activities = await Activity.find({ trip: trip._id, dayIndex: Number(dayIndex) }).sort({ order: 1 });
  emitTrip(trip._id, 'activity:reordered', { dayIndex: Number(dayIndex), activities });
  return res.json({ activities });
});

router.delete('/:activityId', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!requireEdit(req, res)) return;
  const activity = await Activity.findOneAndDelete({ _id: req.params.activityId, trip: trip._id });
  if (!activity) return res.status(404).json({ error: 'Activity not found' });
  emitTrip(trip._id, 'activity:deleted', { activityId: activity._id, dayIndex: activity.dayIndex });
  return res.json({ ok: true });
});

module.exports = router;
