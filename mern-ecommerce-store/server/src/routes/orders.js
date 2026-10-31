const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Create an order from cart items. Stock is checked and decremented here.
router.post('/', protect, async (req, res) => {
  try {
    const { items, address } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
    if (!address) return res.status(400).json({ message: 'Delivery address is required' });

    const orderItems = [];
    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(400).json({ message: 'A product in your cart no longer exists' });
      if (product.stock < item.qty) return res.status(400).json({ message: `${product.name} is out of stock` });
      product.stock -= item.qty;
      await product.save();
      orderItems.push({ product: product._id, name: product.name, price: product.price, qty: item.qty, image: product.image });
      total += product.price * item.qty;
    }
    const order = await Order.create({ user: req.user._id, items: orderItems, total: Number(total.toFixed(2)), address });
    return res.status(201).json({ order });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/mine', protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  return res.json({ orders });
});

router.get('/', protect, adminOnly, async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
  return res.json({ orders });
});

router.put('/:id/status', protect, adminOnly, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  return res.json({ order });
});

module.exports = router;
