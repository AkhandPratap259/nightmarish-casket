require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const waitlistRoutes = require('./routes/waitlist');
const adminRoutes = require('./routes/admin');
const organizerRoutes = require('./routes/organizer');
const notificationRoutes = require('./routes/notifications');
const seed = require('./seed/seed');
const { setIo, releaseExpiredHolds } = require('./utils/notify');

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
  const eventId = socket.handshake.auth?.eventId;
  if (eventId) socket.join(`event:${eventId}`);
  socket.on('watch-event', (id) => {
    if (typeof id === 'string') socket.join(`event:${id}`);
  });
  socket.on('unwatch-event', (id) => {
    if (typeof id === 'string') socket.leave(`event:${id}`);
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'gatherly-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/notifications', notificationRoutes);

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
  await mongoose.connect(uri, { dbName: 'gatherly' });
  await seed();
  // Sweeper: release expired 5-minute seat holds every 60 seconds.
  setInterval(() => {
    releaseExpiredHolds().catch((err) => console.error('Hold sweeper failed:', err.message));
  }, 60000);
  server.listen(PORT, () => console.log(`Gatherly API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
