const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const notes = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);
  return res.json({
    notifications: notes.map((n) => ({
      id: n._id,
      message: n.message,
      kind: n.kind,
      read: n.read,
      createdAt: n.createdAt,
    })),
  });
});

router.patch('/read-all', auth, async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  return res.json({ ok: true });
});

module.exports = router;
