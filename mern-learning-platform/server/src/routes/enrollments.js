const express = require('express');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');
const router = express.Router();
function withProgress(enrollment) {
  const course = enrollment.course;
  const total = course && course.lessons ? course.lessons.length : 0;
  const done = enrollment.completedLessonIds.length;
  return { ...enrollment.toObject(), totalLessons: total, completedCount: done, progress: total ? Math.round((done / total) * 100) : 0 };
}
router.post('/', auth, async (req, res) => {
  const { courseId } = req.body || {};
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const existing = await Enrollment.findOne({ student: req.user.id, course: courseId }).populate('course');
  if (existing) return res.json(withProgress(existing));
  const enrollment = await Enrollment.create({ student: req.user.id, course: courseId });
  await enrollment.populate('course');
  res.status(201).json(withProgress(enrollment));
});
router.get('/mine', auth, async (req, res) => {
  const rows = await Enrollment.find({ student: req.user.id }).populate('course').sort({ createdAt: -1 });
  res.json(rows.map(withProgress));
});
router.post('/:id/complete-lesson', auth, async (req, res) => {
  const { lessonId } = req.body || {};
  const enrollment = await Enrollment.findById(req.params.id).populate('course');
  if (!enrollment) return res.status(404).json({ error: 'Enrolment not found' });
  if (String(enrollment.student) !== req.user.id) return res.status(403).json({ error: 'Not your enrolment' });
  if (!enrollment.course.lessons.some((l) => String(l._id) === lessonId)) return res.status(400).json({ error: 'Lesson not part of this course' });
  if (!enrollment.completedLessonIds.includes(lessonId)) enrollment.completedLessonIds.push(lessonId);
  await enrollment.save();
  res.json(withProgress(enrollment));
});
module.exports = router;
