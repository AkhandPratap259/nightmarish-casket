const express = require('express');
const Collection = require('../models/Collection');
const Recipe = require('../models/Recipe');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const collections = await Collection.find({ user: req.user._id })
    .populate('recipes', 'title cuisine category')
    .sort({ createdAt: -1 })
    .lean();
  return res.json({
    collections: collections.map((c) => ({
      id: c._id,
      name: c.name,
      description: c.description,
      recipeCount: c.recipes.length,
      recipes: c.recipes,
      createdAt: c.createdAt,
    })),
  });
});

router.post('/', auth, async (req, res) => {
  const { name, description } = req.body || {};
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Collection name needs at least 2 characters' });
  }
  const collection = await Collection.create({
    user: req.user._id,
    name: String(name).trim(),
    description: String(description || '').trim(),
  });
  return res.status(201).json({ collection });
});

router.delete('/:id', auth, async (req, res) => {
  const collection = await Collection.findOne({ _id: req.params.id, user: req.user._id });
  if (!collection) return res.status(404).json({ error: 'Collection not found' });
  await collection.deleteOne();
  return res.json({ ok: true });
});

router.post('/:id/recipes', auth, async (req, res) => {
  const { recipeId } = req.body || {};
  const collection = await Collection.findOne({ _id: req.params.id, user: req.user._id });
  if (!collection) return res.status(404).json({ error: 'Collection not found' });
  const recipe = await Recipe.findById(recipeId);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  if (collection.recipes.some((r) => String(r) === String(recipeId))) {
    return res.status(409).json({ error: 'Recipe is already in this collection' });
  }
  collection.recipes.push(recipeId);
  await collection.save();
  return res.json({ ok: true, recipeCount: collection.recipes.length });
});

router.delete('/:id/recipes/:recipeId', auth, async (req, res) => {
  const collection = await Collection.findOne({ _id: req.params.id, user: req.user._id });
  if (!collection) return res.status(404).json({ error: 'Collection not found' });
  collection.recipes = collection.recipes.filter((r) => String(r) !== String(req.params.recipeId));
  await collection.save();
  return res.json({ ok: true, recipeCount: collection.recipes.length });
});

module.exports = router;
