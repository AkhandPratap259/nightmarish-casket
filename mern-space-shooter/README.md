# Neon Space Shooter

A complete, playable arcade space shooter built with the MERN stack. Fly a neon ship through
escalating waves, fight a boss every 5 waves, grab power-ups, chain combo kills, and climb the
leaderboard. All ships, enemies and sounds are drawn / synthesized in code — there are no image
or audio files to download.

## Features

- **Complete game loop:** start menu → playing → pause → game over → restart, with a HUD
  showing score, lives, wave, combo and current weapon.
- **Controls:** Arrow keys / WASD to move, Space (or click / touch) to shoot, P or Esc to pause.
  On touch devices, drag to move and the ship auto-fires.
- **Enemies:** drone (straight down, cyan), weaver (sine-wave path, magenta), tank (slow, high HP,
  shoots, orange), and a boss every 5 waves (large HP bar, spread attack, red).
- **Waves that get harder:** more enemies and faster enemies as waves increase.
- **Power-ups:** spread shot (S), rapid fire (R), shield (◈, absorbs one hit), extra life (+, rare).
- **Combo scoring:** consecutive kills without taking damage raise your combo; each 5-combo step
  increases the score multiplier. Taking a hit resets the combo.
- **Juice:** parallax starfield, particle explosions, screen shake on player hit, neon glow, and a
  distinct deep black / violet / cyan / magenta theme.
- **Sound:** Web Audio API synthesized laser, explosion, power-up and background hum, with a
  mute toggle. Menu/UI animations respect `prefers-reduced-motion`.
- **Accounts & leaderboard:** optional JWT register/login (passwords stored only as bcrypt
  `passwordHash`). Guest play works without logging in; a logged-in user's name is prefilled
  when saving a score. The leaderboard is never seeded with fake scores — an empty board
  honestly says "No scores yet".

## Tech stack

- Frontend: React + Vite, HTML Canvas 2D, `requestAnimationFrame` game loop, plain JavaScript
  game logic (no Phaser, no Three.js), Web Audio API, CSS animations.
- Backend: Express + Mongoose, JWT auth with bcrypt, scores API.
- Database: MongoDB via `MONGO_URI` if set, otherwise `mongodb-memory-server` (in-memory,
  data resets on restart).

## API overview

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Returns `{ "ok": true, "service": "mern-space-shooter" }` |
| `POST /api/auth/register` | `{ name, email, password }` → `{ token, user }` |
| `POST /api/auth/login` | `{ email, password }` → `{ token, user }` |
| `POST /api/scores` | `{ player, score, wave }` (validated: name 1–30 chars, score ≥ 0 integer, wave ≥ 1 integer) |
| `GET /api/scores/top?limit=10` | Top scores, sorted by score descending |

The frontend API base is `import.meta.env.VITE_API_URL || 'http://localhost:5000'`, so you can
move the backend to another port by setting `VITE_API_URL` (and `PORT` / `CLIENT_URL` in the
server) — the frontend is not hard-coded to port 5000.

## Run it locally

Server terminal:

```powershell
cd server
npm install
npm run dev
```

Client terminal (a second terminal):

```powershell
cd client
npm install
npm run dev
```

Then open http://localhost:5173

Backend runs on http://localhost:5000 by default. Only one backend can use port 5000 at a
time — if another project is already running there, stop it first or move this project with
`PORT` (server) and `VITE_API_URL` (client).

## Windows on ARM note

On Windows on ARM, `mongodb-memory-server` cannot download a Windows-ARM MongoDB 7.0.24
binary (that file does not exist, so the download returns 403). This project handles that in
two ways: the shipped `server/.env` sets `MONGOMS_ARCH=x64`, and — more importantly — the
server code itself forces the x64 binary on Windows ARM
(`process.platform === 'win32' && process.arch === 'arm64'` → `MongoMemoryServer.create({ binary: { arch: 'x64' } })`),
so a missing or misnamed `.env` file cannot silently fall back to the broken download.
Alternatively, set `MONGO_URI` to a free MongoDB Atlas M0 cluster to skip the in-memory
download entirely and keep scores between restarts.

**Security note:** the committed `server/.env` contains local-development defaults only
(dev-only JWT secret, empty `MONGO_URI`). A real Atlas connection string, password or API
key must never be committed to this public repository — a real Atlas URI goes in your own
local copy only.
