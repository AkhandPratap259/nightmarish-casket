const express = require('express');
const Enquiry = require('../models/Enquiry');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');
const { emitToUser } = require('../utils/notify');

const router = express.Router();

function publicEnquiry(e) {
  const o = e.toObject ? e.toObject() : e;
  const out = {
    id: o._id,
    message: o.message,
    reply: o.reply || '',
    createdAt: o.createdAt,
    property: null,
    from: null,
  };
  if (o.property && typeof o.property === 'object') {
    out.property = { id: o.property._id, title: o.property.title, city: o.property.city, locality: o.property.locality, agent: o.property.agent };
  } else if (o.property) {
    out.property = { id: o.property };
  }
  if (o.from && typeof o.from === 'object') out.from = { id: o.from._id, name: o.from.name, email: o.from.email };
  return out;
}

// GET /api/enquiries — agent sees enquiries on their listings, buyer their own, admin all.
router.get('/', auth, async (req, res) => {
  let filter = {};
  if (req.user.role === 'admin') {
    filter = {};
  } else if (req.user.role === 'agent') {
    const mine = await Property.find({ agent: req.user._id }).select('_id');
    filter = { property: { $in: mine.map((p) => p._id) } };
  } else {
    filter = { from: req.user._id };
  }
  const list = await Enquiry.find(filter)
    .populate('property', 'title city locality agent')
    .populate('from', 'name email')
    .sort({ createdAt: -1 });
  return res.json({ enquiries: list.map(publicEnquiry) });
});

// POST /api/enquiries/:id/reply — listing agent or admin.
router.post('/:id/reply', auth, async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id).populate('property', 'title agent');
  if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
  const isAgent = String(enquiry.property.agent) === String(req.user._id);
  if (!isAgent && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the listing agent (or an admin) can reply' });
  }
  const { message } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'A reply message is required' });
  enquiry.reply = String(message).trim();
  enquiry.repliedBy = req.user._id;
  await enquiry.save();
  emitToUser(String(enquiry.from), 'enquiry-replied', {
    propertyTitle: enquiry.property.title,
    reply: enquiry.reply,
  });
  const populated = await Enquiry.findById(enquiry._id)
    .populate('property', 'title city locality agent')
    .populate('from', 'name email');
  return res.json({ enquiry: publicEnquiry(populated) });
});

module.exports = router;
