const express = require('express');
const Recipe = require('../models/Recipe');
const Review = require('../models/Review');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');
const { scaleQuantity, round2 } = require('../utils/helpers');
const { estimateNutrition } = require('../utils/nutrition');
const { emitToRecipe } = require('../utils/notify');

const router = express.Router();

const CATEGORIES = ['Breakfast', 'Main', 'Dessert', 'Snack', 'Drink'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function publicRecipe(r, servingsOverride) {
  const obj = r.toObject ? r.toObject() : r;
  const servings = servingsOverride || obj.servings;
  const factor = servings / obj.servings;
  const scaledIngredients = obj.ingredients.map((ing) => ({
    ...ing,
    quantity: scaleQuantity(ing.quantity, factor),
  }));
  return {
    ...obj,
    servings,
    ingredients: scaledIngredients,
    totalTimeMin: obj.prepTimeMin + obj.cookTimeMin,
    nutrition: estimateNutrition(scaledIngredients, servings),
  };
}

function validateRecipeBody(body) {
  const errors = [];
  if (!body.title || String(body.title).trim().length < 3) errors.push('Title needs at least 3 characters');
  if (!body.description || String(body.description).trim().length < 10) errors.push('Description needs at least 10 characters');
  if (!body.cuisine || !String(body.cuisine).trim()) errors.push('Cuisine is required');
  if (!CATEGORIES.includes(body.category)) errors.push('Category must be Breakfast, Main, Dessert, Snack or Drink');
  if (!DIFFICULTIES.includes(body.difficulty)) errors.push('Difficulty must be Easy, Medium or Hard');
  if (!(Number(body.prepTimeMin) >= 0)) errors.push('Prep time must be 0 or more');
  if (!(Number(body.cookTimeMin) >= 0)) errors.push('Cook time must be 0 or more');
  if (!(Number(body.servings) >= 1 && Number(body.servings) <= 24)) errors.push('Servings must be between 1 and 24');
  if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) errors.push('Add at least one ingredient');
  if (!Array.isArray(body.steps) || body.steps.length === 0) errors.push('Add at least one step');
  return errors;
}

function recipeFields(body) {
  return {
    title: String(body.title).trim(),
    description: String(body.description).trim(),
    cuisine: String(body.cuisine).trim(),
    category: body.category,
    difficulty: body.difficulty,
    prepTimeMin: Number(body.prepTimeMin),
    cookTimeMin: Number(body.cookTimeMin),
    servings: Number(body.servings),
    ingredients: (body.ingredients || []).map((ing) => ({
      name: String(ing.name || '').trim(),
      quantity: Number(ing.quantity) || 0,
      unit: String(ing.unit || '').trim(),
    })).filter((ing) => ing.name),
    steps: (body.steps || []).map((s, i) => ({
      order: Number(s.order) || i + 1,
      text: String(s.text || '').trim(),
    })).filter((s) => s.text).sort((a, b) => a.order - b.order),
    tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12) : [],
  };
}

