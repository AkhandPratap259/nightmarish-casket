const express = require('express');
const Task = require('../models/Task');
const Garden = require('../models/Garden');
const { auth } = require('../middleware/auth');
const { emitToGarden } = require('../utils/notify');

const router = express.Router();

// Open tasks for a garden, soonest due first. ?status=open|done|all
router.get('/gardens/:gardenId/tasks', auth, async (req, res) => {
  const garden = await Garden.findById(req.params.gardenId);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  const filter = { garden: garden._id };
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.mine === 'true') filter.assignee = req.user._id;
  const tasks = await Task.find(filter)
    .populate('planting', 'status')
    .populate('bed', 'name')
    .populate('assignee', 'name')
    .sort({ dueDate: 1 });
  return res.json({ tasks });
});

router.post('/gardens/:gardenId/tasks', auth, async (req, res) => {
  const garden = await Garden.findById(req.params.gardenId);
  if (!garden) return res.status(404).json({ error: 'Garden not found' });
  const { kind, title, dueDate, planting, bed, assignee } = req.body || {};
  if (!kind || !title || !dueDate) {
    return res.status(400).json({ error: 'Kind, title and due date are required' });
  }
  const task = await Task.create({
    garden: garden._id,
    kind,
    title: String(title).trim(),
    dueDate: new Date(dueDate),
    planting: planting || null,
    bed: bed || null,
    assignee: assignee || req.user._id,
    createdBy: req.user._id,
  });
  emitToGarden(garden._id, 'task:created', { task });
  return res.status(201).json({ task });
});

router.patch('/:id', auth, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.body.status && ['open', 'done', 'skipped'].includes(req.body.status)) task.status = req.body.status;
  if (req.body.assignee !== undefined) task.assignee = req.body.assignee || null;
  if (req.body.dueDate) task.dueDate = new Date(req.body.dueDate);
  await task.save();
  emitToGarden(task.garden, 'task:updated', { task });
  return res.json({ task });
});

router.delete('/:id', auth, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  await task.deleteOne();
  emitToGarden(task.garden, 'task:deleted', { taskId: task._id });
  return res.json({ ok: true });
});

module.exports = router;
