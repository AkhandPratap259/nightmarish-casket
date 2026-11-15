const express = require('express');
const Lesson = require('../models/Lesson');
const Progress = require('../models/Progress');
const ReviewItem = require('../models/ReviewItem');
const { auth } = require('../middleware/auth');
const { isUnlocked } = require('../utils/progress');
const {
  XP_PER_CORRECT,
  awardXp,
  checkAchievements,
  resetDailyIfNeeded,
} = require('../utils/gamify');
const { emitToUser } = require('../utils/notify');

const router = express.Router();

// In-memory lesson sessions: hearts, position and wrong words live here so
// the client cannot award itself XP or skip ahead. Sessions expire after
// 30 minutes of inactivity.
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000;

function sessionKey(userId, lessonId) {
  return `${userId}:${lessonId}`;
}

function getSession(userId, lessonId) {
  const s = sessions.get(sessionKey(userId, lessonId));
  if (!s) return null;
  if (Date.now() - s.startedAt > SESSION_TTL_MS) {
    sessions.delete(sessionKey(userId, lessonId));
    return null;
  }
  return s;
}

// Compare typed answers loosely: ignore case, surrounding spaces and
// accents, so "Buenos dias" counts for "Buenos días".
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .trim()
    .replace(/\s+/g, ' ');
}

function publicExercise(ex) {
  const out = { type: ex.type, prompt: ex.prompt, question: ex.question || '' };
  if (ex.options && ex.options.length) out.options = ex.options;
  if (ex.pairs && ex.pairs.length) out.pairs = ex.pairs;
  if (ex.audioText) out.audioText = ex.audioText;
  return out;
}

function userSnapshot(user) {
  return {
    xp: user.xp,
    level: user.level,
    streak: user.streak,
    dailyXp: user.dailyXp,
    lessonsCompleted: user.lessonsCompleted,
    achievements: user.achievements,
  };
}

// Start a lesson: checks the lock, creates a fresh session (3 hearts).
router.post('/start/:lessonId', auth, async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId).lean();
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (!(await isUnlocked(req.user._id, lesson))) {
    return res.status(403).json({ error: 'Complete the previous lesson to unlock this one' });
  }
  const session = {
    lessonId: String(lesson._id),
    index: 0,
    hearts: 3,
    correct: 0,
    wrong: 0,
    xpEarned: 0,
    wrongWords: [],
    startedAt: Date.now(),
  };
  sessions.set(sessionKey(req.user._id, lesson._id), session);
  return res.json({
    lesson: {
      id: lesson._id,
      languageCode: lesson.languageCode,
      title: lesson.title,
      unitTitle: lesson.unitTitle,
      xpReward: lesson.xpReward,
      exercises: lesson.exercises.map(publicExercise),
    },
    session: { hearts: session.hearts, index: 0, total: lesson.exercises.length },
  });
});

