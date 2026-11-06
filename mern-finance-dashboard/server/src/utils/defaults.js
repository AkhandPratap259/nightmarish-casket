const Category = require('../models/Category');

// Sensible default categories seeded on register and for the demo user.
const DEFAULT_CATEGORIES = [
  { name: 'Salary', kind: 'income', colour: '#0f3d2e', icon: '₹' },
  { name: 'Freelance', kind: 'income', colour: '#2e7d5b', icon: '✦' },
  { name: 'Food', kind: 'expense', colour: '#c05621', icon: '🍽' },
  { name: 'Transport', kind: 'expense', colour: '#2b6cb0', icon: '🚌' },
  { name: 'Rent', kind: 'expense', colour: '#6b46c1', icon: '⌂' },
  { name: 'Shopping', kind: 'expense', colour: '#b83280', icon: '🛍' },
  { name: 'Entertainment', kind: 'expense', colour: '#d69e2e', icon: '🎬' },
  { name: 'Health', kind: 'expense', colour: '#38a169', icon: '✚' },
  { name: 'Utilities', kind: 'expense', colour: '#718096', icon: '💡' },
  { name: 'Subscriptions', kind: 'expense', colour: '#805ad5', icon: '↻' },
  { name: 'Other', kind: 'expense', colour: '#a0aec0', icon: '•' },
];

async function seedDefaultCategories(userId) {
  const docs = DEFAULT_CATEGORIES.map((c) => ({ ...c, user: userId }));
  await Category.insertMany(docs, { ordered: false }).catch(() => {});
  return Category.find({ user: userId });
}

module.exports = { DEFAULT_CATEGORIES, seedDefaultCategories };
