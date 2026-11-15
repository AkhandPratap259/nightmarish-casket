const Lesson = require('../models/Lesson');
const Progress = require('../models/Progress');

async function orderedLessons(languageId) {
  return Lesson.find({ language: languageId }).sort({ unit: 1, order: 1 }).lean();
}

// Lesson gating: the first lesson of a language is open; every later lesson
// unlocks only when the previous one is completed.
async function lessonStates(userId, languageId) {
  const lessons = await orderedLessons(languageId);
  const progresses = await Progress.find({
    user: userId,
    lesson: { $in: lessons.map((l) => l._id) },
  }).lean();
  const byLesson = new Map(progresses.map((p) => [String(p.lesson), p]));
  return lessons.map((lesson, i) => {
    const p = byLesson.get(String(lesson._id));
    let status = 'locked';
    if (p && p.status === 'completed') {
      status = 'completed';
    } else if (i === 0) {
      status = 'unlocked';
    } else {
      const prev = byLesson.get(String(lessons[i - 1]._id));
      if (prev && prev.status === 'completed') status = 'unlocked';
    }
    return { lesson, status, bestScore: p ? p.bestScore : 0, attempts: p ? p.attempts : 0 };
  });
}

async function isUnlocked(userId, lesson) {
  const states = await lessonStates(userId, lesson.language);
  const state = states.find((s) => String(s.lesson._id) === String(lesson._id));
  return Boolean(state && state.status !== 'locked');
}

// Next lesson the learner should continue with: first non-completed one.
async function nextLesson(userId, languageId) {
  const states = await lessonStates(userId, languageId);
  return states.find((s) => s.status !== 'completed') || null;
}

module.exports = { orderedLessons, lessonStates, isUnlocked, nextLesson };
