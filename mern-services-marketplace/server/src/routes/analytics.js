const express = require('express');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { getProviderStats } = require('../utils/providerStats');

const router = express.Router();

// Provider analytics — every number computed from live bookings.
router.get('/provider', auth, requireRole('provider'), async (req, res) => {
  const bookings = await Booking.find({ provider: req.user._id }).lean();
  const byStatus = {};
  for (const b of bookings) byStatus[b.status] = (byStatus[b.status] || 0) + 1;
  const completed = bookings.filter((b) => b.status === 'completed');
  const earnings = completed.reduce((s, b) => s + (b.priceBreakdown?.total || 0), 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = completed.filter((b) => new Date(b.createdAt) >= monthStart);
  const monthEarnings = thisMonth.reduce((s, b) => s + (b.priceBreakdown?.total || 0), 0);
  const stats = await getProviderStats(req.user._id);

  // Earnings per service category, completed bookings only.
  const byCategory = {};
  for (const b of completed) {
    const cat = b.serviceCategory || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + (b.priceBreakdown?.total || 0);
  }
  res.json({
    analytics: {
      totalBookings: bookings.length,
      byStatus,
      completedJobs: completed.length,
      earnings,
      thisMonthJobs: thisMonth.length,
      thisMonthEarnings: monthEarnings,
      byCategory,
      rating: stats.rating,
      reviewCount: stats.reviewCount,
      responseRate: stats.responseRate,
    },
  });
});

// Admin overview — live counts across the whole marketplace.
router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  const [users, bookings, providers] = await Promise.all([
    User.find().select('role active').lean(),
    Booking.find().select('status priceBreakdown provider serviceCategory').lean(),
    User.find({ role: 'provider' }).select('name').lean(),
  ]);
  const usersByRole = { customer: 0, provider: 0, admin: 0 };
  let activeUsers = 0;
  for (const u of users) {
    usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
    if (u.active) activeUsers += 1;
  }
  const byStatus = {};
  for (const b of bookings) byStatus[b.status] = (byStatus[b.status] || 0) + 1;
  const completed = bookings.filter((b) => b.status === 'completed');
  const revenue = completed.reduce((s, b) => s + (b.priceBreakdown?.total || 0), 0);
  const byProvider = {};
  for (const b of completed) {
    const key = String(b.provider);
    byProvider[key] = (byProvider[key] || 0) + (b.priceBreakdown?.total || 0);
  }
  const nameById = Object.fromEntries(providers.map((p) => [String(p._id), p.name]));
  const topProviders = Object.entries(byProvider)
    .map(([id, total]) => ({ providerId: id, name: nameById[id] || 'Provider', revenue: total }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  res.json({
    overview: {
      totalUsers: users.length,
      activeUsers,
      usersByRole,
      totalBookings: bookings.length,
      byStatus,
      completedJobs: completed.length,
      revenue,
      topProviders,
    },
  });
});

module.exports = router;
