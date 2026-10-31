# ChatWave — Real-time Chat App (Day 2)

A complete, runnable MERN chat app: JWT authentication, public rooms, messages
persisted in MongoDB, and live delivery with Socket.io — including online
presence and typing indicators.

## Features

- Register and log in with JWT authentication (bcrypt-hashed passwords)
- Public chat rooms, seeded with `general`, `mern-devs` and `random`, plus
  user-created rooms
- Real-time messages over Socket.io, persisted to MongoDB and reloaded as
  history when a room is opened
- Online-user presence broadcast to every connected client
- Live typing indicators per room
- REST API for auth, rooms, message history and the user list

## Tech stack

- MongoDB + Mongoose, Express, React (Vite), Node.js
- Socket.io (server + client), JSON Web Tokens, bcryptjs

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create an account, returns a JWT |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/auth/me` | Current user (auth required) |
| GET | `/api/rooms` | List rooms (auth required) |
| POST | `/api/rooms` | Create a room (auth required) |
| GET | `/api/rooms/:id/messages` | Latest 100 messages in a room (auth required) |
| GET | `/api/users` | List users (auth required) |

Socket.io events (authenticated with the JWT in `auth.token`):

- Client → server: `room:join`, `room:leave`, `message:send`, `typing`
- Server → client: `message:new`, `presence`, `typing`, `room:joined`

## Run it locally

Prerequisites: Node.js 20+ and npm. MongoDB is optional — without
`MONGO_URI` the server uses an in-memory MongoDB for local development.

```bash
# Terminal 1 — API + Socket.io on http://localhost:5000
cd mern-realtime-chat/server
cp .env.example .env   # set JWT_SECRET for anything beyond local testing
npm install
npm run dev

# Terminal 2 — React app on http://localhost:5173
cd mern-realtime-chat/client
npm install
npm run dev
```

Open the app in two browser windows, register as two different users, join the
same room, and watch messages, typing indicators and the online list update live.

To use a real database instead of the in-memory fallback, set `MONGO_URI` in
`server/.env` (for example a MongoDB Atlas connection string).

## Project structure

```
mern-realtime-chat/
  server/
    src/server.js            # Express + Socket.io, presence, message relay
    src/models/              # User, Room, Message
    src/routes/              # auth, rooms (incl. message history)
    src/middleware/auth.js   # JWT protection + token signing
    src/seed/rooms.js        # Seeded rooms
  client/
    src/App.jsx              # Auth, rooms sidebar, chat pane, Socket.io client
    src/styles.css
```
