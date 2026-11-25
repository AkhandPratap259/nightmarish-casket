const express = require('express');
const Project = require('../models/Project');
const Room = require('../models/Room');
const Task = require('../models/Task');
const Takeoff = require('../models/Takeoff');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const q = { owner: req.userId };
  if (req.query.status) q.status = req.query.status;
  if (req.query.search) q.name = new RegExp(req.query.search, 'i');
  const projects = await Project.find(q).sort({ updatedAt: -1 });
  res.json(projects);
});

router.post('/', async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, owner: req.userId });
    res.status(201).json(project);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
});

router.put('/:id', async (req, res) => {
  const project = await Project.findOneAndUpdate({ _id: req.params.id, owner: req.userId }, req.body, { new: true, runValidators: true });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
});

router.delete('/:id', async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  await Promise.all([Room.deleteMany({ project: project._id }), Task.deleteMany({ project: project._id }), Takeoff.deleteMany({ project: project._id })]);
  res.json({ message: 'Project deleted' });
});

// ---- Rooms (nested) ----
router.get('/:id/rooms', async (req, res) => {
  const rooms = await Room.find({ project: req.params.id }).sort({ createdAt: 1 });
  res.json(rooms);
});

router.post('/:id/rooms', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const room = await Room.create({ ...req.body, project: project._id });
    res.status(201).json(room);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/:id/rooms/:roomId', async (req, res) => {
  const room = await Room.findOneAndUpdate({ _id: req.params.roomId, project: req.params.id }, req.body, { new: true, runValidators: true });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  res.json(room);
});

router.delete('/:id/rooms/:roomId', async (req, res) => {
  const room = await Room.findOneAndDelete({ _id: req.params.roomId, project: req.params.id });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  res.json({ message: 'Room deleted' });
});

// ---- Tasks (nested) ----
router.get('/:id/tasks', async (req, res) => {
  const q = { project: req.params.id };
  if (req.query.phase) q.phase = req.query.phase;
  if (req.query.status) q.status = req.query.status;
  const tasks = await Task.find(q).populate('assignedContractor', 'name trade').populate('dependsOn', 'title status').sort({ dueDate: 1, createdAt: 1 });
  res.json(tasks);
});

router.post('/:id/tasks', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (req.body.dependsOn) {
      const dep = await Task.findOne({ _id: req.body.dependsOn, project: project._id });
      if (!dep) return res.status(400).json({ message: 'Dependency task not found in this project' });
    }
    const task = await Task.create({ ...req.body, project: project._id });
    req.io?.to(`project:${project._id}`).emit('activity', { type: 'task-created', taskId: task._id, title: task.title, at: new Date() });
    res.status(201).json(task);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/:id/tasks/:taskId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, project: req.params.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const nextStatus = req.body.status;
    if (nextStatus && nextStatus !== 'todo' && nextStatus !== task.status && task.dependsOn) {
      const dep = await Task.findById(task.dependsOn);
      if (dep && dep.status !== 'done') {
        return res.status(409).json({ message: `Blocked: "${dep.title}" must be done before this task can move to ${nextStatus}.` });
      }
    }
    Object.assign(task, req.body);
    await task.save();
    req.io?.to(`project:${req.params.id}`).emit('task-updated', { taskId: task._id, title: task.title, status: task.status, at: new Date() });
    req.io?.to(`project:${req.params.id}`).emit('activity', { type: 'task-updated', taskId: task._id, title: task.title, status: task.status, at: new Date() });
    res.json(task);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id/tasks/:taskId', async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: req.params.id });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  await Task.updateMany({ dependsOn: task._id }, { $unset: { dependsOn: '' } });
  res.json({ message: 'Task deleted' });
});

// ---- Take-offs (nested) ----
router.get('/:id/takeoffs', async (req, res) => {
  const lines = await Takeoff.find({ project: req.params.id }).populate('room', 'name').populate('material', 'name unit unitPrice').sort({ createdAt: -1 });
  res.json(lines);
});

router.post('/:id/takeoffs', async (req, res) => {
  try {
    const { roomId, materialId, coats = 1 } = req.body;
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const room = await Room.findOne({ _id: roomId, project: project._id });
    const material = await (require('../models/Material')).findById(materialId);
    if (!room || !material) return res.status(404).json({ message: 'Room or material not found' });
    if (!material.coverage || material.coverageBasis === 'none') {
      return res.status(400).json({ message: 'This material has no coverage rate, so a take-off cannot be computed from room dimensions.' });
    }
    const basis = material.coverageBasis;
    const areaUsed = basis === 'wall' ? room.wallArea : room.floorArea;
    const raw = (areaUsed / material.coverage) * coats;
    const quantity = Math.ceil(raw * (1 + material.wastePct / 100) * 100) / 100;
    const totalCost = Math.round(quantity * material.unitPrice);
    const line = await Takeoff.create({ project: project._id, room: room._id, material: material._id, coats, basis, areaUsed, quantity, unitPrice: material.unitPrice, totalCost });
    res.status(201).json(line);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete('/:id/takeoffs/:lineId', async (req, res) => {
  const line = await Takeoff.findOneAndDelete({ _id: req.params.lineId, project: req.params.id });
  if (!line) return res.status(404).json({ message: 'Take-off line not found' });
  res.json({ message: 'Take-off line deleted' });
});

// ---- Budget stats ----
router.get('/:id/stats', async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const tasks = await Task.find({ project: project._id });
  const takeoffs = await Takeoff.find({ project: project._id }).populate('material', 'category');
  const byCategory = {};
  for (const t of tasks) {
    byCategory[t.phase] = byCategory[t.phase] || { estimated: 0, actual: 0 };
    byCategory[t.phase].estimated += t.estimatedCost || 0;
    byCategory[t.phase].actual += t.actualCost || 0;
  }
  for (const l of takeoffs) {
    const cat = l.material?.category || 'Materials';
    byCategory[cat] = byCategory[cat] || { estimated: 0, actual: 0 };
    byCategory[cat].estimated += l.totalCost;
    byCategory[cat].actual += l.totalCost;
  }
  const estimatedTotal = Object.values(byCategory).reduce((s, c) => s + c.estimated, 0);
  const actualTotal = Object.values(byCategory).reduce((s, c) => s + c.actual, 0);
  const remaining = project.totalBudget - estimatedTotal;
  res.json({
    totalBudget: project.totalBudget,
    estimatedTotal,
    actualTotal,
    remaining,
    overBudget: remaining < 0,
    taskCounts: { todo: tasks.filter(t => t.status === 'todo').length, doing: tasks.filter(t => t.status === 'doing').length, done: tasks.filter(t => t.status === 'done').length },
    byCategory: Object.entries(byCategory).map(([category, v]) => ({ category, ...v })),
  });
});

module.exports = router;
