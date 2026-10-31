const express = require('express');
const User = require('../models/User');
const { signToken, protect } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'An account with this email already exists' });
    // First registered user becomes admin, so the store has an admin without a manual DB edit.
    const isFirstUser = (await User.countDocuments()) === 0;
    const user = await User.create({
      name, email: email.toLowerCase(), password,
      role: isFirstUser ? 'admin' : 'user',
    });
    return res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password || ''))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    return res.json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