// Submit one answer. The server validates it against the stored exercise,
// awards XP for a correct answer, and drops a heart for a wrong one.
router.post('/answer', auth, async (req, res) => {
  const { lessonId, exerciseIndex, answer } = req.body || {};
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const session = getSession(req.user._id, lessonId);
  if (!session) return res.status(400).json({ error: 'Start the lesson first' });
  if (session.hearts <= 0) return res.status(400).json({ error: 'Out of hearts — retry the lesson' });
  const idx = Number(exerciseIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= lesson.exercises.length) {
    return res.status(400).json({ error: 'Invalid exercise' });
  }
  if (idx !== session.index) {
    return res.status(400).json({ error: 'Answer the exercises in order' });
  }
  const exercise = lesson.exercises[idx];
  let correct = false;
  if (exercise.type === 'mc' || exercise.type === 'listen') {
    correct = norm(answer) === norm(exercise.answer);
  } else if (exercise.type === 'fill') {
    correct = norm(answer) === norm(exercise.answer);
  } else if (exercise.type === 'match') {
    const submitted = Array.isArray(answer) ? answer : [];
    const key = (a, b) => `${norm(a)}|${norm(b)}`;
    const expected = new Set(exercise.pairs.map((p) => key(p.a, p.b)));
    correct =
      submitted.length === exercise.pairs.length &&
      submitted.every((p) => expected.has(key(p.a, p.b)));
  }

  let leveledUp = false;
  if (correct) {
    session.correct += 1;
    session.xpEarned += XP_PER_CORRECT;
    const result = await awardXp(req.user, XP_PER_CORRECT, 'lesson-answer');
    leveledUp = result.leveledUp;
  } else {
    session.wrong += 1;
    session.hearts -= 1;
    const wrongWord = { word: exercise.word, translation: exercise.translation, languageCode: lesson.languageCode };
    if (wrongWord.word && !session.wrongWords.some((w) => w.word === wrongWord.word)) {
      session.wrongWords.push(wrongWord);
    }
  }
  session.index += 1;
  const failed = session.hearts <= 0;
  if (failed) sessions.delete(sessionKey(req.user._id, lessonId));
  const fresh = req.user;
  return res.json({
    correct,
    correctAnswer: exercise.type === 'match' ? exercise.pairs : exercise.answer,
    hearts: session.hearts,
    index: session.index,
    total: lesson.exercises.length,
    xpEarned: session.xpEarned,
    failed,
    leveledUp,
    user: userSnapshot(fresh),
  });
});

// Complete a lesson: only valid when every exercise was answered with at
// least one heart left. Awards the lesson bonus, updates streak/level,
// queues wrong words for spaced review, and awards achievements.
router.post('/complete', auth, async (req, res) => {
  const { lessonId } = req.body || {};
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const session = getSession(req.user._id, lessonId);
  if (!session) return res.status(400).json({ error: 'No active lesson session' });
  if (session.index < lesson.exercises.length || session.hearts <= 0) {
    return res.status(400).json({ error: 'Finish all exercises with hearts left to complete the lesson' });
  }

  const existing = await Progress.findOne({ user: req.user._id, lesson: lesson._id });
  const firstTime = !existing || existing.status !== 'completed';
  const bonus = firstTime ? lesson.xpReward : 5;
  const score = Math.round((session.correct / lesson.exercises.length) * 100);

  const progress = await Progress.findOneAndUpdate(
    { user: req.user._id, lesson: lesson._id },
    {
      $set: { status: 'completed', completedAt: new Date() },
      $max: { bestScore: score },
      $inc: { attempts: 1 },
    },
    { upsert: true, new: true }
  );

  const user = req.user;
  resetDailyIfNeeded(user);
  if (firstTime) user.lessonsCompleted += 1;
  if (session.hearts === 3) user.flawlessLessons += 1;
  await user.save();

  const result = await awardXp(user, bonus, 'lesson-complete');
  const totalXp = session.xpEarned + bonus;

  // Wrong words go into the spaced-repetition deck, due now.
  for (const w of session.wrongWords) {
    await ReviewItem.findOneAndUpdate(
      { user: user._id, word: w.word, languageCode: w.languageCode },
      {
        $set: { translation: w.translation, intervalDays: 1, dueAt: new Date() },
        $inc: { wrongCount: 1 },
      },
      { upsert: true }
    );
  }

  const newAchievements = await checkAchievements(user);
  sessions.delete(sessionKey(req.user._id, lessonId));

  // One emit to the learner's room only — the celebration toast.
  emitToUser(String(user._id), 'lesson:completed', {
    lessonId: String(lesson._id),
    title: lesson.title,
    xp: totalXp,
    level: result.level,
    leveledUp: result.leveledUp,
    achievements: newAchievements.map((a) => a.title),
  });

  return res.json({
    completed: true,
    score,
    bestScore: progress.bestScore,
    xpEarned: totalXp,
    firstTime,
    newAchievements: newAchievements.map((a) => ({ key: a.key, title: a.title })),
    user: userSnapshot(user),
  });
});

module.exports = router;
