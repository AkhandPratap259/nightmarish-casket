const express = require('express');
const User = require('../models/User');
const League = require('../models/League');
const Team = require('../models/Team');
const Match = require('../models/Match');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth, requireRole('admin'));

router.get('/overview', async (req, res) => {
  const [users, leagues, teams, matches, live] = await Promise.all([
    User.countDocuments(),
    League.countDocuments(),
    Team.countDocuments(),
    Match.countDocuments(),
    Match.countDocuments({ status: 'live' }),
  ]);
  return res.json({ users, leagues, teams, matches, liveMatches: live });
});

router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json({ users: users.map((u) => u.toPublic()) });
});

router.patch('/users/:id/active', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (String(user._id) === String(req.user._id)) return res.status(400).json({ error: 'You cannot deactivate your own account' });
  user.active = req.body.active !== false;
  await user.save();
  return res.json({ user: user.toPublic() });
});

module.exports = router;
