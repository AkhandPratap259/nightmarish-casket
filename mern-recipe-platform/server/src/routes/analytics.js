const express = require('express');
const Recipe = require('../models/Recipe');
const MealPlan = require('../models/MealPlan');
const { auth, optionalAuth } = require('../middleware/auth');
const { weekStartOf, addDays } = require('../utils/helpers');

const router = express.Router();

// Public totals for the home page stats strip.
router.get('/stats', async (req, res) => {
  const [totalRecipes, cookedAgg, cuisines] = await Promise.all([
    Recipe.countDocuments({ hidden: { $ne: true } }),
    Recipe.aggregate([{ $group: { _id: null, total: { $sum: '$timesCooked' } } }]),
    Recipe.distinct('cuisine', { hidden: { $ne: true } }),
  ]);
  return res.json({
    totalRecipes,
    timesCooked: cookedAgg[0] ? cookedAgg[0].total : 0,
    cuisines: cuisines.length,
  });
});

// Weekly cooking streak: consecutive ISO weeks (counting back from the
// current week) in which the signed-in user has at least one planned meal.
// Computed from meal-plan dates; a week with no planned meal breaks the run.
router.get('/analytics/overview', auth, async (req, res) => {
  const [totalRecipes, mostCooked, topRated, cuisineDist, myRecipes, myPlans] = await Promise.all([
    Recipe.countDocuments({ hidden: { $ne: true } }),
    Recipe.find({ hidden: { $ne: true } }).sort({ timesCooked: -1 }).limit(5).select('title cuisine timesCooked').lean(),
    Recipe.find({ hidden: { $ne: true }, ratingCount: { $gte: 1 } }).sort({ ratingAvg: -1, ratingCount: -1 }).limit(5).select('title cuisine ratingAvg ratingCount').lean(),
    Recipe.aggregate([
      { $match: { hidden: { $ne: true } } },
      { $group: { _id: '$cuisine', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Recipe.countDocuments({ author: req.user._id }),
    MealPlan.find({ user: req.user._id }).select('date').lean(),
  ]);

  const weeksWithPlans = new Set(myPlans.map((p) => weekStartOf(p.date)));
  let streak = 0;
  let cursor = weekStartOf(new Date().toISOString().slice(0, 10));
  while (weeksWithPlans.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  const thisWeekStart = weekStartOf(new Date().toISOString().slice(0, 10));
  const plansThisWeek = myPlans.filter((p) => p.date >= thisWeekStart && p.date < addDays(thisWeekStart, 7)).length;

  return res.json({
    totalRecipes,
    myRecipes,
    plansThisWeek,
    weeklyStreak: streak,
    streakDefinition: 'Consecutive weeks (counting back from this week) with at least one planned meal.',
    mostCooked: mostCooked.map((r) => ({ id: r._id, title: r.title, cuisine: r.cuisine, timesCooked: r.timesCooked })),
    topRated: topRated.map((r) => ({ id: r._id, title: r.title, cuisine: r.cuisine, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount })),
    cuisineDistribution: cuisineDist.map((c) => ({ cuisine: c._id, count: c.count })),
  });
});

module.exports = router;
