# TaskTrove — Local Services Marketplace

TaskTrove is a local services marketplace (in the style of Urban Company): customers
compare local providers, book a fixed time slot, and track the job from request to
completion. Providers manage requests, offerings and earnings; admins oversee the
whole marketplace.

## Features

- **Roles & JWT auth** — customer, provider and admin accounts with demo logins.
- **Service catalogue** — 14 services across 6 categories (Home Cleaning, Plumbing,
  Electrical, Appliance Repair, Beauty & Salon, Tutoring) with guide prices.
- **Provider offerings** — 18 seeded offerings; each provider sets their own price,
  duration and service areas. Providers can create, edit, pause and delete offerings.
- **Match-score ranking engine (standout feature)** — every offering carries a
  transparent 0–100 score, computed live from provider rating, completed jobs,
  response rate, price vs the category median, and whether the provider serves the
  customer's area. Browse sorts by match score by default and each card explains
  its own breakdown.
- **Conflict-proof slot booking** — hourly slots 08:00–20:00 for the next 7 days.
  The server rejects a double-booking of the same provider and slot with 409, backed
  by a partial unique index as well as an application-level check.
- **Server-computed pricing** — base price + 15% peak surcharge (slots 17:00–20:00
  or weekends) + 5% platform fee + 18% GST. The client never sends a price; the
  server computes and returns the breakdown, which the booking dialog previews
  live as the date and slot change.
- **Booking lifecycle state machine** — requested → accepted → in_progress →
  completed, plus declined / cancelled_by_customer / cancelled_by_provider.
  Only the assigned provider can accept, decline, start or complete; only the
  customer can cancel while requested or accepted. Illegal moves return 400/403.
  Socket.io pushes live updates to both parties.
- **Reviews** — a customer can review only their own completed booking, once per
  booking. Reviews recompute the provider's public rating server-side.
- **Provider dashboard** — incoming requests, today's schedule, offerings CRUD,
  earnings summary and a response-rate stat, all computed from live data.
- **Admin overview** — users, bookings by status, revenue from completed bookings,
  top providers, and the ability to deactivate users or offerings.
- **Analytics endpoints** — provider and admin analytics computed from live data
  only; no invented numbers anywhere in the app.

## Match-score formula (0–100)

| Input | Points | How it is scored |
| --- | --- | --- |
| Provider rating | up to 30 | (average review rating / 5) × 30. New providers start at a neutral 4.0 until reviewed. |
| Completed jobs | up to 20 | min(completed / 50, 1) × 20 |
| Response rate | up to 20 | Share of requests answered × 20. New providers start at 100% until a request arrives. |
| Price vs median | up to 20 | min(1, median price for the same service / this price) × 20 |
| Serves your area | up to 10 | 10 when the provider serves the selected area, 5 when no area is selected |

## Price breakdown

For a booking on a given date and slot, the server computes:

- **Base** — the offering's own price.
- **Peak surcharge** — 15% of base, applied when the slot starts at 17:00 or later,
  or the date falls on a weekend.
- **Platform fee** — 5% of (base + peak surcharge).
- **GST** — 18% of (base + peak surcharge + platform fee).
- **Total** — the sum, rounded to the nearest rupee.

No payment is taken: bookings are requests, and all money figures in the demo are
illustrative of the pricing rules, not real charges.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, JWT (bcryptjs), Socket.io,
  mongodb-memory-server (in-memory fallback for local development).
- **Frontend:** React 18 + Vite, react-router-dom, socket.io-client, plain CSS.
- **Design:** Editorial x Creative Split — warm ivory, deep charcoal, one vivid
  orange accent; Space Grotesk display, Instrument Serif italic emphasis, Inter body.

## Demo accounts

All demo accounts use the password `TaskTrove123!`:

| Role | Email |
| --- | --- |
| Customer | `demo@tasktrove.example` |
| Provider | `demo-provider@tasktrove.example` (Ramesh Kumar — cleaning & plumbing) |
| Admin | `admin@tasktrove.example` |

