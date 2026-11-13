require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const favouriteRoutes = require('./routes/favourites');
const compareRoutes = require('./routes/compare');
const calculatorRoutes = require('./routes/calculator');
const analyticsRoutes = require('./routes/analytics');
const savedSearchRoutes = require('./routes/savedSearches');
const enquiryRoutes = require('./routes/enquiries');
const adminRoutes = require('./routes/admin');
const seed = require('./seed/seed');
const { setIo } = require('./utils/notify');
const User = require('./models/User');
const Property = require('./models/Property');
const Favourite = require('./models/Favourite');
const SavedSearch = require('./models/SavedSearch');
const Enquiry = require('./models/Enquiry');

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

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'nesthunt-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/favourites', favouriteRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/admin', adminRoutes);

// A single failed query (e.g. a search before an index exists) must never
// crash the process: return a 500 instead.
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
  await mongoose.connect(uri, { dbName: 'nesthunt' });
  // Build all indexes (including the Property text index used by search)
  // BEFORE seeding or serving, so no query can run against a missing index.
  await Promise.all([User.init(), Property.init(), Favourite.init(), SavedSearch.init(), Enquiry.init()]);
  await seed();
  server.listen(PORT, () => console.log(`NestHunt API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
