require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const pledgeRoutes = require('./routes/pledges');
const updateRoutes = require('./routes/updates');
const commentRoutes = require('./routes/comments');
const adminRoutes = require('./routes/admin');
const seed = require('./seed/seed');
const { setIo } = require('./utils/notify');
const { closeDeadlines } = require('./utils/deadline');
const User = require('./models/User');
const Campaign = require('./models/Campaign');
const Pledge = require('./models/Pledge');
const Update = require('./models/Update');
const Comment = require('./models/Comment');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin === CLIENT_URL || /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

const io = new Server(server, { cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] } });
setIo(io);
io.on('connection', (socket) => {
  const campaignId = socket.handshake.auth?.campaignId;
  if (campaignId) socket.join(`campaign:${campaignId}`);
  const userId = socket.handshake.auth?.userId;
  if (userId) socket.join(`user:${userId}`);
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'fundforge-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/campaigns/:id/pledges', pledgeRoutes);
app.use('/api/pledges', pledgeRoutes);
app.use('/api/campaigns/:id/updates', updateRoutes);
app.use('/api/campaigns/:id/comments', commentRoutes);
app.use('/api/admin', adminRoutes);

// A single failed query must never crash the process: return a 500 instead.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

async function start() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    // Windows on ARM (aarch64): the aarch64 mongod binary does not exist,
    // so force the x64 binary in code (independent of .env) and allow a
    // 60s launch window under emulation.
    const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';
    const mongod = await MongoMemoryServer.create({
      binary: isWindowsArm ? { arch: 'x64' } : {},
      instance: { launchTimeout: 60000 },
    });
    uri = mongod.getUri();
    console.log('Connected to in-memory MongoDB');
  } else {
    console.log('Connected to MongoDB (MONGO_URI)');
  }
  await mongoose.connect(uri, { dbName: 'fundforge' });
  // Build all indexes BEFORE seeding or serving, so no query can run
  // against a missing index.
  await Promise.all([User.init(), Campaign.init(), Pledge.init(), Update.init(), Comment.init()]);
  await seed();
  // Close any live campaigns whose deadline has already passed, then
  // re-check every 60 seconds.
  await closeDeadlines();
  const deadlineTimer = setInterval(() => {
    closeDeadlines().catch((err) => console.error('Deadline check failed:', err));
  }, 60 * 1000);
  deadlineTimer.unref();
  server.listen(PORT, () => console.log(`FundForge API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
