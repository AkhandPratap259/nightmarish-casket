const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();
router.get('/', auth, async (req, res) => {
  const items = await Notification.find({ recipient: req.userId }).sort({ createdAt: -1 }).limit(30)
    .populate('actor', 'name color').populate('post', 'text');
  res.json(items);
});
router.post('/read', auth, async (req, res) => {
  await Notification.updateMany({ recipient: req.userId, read: false }, { read: true });
  res.json({ ok: true });
});
module.exports = router;