Seeded demo customers Priya Singh (`priya@tasktrove.example`) and Arjun Patel
(`arjun@tasktrove.example`) share the same password. Seed data is demo/illustrative:
completed-job counts, ratings and response rates all derive from the seeded
bookings and reviews, and the app never invents metrics.

## API overview

| Method & path | Description |
| --- | --- |
| `GET /api/health` | Service health check |
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | Auth (JWT) |
| `GET /api/services` · `GET /api/services/:id` | Service catalogue, filter by `category` |
| `GET /api/offerings?category=&area=&q=&sort=` | Offerings with match scores; default sort is best match |
| `GET /api/offerings/:id` · `POST /api/offerings` · `PUT /api/offerings/:id` · `DELETE /api/offerings/:id` | Offering detail and provider CRUD |
| `GET /api/offerings/mine` | Signed-in provider's offerings |
| `GET /api/bookings/slots?offeringId=&date=` | Booked slots for a provider on a date |
| `POST /api/bookings` | Create a booking (price computed server-side; 409 on slot clash) |
| `GET /api/bookings/mine` · `GET /api/bookings/:id` | Own bookings, filter by `status` |
| `PATCH /api/bookings/:id/status` | Lifecycle transition (validated server-side) |
| `POST /api/reviews` | Review a completed booking (once per booking) |
| `GET /api/reviews/provider/:providerId` · `GET /api/reviews/offering/:offeringId` | Reviews |
| `GET /api/providers` · `GET /api/providers/:id` | Provider directory and profile with live stats |
| `GET /api/analytics/provider` | Provider earnings, bookings by status, response rate |
| `GET /api/analytics/overview` | Admin overview (admin only) |
| `GET /api/admin/users` · `GET /api/admin/bookings` | Admin lists (admin only) |
| `PATCH /api/admin/users/:id/active` · `PATCH /api/admin/offerings/:id/active` | Deactivate / reactivate (admin only) |

Socket.io: clients join `user:<id>` rooms and receive `booking:updated` events
whenever a booking they are party to changes status.

## Run locally

```bash
# 1. Start the API (port 5000)
cd server
npm install
npm start

# 2. In a second terminal, start the frontend (port 5173)
cd client
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with a demo account above.

### Environment

`server/.env` ships with safe local-development defaults only (port, an empty
`MONGO_URI` for the in-memory fallback, a dev-only JWT secret, `CLIENT_URL`, and
`MONGOMS_ARCH=x64`). A real MongoDB Atlas connection string, if you want one,
goes in your own local copy only and must never be committed. On Windows on ARM
the server also forces the x64 `mongod` binary in code with a 60-second launch
timeout, so the in-memory fallback works even if the `.env` file is not loaded.

To re-seed the demo data from scratch:

```bash
cd server
npm run seed
```

### Build the frontend for production

```bash
cd client
npm run build
```

## Project structure

```
server/
  src/
    server.js            Express + Socket.io setup, in-memory MongoDB fallback
    models/              User, Service, Offering, Booking, Review
    middleware/auth.js   JWT auth + role guard
    routes/              auth, services, offerings, bookings, reviews,
                         providers, analytics, admin
    utils/               pricing (server-side breakdown), providerStats
                         (live aggregates + match score), notify (Socket.io)
    seed/seed.js         Deterministic demo data
  .env / .env.example    Dev defaults only — no real secrets
client/
  src/
    App.jsx              Routes, nav, footer
    api.js               Fetch wrapper + API methods
    socket.js            Shared Socket.io connection
    data/content.js      Static copy: areas, categories, match formula
    components/          Cursor, Dialog (portal + focus trap),
                         MatchScoreBar, Reveal (scroll reveal)
    pages/               Home, Browse, OfferingDetail, MyBookings,
                         ProviderDashboard, OfferingForm, ProviderProfile,
                         Auth, Admin
    styles.css           Design tokens + all styles
```
