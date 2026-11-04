const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();
const COLORS = ['#e4572e', '#2a7f6f', '#b7791f', '#5b5ea6', '#a63d6f'];
function sign(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'dev-only-orbit-secret', { expiresIn: '7d' });
}
function publicUser(u) {
  return { _id: u._id, name: u.name, email: u.email, bio: u.bio, color: u.color,
    followingCount: u.following.length, followersCount: u.followers.length };
}
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, bio } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (await User.findOne({ email: String(email).toLowerCase() })) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({ name, email: String(email).toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10), bio: bio || '',
      color: COLORS[(await User.countDocuments()) % COLORS.length] });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(req.body.password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(publicUser(user));
});
module.exports = router;
