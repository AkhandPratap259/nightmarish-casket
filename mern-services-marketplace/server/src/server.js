require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./models/User');
const Service = require('./models/Service');
const Offering = require('./models/Offering');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const { setIo } = require('./utils/notify');
const seed = require('./seed/seed');

const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const offeringRoutes = require('./routes/offerings');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const providerRoutes = require('./routes/providers');
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
  const userId = socket.handshake.auth?.userId;
  if (userId) socket.join(`user:${userId}`);
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'tasktrove-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/offerings', offeringRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/analytics', analyticsRoutes);
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
  await mongoose.connect(uri, { dbName: 'tasktrove' });
  // Build all indexes BEFORE seeding or serving, so no query can run
  // against a missing index.
  await Promise.all([
    User.init(),
    Service.init(),
    Offering.init(),
    Booking.init(),
    Review.init(),
  ]);
  const existing = await Service.countDocuments();
  if (existing === 0) {
    await seed();
    console.log('Seeded demo data');
  }
  server.listen(PORT, () => console.log(`TaskTrove API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
