const express = require('express');
const Recurring = require('../models/Recurring');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

function advanceDate(date, frequency) {
  const d = new Date(date);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

router.get('/', async (req, res) => {
  const items = await Recurring.find({ user: req.userId })
    .populate('category', 'name kind colour icon')
    .populate('account', 'name type')
    .sort({ nextDate: 1 });
  res.json(items);
});

router.post('/', async (req, res) => {
  try {
    const { name, amount, kind, category, account, frequency, dayOfMonth, weekday, nextDate } = req.body || {};
    const value = Number(amount);
    if (!name || !value || value <= 0 || !kind || !category || !account || !nextDate) {
      return res.status(400).json({ error: 'name, amount, kind, category, account and nextDate are required' });
    }
    if (!['income', 'expense'].includes(kind)) {
      return res.status(400).json({ error: 'kind must be income or expense' });
    }
    const item = await Recurring.create({
      user: req.userId,
      name,
      amount: value,
      kind,
      category,
      account,
      frequency: frequency || 'monthly',
      dayOfMonth: dayOfMonth ? Number(dayOfMonth) : undefined,
      weekday: weekday !== undefined && weekday !== null ? Number(weekday) : undefined,
      nextDate: new Date(nextDate),
      active: true,
    });
    const populated = await Recurring.findById(item._id)
      .populate('category', 'name kind colour icon')
      .populate('account', 'name type');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const item = await Recurring.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body || {},
      { new: true, runValidators: true }
    )
      .populate('category', 'name kind colour icon')
      .populate('account', 'name type');
    if (!item) return res.status(404).json({ error: 'Recurring payment not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Materialise a Transaction for every active recurring whose nextDate is due.
router.post('/generate-due', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const due = await Recurring.find({ user: req.userId, active: true, nextDate: { $lte: today } });
    let created = 0;
    const createdTxns = [];
    for (const item of due) {
      const txn = await Transaction.create({
        user: req.userId,
        account: item.account,
        category: item.category,
        kind: item.kind,
        amount: item.amount,
        date: new Date(item.nextDate),
        note: `Recurring: ${item.name}`,
      });
      await Account.updateOne(
        { _id: item.account },
        { $inc: { balance: item.kind === 'income' ? item.amount : -item.amount } }
      );
      item.nextDate = advanceDate(item.nextDate, item.frequency);
      await item.save();
      created += 1;
      createdTxns.push(txn);
    }
    res.json({ created, transactions: createdTxns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
