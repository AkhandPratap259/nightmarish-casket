// FairShare seed data — fixed demo users, one demo group, and demo expenses.
// All amounts, names and dates here are demo data for local testing only.
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Activity = require('../models/Activity');
const { computeSplits, computeBalances, pairwiseDebts, round2 } = require('../utils/balances');

const PASSWORD = 'FairShare123!';

const DEMO_USERS = [
  { name: 'Aarav Demo', email: 'demo@fairshare.example', avatarColor: '#1f5c4d', role: 'member' },
  { name: 'Priya Sharma', email: 'priya@fairshare.example', avatarColor: '#27408b', role: 'member' },
  { name: 'Rohan Verma', email: 'rohan@fairshare.example', avatarColor: '#e8501a', role: 'member' },
  { name: 'Meera Iyer', email: 'meera@fairshare.example', avatarColor: '#7a4a21', role: 'member' },
  { name: 'FairShare Admin', email: 'admin@fairshare.example', avatarColor: '#1a1a18', role: 'admin' },
];

function daysAgo(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d;
}

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = {};
  for (const u of DEMO_USERS) {
    users[u.email] = await User.create({ ...u, passwordHash });
  }
  const demo = users['demo@fairshare.example'];
  const priya = users['priya@fairshare.example'];
  const rohan = users['rohan@fairshare.example'];
  const meera = users['meera@fairshare.example'];

  const group = await Group.create({
    name: 'Goa Trip 2026',
    description: 'Shared expenses for our Goa trip — stays, food, transport and activities.',
    currency: '₹',
    members: [
      { user: demo._id, role: 'creator' },
      { user: priya._id, role: 'member' },
      { user: rohan._id, role: 'member' },
      { user: meera._id, role: 'member' },
    ],
    createdBy: demo._id,
  });

  const allIds = [demo._id, priya._id, rohan._id, meera._id];
  const byName = { demo, priya, rohan, meera };

  // Demo expenses across categories, using every split type.
  const plan = [
    { title: 'Beachside dinner', amount: 2400, category: 'Food', paidBy: 'demo', splitType: 'equal', splits: null, days: 6, notes: 'Dinner at a beach shack on day one.' },
    { title: 'Villa stay (2 nights)', amount: 12000, category: 'Stay', paidBy: 'priya', splitType: 'equal', splits: null, days: 6, notes: 'Villa near the beach, split four ways.' },
    { title: 'Scooter rental', amount: 1800, category: 'Transport', paidBy: 'rohan', splitType: 'equal', splits: [{ user: demo._id }, { user: rohan._id }, { user: meera._id }], days: 5, notes: 'Three scooters for two days.' },
    { title: 'Water sports', amount: 4500, category: 'Activities', paidBy: 'meera', splitType: 'percentage', splits: [{ user: demo._id, percentage: 40 }, { user: priya._id, percentage: 30 }, { user: rohan._id, percentage: 20 }, { user: meera._id, percentage: 10 }], days: 4, notes: 'Parasailing and jet ski.' },
    { title: 'Groceries & snacks', amount: 960, category: 'Shopping', paidBy: 'demo', splitType: 'shares', splits: [{ user: demo._id, shares: 2 }, { user: priya._id, shares: 1 }, { user: rohan._id, shares: 1 }, { user: meera._id, shares: 1 }], days: 3, notes: 'Breakfast supplies and snacks for the villa.' },
    { title: 'Airport taxi', amount: 1500, category: 'Transport', paidBy: 'rohan', splitType: 'exact', splits: [{ user: demo._id, amount: 500 }, { user: priya._id, amount: 400 }, { user: rohan._id, amount: 300 }, { user: meera._id, amount: 300 }], days: 2, notes: 'Taxi from the airport to the villa.' },
    { title: 'Café breakfast', amount: 850, category: 'Food', paidBy: 'meera', splitType: 'equal', splits: [{ user: demo._id }, { user: priya._id }, { user: meera._id }], days: 1, notes: 'Morning café stop; Rohan skipped breakfast.' },
    { title: 'Villa utilities', amount: 700, category: 'Utilities', paidBy: 'priya', splitType: 'equal', splits: null, days: 0, notes: 'Electricity and water top-up for the villa.' },
  ];

  const expenses = [];
  for (const item of plan) {
    const payer = byName[item.paidBy];
    const computed = computeSplits(item.amount, item.splitType, item.splits, allIds);
    const expense = await Expense.create({
      group: group._id,
      title: item.title,
      amount: round2(item.amount),
      category: item.category,
      paidBy: payer._id,
      splitType: item.splitType,
      splits: computed,
      date: daysAgo(item.days),
      notes: item.notes,
      createdBy: payer._id,
    });
    expenses.push(expense);
    await Activity.create({
      group: group._id,
      type: 'expense',
      actor: payer._id,
      text: `${payer.name} added “${item.title}” (₹${round2(item.amount).toFixed(2)})`,
      meta: { expenseId: expense._id, amount: item.amount, category: item.category },
    });
  }

  // Two demo settlements, sized from the actual outstanding debts so they
  // are always valid against the balances above.
  const settlements = [];
  for (let n = 0; n < 2; n += 1) {
    const nets = computeBalances(expenses, settlements, allIds);
    const debts = pairwiseDebts(nets);
    if (debts.length === 0) break;
    const debt = debts[n % debts.length];
    const amount = round2(Math.min(debt.amount, 1000));
    if (amount < 0.01) break;
    const settlement = await Settlement.create({
      group: group._id,
      from: debt.from,
      to: debt.to,
      amount,
      note: n === 0 ? 'Partial settlement for the trip' : 'Settling up before we head home',
      createdBy: demo._id,
    });
    settlements.push(settlement);
    const fromUser = await User.findById(debt.from);
    const toUser = await User.findById(debt.to);
    await Activity.create({
      group: group._id,
      type: 'settlement',
      actor: demo._id,
      text: `${fromUser.name} paid ${toUser.name} ₹${amount.toFixed(2)}`,
      meta: { settlementId: settlement._id, amount },
    });
  }

  await Activity.create({
    group: group._id,
    type: 'group',
    actor: demo._id,
    text: `${demo.name} created the group “Goa Trip 2026”`,
    meta: { groupId: group._id },
  });

  return { group, users };
}

async function main() {
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
  await mongoose.connect(uri, { dbName: 'fairshare' });
  await Promise.all([User.init(), Group.init(), Expense.init(), Settlement.init(), Activity.init()]);
  await Promise.all([
    User.deleteMany({}),
    Group.deleteMany({}),
    Expense.deleteMany({}),
    Settlement.deleteMany({}),
    Activity.deleteMany({}),
  ]);
  await seed();
  const counts = {
    users: await User.countDocuments(),
    groups: await Group.countDocuments(),
    expenses: await Expense.countDocuments(),
    settlements: await Settlement.countDocuments(),
    activity: await Activity.countDocuments(),
  };
  console.log('FairShare seeded:', counts);
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seed;
