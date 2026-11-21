const express = require('express');
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Review = require('../models/Review');
const MealPlan = require('../models/MealPlan');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', auth, requireRole('admin'), async (req, res) => {
  const [users, recipes, reviews, plans, newestUsers, flagged] = await Promise.all([
    User.countDocuments(),
    Recipe.countDocuments(),
    Review.countDocuments(),
    MealPlan.countDocuments(),
    User.find().sort({ createdAt: -1 }).limit(8).lean(),
    Recipe.find({ flagged: true }).populate('author', 'name').sort({ updatedAt: -1 }).limit(10).lean(),
  ]);
  return res.json({
    users,
    recipes,
    reviews,
    plans,
    newestUsers: newestUsers.map((u) => ({
      id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt,
    })),
    flaggedRecipes: flagged.map((r) => ({
      id: r._id,
      title: r.title,
      cuisine: r.cuisine,
      author: r.author ? r.author.name : '',
      hidden: r.hidden,
      createdAt: r.createdAt,
    })),
  });
});

module.exports = router;
