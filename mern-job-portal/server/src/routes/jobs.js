const express = require('express');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public job search: keyword, location, type, work mode, pagination.
router.get('/', async (req, res) => {
  const { search = '', location = '', type = '', workMode = '', status = 'open' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const filter = {};
  if (status) filter.status = status;
  if (location) filter.location = new RegExp(location, 'i');
  if (type) filter.type = type;
  if (workMode) filter.workMode = workMode;
  if (search) {
    const rx = new RegExp(search, 'i');
    filter.$or = [{ title: rx }, { company: rx }, { description: rx }, { skills: rx }];
  }
  const [jobs, total] = await Promise.all([
    Job.find(filter).populate('postedBy', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Job.countDocuments(filter),
  ]);
  return res.json({ jobs, total, page, pages: Math.ceil(total / limit) });
});

// Recruiter's own postings.
router.get('/mine/posted', protect, requireRole('recruiter'), async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
  return res.json(jobs);
});

router.get('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
  if (!job) return res.status(404).json({ message: 'Job not found' });
  return res.json(job);
});

router.post('/', protect, requireRole('recruiter'), async (req, res) => {
  const { title, company, location, type, workMode, salaryMin, salaryMax, description, requirements, skills } = req.body || {};
  if (!title || !company || !location || !description) {
    return res.status(400).json({ message: 'Title, company, location and description are required' });
  }
  const split = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v : []);
  const job = await Job.create({
    title, company, location, type, workMode,
    salaryMin: Number(salaryMin) || 0, salaryMax: Number(salaryMax) || 0,
    description, requirements: split(requirements), skills: split(skills),
    postedBy: req.user._id,
  });
  return res.status(201).json(job);
});

async function ownJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) { res.status(404).json({ message: 'Job not found' }); return null; }
  if (String(job.postedBy) !== String(req.user._id)) {
    res.status(403).json({ message: 'Only the posting recruiter can change this job' });
    return null;
  }
  return job;
}

router.put('/:id', protect, requireRole('recruiter'), async (req, res) => {
  const job = await ownJob(req, res);
  if (!job) return undefined;
  const fields = ['title', 'company', 'location', 'type', 'workMode', 'salaryMin', 'salaryMax', 'description', 'status'];
  fields.forEach((f) => { if (req.body[f] !== undefined) job[f] = req.body[f]; });
  if (req.body.requirements !== undefined) job.requirements = req.body.requirements;
  if (req.body.skills !== undefined) job.skills = req.body.skills;
  await job.save();
  return res.json(job);
});

router.delete('/:id', protect, requireRole('recruiter'), async (req, res) => {
  const job = await ownJob(req, res);
  if (!job) return undefined;
  await Application.deleteMany({ job: job._id });
  await job.deleteOne();
  return res.json({ message: 'Job deleted' });
});

module.exports = router;
