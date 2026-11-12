# Voyara — Travel Itinerary Planner

A MERN travel itinerary planner. Travellers plan trips end to end: a day-by-day itinerary with timed activities that cannot clash, a live budget with burn-down and over-budget warnings, a packing checklist with an essentials template, trip analytics, and live collaboration with co-travellers.

## Features

- **JWT auth** — traveller accounts. One-click demo account (`demo@voyara.example` / `Voyara123!`).
- **Trips CRUD** — destination, dates, cover style, status (planning / upcoming / ongoing / completed), traveller count and budget. Search by destination or title, filter by status or date, sort by departure date.
- **Day-by-day itinerary** — each trip auto-generates one day shell per date in its range. Activities carry a start/end time, category (sightseeing / food / transport / stay / other), planned cost and notes.
- **Server-side time-conflict detection (standout feature)** — overlapping activities on the same day are rejected with a clear 409 error naming the clash (for example `Overlaps with "City Palace" (09:00–11:00)`). Touching endpoints are allowed. The rule is enforced on create and on edit, so the plan can never double-book an hour.
- **Drag-to-reorder activities** — HTML5 drag-and-drop within a day, persisted server-side with an explicit reorder endpoint.
- **Live budget** — per-trip budget with a burn-down bar and over-budget warnings; expenses linked to days (and optionally to activities) with a spend-by-category breakdown.
- **Packing checklist** — categories, an animated progress ring, and "Add from template" with a 12-item essentials list (duplicates skipped).
- **Trip analytics** — total spend by category, planned vs spent cost, cost per day, itinerary density (activities per day), packing completion and days to departure, plus a per-day cost chart.
- **Collaborators** — invite a registered traveller by email as viewer or editor. Viewers can see but not change a trip; editors can edit activities, expenses and packing; only the owner can invite or delete. Roles are enforced server-side on every route.
- **Live updates** — Socket.io broadcasts activity, expense, packing and collaborator changes to everyone watching the trip, and the open trip view refreshes with a "updated live" notice.

## Why this is not a beginner project

The core is a real domain rule, not plain CRUD: interval-overlap detection enforced server-side on every write, plus ordered drag-and-drop persistence, role-based collaboration with server-side enforcement on every route, and analytics computed from live data (spend by category, cost per day, itinerary density, packing completion). The frontend is a multi-view app (auth, dashboard, trip detail) with a horizontal timeline rail, a live budget burn-down and an animated packing ring.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, Socket.io, JWT (bcryptjs), mongodb-memory-server for zero-config local runs.
- **Frontend:** React + Vite, plain CSS with design tokens, no heavy 3D libraries.

## Design

Editorial x Creative Split: warm ivory, deep charcoal, one electric-blue accent used only for meaning. Oversized Space Grotesk headlines with one italic Instrument Serif phrase per headline, numbered section labels, ruled trip rows (no card grid), a horizontal timeline rail with day scrubber, a dark trip-hero split with a live budget burn-down, and an asymmetric budget/packing split. Cursor effect is a small glowing ring only, with a fading trail and click ripples. Reduced-motion is honoured throughout.

## Run locally

```bash
# Terminal 1 — API (port 5000)
cd server
npm install
npm run dev

# Terminal 2 — frontend (port 5173)
cd client
npm install
npm run dev
```

Open http://localhost:5173. The API starts with an in-memory MongoDB by default — no database setup needed.

### Demo account (password `Voyara123!`)

| Email | Notes |
| --- | --- |
| `demo@voyara.example` | Three sample trips: Rajasthan Heritage Trail, Himachal Slow Mountains, Goa Beach Weekend |
| `friend@voyara.example` | Co-traveller — already an editor on the Rajasthan sample trip, so you can invite this account to test collaboration |

All seeded trips, places and prices are sample data created by the demo account — clearly labelled "Sample" in the app. No real hotels, operators or live bookings are listed, and no price is the price of a real business.

## Environment

`server/.env` ships with safe local-development defaults only (port, empty `MONGO_URI` for the in-memory fallback, a dev-only JWT secret, `MONGOMS_ARCH=x64`). **Never commit a real secret.** To use a real MongoDB Atlas database, put its connection string in your **own local copy** of `server/.env` only — never in a committed file. `MONGOMS_ARCH=x64` is only needed on Windows on ARM machines; it can be removed on other machines. The in-memory fallback also forces the x64 binary in server code with a 60-second launch timeout, so it works on Windows on ARM even if the `.env` line is missing.

## API overview

| Method | Endpoint | Who | What it does |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register a traveller account |
| POST | `/api/auth/login` | — | Sign in, returns JWT |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/trips` | any | Own + shared trips (`?search&status&from&to&sort`) |
| POST | `/api/trips` | any | Create a trip |
| GET | `/api/trips/:id` | owner / collaborator | Trip detail: day shells, activities, expenses, packing, spend summary |
| PATCH | `/api/trips/:id` | owner / editor | Edit a trip |
| DELETE | `/api/trips/:id` | owner | Delete a trip and its activities, expenses and packing items |
| POST | `/api/trips/:id/invite` | owner | Invite a registered traveller as viewer or editor |
| GET | `/api/trips/:id/analytics` | owner / collaborator | Spend by category, cost per day, density, packing, countdown |
| GET | `/api/trips/:tripId/activities` | owner / collaborator | Activities for a trip |
| POST | `/api/trips/:tripId/activities` | owner / editor | Add an activity (409 on time clash) |
| PATCH | `/api/trips/:tripId/activities/:id` | owner / editor | Edit an activity (409 on time clash) |
| POST | `/api/trips/:tripId/activities/reorder` | owner / editor | Persist a drag-and-drop order for one day |
| DELETE | `/api/trips/:tripId/activities/:id` | owner / editor | Delete an activity |
| GET | `/api/trips/:tripId/expenses` | owner / collaborator | Expenses for a trip |
| POST | `/api/trips/:tripId/expenses` | owner / editor | Log an expense |
| PATCH | `/api/trips/:tripId/expenses/:id` | owner / editor | Edit an expense |
| DELETE | `/api/trips/:tripId/expenses/:id` | owner / editor | Delete an expense |
| GET | `/api/trips/:tripId/packing` | owner / collaborator | Packing list |
| POST | `/api/trips/:tripId/packing` | owner / editor | Add a packing item |
| POST | `/api/trips/:tripId/packing/template` | owner / editor | Add the essentials template (skips duplicates) |
| PATCH | `/api/trips/:tripId/packing/:id` | owner / editor | Edit / check off a packing item |
| DELETE | `/api/trips/:tripId/packing/:id` | owner / editor | Delete a packing item |

## Status

Completed demo project. No real bookings, payments or live travel data — all seeded content is labelled sample data.

© 2026 Akhand
