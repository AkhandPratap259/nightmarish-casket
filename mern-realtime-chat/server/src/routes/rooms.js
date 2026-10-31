const express = require('express');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const rooms = await Room.find().sort({ createdAt: 1 }).populate('createdBy', 'name');
  res.json(rooms);
});

router.post('/', protect, async (req, res) => {
  const { name, description } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ message: 'Room name is required' });
  const room = await Room.create({ name: name.trim(), description: description || '', createdBy: req.user._id });
  res.status(201).json(room);
});

// Message history for a room, oldest first (latest 100 by default).
router.get('/:id/messages', protect, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  const messages = await Message.find({ room: room._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('sender', 'name')
    .lean();
  res.json(messages.reverse());
});

module.exports = router;
