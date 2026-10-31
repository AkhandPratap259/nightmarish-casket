const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');
const roomsSeed = require('./seed/rooms');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mern-realtime-chat' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.get('/api/users', require('./middleware/auth').protect, async (req, res) => {
  const users = await User.find().select('name email').sort({ name: 1 });
  res.json(users);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

// Online presence: userId -> number of connected sockets.
const online = new Map();
const onlineUsersPayload = () => [...online.keys()];

io.use(async (socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Missing token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = String(socket.user._id);
  online.set(userId, (online.get(userId) || 0) + 1);
  io.emit('presence', onlineUsersPayload());

  socket.on('room:join', async (roomId) => {
    const room = await Room.findById(roomId).catch(() => null);
    if (!room) return socket.emit('error:message', 'Room not found');
    socket.join(roomId);
    socket.emit('room:joined', roomId);
  });

  socket.on('room:leave', (roomId) => socket.leave(roomId));

  socket.on('message:send', async ({ roomId, text }) => {
    const clean = (text || '').trim();
    if (!clean || clean.length > 2000) return;
    const room = await Room.findById(roomId).catch(() => null);
    if (!room) return socket.emit('error:message', 'Room not found');
    const message = await Message.create({ room: roomId, sender: socket.user._id, text: clean });
    const payload = {
      _id: message._id,
      room: roomId,
      text: clean,
      createdAt: message.createdAt,
      sender: { _id: socket.user._id, name: socket.user.name },
    };
    io.to(roomId).emit('message:new', payload);
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', { roomId, user: socket.user.name, isTyping: !!isTyping });
  });

  socket.on('disconnect', () => {
    const count = (online.get(userId) || 1) - 1;
    if (count <= 0) online.delete(userId);
    else online.set(userId, count);
    io.emit('presence', onlineUsersPayload());
  });
});

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return;
  }
  // Local development fallback: an in-memory MongoDB, so the app runs with
  // zero setup. Production should always set MONGO_URI (e.g. MongoDB Atlas).
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory MongoDB (local dev only — set MONGO_URI for persistent data)');
}

async function start() {
  await connectDb();
  if ((await Room.countDocuments()) === 0) {
    await Room.insertMany(roomsSeed);
    console.log(`Seeded ${roomsSeed.length} rooms`);
  }
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`API + Socket.io running on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { app, server, start };
