require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seed = require('./seed/seed');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'] } });

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use((req, res, next) => { req.io = io; next(); });

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'homedraft-api', time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/contractors', require('./routes/contractors'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ message: 'Server error' }); });

io.on('connection', (socket) => {
  socket.on('join-project', (projectId) => socket.join(`project:${projectId}`));
  socket.on('leave-project', (projectId) => socket.leave(`project:${projectId}`));
});

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return;
  }
  const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';
  const mongod = await MongoMemoryServer.create({ binary: isWindowsArm ? { arch: 'x64' } : {}, instance: { launchTimeout: 60000 } });
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory MongoDB (Windows-ARM x64 binary forced, 60s launch timeout)');
}

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDb();
  await seed();
  server.listen(PORT, () => console.log(`HomeDraft API listening on http://localhost:${PORT}`));
}

if (require.main === module) start();

module.exports = { app, server, start };
