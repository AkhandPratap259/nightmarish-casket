const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Takeoff = require('../models/Takeoff');
const User = require('../models/User');
const Material = require('../models/Material');
const Contractor = require('../models/Contractor');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const projects = await Project.find({ owner: req.userId });
  const projectIds = projects.map(p => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } }).populate('project', 'name').sort({ dueDate: 1 });
  const upcoming = tasks.filter(t => t.status !== 'done' && t.dueDate).slice(0, 6);
  const totalBudget = projects.reduce((s, p) => s + (p.totalBudget || 0), 0);
  const estimated = tasks.reduce((s, t) => s + (t.estimatedCost || 0), 0);
  const takeoffs = await Takeoff.find({ project: { $in: projectIds } });
  const takeoffTotal = takeoffs.reduce((s, l) => s + (l.totalCost || 0), 0);
  res.json({
    projectCount: projects.length,
    projects: projects.map(p => ({ id: p._id, name: p.name, status: p.status, totalBudget: p.totalBudget, isSample: p.isSample })),
    taskCounts: { todo: tasks.filter(t => t.status === 'todo').length, doing: tasks.filter(t => t.status === 'doing').length, done: tasks.filter(t => t.status === 'done').length },
    upcomingTasks: upcoming,
    totalBudget,
    estimatedTotal: estimated + takeoffTotal,
    takeoffTotal,
  });
});

router.get('/admin', requireRole('admin'), async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({
    users,
    counts: { users: users.length, materials: await Material.countDocuments(), contractors: await Contractor.countDocuments(), projects: await Project.countDocuments() },
  });
});

module.exports = router;
