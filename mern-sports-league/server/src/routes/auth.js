const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, auth } = require('../middleware/auth');

const router = express.Router();

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !isEmail(email) || !password || password.length < 8) {
    return res.status(400).json({ error: 'Name, a valid email and a password of at least 8 characters are required' });
  }
  const allowedRole = ['organizer', 'captain', 'fan'].includes(role) ? role : 'fan';
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash, role: allowedRole });
  return res.status(201).json({ user: user.toPublic(), token: signToken(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email) || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'No account matches this email' });
  if (!user.active) return res.status(403).json({ error: 'This account has been deactivated' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Incorrect password' });
  return res.json({ user: user.toPublic(), token: signToken(user) });
});

router.get('/me', auth, (req, res) => res.json({ user: req.user.toPublic() }));

module.exports = router;
