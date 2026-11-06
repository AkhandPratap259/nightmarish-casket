require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { seedDemo } = require('./seed/seed');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'paisapilot-api' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/analytics', require('./routes/analytics'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return null;
  }
  // In-memory fallback. The x64 binary is forced in code (not just .env) so
  // Windows on ARM never downloads the broken aarch64 build, and the
  // instance gets 60 seconds to start under emulation instead of the
  // 10-second default.
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
  .then(async () => {
    const seeded = await seedDemo();
    if (seeded) console.log('Demo user seeded: demo@paisapilot.example');
    app.listen(PORT, () => console.log(`PaisaPilot API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
