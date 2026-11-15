const express = require('express');
const Lesson = require('../models/Lesson');
const Language = require('../models/Language');
const { auth, requireRole } = require('../middleware/auth');
const { lessonStates } = require('../utils/progress');

const router = express.Router();

// Public view of one exercise: everything the client needs to render it,
// but never the correct answer — answers are validated server-side.
function publicExercise(ex) {
  const out = { type: ex.type, prompt: ex.prompt, question: ex.question || '' };
  if (ex.options && ex.options.length) out.options = ex.options;
  if (ex.pairs && ex.pairs.length) out.pairs = ex.pairs;
  if (ex.audioText) out.audioText = ex.audioText;
  return out;
}

function publicLesson(lesson) {
  return {
    id: lesson._id,
    languageCode: lesson.languageCode,
    unit: lesson.unit,
    unitTitle: lesson.unitTitle,
    order: lesson.order,
    title: lesson.title,
    description: lesson.description,
    xpReward: lesson.xpReward,
    words: lesson.words,
    exercises: lesson.exercises.map(publicExercise),
  };
}

// List lessons, optionally filtered by language code. Signed-in learners
// also get the lock status of each lesson.
router.get('/', auth, async (req, res) => {
  const filter = {};
  let language = null;
  if (req.query.language) {
    language = await Language.findOne({ code: req.query.language });
    if (!language) return res.status(404).json({ error: 'Language not found' });
    filter.language = language._id;
  }
  const lessons = await Lesson.find(filter).sort({ languageCode: 1, unit: 1, order: 1 }).lean();
  if (!language) {
    return res.json({ lessons: lessons.map((l) => ({ ...publicLesson(l), status: 'unlocked' })) });
  }
  const states = await lessonStates(req.user._id, language._id);
  const statusById = new Map(states.map((s) => [String(s.lesson._id), s.status]));
  return res.json({
    lessons: lessons.map((l) => ({ ...publicLesson(l), status: statusById.get(String(l._id)) || 'locked' })),
  });
});

// One lesson (answers stripped) with its lock status for the learner.
router.get('/:id', auth, async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).lean();
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const states = await lessonStates(req.user._id, lesson.language);
  const state = states.find((s) => String(s.lesson._id) === String(lesson._id));
  return res.json({ lesson: publicLesson(lesson), status: state ? state.status : 'locked' });
});

// Create a lesson (instructor or admin). Exercises arrive with their
// answers — the instructor is the author, so they supply them.
router.post('/', auth, requireRole('instructor', 'admin'), async (req, res) => {
  const { languageCode, unit, order, title, description, xpReward, words, exercises } = req.body || {};
  if (!languageCode || !unit || !order || !title || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'Language, unit, order, title and at least one exercise are required' });
  }
  const language = await Language.findOne({ code: languageCode });
  if (!language) return res.status(404).json({ error: 'Language not found' });
  const lesson = await Lesson.create({
    language: language._id,
    languageCode,
    unit: Number(unit),
    unitTitle: req.body.unitTitle || `Unit ${unit}`,
    order: Number(order),
    title: title.trim(),
    description: (description || '').trim(),
    xpReward: Number(xpReward) || 20,
    words: Array.isArray(words) ? words : [],
    exercises,
  });
  return res.status(201).json({ lesson: publicLesson(lesson.toObject()) });
});

// Update a lesson (instructor or admin).
router.put('/:id', auth, requireRole('instructor', 'admin'), async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const { unit, unitTitle, order, title, description, xpReward, words, exercises } = req.body || {};
  if (unit !== undefined) lesson.unit = Number(unit);
  if (unitTitle !== undefined) lesson.unitTitle = unitTitle;
  if (order !== undefined) lesson.order = Number(order);
  if (title !== undefined) lesson.title = title.trim();
  if (description !== undefined) lesson.description = description;
  if (xpReward !== undefined) lesson.xpReward = Number(xpReward);
  if (Array.isArray(words)) lesson.words = words;
  if (Array.isArray(exercises) && exercises.length) lesson.exercises = exercises;
  await lesson.save();
  return res.json({ lesson: publicLesson(lesson.toObject()) });
});

// Delete a lesson (instructor or admin).
router.delete('/:id', auth, requireRole('instructor', 'admin'), async (req, res) => {
  const lesson = await Lesson.findByIdAndDelete(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  return res.json({ deleted: true });
});

module.exports = router;
