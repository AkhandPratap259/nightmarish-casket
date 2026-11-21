// FlavorForge seed data — fixed demo users, 12 demo recipes, demo reviews,
// two demo collections and a sample week meal plan for the demo cook.
// All names, amounts and dates here are demo data for local testing only.
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Review = require('../models/Review');
const Collection = require('../models/Collection');
const MealPlan = require('../models/MealPlan');
const { weekStartOf, addDays } = require('../utils/helpers');

const PASSWORD = 'FlavorForge123!';

const DEMO_USERS = [
  { name: 'Asha Demo', email: 'demo@flavorforge.example', role: 'cook' },
  { name: 'Rohan Chef', email: 'demo-chef@flavorforge.example', role: 'cook' },
  { name: 'FlavorForge Admin', email: 'admin@flavorforge.example', role: 'admin' },
];

function ing(name, quantity, unit) {
  return { name, quantity, unit };
}
function step(order, text) {
  return { order, text };
}

const RECIPES = [
  {
    title: 'Chole Masala',
    description: 'Slow-simmered chickpeas in a spiced tomato and onion gravy — the North Indian weeknight classic, best with rice or bhature.',
    cuisine: 'Indian', category: 'Main', difficulty: 'Medium', prepTimeMin: 15, cookTimeMin: 35, servings: 4, tags: ['veg', 'one-pot', 'spicy'],
    author: 'demo',
    ingredients: [ing('chickpeas', 400, 'g'), ing('tomato', 300, 'g'), ing('onion', 200, 'g'), ing('ginger', 20, 'g'), ing('garlic', 15, 'g'), ing('oil', 30, 'ml'), ing('green chilli', 2, 'piece'), ing('salt', 8, 'g'), ing('coriander leaves', 20, 'g')],
    steps: [step(1, 'Soak the chickpeas overnight, then pressure-cook or boil until tender.'), step(2, 'Heat oil and fry the onion until golden, then add ginger, garlic and green chilli.'), step(3, 'Add the chopped tomato and cook until the oil separates.'), step(4, 'Stir in the chickpeas with a splash of their cooking water.'), step(5, 'Simmer 20 minutes until the gravy thickens.'), step(6, 'Season with salt and finish with coriander leaves.')],
    rating: 4.8, timesCooked: 14,
  },
  {
    title: 'Masala Dosa',
    description: 'Crisp fermented rice crepe wrapped around a spiced potato filling, served with coconut chutney. A South Indian breakfast staple.',
    cuisine: 'Indian', category: 'Breakfast', difficulty: 'Hard', prepTimeMin: 20, cookTimeMin: 25, servings: 4, tags: ['breakfast', 'fermented'],
    author: 'demo-chef',
    ingredients: [ing('rice', 300, 'g'), ing('urad dal', 100, 'g'), ing('potato', 400, 'g'), ing('onion', 100, 'g'), ing('green chilli', 2, 'piece'), ing('ginger', 15, 'g'), ing('oil', 40, 'ml'), ing('salt', 8, 'g')],
    steps: [step(1, 'Grind soaked rice and urad dal into a smooth batter and ferment overnight.'), step(2, 'Boil and mash the potatoes.'), step(3, 'Temper mustard seeds, then fry onion, ginger and green chilli.'), step(4, 'Fold in the mashed potato and salt for the filling.'), step(5, 'Ladle batter onto a hot tawa and spread thin in a circle.'), step(6, 'Drizzle oil, cook until crisp, add filling and fold.')],
    rating: 4.9, timesCooked: 9,
  },
  {
    title: 'Paneer Butter Masala',
    description: 'Soft paneer cubes folded into a rich tomato-butter gravy with cream. Mild, comforting and ready in half an hour.',
    cuisine: 'Indian', category: 'Main', difficulty: 'Easy', prepTimeMin: 10, cookTimeMin: 25, servings: 4, tags: ['veg', 'creamy'],
    author: 'demo',
    ingredients: [ing('paneer', 400, 'g'), ing('tomato', 400, 'g'), ing('onion', 150, 'g'), ing('butter', 40, 'g'), ing('cream', 100, 'ml'), ing('garlic', 15, 'g'), ing('ginger', 15, 'g'), ing('salt', 7, 'g'), ing('coriander leaves', 15, 'g')],
    steps: [step(1, 'Blanch the tomatoes, peel and blend them smooth.'), step(2, 'Melt butter and fry onion, garlic and ginger until soft.'), step(3, 'Pour in the tomato puree and simmer 12 minutes.'), step(4, 'Add the paneer cubes and stir gently.'), step(5, 'Swirl in the cream and season with salt.'), step(6, 'Rest 5 minutes and garnish with coriander leaves.')],
    rating: 4.7, timesCooked: 18,
  },
  {
    title: 'Spaghetti Aglio e Olio',
    description: 'Five ingredients, ten minutes: garlic, chilli and olive oil tossed through al dente spaghetti. The Italian pantry rescue dish.',
    cuisine: 'Italian', category: 'Main', difficulty: 'Easy', prepTimeMin: 5, cookTimeMin: 12, servings: 2, tags: ['quick', 'vegan'],
    author: 'demo-chef',
    ingredients: [ing('spaghetti', 200, 'g'), ing('garlic', 20, 'g'), ing('olive oil', 60, 'ml'), ing('chilli flakes', 5, 'g'), ing('salt', 6, 'g'), ing('coriander leaves', 10, 'g')],
    steps: [step(1, 'Boil the spaghetti in well-salted water until al dente.'), step(2, 'Warm the olive oil and gently fry the sliced garlic until pale gold.'), step(3, 'Add the chilli flakes off the heat.'), step(4, 'Toss the drained pasta through the oil with a splash of pasta water.'), step(5, 'Season and serve with chopped herbs.')],
    rating: 4.6, timesCooked: 22,
  },
  {
    title: 'Margherita Pizza',
    description: 'Thin crust, tomato sauce, fresh mozzarella and basil — the Neapolitan original, kept deliberately simple.',
    cuisine: 'Italian', category: 'Main', difficulty: 'Medium', prepTimeMin: 30, cookTimeMin: 15, servings: 2, tags: ['baking', 'veg'],
    author: 'demo',
    ingredients: [ing('pizza dough', 300, 'g'), ing('tomato sauce', 150, 'g'), ing('mozzarella', 150, 'g'), ing('basil', 15, 'g'), ing('olive oil', 15, 'ml'), ing('salt', 5, 'g'), ing('flour', 30, 'g')],
    steps: [step(1, 'Heat the oven as hot as it will go with a tray inside.'), step(2, 'Stretch the dough on a floured surface to a thin round.'), step(3, 'Spread the tomato sauce, leaving a border.'), step(4, 'Tear over the mozzarella and drizzle with olive oil.'), step(5, 'Bake 10–12 minutes until the crust blisters.'), step(6, 'Top with basil leaves and serve immediately.')],
    rating: 4.5, timesCooked: 7,
  },
  {
    title: 'Veg Tacos',
    description: 'Charred vegetables, spiced black beans and fresh salsa in warm tortillas — a build-your-own Mexican dinner.',
    cuisine: 'Mexican', category: 'Main', difficulty: 'Easy', prepTimeMin: 15, cookTimeMin: 15, servings: 4, tags: ['vegan', 'quick'],
    author: 'demo-chef',
    ingredients: [ing('tortilla', 8, 'piece'), ing('black beans', 400, 'g'), ing('bell pepper', 200, 'g'), ing('onion', 150, 'g'), ing('corn', 150, 'g'), ing('salsa', 150, 'g'), ing('lime', 1, 'piece'), ing('avocado', 150, 'g')],
    steps: [step(1, 'Warm the beans with a pinch of salt and cumin.'), step(2, 'Char the peppers and onion in a hot pan.'), step(3, 'Warm the tortillas over a flame or in a dry pan.'), step(4, 'Mash the avocado with lime juice and salt.'), step(5, 'Fill each tortilla with beans, vegetables and corn.'), step(6, 'Top with salsa and serve with lime wedges.')],
    rating: 4.4, timesCooked: 11,
  },
  {
    title: 'Chicken Fajitas',
    description: 'Sizzling strips of chicken and peppers with warm tortillas and toppings — a loud, hands-on Mexican favourite.',
    cuisine: 'Mexican', category: 'Main', difficulty: 'Medium', prepTimeMin: 15, cookTimeMin: 15, servings: 4, tags: ['chicken', 'one-pan'],
    author: 'demo',
    ingredients: [ing('chicken breast', 500, 'g'), ing('bell pepper', 300, 'g'), ing('onion', 200, 'g'), ing('tortilla', 8, 'piece'), ing('lime', 1, 'piece'), ing('oil', 30, 'ml'), ing('salt', 7, 'g'), ing('salsa', 120, 'g')],
    steps: [step(1, 'Slice the chicken and peppers into even strips.'), step(2, 'Season the chicken with salt and spices.'), step(3, 'Sear the chicken in a hot oiled pan until cooked through.'), step(4, 'Add the peppers and onion and cook until just softened.'), step(5, 'Squeeze over the lime juice.'), step(6, 'Serve in warm tortillas with salsa.')],
    rating: 4.6, timesCooked: 12,
  },
  {
    title: 'Veg Hakka Noodles',
    description: 'Street-style Indo-Chinese noodles tossed with crunchy vegetables and soy sauce — fast, smoky and endlessly adaptable.',
    cuisine: 'Chinese', category: 'Main', difficulty: 'Easy', prepTimeMin: 10, cookTimeMin: 12, servings: 3, tags: ['quick', 'vegan'],
    author: 'demo-chef',
    ingredients: [ing('noodles', 250, 'g'), ing('cabbage', 150, 'g'), ing('carrot', 100, 'g'), ing('bell pepper', 100, 'g'), ing('spring onion', 50, 'g'), ing('soy sauce', 30, 'ml'), ing('oil', 30, 'ml'), ing('garlic', 10, 'g')],
    steps: [step(1, 'Boil the noodles, drain and toss with a little oil.'), step(2, 'Heat oil on high and fry the garlic briefly.'), step(3, 'Add the vegetables and stir-fry for 2 minutes.'), step(4, 'Add the noodles and soy sauce.'), step(5, 'Toss on high heat until everything is coated.'), step(6, 'Finish with spring onion and serve hot.')],
    rating: 4.3, timesCooked: 16,
  },
  {
    title: 'Chilli Paneer',
    description: 'Crisp-edged paneer cubes glazed in a spicy soy-chilli sauce with peppers — the Indo-Chinese restaurant starter, made at home.',
    cuisine: 'Chinese', category: 'Snack', difficulty: 'Medium', prepTimeMin: 15, cookTimeMin: 12, servings: 3, tags: ['spicy', 'starter'],
    author: 'demo',
    ingredients: [ing('paneer', 350, 'g'), ing('bell pepper', 150, 'g'), ing('onion', 120, 'g'), ing('soy sauce', 30, 'ml'), ing('green chilli', 3, 'piece'), ing('garlic', 15, 'g'), ing('ginger', 10, 'g'), ing('oil', 40, 'ml')],
    steps: [step(1, 'Cube the paneer and pan-fry until golden at the edges.'), step(2, 'Fry garlic, ginger and green chilli in hot oil.'), step(3, 'Add onion and peppers and cook for 2 minutes.'), step(4, 'Pour in the soy sauce and a splash of water.'), step(5, 'Toss in the paneer and coat in the sauce.'), step(6, 'Serve immediately while the edges are still crisp.')],
    rating: 4.5, timesCooked: 8,
  },
  {
    title: 'Thai Green Curry',
    description: 'Fragrant coconut curry with vegetables and tofu, simmered with green curry paste and finished with basil.',
    cuisine: 'Thai', category: 'Main', difficulty: 'Medium', prepTimeMin: 15, cookTimeMin: 20, servings: 4, tags: ['vegan', 'coconut'],
    author: 'demo-chef',
    ingredients: [ing('coconut milk', 400, 'ml'), ing('tofu', 300, 'g'), ing('bell pepper', 150, 'g'), ing('mushrooms', 150, 'g'), ing('rice', 300, 'g'), ing('basil', 15, 'g'), ing('lime', 1, 'piece'), ing('salt', 6, 'g')],
    steps: [step(1, 'Simmer the rice and set aside.'), step(2, 'Fry the green curry paste in a little coconut milk until fragrant.'), step(3, 'Add the remaining coconut milk and bring to a gentle simmer.'), step(4, 'Add tofu, peppers and mushrooms.'), step(5, 'Cook 10 minutes until the vegetables are tender.'), step(6, 'Season, add basil and lime, and serve over rice.')],
    rating: 4.7, timesCooked: 6,
  },
  {
    title: 'Greek Salad',
    description: 'Tomato, cucumber, onion, olives and feta with olive oil and lemon — no cooking, just good ingredients and a sharp knife.',
    cuisine: 'Mediterranean', category: 'Snack', difficulty: 'Easy', prepTimeMin: 12, cookTimeMin: 0, servings: 4, tags: ['no-cook', 'veg'],
    author: 'demo',
    ingredients: [ing('tomato', 400, 'g'), ing('cucumber', 300, 'g'), ing('onion', 100, 'g'), ing('feta', 150, 'g'), ing('olive oil', 45, 'ml'), ing('lemon', 1, 'piece'), ing('salt', 5, 'g')],
    steps: [step(1, 'Chop the tomatoes and cucumber into chunky pieces.'), step(2, 'Slice the onion thinly.'), step(3, 'Combine in a wide bowl and season with salt.'), step(4, 'Crumble the feta over the top.'), step(5, 'Dress with olive oil and lemon juice.'), step(6, 'Toss once and serve straight away.')],
    rating: 4.2, timesCooked: 19,
  },
  {
    title: 'Shakshuka',
    description: 'Eggs poached in a spiced tomato and pepper sauce — a one-pan Mediterranean breakfast that doubles as dinner.',
    cuisine: 'Mediterranean', category: 'Breakfast', difficulty: 'Easy', prepTimeMin: 10, cookTimeMin: 20, servings: 3, tags: ['one-pan', 'breakfast'],
    author: 'demo-chef',
    ingredients: [ing('egg', 6, 'piece'), ing('tomato', 500, 'g'), ing('bell pepper', 200, 'g'), ing('onion', 150, 'g'), ing('garlic', 15, 'g'), ing('olive oil', 30, 'ml'), ing('bread', 200, 'g'), ing('salt', 6, 'g')],
    steps: [step(1, 'Soften the onion and pepper in olive oil.'), step(2, 'Add garlic and cook for a minute.'), step(3, 'Pour in the tomatoes and simmer 10 minutes.'), step(4, 'Make wells in the sauce and crack in the eggs.'), step(5, 'Cover and cook until the whites are set.'), step(6, 'Serve straight from the pan with bread.')],
    rating: 4.8, timesCooked: 10,
  },
];

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = {};
  for (const u of DEMO_USERS) {
    users[u.email] = await User.create({ ...u, passwordHash });
  }
  const demo = users['demo@flavorforge.example'];
  const chef = users['demo-chef@flavorforge.example'];

  const byKey = { demo, 'demo-chef': chef };
  const created = [];
  for (const r of RECIPES) {
    const author = byKey[r.author] || demo;
    const doc = await Recipe.create({
      title: r.title,
      description: r.description,
      cuisine: r.cuisine,
      category: r.category,
      difficulty: r.difficulty,
      prepTimeMin: r.prepTimeMin,
      cookTimeMin: r.cookTimeMin,
      servings: r.servings,
      ingredients: r.ingredients,
      steps: r.steps,
      tags: r.tags,
      author: author._id,
      timesCooked: r.timesCooked,
    });
    created.push(doc);
  }

  // Demo reviews: one per user per recipe, spread across the list.
  const reviewPlan = [
    { recipe: 0, user: chef, stars: 5, text: 'Made it twice this week — the gravy comes together beautifully.' },
    { recipe: 0, user: demo, stars: 4, text: 'Great base recipe. I add a little more tomato for extra tang.' },
    { recipe: 1, user: demo, stars: 5, text: 'Crisp edges, soft inside. The filling is spot on.' },
    { recipe: 2, user: chef, stars: 5, text: 'Restaurant-style richness without much effort.' },
    { recipe: 3, user: demo, stars: 5, text: 'Ten minutes and it tastes like far more work than it is.' },
    { recipe: 5, user: demo, stars: 4, text: 'Easy to scale up for guests — the beans carry it.' },
    { recipe: 9, user: demo, stars: 5, text: 'Fragrant and forgiving. Works with whatever vegetables are in the fridge.' },
    { recipe: 11, user: chef, stars: 5, text: 'My go-to weekend breakfast now.' },
  ];
  for (const item of reviewPlan) {
    await Review.create({ recipe: created[item.recipe]._id, user: item.user._id, stars: item.stars, text: item.text });
  }
  // Recompute stored ratings from the reviews just created.
  for (const doc of created) {
    const stats = await Review.aggregate([
      { $match: { recipe: doc._id } },
      { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
    ]);
    if (stats[0]) {
      doc.ratingAvg = Math.round(stats[0].avg * 100) / 100;
      doc.ratingCount = stats[0].count;
      await doc.save();
    }
  }

  await Collection.create({
    user: demo._id,
    name: 'Weeknight favourites',
    description: 'Fast, reliable dinners for busy evenings.',
    recipes: [created[0]._id, created[3]._id, created[7]._id],
  });
  await Collection.create({
    user: demo._id,
    name: 'Weekend cooking',
    description: 'Slower recipes worth the extra time.',
    recipes: [created[1]._id, created[4]._id, created[11]._id],
  });

  // Sample week meal plan for the demo cook, current week, so the planner
  // and grocery list are non-empty on first run.
  const monday = weekStartOf(new Date().toISOString().slice(0, 10));
  const plan = [
    { day: 0, slot: 'breakfast', recipe: 11 },
    { day: 0, slot: 'dinner', recipe: 0 },
    { day: 1, slot: 'lunch', recipe: 3 },
    { day: 1, slot: 'dinner', recipe: 2 },
    { day: 2, slot: 'dinner', recipe: 6 },
    { day: 3, slot: 'lunch', recipe: 7 },
    { day: 3, slot: 'dinner', recipe: 9 },
    { day: 4, slot: 'dinner', recipe: 5 },
    { day: 5, slot: 'breakfast', recipe: 1 },
    { day: 5, slot: 'dinner', recipe: 4 },
    { day: 6, slot: 'lunch', recipe: 10 },
  ];
  for (const p of plan) {
    await MealPlan.create({
      user: demo._id,
      date: addDays(monday, p.day),
      slot: p.slot,
      recipe: created[p.recipe]._id,
      servings: created[p.recipe].servings,
    });
  }
}

if (require.main === module) {
  (async () => {
    let uri = process.env.MONGO_URI;
    let mongod = null;
    if (!uri) {
      const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';
      mongod = await MongoMemoryServer.create({
        binary: isWindowsArm ? { arch: 'x64' } : {},
        instance: { launchTimeout: 60000 },
      });
      uri = mongod.getUri();
    }
    await mongoose.connect(uri, { dbName: 'flavorforge' });
    await mongoose.connection.dropDatabase();
    await seed();
    console.log('FlavorForge seed complete');
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seed;
