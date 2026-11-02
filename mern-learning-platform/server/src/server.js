const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const User = require('./models/User');
const Course = require('./models/Course');
const coursesSeed = require('./seed/courses');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mern-learning-platform' }));
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
async function connectDb() {
  if (process.env.MONGO_URI) { await mongoose.connect(process.env.MONGO_URI); console.log('Connected to MongoDB (MONGO_URI)'); return; }
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
  let instructor = await User.findOne({ email: 'demo-instructor@learnloop.example' });
  if (!instructor) {
    instructor = await User.create({ name: 'Demo Instructor', email: 'demo-instructor@learnloop.example', passwordHash: await bcrypt.hash('LearnLoop123!', 10), role: 'instructor' });
  }
  if ((await Course.countDocuments()) === 0) {
    await Course.insertMany(coursesSeed.map((c) => ({ ...c, instructor: instructor._id })));
    console.log(`Seeded ${coursesSeed.length} courses`);
  }
}
async function start() {
  await connectDb();
  await seed();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}
if (require.main === module) { start().catch((err) => { console.error(err); process.exit(1); }); }
module.exports = { app, start };