async function recomputeRating(recipeId) {
  const stats = await Review.aggregate([
    { $match: { recipe: recipeId } },
    { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
  ]);
  const avg = stats[0] ? round2(stats[0].avg) : 0;
  const count = stats[0] ? stats[0].count : 0;
  await Recipe.findByIdAndUpdate(recipeId, { ratingAvg: avg, ratingCount: count });
  return { ratingAvg: avg, ratingCount: count };
}

// List with search / filter / sort / pagination. Hidden recipes are only
// listed for admins who pass includeHidden=1.
router.get('/', optionalAuth, async (req, res) => {
  const { q, cuisine, category, difficulty, maxTotalTime, sort, page, limit, mine, author } = req.query;
  const filter = {};
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin || req.query.includeHidden !== '1') filter.hidden = { $ne: true };
  if (cuisine) filter.cuisine = new RegExp(`^${String(cuisine).trim()}$`, 'i');
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (mine === '1') {
    if (!req.user) return res.status(401).json({ error: 'Sign in required' });
    filter.author = req.user._id;
  } else if (author) {
    filter.author = author;
  }
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { 'ingredients.name': rx }];
  }
  if (maxTotalTime) {
    const max = Number(maxTotalTime);
    filter.$expr = { $lte: [{ $add: ['$prepTimeMin', '$cookTimeMin'] }, max] };
  }
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(limit) || 12));
  const sortMap = {
    'top-rated': { ratingAvg: -1, ratingCount: -1 },
    quickest: null, // computed below via aggregation-free sort on total time
    'most-cooked': { timesCooked: -1 },
    newest: { createdAt: -1 },
  };
  let query = Recipe.find(filter).populate('author', 'name');
  if (sort === 'quickest') {
    // Total time is prep + cook; sort client-side-safe by fetching sorted on
    // the sum through an aggregation-free approach: sort by prep then cook.
    query = query.sort({ prepTimeMin: 1, cookTimeMin: 1 });
  } else {
    query = query.sort(sortMap[sort] || { createdAt: -1 });
  }
  let recipes = await query.skip((pageNum - 1) * pageSize).limit(pageSize).lean();
  const total = await Recipe.countDocuments(filter);
  return res.json({
    recipes: recipes.map((r) => publicRecipe(r)),
    total,
    page: pageNum,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

router.get('/:id', optionalAuth, async (req, res) => {
  const recipe = await Recipe.findById(req.params.id).populate('author', 'name');
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  if (recipe.hidden && (!req.user || req.user.role !== 'admin')) {
    return res.status(404).json({ error: 'Recipe not found' });
  }
  const servings = Number(req.query.servings);
  return res.json({ recipe: publicRecipe(recipe, servings > 0 ? servings : undefined) });
});

router.post('/', auth, async (req, res) => {
  const errors = validateRecipeBody(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  const recipe = await Recipe.create({ ...recipeFields(req.body), author: req.user._id });
  return res.status(201).json({ recipe: publicRecipe(recipe) });
});

router.put('/:id', auth, async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  const isOwner = String(recipe.author) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the author can edit this recipe' });
  }
  const errors = validateRecipeBody(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  Object.assign(recipe, recipeFields(req.body));
  await recipe.save();
  return res.json({ recipe: publicRecipe(recipe) });
});

router.delete('/:id', auth, async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  const isOwner = String(recipe.author) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the author can delete this recipe' });
  }
  await Review.deleteMany({ recipe: recipe._id });
  await recipe.deleteOne();
  return res.json({ ok: true });
});

router.post('/:id/cooked', auth, async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(
    req.params.id,
    { $inc: { timesCooked: 1 } },
    { new: true }
  );
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  return res.json({ timesCooked: recipe.timesCooked });
});

router.post('/:id/report', auth, async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(
    req.params.id,
    { flagged: true },
    { new: true }
  );
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  return res.json({ ok: true, flagged: true });
});

router.post('/:id/hide', auth, requireRole('admin'), async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, { hidden: true }, { new: true });
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  return res.json({ recipe: publicRecipe(recipe) });
});

router.post('/:id/unhide', auth, requireRole('admin'), async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, { hidden: false }, { new: true });
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  return res.json({ recipe: publicRecipe(recipe) });
});

// Reviews: one per user per recipe; posting again updates the existing one.
router.get('/:id/reviews', async (req, res) => {
  const reviews = await Review.find({ recipe: req.params.id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .lean();
  return res.json({
    reviews: reviews.map((r) => ({
      id: r._id,
      stars: r.stars,
      text: r.text,
      user: r.user ? r.user.name : 'Cook',
      userId: r.user ? r.user._id : null,
      createdAt: r.createdAt,
    })),
  });
});

router.post('/:id/reviews', auth, async (req, res) => {
  const { stars, text } = req.body || {};
  if (!(Number(stars) >= 1 && Number(stars) <= 5)) {
    return res.status(400).json({ error: 'Stars must be between 1 and 5' });
  }
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  const review = await Review.findOneAndUpdate(
    { recipe: recipe._id, user: req.user._id },
    { stars: Number(stars), text: String(text || '').trim() },
    { new: true, upsert: true }
  );
  const rating = await recomputeRating(recipe._id);
  emitToRecipe(recipe._id, 'review:updated', {
    recipeId: String(recipe._id),
    stars: review.stars,
    user: req.user.name,
    ...rating,
  });
  return res.status(201).json({ review, ...rating });
});

module.exports = router;
