const express = require('express');
const User = require('../models/User');
const Garden = require('../models/Garden');
const Bed = require('../models/Bed');
const Planting = require('../models/Planting');
const Plant = require('../models/Plant');
const Task = require('../models/Task');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  const [users, gardens, beds, plantings, plants, openTasks] = await Promise.all([
    User.countDocuments(),
    Garden.countDocuments(),
    Bed.countDocuments(),
    Planting.countDocuments(),
    Plant.countDocuments(),
    Task.countDocuments({ status: 'open' }),
  ]);
  const harvested = await Planting.countDocuments({ status: 'harvested' });
  return res.json({ users, gardens, beds, plantings, plants, openTasks, harvested });
});

router.get('/users', auth, requireRole('admin'), async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json({ users: users.map((u) => u.toPublic()) });
});

router.patch('/users/:id/active', auth, requireRole('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.active = req.body.active !== false;
  await user.save();
  return res.json({ user: user.toPublic() });
});

module.exports = router;
