const express = require('express');
const MealPlan = require('../models/MealPlan');
const GroceryItem = require('../models/GroceryItem');
const Recipe = require('../models/Recipe');
const { auth } = require('../middleware/auth');
const { normaliseName, normaliseUnit, round2, weekStartOf, scaleQuantity } = require('../utils/helpers');
const { emitToUser } = require('../utils/notify');

const router = express.Router();
const SLOTS = ['breakfast', 'lunch', 'dinner'];
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function planOut(p) {
  const o = p.toObject ? p.toObject() : p;
  return { id: o._id, date: o.date, slot: o.slot, servings: o.servings, recipe: o.recipe };
}

// Group key for the grocery list: fresh produce, pantry, dairy & protein,
// everything else under "Other".
function groceryGroup(name) {
  const n = name.toLowerCase();
  if (/(tomato|onion|potato|spinach|carrot|broccoli|cabbage|cucumber|pepper|capsicum|mushroom|garlic|ginger|lemon|lime|basil|coriander|chilli|spring onion|corn|avocado)/.test(n)) return 'Fresh';
  if (/(paneer|cheese|mozzarella|feta|parmesan|milk|butter|cream|yogurt|curd|egg|chicken|tofu)/.test(n)) return 'Dairy & protein';
  return 'Pantry';
}

router.get('/', auth, async (req, res) => {
  const { from, to } = req.query;
  const filter = { user: req.user._id };
  if (from && DATE_RX.test(from)) filter.date = { ...filter.date, $gte: from };
  if (to && DATE_RX.test(to)) filter.date = { ...filter.date, $lte: to };
  const entries = await MealPlan.find(filter).populate('recipe', 'title cuisine category prepTimeMin cookTimeMin servings').sort({ date: 1 }).lean();
  return res.json({ entries: entries.map(planOut) });
});

router.post('/', auth, async (req, res) => {
  const { date, slot, recipeId, servings } = req.body || {};
  if (!date || !DATE_RX.test(date)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'Slot must be breakfast, lunch or dinner' });
  if (!(Number(servings) >= 1 && Number(servings) <= 24)) return res.status(400).json({ error: 'Servings must be between 1 and 24' });
  const recipe = await Recipe.findById(recipeId);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  const existing = await MealPlan.findOne({ user: req.user._id, date, slot });
  if (existing) {
    // Replacing the recipe in a slot is allowed.
    existing.recipe = recipe._id;
    existing.servings = Number(servings);
    await existing.save();
    await existing.populate('recipe', 'title cuisine category prepTimeMin cookTimeMin servings');
    emitToUser(req.user._id, 'planner:changed', { action: 'updated', entry: planOut(existing) });
    return res.json({ entry: planOut(existing), replaced: true });
  }
  const entry = await MealPlan.create({ user: req.user._id, date, slot, recipe: recipe._id, servings: Number(servings) });
  await entry.populate('recipe', 'title cuisine category prepTimeMin cookTimeMin servings');
  emitToUser(req.user._id, 'planner:changed', { action: 'added', entry: planOut(entry) });
  return res.status(201).json({ entry: planOut(entry) });
});

