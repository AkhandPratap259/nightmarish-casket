const express = require('express');
const Appointment = require('../models/Appointment');
const Waitlist = require('../models/Waitlist');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { generateSlots } = require('../utils/slots');
const { notify, drName } = require('../utils/notify');

const router = express.Router();
const ACTIVE = ['booked', 'confirmed'];

function publicAppt(a) {
  return {
    id: a._id,
    patient: a.patient,
    doctor: a.doctor,
    date: a.date,
    time: a.time,
    reason: a.reason,
    status: a.status,
    fee: a.fee,
    visitNotes: a.visitNotes,
    prescription: a.prescription,
    fromWaitlist: a.fromWaitlist,
    createdAt: a.createdAt,
  };
}

// Promote the first waiting patient for a freed doctor+date slot.
// Returns the new appointment, or null when nobody is waiting.
async function promoteFromWaitlist(doctorId, date, time) {
  const entry = await Waitlist.findOne({ doctor: doctorId, date, status: 'waiting' }).sort({ createdAt: 1 });
  if (!entry) return null;
  const doctor = await User.findById(doctorId);
  const appt = await Appointment.create({
    patient: entry.patient,
    doctor: doctorId,
    date,
    time,
    reason: entry.reason,
    status: 'booked',
    fee: doctor?.doctorProfile?.fee || 0,
    fromWaitlist: true,
  });
  entry.status = 'promoted';
  await entry.save();
  await notify(
    entry.patient,
    `A slot opened up — your waitlist request with ${drName(doctor?.name)} on ${date} at ${time} is now booked.`,
    'waitlist',
    appt._id
  );
  return appt;
}

// Book a slot. The slot must exist in the doctor's generated schedule and
// must not already hold an active appointment.
router.post('/', auth, requireRole('patient'), async (req, res) => {
  const { doctorId, date, time, reason } = req.body || {};
  if (!doctorId || !date || !time) {
    return res.status(400).json({ error: 'Doctor, date and time are required' });
  }
  const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  const valid = generateSlots(doctor.doctorProfile, new Date(`${date}T00:00:00`));
  if (!valid.includes(time)) {
    return res.status(400).json({ error: 'That time is not a bookable slot for this doctor' });
  }
  const clash = await Appointment.findOne({ doctor: doctorId, date, time, status: { $in: ACTIVE } });
  if (clash) return res.status(409).json({ error: 'That slot was just taken — pick another time' });
  try {
    const appt = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      date,
      time,
      reason: reason || '',
      fee: doctor.doctorProfile.fee || 0,
    });
    await notify(
      doctorId,
      `New booking: ${req.user.name} on ${date} at ${time}${reason ? ` — ${reason}` : ''}.`,
      'booking',
      appt._id
    );
    return res.status(201).json({ appointment: publicAppt(appt) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'That slot was just taken — pick another time' });
    }
    throw err;
  }
});

// Appointments for the signed-in user (patient sees theirs, doctor sees theirs).
router.get('/mine', auth, async (req, res) => {
  const filter = req.user.role === 'doctor' ? { doctor: req.user._id } : { patient: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.upcoming === 'true') filter.date = { $gte: new Date().toISOString().slice(0, 10) };
  const appointments = await Appointment.find(filter)
    .populate('patient', 'name email phone')
    .populate('doctor', 'name doctorProfile')
    .sort({ date: 1, time: 1 });
  return res.json({ appointments: appointments.map(publicAppt) });
});

router.get('/:id', auth, async (req, res) => {
  const appt = await Appointment.findById(req.params.id)
    .populate('patient', 'name email phone')
    .populate('doctor', 'name doctorProfile');
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  const mine =
    String(appt.patient._id) === String(req.user._id) ||
    String(appt.doctor._id) === String(req.user._id) ||
    req.user.role === 'admin';
  if (!mine) return res.status(403).json({ error: 'Not your appointment' });
  return res.json({ appointment: publicAppt(appt) });
});

