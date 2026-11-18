require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authRoutes = require('./routes/auth');
const exerciseRoutes = require('./routes/exercises');
const templateRoutes = require('./routes/templates');
const sessionRoutes = require('./routes/sessions');
const recordRoutes = require('./routes/records');
const analyticsRoutes = require('./routes/analytics');
const challengeRoutes = require('./routes/challenges');
const planRoutes = require('./routes/plans');
const adminRoutes = require('./routes/admin');
const seed = require('./seed/seed');
const { setIo } = require('./utils/notify');
const User = require('./models/User');
const Exercise = require('./models/Exercise');
const Template = require('./models/Template');
const Session = require('./models/Session');
const PersonalRecord = require('./models/PersonalRecord');
const Challenge = require('./models/Challenge');
const Plan = require('./models/Plan');

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
  const userId = socket.handshake.auth?.userId;
  if (userId) socket.join(`user:${userId}`);
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'pulsefit-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/plans', planRoutes);
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
  await mongoose.connect(uri, { dbName: 'pulsefit' });
  // Build all indexes BEFORE seeding or serving, so no query can run
  // against a missing index.
  await Promise.all([
    User.init(),
    Exercise.init(),
    Template.init(),
    Session.init(),
    PersonalRecord.init(),
    Challenge.init(),
    Plan.init(),
  ]);
  await seed();
  server.listen(PORT, () => console.log(`PulseFit API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
