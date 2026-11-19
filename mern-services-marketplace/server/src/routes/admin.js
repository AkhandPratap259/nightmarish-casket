const express = require('express');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Offering = require('../models/Offering');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth, requireRole('admin'));

router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json({ users: users.map((u) => ({ ...u, passwordHash: undefined })) });
});

router.get('/bookings', async (req, res) => {
  const bookings = await Booking.find()
    .populate('customer', 'name')
    .populate('provider', 'name')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ bookings });
});

// Deactivate (or reactivate) a user. Deactivated users cannot sign in and
// their offerings stop appearing in browse.
router.patch('/users/:id/active', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }
  user.active = req.body && req.body.active !== undefined ? Boolean(req.body.active) : !user.active;
  await user.save();
  res.json({ user: user.toPublic() });
});

router.patch('/offerings/:id/active', async (req, res) => {
  const offering = await Offering.findById(req.params.id);
  if (!offering) return res.status(404).json({ error: 'Offering not found' });
  offering.active = req.body && req.body.active !== undefined ? Boolean(req.body.active) : !offering.active;
  await offering.save();
  res.json({ offering });
});

module.exports = router;
