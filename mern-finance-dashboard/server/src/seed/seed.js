const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const Recurring = require('../models/Recurring');
const { seedDefaultCategories } = require('../utils/defaults');

const DEMO_EMAIL = 'demo@paisapilot.example';
const DEMO_PASSWORD = 'PaisaPilot123!';

// Runs only when the demo user does not exist yet.
async function seedDemo() {
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) return false;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await User.create({ name: 'Demo User', email: DEMO_EMAIL, passwordHash });
  const categories = await seedDefaultCategories(user._id);
  const cat = (name) => categories.find((c) => c.name === name)._id;

  const hdfc = await Account.create({
    user: user._id, name: 'HDFC Bank', type: 'bank', balance: 48250, colour: '#0f3d2e',
  });
  const cash = await Account.create({
    user: user._id, name: 'Cash Wallet', type: 'cash', balance: 6400, colour: '#c9a227',
  });

  // [date, kind, category, account, amount, note]
  const rows = [
    // October 2026 — previous month, used for month-over-month insights.
    ['2026-10-01', 'income', 'Salary', hdfc, 85000, 'Monthly salary — Oct'],
    ['2026-10-01', 'income', 'Freelance', hdfc, 12000, 'Logo design — side project'],
    ['2026-10-02', 'expense', 'Rent', hdfc, 12000, 'Monthly house rent'],
    ['2026-10-03', 'expense', 'Food', cash, 2450, 'BigBasket weekly shop'],
    ['2026-10-04', 'expense', 'Transport', cash, 320, 'Metro + auto'],
    ['2026-10-05', 'expense', 'Food', cash, 650, 'Swiggy dinner'],
    ['2026-10-06', 'expense', 'Subscriptions', hdfc, 999, 'Internet — Oct'],
    ['2026-10-07', 'expense', 'Shopping', hdfc, 3200, 'New shoes'],
    ['2026-10-08', 'expense', 'Utilities', hdfc, 1850, 'Electricity bill'],
    ['2026-10-10', 'expense', 'Food', cash, 480, 'Lunch with friends'],
    ['2026-10-11', 'expense', 'Transport', cash, 150, 'Auto to station'],
    ['2026-10-12', 'expense', 'Entertainment', hdfc, 799, 'Movie tickets'],
    ['2026-10-14', 'expense', 'Food', cash, 920, 'Groceries — DMart'],
    ['2026-10-15', 'expense', 'Health', hdfc, 1450, 'Pharmacy'],
    ['2026-10-17', 'expense', 'Shopping', hdfc, 2100, 'Shirts'],
    ['2026-10-18', 'expense', 'Food', cash, 560, 'Zomato'],
    ['2026-10-20', 'expense', 'Transport', cash, 400, 'Cab'],
    ['2026-10-22', 'expense', 'Utilities', hdfc, 650, 'Water bill'],
    ['2026-10-24', 'expense', 'Entertainment', hdfc, 499, 'OTT subscription'],
    ['2026-10-26', 'expense', 'Food', cash, 1300, 'Groceries'],
    ['2026-10-28', 'expense', 'Subscriptions', hdfc, 299, 'Mobile recharge'],
    ['2026-10-30', 'expense', 'Food', cash, 720, 'Dinner out'],
    // November 2026 — current month.
    ['2026-11-01', 'income', 'Salary', hdfc, 85000, 'Monthly salary — Nov'],
    ['2026-11-01', 'income', 'Freelance', hdfc, 8000, 'Freelance — website fix'],
    ['2026-11-02', 'expense', 'Rent', hdfc, 12000, 'Monthly house rent'],
    ['2026-11-02', 'expense', 'Food', cash, 1850, 'Groceries — BigBasket'],
    ['2026-11-02', 'expense', 'Health', hdfc, 950, 'Dental checkup'],
    ['2026-11-03', 'expense', 'Transport', cash, 280, 'Metro'],
    ['2026-11-03', 'expense', 'Food', cash, 540, 'Swiggy lunch'],
    ['2026-11-03', 'expense', 'Shopping', cash, 1250, 'Books'],
    ['2026-11-04', 'expense', 'Subscriptions', hdfc, 999, 'Internet — Nov'],
    ['2026-11-04', 'expense', 'Shopping', hdfc, 4500, 'Winter jacket'],
    ['2026-11-04', 'expense', 'Transport', cash, 350, 'Cab'],
    ['2026-11-05', 'expense', 'Food', cash, 620, 'Zomato dinner'],
    ['2026-11-05', 'expense', 'Transport', cash, 180, 'Auto'],
    ['2026-11-05', 'expense', 'Entertainment', hdfc, 899, 'Concert ticket'],
    ['2026-11-05', 'expense', 'Subscriptions', hdfc, 299, 'Mobile recharge'],
    ['2026-11-06', 'expense', 'Utilities', hdfc, 2100, 'Electricity bill'],
    ['2026-11-06', 'expense', 'Food', cash, 430, 'Groceries'],
    ['2026-11-06', 'expense', 'Food', cash, 380, 'Chai & snacks'],
  ];

  await Transaction.insertMany(
    rows.map(([date, kind, category, account, amount, note]) => ({
      user: user._id,
      account: account._id,
      category: cat(category),
      kind,
      amount,
      date: new Date(`${date}T10:00:00`),
      note,
    }))
  );

  const budgetRows = [
    ['Food', 8000],
    ['Transport', 3000],
    ['Shopping', 6000],
    ['Entertainment', 2500],
    ['Utilities', 4000],
  ];
  await Budget.insertMany(
    budgetRows.map(([name, limit]) => ({
      user: user._id, month: '2026-11', category: cat(name), limit,
    }))
  );

  await Goal.insertMany([
    {
      user: user._id, name: 'Emergency Fund', targetAmount: 100000,
      savedAmount: 42000, colour: '#0f3d2e',
    },
    {
      user: user._id, name: 'Japan Trip', targetAmount: 150000,
      savedAmount: 28500, deadline: new Date('2027-06-01'), colour: '#c9a227',
    },
  ]);

  await Recurring.insertMany([
    {
      user: user._id, name: 'Internet', amount: 999, kind: 'expense',
      category: cat('Subscriptions'), account: hdfc._id,
      frequency: 'monthly', dayOfMonth: 4, nextDate: new Date('2026-12-04'), active: true,
    },
    {
      user: user._id, name: 'Mobile Recharge', amount: 299, kind: 'expense',
      category: cat('Subscriptions'), account: hdfc._id,
      frequency: 'monthly', dayOfMonth: 5, nextDate: new Date('2026-12-05'), active: true,
    },
    {
      user: user._id, name: 'Gym', amount: 1500, kind: 'expense',
      category: cat('Health'), account: hdfc._id,
      frequency: 'monthly', dayOfMonth: 1, nextDate: new Date('2026-11-01'), active: true,
    },
  ]);

  return true;
}

module.exports = { seedDemo, DEMO_EMAIL, DEMO_PASSWORD };
