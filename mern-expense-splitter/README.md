# FairShare — Group Expense Splitter

Split shared expenses fairly and settle up in the fewest possible transfers.

FairShare is a MERN app for groups who share costs — flatmates, trip groups,
friends. Create a group, add expenses with equal, exact, percentage or share
splits, and FairShare works out who owes whom. A debt-simplification engine
then reduces the raw pairwise debts to a minimal settlement plan, so a group
of four can often settle in two or three transfers instead of six.

## Features

- **JWT auth** — register / sign in, demo account included (see below).
- **Groups** — create groups, add members by email, creator-managed membership.
- **Expenses** — add with four split modes (equal, exact amounts, percentages,
  shares). The server validates every split: equal splits distribute remainder
  pennies so shares sum exactly; exact splits must sum to the total;
  percentages must sum to 100; shares split proportionally. Invalid splits
  are rejected with a 400.
- **Balances** — live per-member net balances (who owes, who is owed).
- **Debt simplification** — a greedy min-cash-flow engine turns raw pairwise
  debts into a minimal settlement plan (fewer transfers, same totals).
- **Settlements** — record payments against the plan; over-payment is rejected.
- **Analytics** — spend by category (SVG donut), spend by month, totals and
  average per person, per group.
- **Dashboard** — what you owe, what you are owed, total spent, recent activity.
- **Live updates** — Socket.io pushes expense, settlement and balance changes
  to everyone in the group.
- **Admin overview** — user/group/expense counts and recent groups (admin role).

## Tech stack

- **Backend:** Node.js, Express, Mongoose, JWT (jsonwebtoken), bcryptjs,
  Socket.io, mongodb-memory-server (in-memory fallback for local development).
- **Frontend:** React 18 + Vite, react-router-dom, socket.io-client, plain CSS
  with design tokens.

## Run locally

Prerequisites: Node.js 18+.

```bash
# Terminal 1 — API (http://localhost:5000)
cd server
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

The API ships with a ready-to-run `server/.env` containing local-development
defaults only (empty `MONGO_URI`, so it uses an in-memory database, and a
dev-only JWT secret). A real MongoDB Atlas connection string, if you want one,
goes in your own local copy of `server/.env` only and must **never** be
committed. `server/.env.example` documents the same keys.

On Windows on ARM the in-memory database is forced to the x64 binary in code
(`server/src/server.js`) with a 60-second launch window; the shipped `.env`
also sets `MONGOMS_ARCH=x64`. That line can be removed on a non-ARM machine.

### Demo account

Seeded automatically on first start (with a sample "Goa Trip 2026" group):

- Email: `demo@fairshare.example`
- Password: `FairShare123!`

Other seeded members: `priya@fairshare.example`, `rohan@fairshare.example`,
`meera@fairshare.example` (same password). Admin: `admin@fairshare.example`.

To re-seed from scratch, stop the server, delete the database (or restart with
an empty in-memory instance) and run `npm run seed` from `server/`.

## API overview

Base URL: `http://localhost:5000/api` (all routes except auth and health need
a `Bearer` JWT).

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | API health check |
| POST | `/auth/register` | Register `{name, email, password}` |
| POST | `/auth/login` | Sign in `{email, password}` |
| GET | `/auth/me` | Current user |
| GET | `/groups` | My groups (with totals) |
| POST | `/groups` | Create a group |
| GET | `/groups/:id` | Group detail (member only) |
| POST | `/groups/:id/members` | Add a member by email |
| DELETE | `/groups/:id/members/:userId` | Remove a member (creator only) |
| GET | `/groups/:id/expenses` | Expenses (`?category=`, `?q=`) |
| POST | `/groups/:id/expenses` | Add an expense (validated splits) |
| DELETE | `/groups/:id/expenses/:expenseId` | Delete (payer or creator only) |
| GET | `/groups/:id/balances` | Net balances, raw debts, simplified plan |
| POST | `/groups/:id/settlements` | Record a settlement |
| GET | `/groups/:id/settlements` | Settlement history |
| GET | `/groups/:id/activity` | Group activity feed |
| GET | `/groups/:id/analytics` | Spend by category / by month |
| GET | `/dashboard` | My totals across groups |
| GET | `/admin/overview` | Admin overview (admin role) |

## Project structure

```
mern-expense-splitter/
├── server/            # Express + Mongoose API
│   ├── src/
│   │   ├── models/    # User, Group, Expense, Settlement, Activity
│   │   ├── routes/    # auth, groups, expenses, balances, analytics, admin
│   │   ├── middleware/# JWT auth, group membership
│   │   ├── utils/     # balances engine (min-cash-flow simplification), notify
│   │   ├── seed/      # demo users, group and expenses
│   │   └── server.js
│   ├── .env           # local dev defaults only — no real secrets
│   └── .env.example
└── client/            # React + Vite frontend
    └── src/
        ├── pages/     # Home, Auth, Dashboard, Groups, GroupDetail, Admin
        ├── components/# Dialog, SplitEditor, BalanceBar, SettlementFlow,
        │              # CategoryDonut, CountUp, Cursor, Reveal
        ├── data/      # copy / content
        └── styles.css
```

## Design

Editorial x Creative Split: warm ivory and deep charcoal with a single
electric-blue accent, oversized Space Grotesk headlines with one italic-serif
emphasis per headline, numbered section labels, and asymmetric light/dark
splits that differ per section. Interactive details: animated balance bars,
count-up totals, a settlement-flow diagram that animates transfer by transfer,
an SVG category donut, and a split editor with live validation. Animations
respect `prefers-reduced-motion`.

## Status

Completed as a local demo project. The seeded group and expenses are sample
data for trying the app; no real money moves through FairShare.

© 2026 Akhand
