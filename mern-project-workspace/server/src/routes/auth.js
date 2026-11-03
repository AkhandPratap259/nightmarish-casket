const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ error: 'That email is already registered' });
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash: await bcrypt.hash(password, 10),
    });
    return res.status(201).json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    return res.json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

module.exports = router;
