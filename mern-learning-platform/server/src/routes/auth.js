const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
function sign(user) {
  return jwt.sign({ id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'learnloop-dev-secret', { expiresIn: '7d' });
}
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (role && !['student', 'instructor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 10), role: role || 'student' });
  res.status(201).json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});
module.exports = router;
