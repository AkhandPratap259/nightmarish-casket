const express = require('express');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public: browse restaurants with search / cuisine / veg / sort.
router.get('/', async (req, res) => {
  const { q, cuisine, veg, sort } = req.query;
  const filter = {};
  if (q) filter.name = new RegExp(q, 'i');
  if (cuisine && cuisine !== 'All') filter.cuisine = cuisine;
  let query = Restaurant.find(filter);
  if (sort === 'rating') query = query.sort({ rating: -1 });
  else if (sort === 'fastest') query = query.sort({ deliveryMinutes: 1 });
  else query = query.sort({ createdAt: -1 });
  const restaurants = await query.lean();
  if (veg === 'true') {
    // Keep only restaurants that actually serve a veg dish.
    const vegIds = await MenuItem.distinct('restaurant', { veg: true });
    const keep = new Set(vegIds.map(String));
    return res.json(restaurants.filter((r) => keep.has(String(r._id))));
  }
  res.json(restaurants);
});

router.get('/cuisines', async (req, res) => {
  res.json(await Restaurant.distinct('cuisine'));
});

router.get('/:id', async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  const menu = await MenuItem.find({ restaurant: restaurant._id }).sort({ popular: -1, category: 1, name: 1 });
  res.json({ restaurant, menu });
});

// Restaurant owner: create / update their restaurant and menu.
router.post('/', auth, requireRole('restaurant', 'admin'), async (req, res) => {
  const r = await Restaurant.create({ ...req.body, owner: req.user.id });
  res.status(201).json(r);
});

router.put('/:id', auth, requireRole('restaurant', 'admin'), async (req, res) => {
  const r = await Restaurant.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Restaurant not found' });
  if (String(r.owner) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your restaurant' });
  Object.assign(r, req.body);
  await r.save();
  res.json(r);
});

router.post('/:id/menu', auth, requireRole('restaurant', 'admin'), async (req, res) => {
  const r = await Restaurant.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Restaurant not found' });
  if (String(r.owner) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your restaurant' });
  const item = await MenuItem.create({ ...req.body, restaurant: r._id });
  res.status(201).json(item);
});

router.put('/menu/:itemId', auth, requireRole('restaurant', 'admin'), async (req, res) => {
  const item = await MenuItem.findById(req.params.itemId).populate('restaurant');
  if (!item) return res.status(404).json({ error: 'Dish not found' });
  if (String(item.restaurant.owner) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your dish' });
  Object.assign(item, req.body);
  await item.save();
  res.json(item);
});

module.exports = router;
