# PulseFit — MERN Fitness Tracker

Train with a plan, see the progress. PulseFit is a full-stack fitness tracker: build workout templates, log live sessions with a rest timer, and watch personal records, weekly volume and streaks grow from the sets you actually log.

## Features

- **JWT auth with roles** — member, trainer, admin. Register as a member or trainer; the admin account is seeded.
- **Exercise library** — 28 seeded exercises across chest, back, legs, shoulders, arms, core, cardio and full body, with muscle group, equipment, difficulty and step-by-step instructions. Search, filter, and add your own custom exercises.
- **Workout templates** — build reusable workouts with target sets, reps and weight per exercise. Drag rows to reorder (arrow buttons work too); the order is saved on the server. Duplicate public templates.
- **Live sessions** — start from a template or freestyle. Log each set as you finish it, add sets or exercises mid-session, and watch total volume update live against a progress ring. A rest timer with 60/90/120/180-second presets counts down between sets.
- **Personal records** — finishing a session detects new records automatically (heaviest set per exercise, with the Epley estimated one-rep max). New records are celebrated on the finish screen.
- **Progressive-overload suggestions** — for every exercise with a record, the app suggests your next-session weight: best weight + ~2.5%, rounded to the nearest 2.5 kg plate.
- **Analytics** — weekly volume chart for the last 8 weeks, muscle-group split by completed sets, lifetime totals and a consecutive-week streak. Every number is computed from your own completed sessions.
- **Challenges** — trainers and admins create challenges (completed sessions, total kilograms, or distinct training days). Joining one makes your finished sessions count toward it automatically, with a live leaderboard.
- **Training plans** — trainers build multi-week plans from templates and assign them to members.
- **Live feed** — completed sessions broadcast over Socket.io to the home page and dashboards.
- **Admin overview** — user/session/exercise counts, users by role, newest members.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, JWT (bcryptjs), Socket.io, mongodb-memory-server (in-memory fallback)
- **Frontend:** React 18 + Vite, plain CSS with design tokens, Socket.io client
- **Design:** Editorial x Creative Split — warm ivory, deep charcoal, one acid-lime accent; Space Grotesk display type with one italic serif phrase per headline

## How to run locally

You need Node.js 18 or newer.

```bash
# 1. Start the API (port 5000)
cd mern-fitness-tracker/server
npm install
npm run dev

# 2. In a second terminal, start the frontend (port 5173)
cd mern-fitness-tracker/client
npm install
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:5000 (`GET /api/health`).

### Database

The server uses an in-memory MongoDB when `MONGO_URI` is empty, so it runs with no setup. A ready `server/.env` ships with the project containing only safe local-development defaults (`PORT`, an empty `MONGO_URI`, a dev-only `JWT_SECRET`, `CLIENT_URL`, `MONGOMS_ARCH=x64`).

**To use a real database:** set `MONGO_URI` to your own MongoDB Atlas connection string in your own local copy of `server/.env` only — never commit a real connection string or password to the repository.

On Windows on ARM, the in-memory fallback forces the x64 mongod binary in server code and allows a 60-second launch window, so the download works under emulation.

## Demo accounts

All demo accounts use the password `PulseFit123!`:

| Role | Email |
| --- | --- |
| Member | demo@pulsefit.example |
| Trainer | demo-trainer@pulsefit.example |
| Admin | admin@pulsefit.example |

The demo member comes with 9 completed sessions across the last three weeks, personal records, two open challenges and one assigned training plan, so the dashboard, analytics and records pages show real seeded data.

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Service health |
| POST | `/api/auth/register` | Register (member or trainer) |
| POST | `/api/auth/login` | Sign in, returns JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/exercises` | Library, filters: `muscleGroup`, `equipment`, `difficulty`, `q` |
| POST | `/api/exercises` | Add a custom exercise |
| DELETE | `/api/exercises/:id` | Delete a custom exercise |
| GET | `/api/templates` | My templates + public ones |
| POST | `/api/templates` | Create a template |
| PUT | `/api/templates/:id` | Edit a template |
| PUT | `/api/templates/:id/order` | Reorder items (drag-and-drop) |
| POST | `/api/templates/:id/duplicate` | Copy a template |
| POST | `/api/sessions` | Start a session (from template or freestyle) |
| GET | `/api/sessions/mine` | My sessions, `status` filter |
| POST | `/api/sessions/:id/sets` | Log or update a set |
| DELETE | `/api/sessions/:id/sets` | Remove a set |
| POST | `/api/sessions/:id/exercises` | Add an exercise mid-session |
| POST | `/api/sessions/:id/finish` | Finish — computes volume, PRs, challenge progress |
| GET | `/api/records/mine` | My personal records |
| GET | `/api/records/suggestions` | Progressive-overload suggestions |
| GET | `/api/analytics/overview` | Totals, 8-week volume, muscle split, streak |
| GET | `/api/challenges` | Open challenges with my progress |
| POST | `/api/challenges` | Create a challenge (trainer/admin) |
| POST | `/api/challenges/:id/join` | Join a challenge |
| GET | `/api/challenges/:id/leaderboard` | Challenge leaderboard |
| GET | `/api/plans/mine` | Plans assigned to me / created by me |
| POST | `/api/plans` | Create a plan (trainer/admin) |
| POST | `/api/plans/:id/assign` | Assign a plan to a member |
| GET | `/api/admin/overview` | Admin stats (admin only) |

## Project structure

```
mern-fitness-tracker/
├── client/            # React + Vite frontend
│   └── src/
│       ├── components/  # Cursor, Dialog, VolumeRing, RestTimer, charts
│       ├── data/        # config + copy (components only render data)
│       └── pages/       # Home, Auth, Dashboard, Exercises, Templates,
│                        #   Session, History, Records, Analytics,
│                        #   Challenges, Plans, Admin
├── server/
│   └── src/
│       ├── models/      # User, Exercise, Template, Session,
│       │                #   PersonalRecord, Challenge, Plan
│       ├── routes/      # auth, exercises, templates, sessions,
│       │                #   records, analytics, challenges, plans, admin
│       ├── seed/        # demo users, exercises, templates, sessions
│       └── utils/       # fitness math (Epley 1RM, volume, streak),
│                        #   socket notify, async handler
└── README.md
```

## Notes

- All seeded data is labelled sample data (`isSample`). Session volumes and personal records are computed from the seeded sets, never hand-typed.
- Weights are in kilograms. Bodyweight sets use a weight of 0.
- No real payments exist in this app.

© 2026 Akhand
