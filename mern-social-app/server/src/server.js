const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const seed = require('./seed/seed');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const socialRoutes = require('./routes/social');
const feedRoutes = require('./routes/feed');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' } });
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) socket.join(String(userId));
});
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
// Give route handlers a way to push live events without importing socket.io.
app.use((req, res, next) => {
  res.locals.emit = (event, data) => io.emit(event, data);
  res.locals.emitTo = (userId, event, data) => io.to(userId).emit(event, data);
  next();
});
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mern-social-app' }));
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', socialRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/notifications', notificationRoutes);

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return;
  }
  // Local development fallback: an in-memory MongoDB, so the app runs with
  // zero setup. On Windows on ARM, MongoDB does not publish a Windows-ARM
  // binary, so the Intel (x64) binary must be used via emulation. This is
  // forced here in code — not only via server/.env — because a missing,
  // misnamed (.env.txt) or unloaded .env file must not silently fall back
  // to the broken aarch64 download. Set MONGO_URI to a free Atlas M0
  // cluster to skip the download entirely.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';
  // launchTimeout: the default is only 10 seconds, and an x64 mongod running
  // under Windows-ARM emulation (plus first-run extraction / Defender scan)
  // routinely takes longer than that to become ready.
  const mongod = await MongoMemoryServer.create({
    binary: isWindowsArm ? { arch: 'x64' } : {},
    instance: { launchTimeout: 60000 },
  });
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory MongoDB (local dev only — set MONGO_URI for persistent data)');
}

const PORT = process.env.PORT || 5000;
connectDb().then(async () => { await seed(); server.listen(PORT, () => console.log(`Orbit API on http://localhost:${PORT}`)); })
  .catch((e) => { console.error('Failed to start:', e); process.exit(1); });
