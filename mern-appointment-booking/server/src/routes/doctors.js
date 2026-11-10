const express = require('express');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { auth } = require('../middleware/auth');
const { slotsWithStatus, workingDaysAhead, generateSlots, dateStr } = require('../utils/slots');

const router = express.Router();

function publicDoctor(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    doctorProfile: user.doctorProfile,
  };
}

// Public directory of doctors, filterable by speciality / search / max fee.
router.get('/', async (req, res) => {
  const { speciality, q, maxFee } = req.query;
  const filter = { role: 'doctor' };
  if (speciality) filter['doctorProfile.speciality'] = speciality;
  if (maxFee) filter['doctorProfile.fee'] = { $lte: Number(maxFee) };
  let doctors = await User.find(filter).sort({ 'doctorProfile.fee': 1 });
  if (q) {
    const needle = q.toLowerCase();
    doctors = doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        (d.doctorProfile.clinic || '').toLowerCase().includes(needle) ||
        (d.doctorProfile.city || '').toLowerCase().includes(needle)
    );
  }
  return res.json({ doctors: doctors.map(publicDoctor) });
});

router.get('/specialities', async (req, res) => {
  const values = await User.distinct('doctorProfile.speciality', { role: 'doctor' });
  return res.json({ specialities: values.sort() });
});

router.get('/:id', async (req, res) => {
  const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  return res.json({ doctor: publicDoctor(doctor) });
});

// Bookable slots for one doctor on one date (YYYY-MM-DD).
router.get('/:id/slots', async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'A date in YYYY-MM-DD format is required' });
  }
  const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  const booked = await Appointment.find({
    doctor: doctor._id,
    date,
    status: { $in: ['booked', 'confirmed'] },
  }).select('time');
  const slots = slotsWithStatus(doctor.doctorProfile, new Date(`${date}T00:00:00`), booked.map((a) => a.time));
  return res.json({ date, slots });
});

// Working days ahead for the booking date picker.
router.get('/:id/days', async (req, res) => {
  const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  return res.json({ days: workingDaysAhead(doctor.doctorProfile, 14) });
});

// A signed-in doctor updates their own weekly schedule.
router.patch('/me/schedule', auth, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can update a schedule' });
  }
  const { days, sessions, slotMinutes } = req.body || {};
  if (days) req.user.doctorProfile.days = days;
  if (sessions) req.user.doctorProfile.sessions = sessions;
  if (slotMinutes) req.user.doctorProfile.slotMinutes = slotMinutes;
  await req.user.save();
  return res.json({ doctor: publicDoctor(req.user) });
});

// Doctor's own appointments for one date (used by the doctor dashboard).
router.get('/me/day', auth, async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can view their day' });
  }
  const date = req.query.date || dateStr(new Date());
  const appointments = await Appointment.find({ doctor: req.user._id, date })
    .populate('patient', 'name email phone')
    .sort({ time: 1 });
  const bookedTimes = appointments
    .filter((a) => ['booked', 'confirmed'].includes(a.status))
    .map((a) => a.time);
  const slots = generateSlots(req.user.doctorProfile, new Date(`${date}T00:00:00`));
  return res.json({ date, appointments, slots, bookedTimes });
});

module.exports = router;
