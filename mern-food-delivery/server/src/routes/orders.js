const express = require('express');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { Order, STATUSES } = require('../models/Order');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Promo rules are server-side only: the client never computes a price.
function promoDiscount(code, subtotal) {
  if (!code) return 0;
  if (code === 'WELCOME20') return Math.min(Math.round(subtotal * 0.2), 150);
  if (code === 'FLAT50' && subtotal >= 299) return 50;
  if (code === 'FREEDEL') return 0; // handled as a fee waiver below
  return 0;
}

const FLOW = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const COURIERS = ['Aarav (Bike)', 'Priya (Scooter)', 'Rohan (Bike)', 'Sana (E-bike)'];

router.post('/', auth, async (req, res) => {
  try {
    const { restaurantId, items, promoCode, paymentMethod, deliveryAddress } = req.body;
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (!restaurant.isOpen) return res.status(400).json({ error: 'Restaurant is closed right now' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    // Re-price every line from the database: client prices are never trusted.
    const lines = [];
    for (const line of items) {
      const dish = await MenuItem.findOne({ _id: line.itemId, restaurant: restaurantId, available: true });
      if (!dish) return res.status(400).json({ error: 'A dish is unavailable or does not belong to this restaurant' });
      const qty = Math.max(1, Math.min(20, Number(line.qty) || 1));
      lines.push({ name: dish.name, price: dish.price, qty });
    }
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const code = String(promoCode || '').toUpperCase().trim();
    const discount = promoDiscount(code, subtotal);
    const deliveryFee = subtotal - discount >= 499 || code === 'FREEDEL' ? 0 : 39;
    const gst = Math.round((subtotal - discount) * 0.05);
    const total = subtotal - discount + deliveryFee + gst;

    const order = await Order.create({
      customer: req.user.id,
      restaurant: restaurantId,
      items: lines,
      subtotal,
      discount,
      deliveryFee,
      gst,
      total,
      promoCode: code,
      paymentMethod: ['mock_upi', 'mock_card', 'cod'].includes(paymentMethod) ? paymentMethod : 'cod',
      deliveryAddress: deliveryAddress || '',
      status: 'placed',
      statusHistory: [{ status: 'placed', at: new Date() }],
      etaMinutes: restaurant.deliveryMinutes,
      courierName: COURIERS[Math.floor(Math.random() * COURIERS.length)],
    });
    req.app.get('io').to(`restaurant:${restaurantId}`).emit('order:created', order);
    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/mine', auth, async (req, res) => {
  const filter = req.user.role === 'restaurant'
    ? { restaurant: { $in: await Restaurant.find({ owner: req.user.id }).distinct('_id') } }
    : { customer: req.user.id };
  const orders = await Order.find(filter).populate('restaurant', 'name cuisine').sort({ createdAt: -1 }).limit(50);
  res.json(orders);
});

router.get('/:id', auth, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('restaurant', 'name cuisine area');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

function advance(order) {
  const i = FLOW.indexOf(order.status);
  if (i < 0 || i >= FLOW.length - 1) return null;
  order.status = FLOW[i + 1];
  order.statusHistory.push({ status: order.status, at: new Date() });
  if (order.status === 'out_for_delivery') order.etaMinutes = Math.max(8, Math.round(order.etaMinutes / 2));
  if (order.status === 'delivered') order.etaMinutes = 0;
  return order.status;
}

// Restaurant owner advances one step; only the next status is legal.
router.post('/:id/advance', auth, requireRole('restaurant', 'admin'), async (req, res) => {
  const order = await Order.findById(req.params.id).populate('restaurant');
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (String(order.restaurant.owner) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your order' });
  const next = advance(order);
  if (!next) return res.status(400).json({ error: 'Order cannot move forward from here' });
  await order.save();
  req.app.get('io').to(`order:${order._id}`).emit('order:updated', order);
  res.json(order);
});

// Demo mode: auto-advance the order every 12 seconds so the live tracker moves.
router.post('/:id/simulate', auth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (String(order.customer) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your order' });
  if (order.status === 'delivered' || order.status === 'cancelled') return res.status(400).json({ error: 'Order already finished' });
  const io = req.app.get('io');
  const timer = setInterval(async () => {
    const fresh = await Order.findById(order._id);
    if (!fresh || fresh.status === 'delivered' || fresh.status === 'cancelled') return clearInterval(timer);
    advance(fresh);
    await fresh.save();
    io.to(`order:${fresh._id}`).emit('order:updated', fresh);
    if (fresh.status === 'delivered') clearInterval(timer);
  }, 12000);
  res.json({ simulating: true, stepSeconds: 12 });
});

router.post('/:id/cancel', auth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (String(order.customer) !== req.user.id) return res.status(403).json({ error: 'Not your order' });
  if (!['placed', 'confirmed'].includes(order.status)) return res.status(400).json({ error: 'Too late to cancel this order' });
  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', at: new Date() });
  await order.save();
  req.app.get('io').to(`order:${order._id}`).emit('order:updated', order);
  res.json(order);
});

module.exports = router;
