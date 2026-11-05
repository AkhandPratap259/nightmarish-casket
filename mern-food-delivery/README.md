# FoodFleet — MERN Food Delivery Platform

Order food from local kitchens, track the order live from the tawa to your
door, and manage a restaurant as an owner — all in one MERN app.

## What it does

- **Browse restaurants** — search by name, filter by cuisine, veg-only toggle,
  sort by rating or fastest delivery.
- **Menus with real detail** — veg/non-veg markers, spice levels, bestseller
  badges, categories, and per-dish availability.
- **Cart + checkout** — a slide-in cart drawer, delivery address, promo codes
  and a choice of payment method. **Payments are mock only — no real money
  moves.**
- **Server-side pricing** — the client never sets a price. Checkout re-prices
  every line from the database, then applies the promo, delivery fee and GST:
  - `WELCOME20` — 20% off, capped at ₹150
  - `FLAT50` — ₹50 off on orders over ₹299
  - `FREEDEL` — free delivery
  - Free delivery on orders over ₹499, otherwise ₹39; GST is 5%.
- **Live order tracking** — a strict status state machine
  (`placed → confirmed → preparing → out for delivery → delivered`) with a
  validated next-step-only advance, an animated courier route, a timeline and
  Socket.io push updates. Customers can also hit **Simulate live delivery**
  to watch the order advance every 12 seconds, and cancel while it is still
  placed or confirmed.
- **Owner dashboard** — revenue and order stats, one-click order advance, and
  adding dishes to your restaurant. Restaurant owners see only their own
  orders; customers see only theirs.

## Standout feature — why this is not a beginner project

The order pipeline is a real state machine with server-enforced rules, not a
CRUD list: prices are recomputed server-side, promo rules live only on the
server, status transitions accept only the next legal step, and every change
is pushed live to the tracking page over Socket.io. On top of that, the
delivery-fee / promo / GST bill logic and the owner analytics turn a simple
menu app into a working delivery business flow.

## Theme and interactive upgrades (Day 7)

Theme: **Warm street-food market** — cream paper, chilli red, saffron and
charcoal ink, with Georgia serif headlines and rounded, market-stall cards.
This is deliberately different from Day 6 Orbit's editorial minimal split
layout (paper/ink/coral, left nav / centre feed / right trending).

Interactive upgrades beyond Orbit: reveal-on-scroll for restaurant and dish
cards, hover tilt (CSS perspective) on cards, an animated hero, animated
cuisine filter chips, a slide-in cart drawer with quantity steppers, and the
live tracking page — an animated courier travelling a progress route with a
timeline that fills in as Socket.io updates arrive. Animations respect
`prefers-reduced-motion`.

## Tech stack

- Backend: Node.js, Express, Mongoose, Socket.io, JWT + bcryptjs
- Frontend: React (Vite), Socket.io client, CSS (no component library)
- Database: MongoDB — a free Atlas M0 cluster, or the in-memory fallback
  (no setup needed)

## Project structure

```
mern-food-delivery/
  server/   Express + Mongoose + Socket.io API (src/server.js, src/routes/, src/models/, src/seed/)
  client/   React + Vite frontend (src/App.jsx, src/styles.css)
```

## API overview

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/register`, `/api/auth/login` | Roles: `customer`, `restaurant` |
| GET | `/api/auth/me` | Requires JWT |
| GET | `/api/restaurants?q=&cuisine=&veg=&sort=` | Public browse; sort `rating` / `fastest` |
| GET | `/api/restaurants/cuisines` | Cuisine list for filter chips |
| GET | `/api/restaurants/:id` | Restaurant + full menu |
| POST | `/api/restaurants`, `PUT /api/restaurants/:id` | Owner / admin |
| POST | `/api/restaurants/:id/menu`, `PUT /api/restaurants/menu/:itemId` | Owner dish CRUD |
| POST | `/api/orders` | Checkout; server re-prices, applies promo + GST |
| GET | `/api/orders/mine` | Own orders (customer) or own restaurants' orders (owner) |
| GET | `/api/orders/:id` | Order detail |
| POST | `/api/orders/:id/advance` | Owner: next status step only |
| POST | `/api/orders/:id/simulate` | Auto-advance every 12 s (demo) |
| POST | `/api/orders/:id/cancel` | Customer, while placed/confirmed |

Socket.io rooms: clients join `order:<orderId>` for live updates; the server
also emits `order:created` to `restaurant:<restaurantId>`.

## Demo accounts (seeded on first run)

| Role | Email | Password |
| --- | --- | --- |
| Customer | `demo@foodfleet.example` | `FoodFleet123!` |
| Restaurant owner | `demo-owner@foodfleet.example` | `FoodFleet123!` |

Seed data: 6 restaurants (North Indian, South Indian, Chinese, Italian,
Street Food, Desserts) with about 30 dishes.

## Run it locally

```bash
# Terminal 1 — API on http://localhost:5000
cd mern-food-delivery/server
npm install
npm run dev

# Terminal 2 — frontend on http://localhost:5173
cd mern-food-delivery/client
npm install
npm run dev
```

The included `server/.env` already contains safe local-development defaults,
so you do not need to create one by hand. With `MONGO_URI` left empty the
server uses an in-memory MongoDB and seeds the demo data automatically.

### Windows on ARM note

The in-memory fallback forces the x64 MongoDB binary **in server code**
(`src/server.js`) and gives it 60 seconds to start, so it works even if the
`.env` file is missing or misnamed. `MONGOMS_ARCH=x64` in `.env` is a
belt-and-braces extra for the same case.

### Using a real MongoDB Atlas cluster instead (optional)

Put your own connection string in **your own local copy** of
`server/.env` only:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
```

**Never commit a real Atlas URI, password, API key or any other secret to
GitHub.** The committed `.env` contains dev defaults only; a real URI belongs
in your local copy and nowhere else. If you run two projects at once, remember
each backend defaults to port 5000 — run only one at a time.

## Try it

1. Open http://localhost:5173, pick a restaurant, add dishes to the cart.
2. Log in as the demo customer, check out with promo code `WELCOME20`.
3. Open the order, press **Simulate live delivery**, and watch the courier
   travel the route as the status advances.
4. Log in as the demo owner to advance real orders and add dishes.
