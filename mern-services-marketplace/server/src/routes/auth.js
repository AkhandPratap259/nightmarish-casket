const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, auth } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  return user.toPublic();
}

router.post('/register', async (req, res) => {
  const { name, email, password, role, phone, city } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const cleanRole = ['customer', 'provider'].includes(role) ? role : 'customer';
  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    passwordHash,
    role: cleanRole,
    phone: phone ? String(phone).trim() : '',
    city: city ? String(city).trim() : 'Azamgarh',
    avatarColor: ['#e8501a', '#1f5c4d', '#27408b', '#7a4a21'][Math.floor(Math.random() * 4)],
  });
  return res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.active) return res.status(403).json({ error: 'Account deactivated' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  return res.json({ user: publicUser(user), token: signToken(user) });
});

router.get('/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
