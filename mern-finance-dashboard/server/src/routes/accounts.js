const express = require('express');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const accounts = await Account.find({ user: req.userId }).sort({ createdAt: 1 });
  res.json(accounts);
});

router.post('/', async (req, res) => {
  try {
    const { name, type, balance, colour } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const account = await Account.create({
      user: req.userId,
      name,
      type: type || 'bank',
      balance: Number(balance) || 0,
      colour: colour || '#0f3d2e',
    });
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body || {},
      { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const account = await Account.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json({ deleted: true });
});

// Move money between two of the user's accounts, atomically per account.
router.post('/transfer', async (req, res) => {
  try {
    const { fromId, toId, amount } = req.body || {};
    const value = Number(amount);
    if (!fromId || !toId || fromId === toId || !value || value <= 0) {
      return res.status(400).json({ error: 'fromId, toId and a positive amount are required' });
    }
    const from = await Account.findOne({ _id: fromId, user: req.userId });
    const to = await Account.findOne({ _id: toId, user: req.userId });
    if (!from || !to) return res.status(404).json({ error: 'Account not found' });
    if (from.balance < value) return res.status(400).json({ error: 'Insufficient balance' });
    await Account.updateOne({ _id: fromId }, { $inc: { balance: -value } });
    await Account.updateOne({ _id: toId }, { $inc: { balance: value } });
    const updated = await Account.find({ user: req.userId }).sort({ createdAt: 1 });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
