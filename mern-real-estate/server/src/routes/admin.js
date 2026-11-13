const express = require('express');
const Property = require('../models/Property');
const User = require('../models/User');
const Enquiry = require('../models/Enquiry');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  const [totalProperties, totalUsers, totalEnquiries, byStatus, byCity] = await Promise.all([
    Property.countDocuments(),
    User.countDocuments(),
    Enquiry.countDocuments(),
    Property.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Property.aggregate([{ $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
  ]);
  return res.json({
    totalProperties,
    totalUsers,
    totalEnquiries,
    listingsByStatus: byStatus.map((r) => ({ status: r._id, count: r.count })),
    listingsByCity: byCity.map((r) => ({ city: r._id, count: r.count })),
  });
});

module.exports = router;
