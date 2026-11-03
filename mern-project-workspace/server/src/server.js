const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const User = require('./models/User');
const Project = require('./models/Project');
const { Task } = require('./models/Task');
const Activity = require('./models/Activity');
const seedTasks = require('./seed/tasks');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mern-project-workspace' }));
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return;
  }
  // Local development fallback: an in-memory MongoDB, so the app runs with
  // zero setup. On Windows on ARM, force the Intel binary with MONGOMS_ARCH=x64
  // (already in the shipped server/.env), or set MONGO_URI to a free Atlas M0
  // cluster to skip the download entirely.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory MongoDB (local dev only — set MONGO_URI for persistent data)');
}

async function seed() {
  let manager = await User.findOne({ email: 'demo-manager@flowboard.example' });
  if (!manager) {
    manager = await User.create({
      name: 'Demo Manager',
      email: 'demo-manager@flowboard.example',
      passwordHash: await bcrypt.hash('FlowBoard123!', 10),
    });
  }
  const teammates = [];
  for (const [name, email] of [
    ['Priya Sharma', 'priya@flowboard.example'],
    ['Arjun Mehta', 'arjun@flowboard.example'],
  ]) {
    let u = await User.findOne({ email });
    if (!u) u = await User.create({ name, email, passwordHash: await bcrypt.hash('FlowBoard123!', 10) });
    teammates.push(u);
  }
  if ((await Project.countDocuments()) === 0) {
    const project = await Project.create({
      name: 'Website Redesign Launch',
      description: 'Rebuild the marketing site: new hero, product templates, accessibility pass and launch checklist.',
      color: '#f5a524',
      owner: manager._id,
      members: [manager._id, ...teammates.map((t) => t._id)],
    });
    const assignees = [manager, ...teammates];
    await Task.insertMany(
      seedTasks.map((t, i) => ({
        project: project._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        labels: t.labels,
        dueDate: seedTasks.daysFromNow(t.due),
        assignee: assignees[i % assignees.length]._id,
        position: i,
        checklist: t.checklist,
        comments: i === 3
          ? [{ author: teammates[0]._id, text: 'Hero looks great on mobile — just needs the focus ring fix.' }]
          : [],
        createdBy: manager._id,
      }))
    );
    await Activity.create({ project: project._id, actor: manager._id, action: 'created project', taskTitle: project.name });
    console.log(`Seeded project with ${seedTasks.length} tasks`);
  }
}

async function start() {
  await connectDb();
  await seed();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}
if (require.main === module) start().catch((err) => { console.error(err); process.exit(1); });
module.exports = { app, start };
