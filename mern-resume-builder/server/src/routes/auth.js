const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'resumeforge-dev-secret-change-me';

function sign(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'An account with this email already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    return res.status(201).json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(password || '', user.passwordHash);
    } catch (err) {
      ok = false;
    }
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });
    return res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('name email');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ id: user._id, name: user.name, email: user.email });
});

module.exports = router;
