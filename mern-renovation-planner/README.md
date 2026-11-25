# HomeDraft — Home Renovation Planner

Plan, draw and budget a home renovation. Measure rooms, lay them out on a blueprint floor plan, phase tasks with dependencies, run quantity take-offs from real room dimensions, and watch the budget live.

## Standout features

- **Interactive floor-plan editor** — an SVG blueprint canvas (navy paper, cyan grid, dimension lines). Drag rooms to reposition them and drag the yellow corner handle to resize; dimension lines and computed areas update live and persist via the API.
- **Quantity take-off engine** — pick a room + material + coats and the server computes the quantity from the room's real dimensions: paint uses wall area ÷ coverage × coats × (1 + waste%); flooring and tiles use floor/wall area as applicable. Results are saved as take-off lines and summed into the budget.

## Features

- JWT auth with three roles: homeowner, contractor, admin (bcryptjs password hashing).
- Projects: name, property type, address, total budget (₹), start/target dates, status, filters.
- Rooms per project with server-computed floor area, wall area and volume.
- Tasks by phase (Demolition → Finishing) with status, costs, due dates, assigned contractor and `dependsOn` — the server returns 409 if a task is moved to doing/done before its dependency is done.
- Materials catalogue (admin-managed) with unit price, coverage per unit and waste %.
- Budget dashboard: estimated vs actual per category, remaining budget, over-budget warnings, animated SVG cost-breakdown chart drawn from real tasks + take-offs.
- Contractor directory with ratings, assignable to tasks; quotes per task.
- Dashboard with project cards, next due tasks and budget health.
- Socket.io live updates: task changes and new quotes broadcast to the project's room and shown in a live activity feed.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, JWT, bcryptjs, Socket.io, mongodb-memory-server (in-memory fallback).
- **Frontend:** React 18, Vite, react-router-dom, axios, socket.io-client, custom CSS (no Tailwind).
- **Design:** Neo-brutalist (thick ink borders, hard offset shadows, flat bold colours) with a blueprint-technical floor-plan canvas, Unbounded + Work Sans, magnetic buttons and cursor, SVG displacement wobble on hover, ink-bleed view transitions, fluid liquid motion.

## Run locally

### 1. Backend

```bash
cd server
npm install
npm start
```

The API listens on `http://localhost:5000`. On first start it seeds demo accounts, two sample projects, rooms, tasks, materials, contractors and take-off lines (labelled "Sample" in the UI).

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to the backend.

### 3. Demo accounts (password for all three: `HomeDraft123!`)

| Role | Email |
| --- | --- |
| Homeowner | demo@homedraft.example |
| Contractor | contractor@homedraft.example |
| Admin | admin@homedraft.example |

## API overview

Base URL: `http://localhost:5000/api` (all routes except auth and `/health` need `Authorization: Bearer <token>`).

| Method | Route | What it does |
| --- | --- | --- |
| GET | `/health` | API health check |
| POST | `/auth/register`, `/auth/login` | Create account / sign in (returns JWT) |
| GET | `/auth/me` | Current user |
| GET/POST | `/projects` | List (filter by `status`, `search`) / create project |
| GET/PUT/DELETE | `/projects/:id` | Read / update / delete project |
| GET/POST | `/projects/:id/rooms` | List / add room (server computes areas) |
| PUT/DELETE | `/projects/:id/rooms/:roomId` | Move, resize or delete a room |
| GET/POST | `/projects/:id/tasks` | List (filter by `phase`, `status`) / add task |
| PUT | `/projects/:id/tasks/:taskId` | Update task (409 if dependency not done) |
| GET/POST | `/projects/:id/takeoffs` | List / compute a take-off line |
| GET | `/projects/:id/stats` | Budget stats: estimated/actual/remaining, per-category breakdown |
| GET | `/dashboard` | Overview: project counts, upcoming tasks, totals |
| GET | `/dashboard/admin` | Admin user overview |
| GET/POST/PUT/DELETE | `/materials` | Catalogue (writes are admin-only) |
| GET/POST/PUT/DELETE | `/contractors` | Contractor directory |
| GET | `/quotes/task/:taskId` | Quotes for a task |
| POST/PUT | `/quotes` | Add / update a quote |

Socket.io events: join a project room with `join-project` (project id); the server emits `task-updated`, `quote-added` and `activity` to `project:<id>`.

## Environment

`server/.env` ships with safe local-development defaults only (PORT 5000, empty MONGO_URI so the in-memory fallback runs, a dev-only JWT_SECRET, CLIENT_URL, `MONGOMS_ARCH=x64`). The in-memory fallback also forces the x64 MongoDB binary in server code with a 60-second launch timeout, so it works on Windows on ARM.

**Never put a real MongoDB Atlas connection string or any real secret in `server/.env` and never commit one.** A real Atlas URI, if you want one, goes in your own local copy only — set `MONGO_URI` there and keep it out of git. See `server/.env.example` for the documented template.

## Honesty notes

- Seed projects, rooms, contractors and material prices are sample data, labelled "Sample" wherever they appear. Prices are realistic illustrations, not live supplier quotes.
- No invented metrics, testimonials or awards anywhere in the app.

## Copyright

© 2026 Akhand
