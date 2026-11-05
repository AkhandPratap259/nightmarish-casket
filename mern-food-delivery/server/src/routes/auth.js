const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();
const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role, name: u.name }, process.env.JWT_SECRET || 'foodfleet-dev-only-secret', { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (await User.findOne({ email: String(email).toLowerCase() })) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role: ['customer', 'restaurant'].includes(role) ? role : 'customer',
    });
    res.status(201).json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid email or password' });
    if (!(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
