require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./models/User');
const League = require('./models/League');
const Team = require('./models/Team');
const Match = require('./models/Match');
const { setIo } = require('./utils/notify');
const seed = require('./seed/seed');

const authRoutes = require('./routes/auth');
const leagueRoutes = require('./routes/leagues');
const teamRoutes = require('./routes/teams');
const matchRoutes = require('./routes/matches');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] } });
setIo(io);
io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  if (userId) socket.join(`user:${userId}`);
  socket.on('join-league', (id) => {
    if (id) socket.join(`league:${id}`);
  });
  socket.on('join-match', (id) => {
    if (id) socket.join(`match:${id}`);
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'playpulse-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
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
  await mongoose.connect(uri, { dbName: 'playpulse' });
  // Build all indexes BEFORE seeding or serving, so no query can run
  // against a missing index.
  await Promise.all([User.init(), League.init(), Team.init(), Match.init()]);
  const existing = await League.countDocuments();
  if (existing === 0) {
    await seed();
    console.log('Seeded demo data');
  }
  server.listen(PORT, () => console.log(`PlayPulse API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
