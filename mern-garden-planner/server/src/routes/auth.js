const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, auth } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  return user.toPublic();
}

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const allowedRoles = ['gardener', 'coordinator'];
  const chosenRole = allowedRoles.includes(role) ? role : 'gardener';
  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await User.create({ name: String(name).trim(), email: String(email).toLowerCase(), passwordHash, role: chosenRole });
  return res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) return res.status(401).json({ error: 'No account matches this email' });
  if (!user.active) return res.status(403).json({ error: 'Account deactivated' });
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Wrong password' });
  return res.json({ user: publicUser(user), token: signToken(user) });
});

router.get('/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
