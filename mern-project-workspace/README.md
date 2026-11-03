# FlowBoard — Collaborative Project Workspace

A MERN project-management workspace: create projects, invite members by email,
and move work across a Kanban board. Unlike a plain task list, the board
enforces how much work can be in flight, tracks checklists and comments per
card, keeps an activity feed, and shows live board health (completion,
overdue cards, per-column counts and per-member workload).

## Standout feature — why this is not a beginner project

**Drag-and-drop Kanban with server-enforced WIP limits.** "In Progress" is
capped at 4 cards and "Review" at 3. The limit is checked on the server on
every create and move, so dragging a 5th card into a full column is rejected
with a clear error (and a shake animation in the UI) — it cannot be bypassed
from the client. Around that core sit deeper domain logic than plain CRUD:
per-card checklists with live progress bars, comments, due-date urgency
(overdue badges), priority/label/search/"my tasks" filtering, a member system
(owner-only member adds and deletes), an activity log for every create, move
and comment, and an analytics endpoint that aggregates completion, overdue
counts and workload per member.

This goes beyond Day 4 (LearnLoop, a course catalogue with enrolments): the
interaction model is a live, constraint-aware board rather than browse-and-
enrol, and the standout rule (WIP enforcement) changes what users are
allowed to do, not just what they can view.

## Day 5 theme and interactive upgrades

- **Theme — "Forge Dark":** warm charcoal-brown background, amber flame
  accent, cream type, serif display headings (Georgia) with a monospace label
  face. A sidebar + horizontal Kanban layout, not the card-grid layout of
  Days 1–4.
- **Interactive upgrades over Day 4:** HTML5 drag-and-drop with a glowing
  drop-column highlight; 3D tilt on card hover (CSS perspective +
  rotateX/rotateY driven by the cursor); staggered card entrance animations;
  animated WIP-limit bars that turn ember-red when full; an animated SVG
  completion donut and animated status bars in the Board health panel;
  animated filter chips, a slide-up task-detail modal, and a toast for
  WIP-limit rejections. Animations respect `prefers-reduced-motion` and never
  hide content.
- The upgrades are visible on first load: tilt any card, drag one between
  columns, and watch the donut and WIP bars move.

## Features

- JWT auth (register / login, 7-day token); demo account below
- Projects with owner + members; add members by email (owner only)
- Kanban board: To Do / In Progress (WIP 4) / Review (WIP 3) / Done
- Drag-and-drop moves, plus a "Move to" control in the task detail view
- Tasks: title, description, priority (low/medium/high/urgent), labels,
  due date, assignee, checklist with progress %, comments
- Search, priority filter, "My tasks" filter
- Board health analytics: completion %, overdue count, per-column and
  per-member breakdowns
- Activity feed: project creation, task creation, moves, comments

## Tech stack

- Backend: Node.js, Express, Mongoose, JWT, bcryptjs
- Frontend: React + Vite (no router — view state keeps the board fast)
- Database: MongoDB (Atlas, or an in-memory MongoDB for local dev)

## API overview

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/health` | Service check |
| POST | `/api/auth/register`, `/api/auth/login` | Returns `{ token, user }` |
| GET | `/api/auth/me` | Auth required |
| GET / POST | `/api/projects` | Member's projects; create |
| GET | `/api/projects/:id` | Members populated |
| POST | `/api/projects/:id/members` | Owner only, by email |
| GET | `/api/projects/:id/activity` | Latest 30 events |
| GET | `/api/projects/:id/analytics` | Completion, overdue, workload |
| DELETE | `/api/projects/:id` | Owner only |
| GET | `/api/tasks/project/:projectId` | `?status=&priority=&search=&mine=true&assignee=` |
| POST | `/api/tasks/project/:projectId` | WIP-checked |
| PATCH | `/api/tasks/:id/move` | `{ status }` — WIP-checked |
| PATCH | `/api/tasks/:id` | Edit title/description/priority/labels/due/assignee |
| POST / PATCH | `/api/tasks/:id/checklist`, `/api/tasks/:id/checklist/:itemId` | Add / toggle items |
| POST | `/api/tasks/:id/comments` | Add a comment |
| DELETE | `/api/tasks/:id` | Member only |

## Run it locally

The project ships with a ready `server/.env` containing **local-development
defaults only** (PORT, an empty `MONGO_URI` for the in-memory fallback, a
dev-only JWT secret, `CLIENT_URL`, and `MONGOMS_ARCH=x64`). You do not need
to create a `.env` file by hand.

> **Never commit a real secret.** A real MongoDB Atlas connection string, if
> you want one, goes in your own local copy only and must never be committed
> to this public repository. The shipped `.env` contains no real credentials.

```bash
# Terminal 1 — backend (port 5000)
cd mern-project-workspace/server
npm install
npm run dev

# Terminal 2 — frontend (port 5173)
cd mern-project-workspace/client
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the seeded demo account:

- Email: `demo-manager@flowboard.example`
- Password: `FlowBoard123!`

The demo account seeds one project, "Website Redesign Launch", with 11 tasks
across all four columns, plus two teammates (Priya Sharma, Arjun Mehta) who
can be signed in with the same password pattern via their own registrations —
or add any registered user to a project by email from the sidebar.

Notes for local runs:

- With `MONGO_URI` empty, the server uses an in-memory MongoDB, so seeded
  data resets on restart. Set `MONGO_URI` to a free Atlas M0 cluster in your
  local copy for persistent data.
- On Windows on ARM, keep `MONGOMS_ARCH=x64` in `server/.env` so the
  in-memory MongoDB download works. On a non-ARM machine this line can be
  removed.
- All daily projects default to backend port 5000 and frontend port 5173, so
  run only one backend at a time locally, or set `PORT` (and the client's
  `VITE_API_URL` / proxy) to move this one.
- There is no payment flow in this project, so no payment claims apply.

## Project structure

```
mern-project-workspace/
├── client/   # Vite + React: sidebar, Kanban board, analytics rail, task modal
└── server/   # Express + Mongoose: auth, projects, tasks (WIP-checked), seed
    ├── .env          # dev defaults only — safe to commit, no real secrets
    └── .env.example  # documented template
```