router.put('/:id', auth, async (req, res) => {
  const { date, slot, servings } = req.body || {};
  const entry = await MealPlan.findOne({ _id: req.params.id, user: req.user._id });
  if (!entry) return res.status(404).json({ error: 'Plan entry not found' });
  const nextDate = date || entry.date;
  const nextSlot = slot || entry.slot;
  if (!DATE_RX.test(nextDate)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
  if (!SLOTS.includes(nextSlot)) return res.status(400).json({ error: 'Slot must be breakfast, lunch or dinner' });
  if (servings !== undefined && !(Number(servings) >= 1 && Number(servings) <= 24)) {
    return res.status(400).json({ error: 'Servings must be between 1 and 24' });
  }
  const clash = await MealPlan.findOne({
    user: req.user._id, date: nextDate, slot: nextSlot, _id: { $ne: entry._id },
  });
  if (clash) {
    // Same recipe in the same slot and date is a duplicate; a different
    // recipe there is replaced by moving this entry onto it.
    if (String(clash.recipe) === String(entry.recipe)) {
      return res.status(409).json({ error: 'This recipe is already planned for that day and slot' });
    }
    await clash.deleteOne();
  }
  entry.date = nextDate;
  entry.slot = nextSlot;
  if (servings !== undefined) entry.servings = Number(servings);
  await entry.save();
  await entry.populate('recipe', 'title cuisine category prepTimeMin cookTimeMin servings');
  emitToUser(req.user._id, 'planner:changed', { action: 'moved', entry: planOut(entry) });
  return res.json({ entry: planOut(entry) });
});

router.delete('/:id', auth, async (req, res) => {
  const entry = await MealPlan.findOne({ _id: req.params.id, user: req.user._id });
  if (!entry) return res.status(404).json({ error: 'Plan entry not found' });
  await entry.deleteOne();
  emitToUser(req.user._id, 'planner:changed', { action: 'removed', entryId: String(entry._id) });
  return res.json({ ok: true });
});

// Grocery list: aggregate planned ingredients across the range, scaled to
// planned servings, summed by normalised name + unit. Checked state persists
// per user per week in GroceryItem.
router.get('/grocery', auth, async (req, res) => {
  const { from, to } = req.query;
  if (!from || !DATE_RX.test(from) || !to || !DATE_RX.test(to)) {
    return res.status(400).json({ error: 'from and to dates (YYYY-MM-DD) are required' });
  }
  const weekStart = weekStartOf(from);
  const entries = await MealPlan.find({ user: req.user._id, date: { $gte: from, $lte: to } })
    .populate('recipe', 'ingredients servings')
    .lean();
  const sums = new Map();
  for (const entry of entries) {
    const recipe = entry.recipe;
    if (!recipe) continue;
    const factor = (entry.servings || recipe.servings) / recipe.servings;
    for (const ing of recipe.ingredients || []) {
      const name = normaliseName(ing.name);
      const unit = normaliseUnit(ing.unit);
      const key = `${name}|||${unit}`;
      const prev = sums.get(key) || 0;
      sums.set(key, prev + scaleQuantity(ing.quantity, factor));
    }
  }
  // Refresh the stored week items: upsert aggregated quantities, keep the
  // checked flag on matching items, drop items no longer in the plan.
  const wanted = new Set(sums.keys());
  const existing = await GroceryItem.find({ user: req.user._id, weekStart });
  for (const item of existing) {
    const key = `${normaliseName(item.name)}|||${normaliseUnit(item.unit)}`;
    if (!wanted.has(key)) await item.deleteOne();
  }
  const items = [];
  for (const [key, quantity] of sums.entries()) {
    const [name, unit] = key.split('|||');
    const item = await GroceryItem.findOneAndUpdate(
      { user: req.user._id, weekStart, name, unit },
      { quantity: round2(quantity) },
      { new: true, upsert: true }
    );
    items.push(item);
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  return res.json({
    weekStart,
    from,
    to,
    items: items.map((i) => ({
      id: i._id,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      checked: i.checked,
      group: groceryGroup(i.name),
    })),
  });
});

router.patch('/grocery/:id', auth, async (req, res) => {
  const { checked } = req.body || {};
  if (typeof checked !== 'boolean') return res.status(400).json({ error: 'checked must be true or false' });
  const item = await GroceryItem.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { checked },
    { new: true }
  );
  if (!item) return res.status(404).json({ error: 'Grocery item not found' });
  emitToUser(req.user._id, 'grocery:changed', { itemId: String(item._id), checked });
  return res.json({ item: { id: item._id, name: item.name, unit: item.unit, quantity: item.quantity, checked: item.checked } });
});

router.delete('/grocery/checked', auth, async (req, res) => {
  const { weekStart } = req.query;
  if (!weekStart || !DATE_RX.test(weekStart)) return res.status(400).json({ error: 'weekStart (YYYY-MM-DD) is required' });
  const result = await GroceryItem.deleteMany({ user: req.user._id, weekStart, checked: true });
  emitToUser(req.user._id, 'grocery:changed', { action: 'cleared-checked', weekStart });
  return res.json({ ok: true, removed: result.deletedCount });
});

module.exports = router;
