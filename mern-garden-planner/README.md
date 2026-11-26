# SproutPlot — Community Garden Planner

Plan a shared garden as orbit rings of raised beds around a central compost hub. Throw a seed packet onto a bed and the companion-planting engine tells you straight away whether the neighbours will thrive together — or fight.

## What it does

- **Orbit garden map** — beds sit on concentric rings around a central hub. Click a bed to see its plantings, harmony and slot use.
- **Companion-planting harmony engine** — every sowing is validated against the bed's current neighbours using a companion / antagonist matrix. Antagonists are refused with the conflict named (409); companions lift the bed's 0–100 harmony score, recomputed live.
- **Drag-and-throw seed deck** — drag a Bauhaus seed packet with inertia and drop it on a bed to sow. Keyboard and touch users get the same flow through the Sow button and a bed picker.
- **Growth, watering and harvest, computed** — each planting's growth stage (sown → sprouted → growing → ready), next watering date and days-to-harvest are derived from its sowing date and the plant library. Watering a planting stamps the date and re-schedules its task.
- **Garden analytics** — bed utilisation and harmony, a harvest forecast chart for the next 30 days, and a live list of plantings that need water, all computed from real data.
- **Tasks** — watering, weeding, harvest, feeding and pruning tasks with due dates, assignees and overdue highlighting. Sowing a plant creates its first watering task automatically.
- **Plant library** — 16 plants with family, days to maturity, water need, sun, spacing, season and companion / antagonist lists. Coordinators can add plants.
- **Roles and live updates** — gardener / coordinator / admin roles with JWT auth, and Socket.io updates so a garden's beds refresh for everyone when someone sows, waters or harvests.

## Standout feature

The companion-planting engine is the part that makes this more than a list app: sowing is a validated domain operation, not a plain insert. The server scores the candidate against every active neighbour, refuses antagonists with a named conflict, and recomputes a bed-level harmony score that the orbit map, the bed panel and the analytics all read from. Watering and harvest dates are likewise derived, never typed in.

## Design

Bauhaus primaries printed like a Risograph: flat red / blue / yellow on paper, hard offset shadows, misregistered overprint and grain. Bebas Neue + Karla. Radial orbit layout for the garden map, a resizable sidebar workspace for dashboards, drag-and-throw seed cards, shared-element morphs from seed card to planting detail, and a circular reveal from the click point on route changes. Motion is a snappy spring throughout.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, JWT auth, Socket.io, `mongodb-memory-server` (in-memory fallback when no `MONGO_URI` is set)
- **Frontend:** React 18 + Vite, React Router, Socket.io client, CSS design system (no component library)

## Run it locally

```bash
# Terminal 1 — API on http://localhost:5000
cd server
npm install
npm run dev

# Terminal 2 — app on http://localhost:5173
cd client
npm install
npm run dev
```

A `server/.env` with safe local-development defaults is included, so the API starts with no setup. It contains no real secrets. If you want a real MongoDB Atlas database, put its URI in your own local copy of `server/.env` only — never commit it. The `MONGOMS_ARCH=x64` line in `.env` helps the in-memory database on Windows on ARM machines and can be removed on other machines; the server code also forces the x64 binary and a 60-second launch timeout independently of `.env`.

## Demo accounts

Seeded automatically on first run (password for all three is `Sprout123!`):

| Role | Email |
| --- | --- |
| Gardener | `demo@sproutplot.example` |
| Coordinator | `coord@sproutplot.example` |
| Admin | `admin@sproutplot.example` |

The demo garden is **Sunrise Community Garden** (Azamgarh, Uttar Pradesh) with six beds across two orbit rings and ten plantings at different growth stages.

## API overview

| Method & path | What it does |
| --- | --- |
| `GET /api/health` | Service health check |
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | JWT auth |
| `GET /api/plants`, `GET /api/plants/:id`, `GET /api/plants/:id/companions` | Plant library + companion lookup |
| `POST /api/plants` | Add a plant (coordinator / admin) |
| `GET /api/gardens`, `POST /api/gardens`, `GET /api/gardens/:id` | Gardens |
| `GET /api/beds/gardens/:gardenId/beds`, `POST /api/beds/gardens/:gardenId/beds` | Beds with live harmony |
| `GET /api/plantings/beds/:bedId/plantings`, `GET /api/plantings/mine` | Plantings |
| `POST /api/plantings/beds/:bedId/plantings` | Sow — runs the harmony engine |
| `POST /api/plantings/:id/water`, `POST /api/plantings/:id/harvest`, `POST /api/plantings/:id/lost` | Planting lifecycle |
| `GET /api/tasks/gardens/:gardenId/tasks`, `POST /api/tasks/gardens/:gardenId/tasks` | Garden tasks |
| `GET /api/dashboard/me`, `GET /api/dashboard/gardens/:gardenId` | Personal dashboard + garden analytics |
| `GET /api/admin/overview`, `GET /api/admin/users` | Admin overview (admin only) |

## Project structure

```
mern-garden-planner/
├── server/
│   ├── src/
│   │   ├── models/      # User, Plant, Garden, Bed, Planting, Task
│   │   ├── routes/      # auth, plants, gardens, beds, plantings, tasks, dashboard, admin
│   │   ├── utils/       # garden engine (harmony, growth, watering), socket notify
│   │   ├── seed/seed.js # 16 plants, demo users, demo garden, beds, plantings, tasks
│   │   ├── middleware/auth.js
│   │   └── server.js
│   ├── .env             # dev defaults only — no real secrets
│   └── .env.example
└── client/
    ├── src/
    │   ├── pages/       # Landing, Auth, Dashboard, GardenDetail, Plants, PlantingDetail, Tasks, Admin
    │   ├── components/  # OrbitMap, SeedDeck, HarmonyMeter, HarvestChart, Modal, SeedShape
    │   ├── data/config.js
    │   ├── api.js, socket.js, App.jsx, main.jsx, styles.css
    └── index.html
```

© 2026 Akhand
