const express = require('express');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return [new Date(y, m - 1, 1), new Date(y, m, 1)];
}

function prevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function round(n) {
  return Math.round(n);
}

// Server-side analytics: totals, per-category spend vs budget, daily trend,
// run-rate forecast and plain-language insights. All amounts are whole rupees.
router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = req.query.month || defaultMonth;
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }
    const [start, end] = monthRange(month);
    const [prevStart, prevEnd] = monthRange(prevMonth(month));

    const [txns, prevTxns, accounts, budgets, goals] = await Promise.all([
      Transaction.find({ user: req.userId, date: { $gte: start, $lt: end } })
        .populate('category', 'name kind colour icon')
        .sort({ date: 1 }),
      Transaction.find({ user: req.userId, date: { $gte: prevStart, $lt: prevEnd } })
        .populate('category', 'name'),
      Account.find({ user: req.userId }).sort({ createdAt: 1 }),
      Budget.find({ user: req.userId, month }).populate('category', 'name kind colour icon'),
      Goal.find({ user: req.userId }),
    ]);

    let income = 0;
    let expense = 0;
    for (const t of txns) {
      if (t.kind === 'income') income += t.amount;
      else expense += t.amount;
    }
    const net = income - expense;
    const savingsRate = income > 0 ? round((net / income) * 100) : 0;

    // Spend by category, joined to this month's budget for that category.
    const byCatMap = new Map();
    for (const t of txns) {
      if (t.kind !== 'expense' || !t.category) continue;
      const id = String(t.category._id);
      if (!byCatMap.has(id)) {
        byCatMap.set(id, {
          categoryId: id,
          name: t.category.name,
          colour: t.category.colour,
          icon: t.category.icon,
          spent: 0,
          limit: null,
        });
      }
      byCatMap.get(id).spent += t.amount;
    }
    for (const b of budgets) {
      const id = String(b.category._id);
      if (byCatMap.has(id)) byCatMap.get(id).limit = b.limit;
      else {
        byCatMap.set(id, {
          categoryId: id,
          name: b.category.name,
          colour: b.category.colour,
          icon: b.category.icon,
          spent: 0,
          limit: b.limit,
        });
      }
    }
    const byCategory = [...byCatMap.values()]
      .map((c) => ({
        ...c,
        spent: round(c.spent),
        remaining: c.limit === null ? null : round(c.limit - c.spent),
        pct: c.limit ? round((c.spent / c.limit) * 100) : null,
      }))
      .sort((a, b) => b.spent - a.spent);

    // Daily trend: one entry per day of the month.
    const dim = daysInMonth(month);
    const dailyTrend = [];
    for (let d = 1; d <= dim; d += 1) {
      dailyTrend.push({ day: d, income: 0, expense: 0 });
    }
    for (const t of txns) {
      const day = t.date.getDate();
      if (t.kind === 'income') dailyTrend[day - 1].income += t.amount;
      else dailyTrend[day - 1].expense += t.amount;
    }
    for (const row of dailyTrend) {
      row.income = round(row.income);
      row.expense = round(row.expense);
    }

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const goalsProgress = goals.map((g) => ({
      id: g._id,
      name: g.name,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      pct: g.targetAmount ? round((g.savedAmount / g.targetAmount) * 100) : 0,
      deadline: g.deadline,
      colour: g.colour,
    }));

    // Forecast: daily run-rate so far, projected to the end of the month.
    const isCurrentMonth = month === defaultMonth;
    const daysElapsed = isCurrentMonth ? Math.min(now.getDate(), dim) : dim;
    const runRate = daysElapsed > 0 ? expense / daysElapsed : 0;
    const projectedMonthEndExpense = round(runRate * dim);
    const projectedBalance = round(totalBalance - (projectedMonthEndExpense - expense));

    // ---- Insights ----
    const insights = [];
    if (byCategory.length > 0) {
      const top = byCategory[0];
      insights.push({
        type: 'top-category',
        text: `${top.name} is your biggest spend this month at ₹${top.spent.toLocaleString('en-IN')} — ${expense > 0 ? Math.round((top.spent / expense) * 100) : 0}% of all spending.`,
      });
    }
    const biggest = txns
      .filter((t) => t.kind === 'expense')
      .sort((a, b) => b.amount - a.amount)[0];
    if (biggest) {
      insights.push({
        type: 'biggest-expense',
        text: `Your biggest single expense was ₹${biggest.amount.toLocaleString('en-IN')} on ${biggest.note || (biggest.category ? biggest.category.name : 'an item')} (${biggest.date.toISOString().slice(0, 10)}).`,
      });
    }
    // Month-over-month change per top category; flag spikes over 50%.
    const prevByCat = new Map();
    for (const t of prevTxns) {
      if (t.kind !== 'expense' || !t.category) continue;
      prevByCat.set(t.category.name, (prevByCat.get(t.category.name) || 0) + t.amount);
    }
    for (const c of byCategory.slice(0, 3)) {
      const prev = prevByCat.get(c.name) || 0;
      if (prev > 0) {
        const change = Math.round(((c.spent - prev) / prev) * 100);
        if (change >= 50) {
          insights.push({
            type: 'spike',
            text: `Spending on ${c.name} is up ${change}% vs last month (₹${prev.toLocaleString('en-IN')} → ₹${c.spent.toLocaleString('en-IN')}). Worth a look.`,
          });
        } else {
          insights.push({
            type: 'month-over-month',
            text: `${c.name} spending is ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)}% vs last month (₹${prev.toLocaleString('en-IN')} → ₹${c.spent.toLocaleString('en-IN')}).`,
          });
        }
      }
    }
    // Budget at risk: projected spend above the limit.
    for (const c of byCategory) {
      if (c.limit !== null && c.limit > 0) {
        const projected = daysElapsed > 0 ? round((c.spent / daysElapsed) * dim) : c.spent;
        if (projected > c.limit) {
          insights.push({
            type: 'budget-at-risk',
            text: `${c.name} is on track to reach ₹${projected.toLocaleString('en-IN')} by month end, over its ₹${c.limit.toLocaleString('en-IN')} budget.`,
          });
        }
      }
    }
    if (insights.length === 0) {
      insights.push({
        type: 'no-data',
        text: 'No spending recorded this month yet. Add a transaction to see insights here.',
      });
    }

    res.json({
      month,
      totals: { income: round(income), expense: round(expense), net: round(net), savingsRate },
      byCategory,
      dailyTrend,
      accounts: accounts.map((a) => ({
        id: a._id,
        name: a.name,
        type: a.type,
        balance: round(a.balance),
        colour: a.colour,
      })),
      totalBalance: round(totalBalance),
      goals: goalsProgress,
      forecast: { projectedMonthEndExpense, projectedBalance, runRate: round(runRate), daysElapsed, daysInMonth: dim },
      insights,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
