const Booking = require('../models/Booking');
const Review = require('../models/Review');

// Provider aggregates, always computed from live bookings and reviews —
// never stored, never invented.
//
//   rating        mean of all review ratings (neutral 4.0 while unreviewed)
//   reviewCount   number of reviews received
//   completedJobs bookings in status "completed"
//   responseRate  share of requests the provider answered (accepted,
//                 declined, started or completed) out of all requests
//                 received; 1.0 while no request has arrived yet
//   earnings      sum of priceBreakdown.total over completed bookings
async function getProviderStats(providerId) {
  const [bookings, reviews] = await Promise.all([
    Booking.find({ provider: providerId }).select('status priceBreakdown').lean(),
    Review.find({ provider: providerId }).select('rating').lean(),
  ]);

  const requested = bookings.length;
  const answered = bookings.filter((b) => b.status !== 'requested').length;
  const completedJobs = bookings.filter((b) => b.status === 'completed').length;
  const earnings = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.priceBreakdown ? b.priceBreakdown.total : 0), 0);

  const reviewCount = reviews.length;
  const rating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 4.0;

  return {
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    completedJobs,
    responseRate: requested === 0 ? 1 : Math.round((answered / requested) * 100) / 100,
    earnings,
    totalRequests: requested,
  };
}

// Match score, 0–100. Every input is live data; the formula is published in
// the README and in the browse UI so customers can see why an offering
// ranks where it does.
//
//   rating        up to 30  — (rating / 5) * 30
//   completed     up to 20  — min(completedJobs / 50, 1) * 20
//   response rate up to 20  — responseRate * 20
//   price         up to 20  — min(1, categoryMedian / price) * 20
//   area match    up to 10  — 10 if the provider serves the customer's
//                             area, 5 when no area was given, else 0
function computeMatchScore(stats, price, medianPrice, servesArea) {
  const ratingPart = (stats.rating / 5) * 30;
  const jobsPart = Math.min(stats.completedJobs / 50, 1) * 20;
  const responsePart = stats.responseRate * 20;
  const median = medianPrice && medianPrice > 0 ? medianPrice : price;
  const pricePart = Math.min(1, median / Math.max(price, 1)) * 20;
  const areaPart = servesArea === null || servesArea === undefined ? 5 : servesArea ? 10 : 0;
  const raw = ratingPart + jobsPart + responsePart + pricePart + areaPart;
  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    parts: {
      rating: Math.round(ratingPart),
      completedJobs: Math.round(jobsPart),
      responseRate: Math.round(responsePart),
      price: Math.round(pricePart),
      area: areaPart,
    },
  };
}

module.exports = { getProviderStats, computeMatchScore };
