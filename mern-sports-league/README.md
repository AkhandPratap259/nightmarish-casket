# PlayPulse — Community Sports League Manager

PlayPulse runs community sports leagues: round-robin fixtures in one click, a live match centre with instant score updates, standings computed with real tiebreakers, and a top-scorers chart that updates as goals go in.

## Standout feature

**A live match centre wired to a real standings engine.** Organizers generate a full round-robin season with the circle method, then kick matches off and log goals, cards and substitutions as they happen. Every event is broadcast over Socket.io, the score is recomputed from the event log (never typed in by hand), and the table re-sorts itself using points, goal difference, goals scored and head-to-head — with a five-match form guide for every team.

## Features

- JWT auth with organizer, captain, fan and admin roles
- Leagues for Football, Futsal and Hockey with configurable points (win/draw) and a clay-colour identity
- Teams with squads (positions, shirt numbers) and short codes for the broadcast score bug
- Round-robin fixture generator (circle method, handles odd team counts with a bye), with a guarded rebuild
- Live match centre: kick off, log events (goal, penalty, own goal, cards, substitution, note), full time; scores derive from events
- Standings engine: points → goal difference → goals scored → head-to-head points, plus last-five form
- Analytics: top scorers, goals per matchweek chart, goals per match, biggest win
- Command palette (`Ctrl`/`⌘` + `K`) to jump to leagues, matches and actions
- Fixture lists reorder with FLIP animations when filters or sorting change
- Live matches strip and results ticker on the home page
- Admin overview with user activation control

## Design

Clay 3D primary theme (pastel clay cards, chunky radii, soft inset highlights) blended with Broadcast sport (diagonal stripes, black score bug with yellow digits, results ticker). Collage of overlapping tilted layers on the hero, sticky stacking cards on league pages — a MIXUP of two layout families. Archivo Black + Archivo. Primary interaction: command palette; secondary: FLIP reorder. Split-panel route transitions in a mechanical stepped motion personality. See the Design section in the project notes for the full Design DNA.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, Socket.io, JWT (bcryptjs), mongodb-memory-server for local development
- **Frontend:** React 18, Vite, React Router, Socket.io client, plain CSS design system

## Run locally

```bash
# Backend (port 5000)
cd server
npm install
npm run dev

# Frontend (port 5173)
cd client
npm install
npm run dev
```

Open http://localhost:5173. The API seeds two demo leagues on first start (Sunday Football League and Friday Futsal League, including one live match) when no leagues exist.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Organizer | demo@playpulse.example | PlayPulse123! |
| Captain | captain@playpulse.example | PlayPulse123! |
| Fan | fan@playpulse.example | PlayPulse123! |
| Admin | admin@playpulse.example | PlayPulse123! |

## API overview

| Method | Endpoint | What it does |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` · `/api/auth/login` | Create account / sign in (JWT) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/leagues` | List leagues (search, sport, status, sort) |
| POST | `/api/leagues` | Create a league (organizer/admin) |
| GET · PUT · DELETE | `/api/leagues/:id` | League detail / edit / delete |
| POST | `/api/leagues/:id/generate-fixtures` | Round-robin fixtures (`?regenerate=true` rebuilds) |
| GET | `/api/leagues/:id/standings` | Live standings table |
| GET | `/api/leagues/:id/analytics` | Scorers, goals per matchweek, totals |
| GET · POST | `/api/teams/leagues/:leagueId/teams` | List / add teams |
| PUT · DELETE | `/api/teams/:id` | Edit / remove a team |
| GET | `/api/matches/leagues/:leagueId/matches` | Fixtures (matchweek, status, team filters) |
| GET | `/api/matches/live` | Matches currently live |
| GET | `/api/matches/:id` | Match detail + whether you can score it |
| POST | `/api/matches/:id/start` · `/finish` | Kick off / finish a match |
| POST | `/api/matches/:id/events` | Log a match event (score recomputed) |
| DELETE | `/api/matches/:id/events/:eventId` | Remove an event |
| GET | `/api/admin/overview` · `/api/admin/users` | Admin stats and accounts |

Socket.io rooms: `league:<id>` and `match:<id>` receive `match:update` whenever a match changes; `league:fixtures` fires after fixture generation.

## Environment

`server/.env` ships with safe local-development defaults only. A real MongoDB Atlas URI, if you want one, goes in your own local copy only and must never be committed.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `MONGO_URI` | _(empty)_ | Empty = in-memory MongoDB fallback |
| `JWT_SECRET` | `playpulse-dev-secret` | Dev-only secret; replace in production |
| `CLIENT_URL` | `http://localhost:5173` | Frontend origin for CORS |
| `MONGOMS_ARCH` | `x64` | Forces the x64 mongod binary on Windows on ARM; remove on a non-ARM machine |

The server also forces the x64 binary in code (independent of `.env`) and gives the in-memory instance 60 seconds to start, so a missing or misnamed `.env` cannot silently break the Windows-ARM setup.

## Project structure

```
mern-sports-league/
├── server/            Express + Mongoose API, Socket.io, seed data
│   ├── src/models/    User, League, Team, Match
│   ├── src/routes/    auth, leagues, teams, matches, admin
│   ├── src/utils/     standings engine, round-robin generator, socket notify
│   └── src/seed/      demo leagues, teams, fixtures, live match
└── client/            React + Vite frontend
    ├── src/pages/     Home, Leagues, LeagueDetail, MatchDetail, CreateLeague, Dashboard, Auth, Admin
    ├── src/components/ ScoreBug, StandingsTable, GoalsChart, CommandPalette, Dialog, FlipList, LeagueArt
    └── src/data/      config + copy
```

© 2026 Akhand
