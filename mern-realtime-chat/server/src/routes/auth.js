const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    return res.status(400).json({ message: 'That email is already registered' });
  }
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
  });
  return res.status(201).json({
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email },
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  return res.json({
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email },
  });
});

router.get('/me', protect, (req, res) => {
  res.json({ id: req.user._id, name: req.user.name, email: req.user.email });
});

module.exports = router;
