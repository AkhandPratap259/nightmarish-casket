const express = require('express');
const Project = require('../models/Project');
const { Task, WIP_LIMITS } = require('../models/Task');
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function memberOf(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const ok =
    String(project.owner) === String(userId) ||
    project.members.some((m) => String(m) === String(userId));
  return ok ? project : null;
}

async function checkWip(projectId, status, excludeId) {
  const limit = WIP_LIMITS[status];
  if (!limit) return null;
  const query = { project: projectId, status };
  if (excludeId) query._id = { $ne: excludeId };
  const count = await Task.countDocuments(query);
  return count >= limit ? limit : null;
}

router.get('/project/:projectId', async (req, res) => {
  const project = await memberOf(req.params.projectId, req.user._id);
  if (!project) return res.status(403).json({ error: 'Not a member of this project' });
  const query = { project: project._id };
  if (req.query.status) query.status = req.query.status;
  if (req.query.priority) query.priority = req.query.priority;
  if (req.query.search) query.title = { $regex: req.query.search, $options: 'i' };
  if (req.query.mine === 'true') query.assignee = req.user._id;
  if (req.query.assignee) query.assignee = req.query.assignee;
  const tasks = await Task.find(query)
    .populate('assignee', 'name email')
    .populate('comments.author', 'name')
    .sort({ position: 1, createdAt: 1 });
  res.json({ tasks, wipLimits: WIP_LIMITS });
});

router.post('/project/:projectId', async (req, res) => {
  const project = await memberOf(req.params.projectId, req.user._id);
  if (!project) return res.status(403).json({ error: 'Not a member of this project' });
  const { title, description, status, priority, labels, dueDate, assignee } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Task title is required' });
  const targetStatus = status || 'todo';
  const limit = await checkWip(project._id, targetStatus, null);
  if (limit) return res.status(400).json({ error: `WIP limit reached: ${targetStatus} already holds ${limit} cards` });
  const max = await Task.findOne({ project: project._id, status: targetStatus }).sort({ position: -1 });
  const task = await Task.create({
    project: project._id,
    title: String(title).trim(),
    description: String(description || '').trim(),
    status: targetStatus,
    priority: priority || 'medium',
    labels: Array.isArray(labels) ? labels : String(labels || '').split(',').map((s) => s.trim()).filter(Boolean),
    dueDate: dueDate || null,
    assignee: assignee || null,
    position: max ? max.position + 1 : 0,
    createdBy: req.user._id,
  });
  await Activity.create({ project: project._id, actor: req.user._id, action: 'created task', taskTitle: task.title });
  res.status(201).json({ task });
});

async function loadTask(req, res, next) {
  const task = await Task.findById(req.params.id).populate('assignee', 'name email').populate('comments.author', 'name');
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const project = await memberOf(task.project, req.user._id);
  if (!project) return res.status(403).json({ error: 'Not a member of this project' });
  req.task = task;
  return next();
}

// Move a card (drag-and-drop target). WIP limits are enforced here.
router.patch('/:id/move', loadTask, async (req, res) => {
  const { status, position } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Status is required' });
  if (status !== req.task.status) {
    const limit = await checkWip(req.task.project, status, req.task._id);
    if (limit) {
      return res.status(400).json({ error: `WIP limit reached: ${status} already holds ${limit} cards. Finish or move one out first.` });
    }
  }
  const oldStatus = req.task.status;
  req.task.status = status;
  if (typeof position === 'number') req.task.position = position;
  await req.task.save();
  if (oldStatus !== status) {
    await Activity.create({ project: req.task.project, actor: req.user._id, action: `moved task ${oldStatus} → ${status}`, taskTitle: req.task.title });
  }
  res.json({ task: req.task });
});

router.patch('/:id', loadTask, async (req, res) => {
  const fields = ['title', 'description', 'priority', 'dueDate', 'assignee'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) req.task[f] = req.body[f];
  });
  if (req.body.labels !== undefined) {
    req.task.labels = Array.isArray(req.body.labels) ? req.body.labels : String(req.body.labels).split(',').map((s) => s.trim()).filter(Boolean);
  }
  await req.task.save();
  res.json({ task: req.task });
});

router.post('/:id/checklist', loadTask, async (req, res) => {
  if (!req.body.text) return res.status(400).json({ error: 'Checklist text is required' });
  req.task.checklist.push({ text: String(req.body.text).trim(), done: false });
  await req.task.save();
  res.json({ task: req.task });
});

router.patch('/:id/checklist/:itemId', loadTask, async (req, res) => {
  const item = req.task.checklist.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Checklist item not found' });
  item.done = req.body.done !== undefined ? !!req.body.done : !item.done;
  await req.task.save();
  res.json({ task: req.task });
});

router.post('/:id/comments', loadTask, async (req, res) => {
  if (!req.body.text) return res.status(400).json({ error: 'Comment text is required' });
  req.task.comments.push({ author: req.user._id, text: String(req.body.text).trim() });
  await req.task.save();
  await Activity.create({ project: req.task.project, actor: req.user._id, action: 'commented on task', taskTitle: req.task.title });
  res.json({ task: await Task.findById(req.task._id).populate('assignee', 'name email').populate('comments.author', 'name') });
});

router.delete('/:id', loadTask, async (req, res) => {
  await Task.findByIdAndDelete(req.task._id);
  res.json({ ok: true });
});

module.exports = router;
