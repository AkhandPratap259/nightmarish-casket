const express = require('express');
const Waitlist = require('../models/Waitlist');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

function publicEntry(w) {
  return {
    id: w._id,
    patient: w.patient,
    doctor: w.doctor,
    date: w.date,
    reason: w.reason,
    status: w.status,
    createdAt: w.createdAt,
  };
}

// Join a doctor's waitlist for a date (used when no slot is free).
router.post('/', auth, requireRole('patient'), async (req, res) => {
  const { doctorId, date, reason } = req.body || {};
  if (!doctorId || !date) return res.status(400).json({ error: 'Doctor and date are required' });
  const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  const existing = await Waitlist.findOne({ patient: req.user._id, doctor: doctorId, date, status: 'waiting' });
  if (existing) return res.status(409).json({ error: 'You are already on the waitlist for that day' });
  const entry = await Waitlist.create({ patient: req.user._id, doctor: doctorId, date, reason: reason || '' });
  return res.status(201).json({ waitlist: publicEntry(entry) });
});

router.get('/mine', auth, requireRole('patient'), async (req, res) => {
  const entries = await Waitlist.find({ patient: req.user._id })
    .populate('doctor', 'name doctorProfile')
    .sort({ date: 1 });
  return res.json({ waitlist: entries.map(publicEntry) });
});

// Doctor sees who is waiting for them.
router.get('/for-doctor', auth, requireRole('doctor'), async (req, res) => {
  const entries = await Waitlist.find({ doctor: req.user._id, status: 'waiting' })
    .populate('patient', 'name email phone')
    .sort({ date: 1, createdAt: 1 });
  return res.json({ waitlist: entries.map(publicEntry) });
});

router.patch('/:id/leave', auth, requireRole('patient'), async (req, res) => {
  const entry = await Waitlist.findById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Waitlist entry not found' });
  if (String(entry.patient) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not your waitlist entry' });
  }
  if (entry.status !== 'waiting') return res.status(400).json({ error: `This entry is already ${entry.status}` });
  entry.status = 'left';
  await entry.save();
  return res.json({ waitlist: publicEntry(entry) });
});

module.exports = router;
