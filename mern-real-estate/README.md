# NestHunt — Real Estate Listing Platform

A MERN real estate listing platform. Buyers search homes by city, price, bedrooms and amenities; agents list and manage properties; the platform computes price-per-square-foot analytics from the actual listings, works out EMIs with a live calculator, compares up to three homes side by side with a server-computed summary, and alerts buyers the moment a new listing matches a saved search.

## Features

- **JWT auth with roles** — buyer, agent and admin. Agents list properties; buyers save favourites and send enquiries; admins see a platform overview. Demo accounts: buyer `demo@nesthunt.example`, agent `demo-agent@nesthunt.example`, admin `admin@nesthunt.example` (all password `NestHunt123!`).
- **Property search** — server-side filters (city, type, price range, minimum beds and area, amenities, status), text search across title/locality/city, four sort orders and pagination. Filtering is done on the server, never by trusting client totals.
- **Agent listings CRUD** — agents create, edit and delete only their own listings; admins can manage any listing.
- **Favourites** — buyers and agents save homes to a personal list (unique user + property pair, enforced in the database).
- **Comparison matrix (standout feature)** — compare up to three properties side by side. The summary (cheapest, largest area, best price per sq ft, most bedrooms) is computed on the server, not the client.
- **Price analytics (standout feature)** — MongoDB aggregations over the real stored listings: average price and average price per sq ft by locality, counts by type and city, average price by bedrooms. No invented numbers — the charts only ever show what is actually listed.
- **EMI calculator (standout feature)** — live sliders for loan amount, rate and tenure update the monthly figure instantly in the browser, and a "Check with the server" button confirms the same figure from the API using the standard reducing-balance formula.
- **Saved-search alerts (standout feature)** — save a search (city, type, price range, minimum beds). When an agent lists a property that matches, the server checks every saved search and pushes a live Socket.io alert to each matching buyer, plus a broadcast to all connected clients.
- **Enquiries** — buyers ask the listing agent about a home; the agent is alerted live and replies in the app, and the buyer gets a live "enquiry replied" alert.
- **Admin overview** — total properties, users and enquiries, listings by status and by city.

## Why this is not a beginner project

The core is real domain logic, not plain CRUD: server-side aggregation analytics, a server-computed comparison summary, saved-search matching that runs on every new listing and pushes live alerts over Socket.io, role-based ownership rules enforced on every write, and an EMI engine that exists both as a live client calculator and a validated server endpoint. The frontend is a multi-view app (browse, detail, compare, analytics, saved searches, favourites, agent dashboard, admin) with animated price bars, a sliding compare tray and live toasts.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, Socket.io, JWT (bcryptjs), mongodb-memory-server for zero-config local runs.
- **Frontend:** React + Vite, plain CSS with design tokens, no heavy 3D libraries.

## Design

Editorial x Creative Split, vivid orange accent: warm ivory, deep charcoal, one orange accent used only for meaning. Oversized type-led headlines with one italic Georgia phrase per headline, numbered section labels, ruled listing rows with big index numbers (no card grid), a dark hero panel with the lowest-priced home, an inverted dark/light EMI split, and coded inline SVG illustrations per property type (no stock photos). Interactive upgrades: live EMI sliders, animated SVG price bars that grow on reveal with hover values, a compare tray that slides in as homes are added, an animated filter panel with a live result count, and live Socket.io toasts for saved-search matches and enquiry replies. Cursor effect is a small glowing ring only, with a fading trail and click ripples. Reduced-motion is honoured throughout.

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

### Demo accounts (password `NestHunt123!`)

| Email | Role | Notes |
| --- | --- | --- |
| `demo@nesthunt.example` | Buyer | Save favourites, save searches, send enquiries |
| `demo-agent@nesthunt.example` | Agent | Owns the 8 sample listings; list, edit and delete |
| `admin@nesthunt.example` | Admin | Platform overview |

### Sample data

All 8 seeded listings (Azamgarh, Lucknow, Varanasi, Gorakhpur, Delhi, Mumbai, Bengaluru, Pune) are sample listings for demonstration, clearly labelled "Sample" in the app. No real properties, owners, builders or live prices are listed, and no price is the price of a real property or business.

## Environment

`server/.env` ships with safe local-development defaults only (port, empty `MONGO_URI` for the in-memory fallback, a dev-only JWT secret, `MONGOMS_ARCH=x64`). **Never commit a real secret.** To use a real MongoDB Atlas database, put its connection string in your **own local copy** of `server/.env` only — never in a committed file. `MONGOMS_ARCH=x64` is only needed on Windows on ARM machines; it can be removed on other machines. The in-memory fallback also forces the x64 binary in server code with a 60-second launch timeout, so it works on Windows on ARM even if the `.env` line is missing.

## API overview

| Method | Endpoint | Who | What it does |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register a buyer or agent account |
| POST | `/api/auth/login` | — | Sign in, returns JWT |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/properties` | — | Listings (`?city&type&minPrice&maxPrice&minBeds&minArea&amenities&status&q&sort&page&limit`) |
| GET | `/api/properties/:id` | — | One listing |
| POST | `/api/properties` | agent / admin | Create a listing (alerts matching saved searches) |
| PUT | `/api/properties/:id` | owner agent / admin | Edit a listing |
| DELETE | `/api/properties/:id` | owner agent / admin | Delete a listing |
| POST | `/api/properties/:id/enquiries` | any | Ask the listing agent about a home |
| GET | `/api/favourites` | any | My saved homes |
| POST | `/api/favourites/:propertyId` | any | Save a home |
| DELETE | `/api/favourites/:propertyId` | any | Remove a saved home |
| GET | `/api/compare?ids=a,b,c` | — | Up to 3 homes + server-computed summary |
| POST | `/api/calculator/emi` | — | EMI from principal, annual rate and years |
| GET | `/api/analytics/prices` | — | Price-per-sqft by locality, counts by type/city, avg by beds |
| GET | `/api/saved-searches` | any | My saved searches |
| POST | `/api/saved-searches` | any | Save a search |
| DELETE | `/api/saved-searches/:id` | any | Delete a saved search |
| GET | `/api/enquiries` | any | Enquiries (agent: on my listings; buyer: my own; admin: all) |
| POST | `/api/enquiries/:id/reply` | listing agent / admin | Reply to an enquiry |
| GET | `/api/admin/overview` | admin | Totals + listings by status and city |

## Status

Completed demo project. No real properties, prices, payments or live market data — all seeded content is labelled sample data.

© 2026 Akhand
