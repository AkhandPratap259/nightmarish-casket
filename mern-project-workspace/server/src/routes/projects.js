const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const { Task } = require('../models/Task');
const Activity = require('../models/Activity');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function isMember(project, userId) {
  return (
    String(project.owner) === String(userId) ||
    project.members.some((m) => String(m) === String(userId))
  );
}

async function loadProject(req, res, next) {
  const project = await Project.findById(req.params.id).populate('members', 'name email');
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!isMember(project, req.user._id)) return res.status(403).json({ error: 'Not a member of this project' });
  req.project = project;
  return next();
}

router.get('/', async (req, res) => {
  const projects = await Project.find({
    $or: [{ owner: req.user._id }, { members: req.user._id }],
  })
    .populate('members', 'name email')
    .sort({ updatedAt: -1 });
  res.json({ projects });
});

router.post('/', async (req, res) => {
  const { name, description, color } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  const project = await Project.create({
    name: String(name).trim(),
    description: String(description || '').trim(),
    color: color || '#f5a524',
    owner: req.user._id,
    members: [req.user._id],
  });
  await Activity.create({ project: project._id, actor: req.user._id, action: 'created project', taskTitle: project.name });
  res.status(201).json({ project });
});

router.get('/:id', loadProject, (req, res) => res.json({ project: req.project }));

router.post('/:id/members', loadProject, async (req, res) => {
  if (String(req.project.owner) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Only the project owner can add members' });
  }
  const member = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
  if (!member) return res.status(404).json({ error: 'No user with that email — they need to register first' });
  if (!req.project.members.some((m) => String(m._id || m) === String(member._id))) {
    req.project.members.push(member._id);
    await req.project.save();
  }
  res.json({ project: await Project.findById(req.project._id).populate('members', 'name email') });
});

router.get('/:id/activity', loadProject, async (req, res) => {
  const activity = await Activity.find({ project: req.project._id })
    .populate('actor', 'name')
    .sort({ createdAt: -1 })
    .limit(30);
  res.json({ activity });
});

router.get('/:id/analytics', loadProject, async (req, res) => {
  const tasks = await Task.find({ project: req.project._id }).populate('assignee', 'name');
  const byStatus = { todo: 0, 'in-progress': 0, review: 0, done: 0 };
  const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
  const byMember = {};
  const now = new Date();
  let overdue = 0;
  tasks.forEach((t) => {
    byStatus[t.status] += 1;
    byPriority[t.priority] += 1;
    if (t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now) overdue += 1;
    const key = t.assignee ? t.assignee.name : 'Unassigned';
    byMember[key] = (byMember[key] || 0) + 1;
  });
  const total = tasks.length;
  const completion = total ? Math.round((byStatus.done / total) * 100) : 0;
  res.json({ total, byStatus, byPriority, byMember, overdue, completion });
});

router.delete('/:id', loadProject, async (req, res) => {
  if (String(req.project.owner) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Only the project owner can delete it' });
  }
  await Task.deleteMany({ project: req.project._id });
  await Activity.deleteMany({ project: req.project._id });
  await Project.findByIdAndDelete(req.project._id);
  res.json({ ok: true });
});

module.exports = router;
