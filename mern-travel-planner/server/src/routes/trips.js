const express = require('express');
const Trip = require('../models/Trip');
const Activity = require('../models/Activity');
const Expense = require('../models/Expense');
const PackingItem = require('../models/PackingItem');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { emitTrip } = require('../utils/notify');

const router = express.Router();

// Load a trip the caller owns or collaborates on; null when not found / no access.
async function loadTrip(req, res) {
  const trip = await Trip.findById(req.params.id).populate('collaborators.user', 'name email');
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return null;
  }
  const isOwner = trip.owner.equals(req.user._id);
  const collab = trip.collaborators.find((c) => c.user._id.equals(req.user._id));
  if (!isOwner && !collab) {
    res.status(403).json({ error: 'This trip is not shared with you' });
    return null;
  }
  req.trip = trip;
  req.isOwner = isOwner;
  req.collabRole = collab ? collab.role : null;
  return trip;
}

function canEdit(req) {
  return req.isOwner || req.collabRole === 'editor';
}

function tripView(trip) {
  return {
    id: trip._id,
    title: trip.title,
    destination: trip.destination,
    country: trip.country,
    startDate: trip.startDate,
    endDate: trip.endDate,
    dayCount: trip.dayCount(),
    budget: trip.budget,
    travellers: trip.travellers,
    notes: trip.notes,
    coverStyle: trip.coverStyle,
    status: trip.status,
    owner: trip.owner,
    collaborators: trip.collaborators.map((c) => ({
      user: { id: c.user._id, name: c.user.name, email: c.user.email },
      role: c.role,
    })),
    demo: trip.demo,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

// List trips the caller owns or collaborates on.
// ?search=destination or title, ?status=planning|upcoming|ongoing|completed
// ?from=YYYY-MM-DD&to=YYYY-MM-DD, ?sort=departure|created (default departure).
router.get('/', auth, async (req, res) => {
  const { search, status, from, to, sort } = req.query;
  const access = { $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }] };
  const query = { ...access };
  if (status) query.status = status;
  if (search) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$and = [access, { $or: [{ title: rx }, { destination: rx }] }];
    delete query.$or;
  }
  if (from) query.startDate = { ...query.startDate, $gte: new Date(from) };
  if (to) query.endDate = { ...query.endDate, $lte: new Date(to) };
  const trips = await Trip.find(query)
    .sort(sort === 'created' ? { createdAt: -1 } : { startDate: 1 })
    .populate('collaborators.user', 'name email');
  return res.json({ trips: trips.map(tripView) });
});

router.post('/', auth, async (req, res) => {
  const { title, destination, country, startDate, endDate, budget, travellers, notes, coverStyle, status } = req.body || {};
  if (!title || !destination || !startDate || !endDate || budget === undefined) {
    return res.status(400).json({ error: 'Title, destination, dates and budget are required' });
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return res.status(400).json({ error: 'Dates are not valid' });
  if (end < start) return res.status(400).json({ error: 'End date must be on or after the start date' });
  if (Number(budget) < 0) return res.status(400).json({ error: 'Budget cannot be negative' });
  const trip = await Trip.create({
    title: title.trim(),
    destination: destination.trim(),
    country: (country || 'India').trim(),
    startDate: start,
    endDate: end,
    budget: Number(budget),
    travellers: Math.max(1, Number(travellers) || 1),
    notes: notes || '',
    coverStyle: ['heritage', 'mountain', 'coast', 'city', 'forest'].includes(coverStyle) ? coverStyle : 'city',
    status: ['planning', 'upcoming', 'ongoing', 'completed'].includes(status) ? status : 'planning',
    owner: req.user._id,
  });
  return res.status(201).json({ trip: tripView(trip) });
});

// Full trip detail: day shells (one per date in the range), activities,
// expenses, packing list and a spend summary.
router.get('/:id', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const [activities, expenses, packing] = await Promise.all([
    Activity.find({ trip: trip._id }).sort({ dayIndex: 1, order: 1, startTime: 1 }),
    Expense.find({ trip: trip._id }).sort({ dayIndex: 1, createdAt: 1 }),
    PackingItem.find({ trip: trip._id }).sort({ order: 1, createdAt: 1 }),
  ]);
  const days = Array.from({ length: trip.dayCount() }, (_, i) => ({
    index: i,
    date: trip.dayDate(i),
    activities: activities.filter((a) => a.dayIndex === i),
    expenses: expenses.filter((e) => e.dayIndex === i),
  }));
  const totalSpent = expenses.reduce((n, e) => n + e.amount, 0);
  const plannedCost = activities.reduce((n, a) => n + (a.cost || 0), 0);
  const packedCount = packing.filter((p) => p.checked).length;
  return res.json({
    trip: tripView(trip),
    canEdit: canEdit(req),
    isOwner: req.isOwner,
    days,
    packing,
    summary: {
      totalSpent,
      plannedCost,
      totalCost: totalSpent + plannedCost,
      budget: trip.budget,
      remaining: trip.budget - totalSpent - plannedCost,
      overBudget: totalSpent + plannedCost > trip.budget,
      activityCount: activities.length,
      packingDone: packedCount,
      packingTotal: packing.length,
    },
  });
});

