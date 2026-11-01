const express = require('express');
const Job = require('../models/Job');
const SavedJob = require('../models/SavedJob');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, requireRole('candidate'), async (req, res) => {
  const saved = await SavedJob.find({ user: req.user._id }).populate('job').sort({ createdAt: -1 });
  return res.json(saved.map((s) => s.job).filter(Boolean));
});

// Toggle: save if not saved, unsave if already saved.
router.post('/:jobId', protect, requireRole('candidate'), async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });
  const existing = await SavedJob.findOne({ user: req.user._id, job: job._id });
  if (existing) {
    await existing.deleteOne();
    return res.json({ saved: false });
  }
  await SavedJob.create({ user: req.user._id, job: job._id });
  return res.json({ saved: true });
});

module.exports = router;
