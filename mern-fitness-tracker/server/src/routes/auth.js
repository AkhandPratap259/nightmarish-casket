const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    goal: user.goal,
    experienceLevel: user.experienceLevel,
  };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, goal, experienceLevel } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
    const allowedRoles = ['member', 'trainer'];
    const safeRole = allowedRoles.includes(role) ? role : 'member';
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role: safeRole,
      goal: ['strength', 'hypertrophy', 'endurance', 'general'].includes(goal) ? goal : 'general',
      experienceLevel: ['beginner', 'intermediate', 'advanced'].includes(experienceLevel)
        ? experienceLevel
        : 'beginner',
    });
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    return res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    return res.json({ user: publicUser(req.user) });
  })
);

module.exports = router;
