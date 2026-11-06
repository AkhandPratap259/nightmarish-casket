const Category = require('../models/Category');

// Sensible default categories seeded on register and for the demo user.
const DEFAULT_CATEGORIES = [
  { name: 'Salary', kind: 'income', colour: '#2ec4b6', icon: '₹' },
  { name: 'Freelance', kind: 'income', colour: '#34d399', icon: '✦' },
  { name: 'Food', kind: 'expense', colour: '#ff5a8a', icon: '🍽' },
  { name: 'Transport', kind: 'expense', colour: '#5eead4', icon: '🚌' },
  { name: 'Rent', kind: 'expense', colour: '#7c5cff', icon: '⌂' },
  { name: 'Shopping', kind: 'expense', colour: '#ff8ab0', icon: '🛍' },
  { name: 'Entertainment', kind: 'expense', colour: '#ffb020', icon: '🎬' },
  { name: 'Health', kind: 'expense', colour: '#34d399', icon: '✚' },
  { name: 'Utilities', kind: 'expense', colour: '#a78bfa', icon: '💡' },
  { name: 'Subscriptions', kind: 'expense', colour: '#c084fc', icon: '↻' },
  { name: 'Other', kind: 'expense', colour: '#8d86c2', icon: '•' },
];

async function seedDefaultCategories(userId) {
  const docs = DEFAULT_CATEGORIES.map((c) => ({ ...c, user: userId }));
  await Category.insertMany(docs, { ordered: false }).catch(() => {});
  return Category.find({ user: userId });
}

module.exports = { DEFAULT_CATEGORIES, seedDefaultCategories };
