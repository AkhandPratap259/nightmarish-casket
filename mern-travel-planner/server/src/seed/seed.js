// Demo seed data. Everything below is labelled demo data for trying the
// app locally — all trips, places and prices are sample data created by the
// demo account. No real hotels, operators or live bookings are listed, and
// no price is a price of a real business.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Activity = require('../models/Activity');
const Expense = require('../models/Expense');
const PackingItem = require('../models/PackingItem');

async function seed() {
  const count = await User.countDocuments();
  if (count > 0) return;
  const hash = await bcrypt.hash('Voyara123!', 10);

  const demo = await User.create({ name: 'Demo Traveller', email: 'demo@voyara.example', passwordHash: hash, role: 'traveller' });
  const friend = await User.create({ name: 'Demo Co-traveller', email: 'friend@voyara.example', passwordHash: hash, role: 'traveller' });

  const rajasthan = await Trip.create({
    title: 'Rajasthan Heritage Trail',
    destination: 'Jaipur, Rajasthan',
    country: 'India',
    startDate: new Date('2026-12-18'),
    endDate: new Date('2026-12-22'),
    budget: 45000,
    travellers: 2,
    notes: 'Sample trip: forts, old-city walks and local food across Jaipur and Jodhpur.',
    coverStyle: 'heritage',
    status: 'upcoming',
    owner: demo._id,
    collaborators: [{ user: friend._id, role: 'editor' }],
    demo: true,
  });

  const himachal = await Trip.create({
    title: 'Himachal Slow Mountains',
    destination: 'Manali, Himachal Pradesh',
    country: 'India',
    startDate: new Date('2027-01-09'),
    endDate: new Date('2027-01-12'),
    budget: 30000,
    travellers: 2,
    notes: 'Sample trip: a slow mountain break — walks, a day hike and cafe mornings.',
    coverStyle: 'mountain',
    status: 'planning',
    owner: demo._id,
    demo: true,
  });

  const goa = await Trip.create({
    title: 'Goa Beach Weekend',
    destination: 'North Goa, Goa',
    country: 'India',
    startDate: new Date('2027-02-14'),
    endDate: new Date('2027-02-16'),
    budget: 25000,
    travellers: 3,
    notes: 'Sample trip: beaches, a sunset cruise slot and seafood dinners.',
    coverStyle: 'coast',
    status: 'planning',
    owner: demo._id,
    demo: true,
  });

  // Rajasthan — day 0 (Jaipur arrival day).
  const activities = [
    { trip: rajasthan._id, dayIndex: 0, title: 'Amber Fort visit', category: 'sightseeing', startTime: '09:00', endTime: '12:00', cost: 500, notes: 'Sample activity — entry and guide budget.', order: 0 },
    { trip: rajasthan._id, dayIndex: 0, title: 'Old-city walk and bazaars', category: 'sightseeing', startTime: '14:00', endTime: '16:30', cost: 300, notes: 'Sample activity.', order: 1 },
    { trip: rajasthan._id, dayIndex: 0, title: 'Dinner at a local restaurant', category: 'food', startTime: '19:30', endTime: '21:00', cost: 900, notes: 'Sample activity — dinner budget for two.', order: 2 },
    { trip: rajasthan._id, dayIndex: 1, title: 'City Palace and Jantar Mantar', category: 'sightseeing', startTime: '10:00', endTime: '13:00', cost: 800, notes: 'Sample activity.', order: 0 },
    { trip: rajasthan._id, dayIndex: 1, title: 'Drive to Jodhpur', category: 'transport', startTime: '15:00', endTime: '20:00', cost: 3500, notes: 'Sample activity — intercity taxi budget.', order: 1 },
    { trip: himachal._id, dayIndex: 0, title: 'Old Manali walk', category: 'sightseeing', startTime: '10:00', endTime: '12:30', cost: 0, notes: 'Sample activity.', order: 0 },
    { trip: himachal._id, dayIndex: 0, title: 'Cafe lunch', category: 'food', startTime: '13:00', endTime: '14:00', cost: 700, notes: 'Sample activity.', order: 1 },
    { trip: goa._id, dayIndex: 0, title: 'Beach morning', category: 'sightseeing', startTime: '08:00', endTime: '11:00', cost: 0, notes: 'Sample activity.', order: 0 },
    { trip: goa._id, dayIndex: 0, title: 'Sunset cruise slot', category: 'sightseeing', startTime: '17:00', endTime: '19:00', cost: 1200, notes: 'Sample activity — cruise ticket budget.', order: 1 },
  ];
  for (const a of activities) await Activity.create({ ...a, createdBy: demo._id });

  const expenses = [
    { trip: rajasthan._id, dayIndex: 0, title: 'Stay — night 1', category: 'stay', amount: 3500, notes: 'Sample expense — stay budget.' },
    { trip: rajasthan._id, dayIndex: 0, title: 'Auto and local travel', category: 'transport', amount: 450, notes: 'Sample expense.' },
    { trip: rajasthan._id, dayIndex: 0, title: 'Street food and snacks', category: 'food', amount: 600, notes: 'Sample expense.' },
    { trip: rajasthan._id, dayIndex: 1, title: 'Stay — night 2', category: 'stay', amount: 3200, notes: 'Sample expense — stay budget.' },
    { trip: himachal._id, dayIndex: 0, title: 'Stay — night 1', category: 'stay', amount: 2800, notes: 'Sample expense — stay budget.' },
    { trip: goa._id, dayIndex: 0, title: 'Scooter rental', category: 'transport', amount: 500, notes: 'Sample expense.' },
  ];
  for (const e of expenses) await Expense.create({ ...e, createdBy: demo._id });

  const packing = [
    { trip: rajasthan._id, label: 'Government photo ID', category: 'documents', checked: true, order: 0 },
    { trip: rajasthan._id, label: 'Train tickets (offline copy)', category: 'documents', checked: true, order: 1 },
    { trip: rajasthan._id, label: 'Comfortable walking shoes', category: 'clothing', checked: true, order: 2 },
    { trip: rajasthan._id, label: 'Light jacket', category: 'clothing', checked: false, order: 3 },
    { trip: rajasthan._id, label: 'Sunscreen', category: 'toiletries', checked: false, order: 4 },
    { trip: rajasthan._id, label: 'Phone charger', category: 'tech', checked: true, order: 5 },
    { trip: rajasthan._id, label: 'Power bank', category: 'tech', checked: false, order: 6 },
    { trip: rajasthan._id, label: 'Basic medicines', category: 'health', checked: false, order: 7 },
    { trip: himachal._id, label: 'Warm jacket', category: 'clothing', checked: false, order: 0 },
    { trip: himachal._id, label: 'Government photo ID', category: 'documents', checked: true, order: 1 },
    { trip: goa._id, label: 'Swimwear', category: 'clothing', checked: false, order: 0 },
    { trip: goa._id, label: 'Sunscreen', category: 'toiletries', checked: false, order: 1 },
  ];
  for (const p of packing) await PackingItem.create(p);

  console.log('Seeded Voyara demo data (demo@voyara.example / friend@voyara.example: Voyara123!)');
  return { demo, friend };
}

module.exports = seed;
