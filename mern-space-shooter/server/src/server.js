const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const authRoutes = require('./routes/auth');
const scoreRoutes = require('./routes/scores');

const app = express();
// Local-dev CORS: allow the configured CLIENT_URL and any localhost port,
// so the game still loads its leaderboard if Vite falls back to 5174 (e.g.
// when 5173 is already taken by another project) instead of failing silently.
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === process.env.CLIENT_URL || /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    return cb(null, false);
  },
}));
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mern-space-shooter' }));
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return;
  }
  // Local development fallback: an in-memory MongoDB, so the app runs with
  // zero setup. On Windows on ARM, MongoDB does not publish a Windows-ARM
  // binary for 7.0.24, so the Intel (x64) binary must be used via emulation.
  // This is forced here in code — not only via server/.env — because a
  // missing, misnamed (.env.txt) or unloaded .env file must not be able to
  // silently fall back to the broken aarch64 download. Set MONGO_URI to a
  // free Atlas M0 cluster to skip the download entirely.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';
  // launchTimeout: the default is only 10 seconds, and an x64 mongod running
  // under Windows-ARM emulation (plus first-run extraction / Defender scan)
  // routinely takes longer than that to become ready, producing
  // "Instance failed to start within 10000ms" even though the binary itself
  // is fine. 60 seconds gives it room without changing anything else.
  const mongod = await MongoMemoryServer.create({
    binary: isWindowsArm ? { arch: 'x64' } : {},
    instance: { launchTimeout: 60000 },
  });
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory MongoDB (local dev only — set MONGO_URI for persistent data)');
}

const PORT = process.env.PORT || 5000;
connectDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
