# BidSphere — Real-Time Auction Platform

A complete MERN auction platform: browse live lots, place bids that update for everyone instantly, watch lots, list your own, and see the house ledger as an admin. Bids are validated atomically on the server, and a bid in the final 60 seconds extends the auction by 60 seconds — no sniping.

## Standout feature — the live bidding engine

- **Atomic bid placement.** A bid only lands if the price it was placed against is still the current price (`findOneAndUpdate` with a current-bid guard). Two bids racing each other cannot both win; the loser gets a clear 409 and the new price.
- **Anti-sniping auto-extension.** A bid inside the final 60 seconds extends `endsAt` by 60 seconds and every watcher is told.
- **Live for everyone.** Socket.io broadcasts new bids, extensions and closures to everyone at once, and per-user rooms (`user:<id>`) send the outbid bidder a direct alert. Prices tick in place on the browse page and flash on the lot page.
- **Bidder dashboard with win/lose status.** Every bid is labelled winning, outbid, won or lost from live data.

## Features

- JWT auth with bidder / seller / admin roles (register chooses bidder or seller)
- Lot browse with text search, category, status, and sort (ending soonest, newest, price, most bids), plus pagination
- Lot detail with a live countdown ring, bid console with quick-bid amounts, live bid feed and bid history
- Create a lot (seller): title, description, category, condition, city, starting bid, minimum increment, auction length (1h–7d)
- Watchlist (watch/unwatch any lot; watched lots on the dashboard)
- Seller dashboard: my listings with live countdowns, cancel a lot that has no bids yet
- Admin overview: users, live/ended lots, total bids, volume from ended lots, lots by category, recent bids
- Background job closes expired auctions every 30 seconds and records the winner

## Tech stack

- **Backend:** Express 4, Mongoose 8, JWT (bcryptjs), Socket.io, mongodb-memory-server (in-memory fallback)
- **Frontend:** React 18 + Vite, plain CSS with design tokens, Socket.io client
- **Theme:** Editorial x Creative Split — warm ivory, deep charcoal, one acid-lime accent; oversized type-led headings, ruled lot rows, hard light/dark split on the lot page; small cursor ring only (no large glow orb)

## How to run locally

```bash
# Terminal 1 — API (port 5000)
cd mern-auction-platform/server
npm install
npm run dev

# Terminal 2 — frontend (port 5173)
cd mern-auction-platform/client
npm install
npm run dev
```

Open http://localhost:5173. The API starts with an in-memory MongoDB when no `MONGO_URI` is set, seeds demo users and 8 sample lots, and is ready immediately.

### Demo accounts (password for all three: `BidSphere123!`)

| Account | Email | Role |
| --- | --- | --- |
| Demo Bidder | demo@bidsphere.example | bidder |
| Demo Seller | demo-seller@bidsphere.example | seller |
| Admin | admin@bidsphere.example | admin |

## Environment

`server/.env` ships with safe local-development defaults only (port, empty `MONGO_URI` for the in-memory fallback, a dev-only `JWT_SECRET`, `CLIENT_URL`, `MONGOMS_ARCH=x64`). It contains no real secrets. A real Atlas URI, if you want one, goes in **your own local copy only** and must never be committed — see `server/.env.example`.

On Windows on ARM the in-memory MongoDB binary is forced to x64 in server code (`server.js`), independent of `.env`, with a 60-second launch timeout.

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register (bidder or seller) |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auctions?q=&category=&status=&sort=&page=` | Browse lots |
| GET | `/api/auctions/:id` | One lot + recent bids |
| POST | `/api/auctions` | List a lot (seller) |
| DELETE | `/api/auctions/:id` | Cancel a lot with no bids (owner/admin) |
| POST | `/api/auctions/:id/bids` | Place a bid (atomic + anti-sniping) |
| GET | `/api/auctions/:id/bids` | Bid history |
| GET | `/api/bids/mine` | My bids with win/lose status |
| GET/POST/DELETE | `/api/watchlist[/:auctionId]` | Watchlist |
| GET | `/api/admin/overview` | Admin stats (admin only) |

Socket.io events: `bid:new`, `auction:ended`, `auction:extended`, `auction:created`, `bid:outbid` (to the outbid user), `auction:won` (to the winner).

## Honesty note

All seeded lots, sellers, bidders and prices are **sample data** for trying the app locally. No real items are for sale, no real money changes hands, and no payment is collected. Bids in the demo are not purchases.

## Project structure

```
mern-auction-platform/
├── client/   # React + Vite frontend
└── server/   # Express + Mongoose API
    └── src/
        ├── models/      # User, Auction, Bid, Watchlist
        ├── routes/      # auth, auctions, bids, watchlist, admin
        ├── utils/       # notify (Socket.io), auctions (closeExpired, anti-sniping)
        └── seed/        # demo users + 8 sample lots with bid history
```

© 2026 Akhand
