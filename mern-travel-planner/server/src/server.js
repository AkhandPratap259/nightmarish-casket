require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const activityRoutes = require('./routes/activities');
const expenseRoutes = require('./routes/expenses');
const packingRoutes = require('./routes/packing');
const seed = require('./seed/seed');
const { setIo } = require('./utils/notify');

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
  socket.on('watch-trip', (id) => {
    if (typeof id === 'string') socket.join(`trip:${id}`);
  });
  socket.on('unwatch-trip', (id) => {
    if (typeof id === 'string') socket.leave(`trip:${id}`);
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'voyara-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/trips/:tripId/activities', activityRoutes);
app.use('/api/trips/:tripId/expenses', expenseRoutes);
app.use('/api/trips/:tripId/packing', packingRoutes);

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
  await mongoose.connect(uri, { dbName: 'voyara' });
  await seed();
  server.listen(PORT, () => console.log(`Voyara API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
