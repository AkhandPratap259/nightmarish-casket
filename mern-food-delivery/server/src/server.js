require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const { seed } = require('./seed/seed');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' } });
app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'foodfleet-api' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/orders', require('./routes/orders'));

io.on('connection', (socket) => {
  socket.on('join-order', (orderId) => socket.join(`order:${orderId}`));
  socket.on('join-restaurant', (restaurantId) => socket.join(`restaurant:${restaurantId}`));
});

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return null;
  }
  // In-memory fallback. Windows on ARM cannot run the default aarch64 mongod
  // build, so force the x64 binary in code — never rely on .env alone, because
  // a missing or misnamed .env silently falls back to the broken download.
  // launchTimeout: the default is only 10 seconds, and an x64 mongod running
  // under Windows-ARM emulation (plus first-run extraction / Defender scans)
  // routinely takes longer, producing "Instance failed to start within 10000ms".
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';
  const mongod = await MongoMemoryServer.create({
    binary: isWindowsArm ? { arch: 'x64' } : {},
    instance: { launchTimeout: 60000 },
  });
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory MongoDB');
  return mongod;
}

const PORT = process.env.PORT || 5000;
connectDb()
  .then(() => seed())
  .then(() => server.listen(PORT, () => console.log(`FoodFleet API on http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('Failed to start:', e);
    process.exit(1);
  });
