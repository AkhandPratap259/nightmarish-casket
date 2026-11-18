const express = require('express');
const mongoose = require('mongoose');
const Session = require('../models/Session');
const Template = require('../models/Template');
const PersonalRecord = require('../models/PersonalRecord');
const Challenge = require('../models/Challenge');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { epleyOneRepMax, sessionVolume, isNewRecord } = require('../utils/fitness');
const { emitToUser, emitToAll } = require('../utils/notify');

const router = express.Router();

async function recomputeChallengeProgress(userId, finishedSession) {
  const now = new Date();
  const challenges = await Challenge.find({
    'participants.user': userId,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  });
  for (const challenge of challenges) {
    const participant = challenge.participants.find(
      (p) => String(p.user) === String(userId)
    );
    if (!participant || participant.completedAt) continue;
    if (challenge.type === 'sessions') {
      const count = await Session.countDocuments({
        user: userId,
        status: 'completed',
        finishedAt: { $gte: challenge.startsAt, $lte: challenge.endsAt },
      });
      participant.progress = count;
    } else if (challenge.type === 'volume') {
      const sessions = await Session.find({
        user: userId,
        status: 'completed',
        finishedAt: { $gte: challenge.startsAt, $lte: challenge.endsAt },
      }).lean();
      participant.progress = sessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
    } else if (challenge.type === 'streak') {
      const sessions = await Session.find({
        user: userId,
        status: 'completed',
        finishedAt: { $gte: challenge.startsAt, $lte: challenge.endsAt },
      }).lean();
      const days = new Set(
        sessions.map((s) => new Date(s.finishedAt).toDateString())
      );
      participant.progress = days.size;
    }
    if (participant.progress >= challenge.target) {
      participant.completedAt = now;
      emitToUser(userId, 'challenge:completed', {
        challengeId: challenge._id,
        title: challenge.title,
      });
    }
    await challenge.save();
  }
}

router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const existing = await Session.findOne({ user: req.user._id, status: 'active' });
    if (existing) {
      return res.status(409).json({
        error: 'You already have an active session — finish or discard it first',
        sessionId: existing._id,
      });
    }
    const { templateId, name } = req.body || {};
    let exercises = [];
    let template = null;
    if (templateId) {
      template = await Template.findById(templateId).populate(
        'items.exercise',
        'name muscleGroup equipment'
      );
      if (!template) return res.status(404).json({ error: 'Template not found' });
      const isOwner = String(template.user) === String(req.user._id);
      if (!isOwner && !template.isPublic) {
        return res.status(403).json({ error: 'This template is private' });
      }
      exercises = [...template.items]
        .sort((a, b) => a.order - b.order)
        .map((it) => ({
          exercise: it.exercise._id,
          sets: Array.from({ length: it.targetSets }, () => ({
            reps: it.targetReps,
            weight: it.targetWeight,
            completed: false,
          })),
          notes: it.notes || '',
        }));
    }
    const session = await Session.create({
      user: req.user._id,
      template: template ? template._id : null,
      name: (name && String(name).trim()) || (template ? template.name : 'Freestyle session'),
      exercises,
    });
    await session.populate('exercises.exercise', 'name muscleGroup equipment difficulty');
    return res.status(201).json({ session });
  })
);

router.get(
  '/mine',
  auth,
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    if (status === 'active' || status === 'completed') filter.status = status;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const [items, total] = await Promise.all([
      Session.find(filter)
        .populate('exercises.exercise', 'name muscleGroup')
        .sort({ startedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Session.countDocuments(filter),
    ]);
    return res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  })
);

router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id)
      .populate('exercises.exercise', 'name muscleGroup equipment difficulty instructions')
      .populate('template', 'name')
      .lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (String(session.user) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your session' });
    }
    return res.json({ session });
  })
);

