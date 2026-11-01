const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('./models/User');
const Job = require('./models/Job');
const jobsSeed = require('./seed/jobs');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const savedRoutes = require('./routes/saved');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mern-job-portal' }));
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/saved', savedRoutes);

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return;
  }
  // Local development fallback: an in-memory MongoDB, so the app runs with
  // zero setup. Production should always set MONGO_URI (e.g. MongoDB Atlas).
  // On Windows on ARM, force the Intel binary with MONGOMS_ARCH=x64, or set
  // MONGO_URI to a free Atlas M0 cluster to skip the download entirely.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory MongoDB (local dev only — set MONGO_URI for persistent data)');
}

async function seed() {
  let recruiter = await User.findOne({ email: 'demo-recruiter@hirehub.example' });
  if (!recruiter) {
    recruiter = await User.create({
      name: 'Demo Recruiter',
      email: 'demo-recruiter@hirehub.example',
      passwordHash: await bcrypt.hash('HireHub123!', 10),
      role: 'recruiter',
    });
  }
  if ((await Job.countDocuments()) === 0) {
    await Job.insertMany(jobsSeed.map((job) => ({ ...job, postedBy: recruiter._id })));
    console.log(`Seeded ${jobsSeed.length} jobs`);
  }
}

async function start() {
  await connectDb();
  await seed();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { app, start };
