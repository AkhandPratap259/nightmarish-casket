const express = require('express');
const Property = require('../models/Property');

const router = express.Router();

// GET /api/analytics/prices — Mongo aggregations over the actual stored listings.
// No invented numbers: every figure below is computed from the database.
router.get('/prices', async (req, res) => {
  const byLocality = await Property.aggregate([
    {
      $group: {
        _id: '$locality',
        city: { $first: '$city' },
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        avgPricePerSqft: { $avg: { $divide: ['$price', '$areaSqft'] } },
      },
    },
    { $sort: { avgPricePerSqft: -1 } },
    { $limit: 8 },
  ]);
  const byType = await Property.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
    { $sort: { count: -1 } },
  ]);
  const byCity = await Property.aggregate([
    { $group: { _id: '$city', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
    { $sort: { count: -1 } },
  ]);
  const byBeds = await Property.aggregate([
    { $group: { _id: '$beds', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
    { $sort: { _id: 1 } },
  ]);
  const round = (n) => (n == null ? null : Math.round(n));
  return res.json({
    byLocality: byLocality.map((r) => ({
      locality: r._id,
      city: r.city,
      count: r.count,
      avgPrice: round(r.avgPrice),
      avgPricePerSqft: round(r.avgPricePerSqft),
    })),
    byType: byType.map((r) => ({ type: r._id, count: r.count, avgPrice: round(r.avgPrice) })),
    byCity: byCity.map((r) => ({ city: r._id, count: r.count, avgPrice: round(r.avgPrice) })),
    byBeds: byBeds.map((r) => ({ beds: r._id, count: r.count, avgPrice: round(r.avgPrice) })),
  });
});

module.exports = router;
