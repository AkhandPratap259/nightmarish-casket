const express = require('express');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { generateSlots, dateStr, addDays } = require('../utils/slots');

const router = express.Router();

// Admin analytics: totals, bookings by speciality, doctor utilisation over
// the next 7 working days, cancellations, collected fees, daily trend.
router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  const [totalDoctors, totalPatients, all] = await Promise.all([
    User.countDocuments({ role: 'doctor' }),
    User.countDocuments({ role: 'patient' }),
    Appointment.find().populate('doctor', 'name doctorProfile'),
  ]);

  const byStatus = {};
  let revenue = 0;
  const bySpeciality = {};
  const daily = {};
  for (const a of all) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    if (['booked', 'confirmed', 'completed'].includes(a.status)) {
      revenue += a.fee || 0;
      const spec = a.doctor?.doctorProfile?.speciality || 'Other';
      bySpeciality[spec] = (bySpeciality[spec] || 0) + 1;
    }
    daily[a.date] = (daily[a.date] || 0) + 1;
  }

  // Utilisation: active bookings vs generated slots over the next 7 days.
  const doctors = await User.find({ role: 'doctor' });
  const today = new Date();
  const utilisation = [];
  for (const d of doctors) {
    let slots = 0;
    let booked = 0;
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(today, i);
      const ds = dateStr(day);
      slots += generateSlots(d.doctorProfile, day).length;
      booked += await Appointment.countDocuments({
        doctor: d._id,
        date: ds,
        status: { $in: ['booked', 'confirmed'] },
      });
    }
    utilisation.push({
      doctor: d.name,
      speciality: d.doctorProfile.speciality,
      slots,
      booked,
      rate: slots ? Math.round((booked / slots) * 100) : 0,
    });
  }
  utilisation.sort((a, b) => b.rate - a.rate);

  const trend = Object.entries(daily)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  return res.json({
    totals: {
      doctors: totalDoctors,
      patients: totalPatients,
      appointments: all.length,
      revenue,
    },
    byStatus,
    bySpeciality,
    utilisation,
    trend,
  });
});

module.exports = router;
