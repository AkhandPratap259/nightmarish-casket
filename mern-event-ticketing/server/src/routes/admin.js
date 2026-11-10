const express = require('express');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { totalSeats } = require('../utils/seats');

const router = express.Router();

// Admin analytics: totals, revenue by event, tickets sold per day and
// occupancy per event — all computed from real bookings.
router.get('/analytics', auth, requireRole('admin'), async (req, res) => {
  const [totalEvents, totalUsers, totalOrganizers, allBookings] = await Promise.all([
    Event.countDocuments(),
    User.countDocuments(),
    User.countDocuments({ role: 'organizer' }),
    Booking.find({ status: 'confirmed' }).populate('event', 'title category city date zones'),
  ]);

  let revenue = 0;
  let ticketsSold = 0;
  const revenueByEvent = {};
  const ticketsPerDay = {};
  for (const b of allBookings) {
    revenue += b.totalAmount || 0;
    ticketsSold += b.seats.length;
    const title = b.event?.title || 'Unknown event';
    revenueByEvent[title] = revenueByEvent[title] || { revenue: 0, tickets: 0 };
    revenueByEvent[title].revenue += b.totalAmount || 0;
    revenueByEvent[title].tickets += b.seats.length;
    const day = new Date(b.createdAt).toISOString().slice(0, 10);
    ticketsPerDay[day] = (ticketsPerDay[day] || 0) + b.seats.length;
  }

  const events = await Event.find().populate('organizer', 'name');
  const occupancy = [];
  for (const e of events) {
    const sold = await Booking.aggregate([
      { $match: { event: e._id, status: 'confirmed' } },
      { $group: { _id: null, seats: { $sum: { $size: '$seats' } } } },
    ]);
    const total = totalSeats(e);
    const soldCount = sold.length ? sold[0].seats : 0;
    occupancy.push({
      event: e.title,
      category: e.category,
      city: e.city,
      date: e.date,
      total,
      sold: soldCount,
      rate: total ? Math.round((soldCount / total) * 100) : 0,
    });
  }
  occupancy.sort((a, b) => b.rate - a.rate);

  const trend = Object.entries(ticketsPerDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-14)
    .map(([date, tickets]) => ({ date, tickets }));

  const revenueList = Object.entries(revenueByEvent)
    .map(([event, v]) => ({ event, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  return res.json({
    totals: {
      events: totalEvents,
      users: totalUsers,
      organizers: totalOrganizers,
      confirmedBookings: allBookings.length,
      ticketsSold,
      revenue,
    },
    revenueByEvent: revenueList,
    ticketsPerDay: trend,
    occupancy,
  });
});

module.exports = router;