// Log (or update) one set inside a session exercise.
router.post(
  '/:id/sets',
  auth,
  asyncHandler(async (req, res) => {
    const { exerciseIndex, setIndex, reps, weight, completed } = req.body || {};
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (String(session.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your session' });
    }
    if (session.status !== 'active') {
      return res.status(409).json({ error: 'This session is already finished' });
    }
    const ex = session.exercises[exerciseIndex];
    if (!ex) return res.status(400).json({ error: 'Unknown exercise in this session' });
    const r = Math.min(500, Math.max(0, parseInt(reps, 10) || 0));
    const w = Math.min(2000, Math.max(0, Number(weight) || 0));
    if (typeof setIndex === 'number' && ex.sets[setIndex]) {
      ex.sets[setIndex].reps = r;
      ex.sets[setIndex].weight = w;
      if (typeof completed === 'boolean') ex.sets[setIndex].completed = completed;
    } else {
      ex.sets.push({ reps: r, weight: w, completed: completed !== false });
    }
    session.totalVolume = sessionVolume(session);
    await session.save();
    await session.populate('exercises.exercise', 'name muscleGroup equipment difficulty');
    return res.json({ session });
  })
);

// Remove one set.
router.delete(
  '/:id/sets',
  auth,
  asyncHandler(async (req, res) => {
    const { exerciseIndex, setIndex } = req.body || {};
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (String(session.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your session' });
    }
    if (session.status !== 'active') {
      return res.status(409).json({ error: 'This session is already finished' });
    }
    const ex = session.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) {
      return res.status(400).json({ error: 'Unknown set' });
    }
    ex.sets.splice(setIndex, 1);
    session.totalVolume = sessionVolume(session);
    await session.save();
    await session.populate('exercises.exercise', 'name muscleGroup equipment difficulty');
    return res.json({ session });
  })
);

// Add an exercise to a live session (freestyle or extra work).
router.post(
  '/:id/exercises',
  auth,
  asyncHandler(async (req, res) => {
    const { exerciseId, targetSets = 3, targetReps = 10, targetWeight = 0 } = req.body || {};
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (String(session.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your session' });
    }
    if (session.status !== 'active') {
      return res.status(409).json({ error: 'This session is already finished' });
    }
    if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
      return res.status(400).json({ error: 'Unknown exercise' });
    }
    session.exercises.push({
      exercise: exerciseId,
      sets: Array.from({ length: Math.min(12, Math.max(1, parseInt(targetSets, 10) || 3)) }, () => ({
        reps: Math.min(100, Math.max(1, parseInt(targetReps, 10) || 10)),
        weight: Math.max(0, Number(targetWeight) || 0),
        completed: false,
      })),
    });
    await session.save();
    await session.populate('exercises.exercise', 'name muscleGroup equipment difficulty');
    return res.json({ session });
  })
);

// Finish: lock the session, compute volume + duration, detect new personal
// records, update challenge progress, and broadcast to the live feed.
router.post(
  '/:id/finish',
  auth,
  asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id).populate(
      'exercises.exercise',
      'name muscleGroup'
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (String(session.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your session' });
    }
    if (session.status !== 'active') {
      return res.status(409).json({ error: 'This session is already finished' });
    }
    const finishedAt = new Date();
    session.status = 'completed';
    session.finishedAt = finishedAt;
    session.durationSeconds = Math.max(
      0,
      Math.round((finishedAt - new Date(session.startedAt)) / 1000)
    );
    session.totalVolume = sessionVolume(session);
    await session.save();

    const newRecords = [];
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.completed === false || set.weight <= 0) continue;
        const existing = await PersonalRecord.findOne({
          user: req.user._id,
          exercise: ex.exercise._id,
        });
        if (isNewRecord(set.weight, set.reps, existing)) {
          const record = await PersonalRecord.findOneAndUpdate(
            { user: req.user._id, exercise: ex.exercise._id },
            {
              bestWeight: set.weight,
              bestReps: set.reps,
              estimatedOneRepMax: epleyOneRepMax(set.weight, set.reps),
              achievedAt: finishedAt,
              session: session._id,
            },
            { upsert: true, new: true }
          );
          newRecords.push({
            exercise: ex.exercise.name,
            bestWeight: record.bestWeight,
            bestReps: record.bestReps,
            estimatedOneRepMax: record.estimatedOneRepMax,
          });
        }
      }
    }
    await recomputeChallengeProgress(req.user._id, session);
    emitToAll('session:completed', {
      userName: req.user.name,
      sessionName: session.name,
      totalVolume: session.totalVolume,
      durationSeconds: session.durationSeconds,
      finishedAt,
    });
    return res.json({ session, newRecords });
  })
);

router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (String(session.user) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your session' });
    }
    await session.deleteOne();
    return res.json({ ok: true });
  })
);

module.exports = router;
