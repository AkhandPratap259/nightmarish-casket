const express = require('express');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

function monthRange(month) {
  // month = 'YYYY-MM'; returns [start, end) as Dates in local time.
  const [y, m] = month.split('-').map(Number);
  return [new Date(y, m - 1, 1), new Date(y, m, 1)];
}

function buildFilter(req) {
  const filter = { user: req.userId };
  if (req.query.month) {
    const [start, end] = monthRange(req.query.month);
    filter.date = { $gte: start, $lt: end };
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.account) filter.account = req.query.account;
  if (req.query.kind) filter.kind = req.query.kind;
  if (req.query.q) filter.note = { $regex: req.query.q, $options: 'i' };
  return filter;
}

router.get('/', async (req, res) => {
  try {
    const filter = buildFilter(req);
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const txns = await Transaction.find(filter)
      .populate('category', 'name kind colour icon')
      .populate('account', 'name type')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit);
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV export of the same filtered set. Must be registered before /:id routes.
router.get('/export', async (req, res) => {
  try {
    const filter = buildFilter(req);
    const txns = await Transaction.find(filter)
      .populate('category', 'name')
      .populate('account', 'name')
      .sort({ date: -1 });
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = ['date,kind,category,account,amount,note'];
    for (const t of txns) {
      lines.push(
        [
          t.date.toISOString().slice(0, 10),
          t.kind,
          esc(t.category ? t.category.name : ''),
          esc(t.account ? t.account.name : ''),
          t.amount,
          esc(t.note),
        ].join(',')
      );
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="paisapilot-transactions.csv"');
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { account, category, kind, amount, date, note } = req.body || {};
    const value = Number(amount);
    if (!account || !category || !kind || !value || value <= 0 || !date) {
      return res.status(400).json({ error: 'account, category, kind, a positive amount and date are required' });
    }
    if (!['income', 'expense'].includes(kind)) {
      return res.status(400).json({ error: 'kind must be income or expense' });
    }
    const acc = await Account.findOne({ _id: account, user: req.userId });
    if (!acc) return res.status(404).json({ error: 'Account not found' });
    const txn = await Transaction.create({
      user: req.userId,
      account,
      category,
      kind,
      amount: value,
      date: new Date(date),
      note: note || '',
    });
    // Balance moves with the transaction, in the same request.
    await Account.updateOne(
      { _id: account },
      { $inc: { balance: kind === 'income' ? value : -value } }
    );
    const populated = await Transaction.findById(txn._id)
      .populate('category', 'name kind colour icon')
      .populate('account', 'name type');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const txn = await Transaction.findOne({ _id: req.params.id, user: req.userId });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    await Transaction.deleteOne({ _id: txn._id });
    // Reverse the balance movement.
    await Account.updateOne(
      { _id: txn.account },
      { $inc: { balance: txn.kind === 'income' ? -txn.amount : txn.amount } }
    );
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