router.patch('/:id', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!canEdit(req)) return res.status(403).json({ error: 'Viewers cannot edit this trip' });
  const fields = ['title', 'destination', 'country', 'startDate', 'endDate', 'budget', 'travellers', 'notes', 'coverStyle', 'status'];
  for (const f of fields) if (req.body[f] !== undefined) trip[f] = req.body[f];
  if (trip.endDate < trip.startDate) return res.status(400).json({ error: 'End date must be on or after the start date' });
  await trip.save();
  emitTrip(trip._id, 'trip:updated', { trip: tripView(trip) });
  return res.json({ trip: tripView(trip) });
});

router.delete('/:id', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!req.isOwner) return res.status(403).json({ error: 'Only the trip owner can delete it' });
  await Promise.all([
    Activity.deleteMany({ trip: trip._id }),
    Expense.deleteMany({ trip: trip._id }),
    PackingItem.deleteMany({ trip: trip._id }),
    Trip.deleteOne({ _id: trip._id }),
  ]);
  return res.json({ ok: true });
});

// Invite a registered user as a collaborator. Owner only.
router.post('/:id/invite', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  if (!req.isOwner) return res.status(403).json({ error: 'Only the trip owner can invite collaborators' });
  const { email, role } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const invitee = await User.findOne({ email: email.toLowerCase().trim() });
  if (!invitee) return res.status(404).json({ error: 'No registered traveller with that email' });
  if (invitee._id.equals(req.user._id)) return res.status(400).json({ error: 'You already own this trip' });
  const chosenRole = role === 'editor' ? 'editor' : 'viewer';
  const existing = trip.collaborators.find((c) => c.user._id.equals(invitee._id));
  if (existing) {
    existing.role = chosenRole;
  } else {
    trip.collaborators.push({ user: invitee._id, role: chosenRole });
  }
  await trip.save();
  await trip.populate('collaborators.user', 'name email');
  emitTrip(trip._id, 'trip:collaborator', {
    user: { id: invitee._id, name: invitee.name, email: invitee.email },
    role: chosenRole,
  });
  return res.json({ trip: tripView(trip) });
});

// Analytics: spend by category, cost per day, itinerary density,
// packing completion and days until departure — all from real data.
router.get('/:id/analytics', auth, async (req, res) => {
  const trip = await loadTrip(req, res);
  if (!trip) return;
  const [activities, expenses, packing] = await Promise.all([
    Activity.find({ trip: trip._id }),
    Expense.find({ trip: trip._id }),
    PackingItem.find({ trip: trip._id }),
  ]);
  const byCategory = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  const plannedByCategory = {};
  for (const a of activities) plannedByCategory[a.category] = (plannedByCategory[a.category] || 0) + (a.cost || 0);
  const perDay = Array.from({ length: trip.dayCount() }, (_, i) => {
    const dayExpenses = expenses.filter((e) => e.dayIndex === i).reduce((n, e) => n + e.amount, 0);
    const dayPlanned = activities.filter((a) => a.dayIndex === i).reduce((n, a) => n + (a.cost || 0), 0);
    return {
      index: i,
      date: trip.dayDate(i),
      spent: dayExpenses,
      planned: dayPlanned,
      total: dayExpenses + dayPlanned,
      activities: activities.filter((a) => a.dayIndex === i).length,
    };
  });
  const totalSpent = expenses.reduce((n, e) => n + e.amount, 0);
  const plannedCost = activities.reduce((n, a) => n + (a.cost || 0), 0);
  const totalCost = totalSpent + plannedCost;
  const daysUntilDeparture = Math.ceil((new Date(trip.startDate) - Date.now()) / 86400000);
  return res.json({
    tripId: trip._id,
    budget: trip.budget,
    totalSpent,
    plannedCost,
    totalCost,
    remaining: trip.budget - totalCost,
    overBudget: totalCost > trip.budget,
    budgetUsedPct: trip.budget > 0 ? Math.round((totalCost / trip.budget) * 100) : 0,
    spendByCategory: byCategory,
    plannedByCategory,
    costPerDay: totalCost / trip.dayCount(),
    itineraryDensity: activities.length / trip.dayCount(),
    activityCount: activities.length,
    dayCount: trip.dayCount(),
    packingDone: packing.filter((p) => p.checked).length,
    packingTotal: packing.length,
    daysUntilDeparture,
    perDay,
  });
});

module.exports = router;
