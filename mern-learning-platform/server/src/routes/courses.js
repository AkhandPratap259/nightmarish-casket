const express = require('express');
const Course = require('../models/Course');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();
router.get('/', async (req, res) => {
  const { q, category, level, page = 1, limit = 12 } = req.query;
  const filter = { published: true };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (q) filter.$text = { $search: q };
  const skip = (Number(page) - 1) * Number(limit);
  const [courses, total] = await Promise.all([
    Course.find(filter).populate('instructor', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Course.countDocuments(filter),
  ]);
  res.json({ courses, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});
router.get('/mine', auth, requireRole('instructor'), async (req, res) => {
  res.json(await Course.find({ instructor: req.user.id }).sort({ createdAt: -1 }));
});
router.get('/:id', async (req, res) => {
  const course = await Course.findById(req.params.id).populate('instructor', 'name');
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});
router.post('/', auth, requireRole('instructor'), async (req, res) => {
  const { title, description, category, level, price, lessons } = req.body || {};
  if (!title || !description || !category) return res.status(400).json({ error: 'Title, description and category are required' });
  const course = await Course.create({ title, description, category, level, price: price || 0, lessons: lessons || [], instructor: req.user.id });
  res.status(201).json(course);
});
async function ownCourse(req, res, next) {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (String(course.instructor) !== req.user.id) return res.status(403).json({ error: 'Only the course instructor can change it' });
  req.course = course;
  next();
}
router.put('/:id', auth, requireRole('instructor'), ownCourse, async (req, res) => {
  const { title, description, category, level, price, published } = req.body || {};
  Object.assign(req.course, { title, description, category, level, price, published });
  res.json(await req.course.save());
});
router.delete('/:id', auth, requireRole('instructor'), ownCourse, async (req, res) => {
  await req.course.deleteOne();
  res.json({ ok: true });
});
router.post('/:id/lessons', auth, requireRole('instructor'), ownCourse, async (req, res) => {
  const { title, content, durationMinutes } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Lesson title is required' });
  req.course.lessons.push({ title, content: content || '', durationMinutes: durationMinutes || 10, order: req.course.lessons.length });
  res.status(201).json(await req.course.save());
});
module.exports = router;
