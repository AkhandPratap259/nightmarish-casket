require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./models/User');
const Group = require('./models/Group');
const Expense = require('./models/Expense');
const Settlement = require('./models/Settlement');
const Activity = require('./models/Activity');
const { setIo } = require('./utils/notify');
const seed = require('./seed/seed');

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const balanceRoutes = require('./routes/balances');
const analyticsRoutes = require('./routes/analytics');
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
  const groupId = socket.handshake.auth?.groupId;
  if (groupId) socket.join(`group:${groupId}`);
  socket.on('join-group', (id) => {
    if (id) socket.join(`group:${id}`);
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'fairshare-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups/:id', expenseRoutes);
app.use('/api/groups/:id', balanceRoutes);
app.use('/api', analyticsRoutes);
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
  await mongoose.connect(uri, { dbName: 'fairshare' });
  // Build all indexes BEFORE seeding or serving, so no query can run
  // against a missing index.
  await Promise.all([
    User.init(),
    Group.init(),
    Expense.init(),
    Settlement.init(),
    Activity.init(),
  ]);
  const existing = await Group.countDocuments();
  if (existing === 0) {
    await seed();
    console.log('Seeded demo data');
  }
  server.listen(PORT, () => console.log(`FairShare API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
