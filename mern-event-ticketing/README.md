# Gatherly — Event Discovery & Ticketing

A MERN event discovery and ticketing platform. Attendees browse events by category, city and date, pick their exact seat on a live interactive seat map, hold it for five minutes, and confirm with a clearly-labelled mock checkout to get e-tickets with unique codes. Organizers create events with tiered zone pricing, manage bookings and check tickets in by code; admins see platform analytics.

## Features

- **JWT auth with roles** — attendee, organizer, admin. One-click demo accounts for each role.
- **Interactive SVG seat map** — tiered zones (VIP / Premium / Standard) with different prices, click-to-select seats (max 6 per booking), live availability, hover lift and selected-state bounce. Held seats pulse gently; booked seats are muted.
- **Conflict-proof booking** — seats are held for 5 minutes with a visible countdown ring, then confirmed with a mock checkout. A unique partial index on (event, seat) for active bookings means a held or confirmed seat can never be double-booked, even if two holds race. A background sweeper releases expired holds every 60 seconds.
- **Live updates** — Socket.io pushes seat availability, a live tickets-sold counter and a "just booked" ticker to everyone watching, plus booking notifications to the right user.
- **E-tickets with unique codes** — each confirmed seat gets its own ticket code (e.g. `GT-XXXXXX`); organizers check tickets in by code at the door.
- **Waitlist with promotion** — join a sold-out event's waitlist; when someone cancels, the first person waiting is notified live.
- **Organizer tools** — create events with tiered zone pricing, per-event sales analytics, booking lists, and ticket check-in.
- **Admin analytics** — totals, revenue by event, tickets sold per day, and occupancy per event, all computed from real data.
- **Event discovery** — search by title/venue/city, filter by category, city and date, with live occupancy bars and "Selling fast" flags.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, Socket.io, JWT (bcryptjs), mongodb-memory-server for zero-config local runs.
- **Frontend:** React + Vite, plain CSS with design tokens, no heavy 3D libraries.

## Design

Editorial x Creative Split: warm ivory, deep charcoal, one acid-lime accent used only for meaning. Oversized Space Grotesk headlines with one italic Instrument Serif phrase per headline, numbered section labels, ruled event rows (no card grid), a hard light/dark split hero with a coded seat-map preview, animated occupancy bars, and a live booking ticker. Cursor effect is a small glowing ring only, with a fading trail and click ripples. Reduced-motion is honoured throughout.

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

### Demo accounts (password `Gatherly123!` for all three)

| Role | Email |
| --- | --- |
| Attendee | `demo@gatherly.example` |
| Organizer | `demo-organizer@gatherly.example` |
| Admin | `admin@gatherly.example` |

The seed includes six fictional demo events (music night, tech conference, comedy night, theatre play, cricket final screening, food & folk festival) across Azamgarh, Lucknow, Delhi, Mumbai, Bengaluru and Varanasi, plus a few confirmed demo bookings and a sold-out event with a waitlist entry so the organizer and admin views are not empty. All demo events, venues and artists are fictional and labelled as demo data in the app.

## Environment

`server/.env` ships with safe local-development defaults only (port, empty `MONGO_URI` for the in-memory fallback, a dev-only JWT secret, `MONGOMS_ARCH=x64`). **Never commit a real secret.** To use a real MongoDB Atlas database, put its connection string in your **own local copy** of `server/.env` only — never in a committed file. `MONGOMS_ARCH=x64` is only needed on Windows on ARM machines; it can be removed on other machines.

## API overview

| Method | Endpoint | Role | What it does |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register as attendee or organizer |
| POST | `/api/auth/login` | — | Sign in, returns JWT |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/events` | — | Event list (`?category&city&date&search`) with live occupancy |
| GET | `/api/events/:id` | — | Event detail |
| GET | `/api/events/:id/seats` | — | Live seat states (available / held / booked, own holds marked) |
| POST | `/api/events` | organizer | Create an event with tiered zones |
| PATCH | `/api/events/:id` | organizer (owner) | Edit an event (not after confirmed bookings) |
| GET | `/api/events/:id/bookings` | organizer (owner) / admin | Bookings for one event |
| POST | `/api/bookings/hold` | attendee | Hold up to 6 seats for 5 minutes |
| POST | `/api/bookings/:id/confirm` | attendee | Confirm a hold with the mock checkout (`paymentMethod: 'demo'`) |
| GET | `/api/bookings/mine` | any | Own bookings with ticket codes |
| POST | `/api/bookings/:id/cancel` | owner / admin | Cancel, release seats, promote waitlist |
| POST | `/api/bookings/checkin` | organizer / admin | Check in a ticket by code |
| POST | `/api/waitlist` | attendee | Join a sold-out event's waitlist |
| GET | `/api/waitlist/mine` | attendee | Own waitlist entries |
| GET | `/api/waitlist/for-organizer` | organizer | Who is waiting for own events |
| PATCH | `/api/waitlist/:id/leave` | attendee | Leave the waitlist |
| GET | `/api/organizer/events` | organizer | Own events with occupancy |
| GET | `/api/organizer/analytics` | organizer | Per-event sales analytics |
| GET | `/api/organizer/bookings` | organizer | Bookings across own events |
| GET | `/api/admin/analytics` | admin | Platform analytics |
| GET | `/api/notifications` | any | Own notifications |
| PATCH | `/api/notifications/read-all` | any | Mark all read |

## Status

Completed demo project. Checkout is a mock — no real payment is ever taken. No real events, artists or venues are listed; all seeded data is fictional demo data.

© 2026 Akhand