// Cancel. Cancelling frees the slot and auto-promotes the first waitlist entry.
router.patch('/:id/cancel', auth, async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  const allowed =
    String(appt.patient) === String(req.user._id) ||
    String(appt.doctor) === String(req.user._id) ||
    req.user.role === 'admin';
  if (!allowed) return res.status(403).json({ error: 'Not your appointment' });
  if (!ACTIVE.includes(appt.status)) {
    return res.status(400).json({ error: `A ${appt.status} appointment cannot be cancelled` });
  }
  appt.status = 'cancelled';
  await appt.save();
  const promoted = await promoteFromWaitlist(appt.doctor, appt.date, appt.time);
  const otherId = String(appt.patient) === String(req.user._id) ? appt.doctor : appt.patient;
  await notify(otherId, `Appointment on ${appt.date} at ${appt.time} was cancelled.`, 'cancel', appt._id);
  return res.json({ appointment: publicAppt(appt), promoted: promoted ? publicAppt(promoted) : null });
});

// Reschedule to another free slot.
router.patch('/:id/reschedule', auth, async (req, res) => {
  const { date, time } = req.body || {};
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  const allowed =
    String(appt.patient) === String(req.user._id) || String(appt.doctor) === String(req.user._id);
  if (!allowed) return res.status(403).json({ error: 'Not your appointment' });
  if (!ACTIVE.includes(appt.status)) {
    return res.status(400).json({ error: `A ${appt.status} appointment cannot be rescheduled` });
  }
  const doctor = await User.findById(appt.doctor);
  const valid = generateSlots(doctor.doctorProfile, new Date(`${date}T00:00:00`));
  if (!valid.includes(time)) {
    return res.status(400).json({ error: 'That time is not a bookable slot for this doctor' });
  }
  const clash = await Appointment.findOne({
    doctor: appt.doctor,
    date,
    time,
    status: { $in: ACTIVE },
    _id: { $ne: appt._id },
  });
  if (clash) return res.status(409).json({ error: 'That slot is already taken' });
  const oldDate = appt.date;
  const oldTime = appt.time;
  appt.date = date;
  appt.time = time;
  await appt.save();
  // The freed old slot can go to the waitlist.
  await promoteFromWaitlist(appt.doctor, oldDate, oldTime);
  const otherId = String(appt.patient) === String(req.user._id) ? appt.doctor : appt.patient;
  await notify(otherId, `Appointment moved to ${date} at ${time}.`, 'booking', appt._id);
  return res.json({ appointment: publicAppt(appt) });
});

// Doctor confirms a booking.
router.patch('/:id/confirm', auth, requireRole('doctor'), async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (String(appt.doctor) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not your appointment' });
  }
  if (appt.status !== 'booked') return res.status(400).json({ error: 'Only a booked appointment can be confirmed' });
  appt.status = 'confirmed';
  await appt.save();
  await notify(appt.patient, `${drName(req.user.name)} confirmed your appointment on ${appt.date} at ${appt.time}.`, 'booking', appt._id);
  return res.json({ appointment: publicAppt(appt) });
});

// Doctor completes a visit with notes and an optional prescription.
router.patch('/:id/complete', auth, requireRole('doctor'), async (req, res) => {
  const { visitNotes, prescription } = req.body || {};
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (String(appt.doctor) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not your appointment' });
  }
  if (!ACTIVE.includes(appt.status)) {
    return res.status(400).json({ error: `A ${appt.status} appointment cannot be completed` });
  }
  appt.status = 'completed';
  appt.visitNotes = visitNotes || '';
  appt.prescription = Array.isArray(prescription) ? prescription : [];
  await appt.save();
  await notify(appt.patient, `Your visit with ${drName(req.user.name)} on ${appt.date} is complete — notes and prescription are in your records.`, 'visit', appt._id);
  return res.json({ appointment: publicAppt(appt) });
});

// Doctor marks a patient as a no-show.
router.patch('/:id/no-show', auth, requireRole('doctor'), async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (String(appt.doctor) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not your appointment' });
  }
  if (!ACTIVE.includes(appt.status)) {
    return res.status(400).json({ error: `A ${appt.status} appointment cannot be marked no-show` });
  }
  appt.status = 'no-show';
  await appt.save();
  return res.json({ appointment: publicAppt(appt) });
});

module.exports = router;
