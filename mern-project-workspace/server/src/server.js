const path = require('path');
const fs = require('fs');
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
const cardChatRoutes = require('./routes/cardChat');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
// Chat has its own authenticated, size-limited JSON parser for attachment bytes.
app.use('/api/tasks/:id/chat', cardChatRoutes);
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mern-project-workspace' }));
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', (req,res) => res.status(404).json({error:'API endpoint not found'}));
const clientDist = path.join(__dirname,'..','..','client','dist');
app.use(express.static(clientDist));
app.get('*', (req,res,next) => res.sendFile(path.join(clientDist,'index.html'),err=>{if(err)next();}));
app.use((err,req,res,next)=>{
  if (res.headersSent) return next(err);
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({error:'Invalid request data'});
  console.error(err);
  res.status(500).json({error:'Unexpected server error'});
});

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return;
  }
  // Local MongoDB uses a stable, disk-backed WiredTiger directory.
  // Never silently fall back to ephemeral storage: a failed startup must be visible.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';
  const dbPath = path.resolve(__dirname, '..', process.env.MONGO_DATA_DIR || '.mongo-data');
  fs.mkdirSync(dbPath, { recursive: true });
  const mongod = await MongoMemoryServer.create({
    binary: isWindowsArm ? { arch: 'x64' } : {},
    instance: { dbPath, dbName: 'flowboard', storageEngine: 'wiredTiger', launchTimeout: 60000 },
  });
  await mongoose.connect(mongod.getUri('flowboard'));
  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    try {
      await mongoose.disconnect();
      await mongod.stop({ doCleanup: false, force: false });
      process.exit(0);
    } catch (err) { console.error(err); process.exit(1); }
  }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  console.log('Connected to persistent local MongoDB:', dbPath);
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
  if (process.env.NODE_ENV === 'production' && (!process.env.MONGO_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.includes('dev-only'))) throw new Error('Production requires MONGO_URI and a private JWT_SECRET');
  await connectDb();
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO !== 'false') await seed();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}
if (require.main === module) start().catch((err) => { console.error(err); process.exit(1); });
module.exports = { app, start };
