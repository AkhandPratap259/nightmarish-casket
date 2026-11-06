const express = require('express');
const auth = require('../middleware/auth');
const Resume = require('../models/Resume');
const { analyzeResume } = require('../utils/analyze');
const { improveBullets } = require('../utils/improve');

const router = express.Router();
router.use(auth);

const ALLOWED = ['title', 'template', 'status', 'personal', 'experience', 'education', 'skills', 'projects'];

function pick(body) {
  const out = {};
  for (const key of ALLOWED) if (body && body[key] !== undefined) out[key] = body[key];
  return out;
}

router.get('/', async (req, res) => {
  const resumes = await Resume.find({ user: req.userId }).sort({ updatedAt: -1 }).lean();
  return res.json(resumes);
});

router.post('/', async (req, res) => {
  try {
    const data = pick(req.body);
    if (!data.title) return res.status(400).json({ message: 'A title is required' });
    const resume = await Resume.create({ ...data, user: req.userId });
    return res.status(201).json(resume);
  } catch (err) {
    return res.status(500).json({ message: 'Could not create resume' });
  }
});

router.get('/:id', async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.userId });
  if (!resume) return res.status(404).json({ message: 'Resume not found' });
  return res.json(resume);
});

router.put('/:id', async (req, res) => {
  try {
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!resume) return res.status(404).json({ message: 'Resume not found' });
    return res.json(resume);
  } catch (err) {
    return res.status(500).json({ message: 'Could not save resume' });
  }
});

router.delete('/:id', async (req, res) => {
  const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!resume) return res.status(404).json({ message: 'Resume not found' });
  return res.json({ message: 'Resume deleted' });
});

// Rule-based ATS-style analysis. Deterministic, no AI key needed.
router.post('/:id/analyze', async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.userId });
  if (!resume) return res.status(404).json({ message: 'Resume not found' });
  const jobDescription = (req.body && req.body.jobDescription) || '';
  return res.json(analyzeResume(resume.toObject(), jobDescription));
});

// Bullet improver. Uses OpenAI/Gemini when a key is configured, otherwise
// the built-in rule-based improver — the feature always works.
router.post('/:id/improve', async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.userId });
  if (!resume) return res.status(404).json({ message: 'Resume not found' });
  const bullets = (req.body && req.body.bullets) || [];
  if (!Array.isArray(bullets) || bullets.length === 0) {
    return res.status(400).json({ message: 'Provide at least one bullet to improve' });
  }
  const result = await improveBullets(bullets);
  return res.json(result);
});

// Machine-readable export of the resume.
router.get('/:id/export', async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.userId }).lean();
  if (!resume) return res.status(404).json({ message: 'Resume not found' });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${(resume.title || 'resume').replace(/[^a-z0-9-_]+/gi, '-')}.json"`);
  return res.json(resume);
});

module.exports = router;
