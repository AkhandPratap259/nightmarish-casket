const express = require('express');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// Candidate applies to a job (one application per job).
router.post('/jobs/:jobId/apply', protect, requireRole('candidate'), async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });
  if (job.status !== 'open') return res.status(400).json({ message: 'This job is closed' });
  const { coverNote = '', resumeUrl = '' } = req.body || {};
  try {
    const application = await Application.create({
      job: job._id, candidate: req.user._id, coverNote, resumeUrl,
    });
    return res.status(201).json(application);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'You have already applied to this job' });
    throw err;
  }
});

// Candidate's own applications, with the job attached.
router.get('/mine', protect, requireRole('candidate'), async (req, res) => {
  const applications = await Application.find({ candidate: req.user._id })
    .populate('job')
    .sort({ createdAt: -1 });
  return res.json(applications);
});

// Applicants for one job — only its posting recruiter.
router.get('/job/:jobId', protect, requireRole('recruiter'), async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });
  if (String(job.postedBy) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only the posting recruiter can view applicants' });
  }
  const applications = await Application.find({ job: job._id })
    .populate('candidate', 'name email')
    .sort({ createdAt: -1 });
  return res.json(applications);
});

// Recruiter updates an application's status.
router.patch('/:id', protect, requireRole('recruiter'), async (req, res) => {
  const application = await Application.findById(req.params.id).populate('job');
  if (!application) return res.status(404).json({ message: 'Application not found' });
  if (String(application.job.postedBy) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only the posting recruiter can update this application' });
  }
  const allowed = ['applied', 'reviewed', 'shortlisted', 'rejected', 'hired'];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  application.status = req.body.status;
  await application.save();
  return res.json(application);
});

module.exports = router;
