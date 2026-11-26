require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./models/User');
const Plant = require('./models/Plant');
const Garden = require('./models/Garden');
const Bed = require('./models/Bed');
const Planting = require('./models/Planting');
const Task = require('./models/Task');
const { setIo } = require('./utils/notify');
const seed = require('./seed/seed');

const authRoutes = require('./routes/auth');
const plantRoutes = require('./routes/plants');
const gardenRoutes = require('./routes/gardens');
const bedRoutes = require('./routes/beds');
const plantingRoutes = require('./routes/plantings');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
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
  socket.on('join-garden', (id) => {
    if (id) socket.join(`garden:${id}`);
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'sproutplot-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/gardens', gardenRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/plantings', plantingRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
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
  await mongoose.connect(uri, { dbName: 'sproutplot' });
  // Build all indexes BEFORE seeding or serving, so no query can run
  // against a missing index.
  await Promise.all([
    User.init(), Plant.init(), Garden.init(), Bed.init(), Planting.init(), Task.init(),
  ]);
  const existing = await Plant.countDocuments();
  if (existing === 0) {
    await seed();
    console.log('Seeded demo data');
  }
  server.listen(PORT, () => console.log(`SproutPlot API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
