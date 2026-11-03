const express = require('express');
const Score = require('../models/Score');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { player, score, wave } = req.body || {};
    const cleanPlayer = typeof player === 'string' ? player.trim() : '';
    const cleanScore = Number(score);
    const cleanWave = Number(wave);
    if (!cleanPlayer || cleanPlayer.length > 30) {
      return res.status(400).json({ message: 'Player name (1-30 characters) is required' });
    }
    if (!Number.isInteger(cleanScore) || cleanScore < 0) {
      return res.status(400).json({ message: 'Score must be a non-negative integer' });
    }
    if (!Number.isInteger(cleanWave) || cleanWave < 1) {
      return res.status(400).json({ message: 'Wave must be a positive integer' });
    }
    const created = await Score.create({ player: cleanPlayer, score: cleanScore, wave: cleanWave });
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ message: 'Could not save score' });
  }
});

router.get('/top', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const scores = await Score.find().sort({ score: -1, createdAt: 1 }).limit(limit).lean();
    return res.json(scores);
  } catch (err) {
    return res.status(500).json({ message: 'Could not load leaderboard' });
  }
});

module.exports = router;
