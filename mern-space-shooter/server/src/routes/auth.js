const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'space-shooter-dev-secret';

function tokenFor(user) {
  return jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password || String(password).length < 6) {
      return res.status(400).json({ message: 'Name, email and a password of at least 6 characters are required' });
    }
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ message: 'An account with that email already exists' });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({ name: String(name).trim(), email: String(email).toLowerCase(), passwordHash });
    return res.status(201).json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    // Guard: a user document from another app sharing a database may have
    // no passwordHash here. Return 401 instead of crashing on bcrypt.compare.
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });
    return res.json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
