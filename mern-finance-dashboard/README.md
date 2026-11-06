# PaisaPilot — Personal Finance & Expense Dashboard

A personal finance dashboard (INR, ₹) for tracking multiple accounts, categorised
income and expenses, monthly budgets, savings goals and recurring payments — with a
server-side analytics engine that produces insights and month-end forecasts.

## Features

- **JWT auth** — register / login / me. Registering seeds default categories and a
  starter Cash account. Demo user: `demo@paisapilot.example` / `PaisaPilot123!`
- **Accounts** — cash / bank / wallet accounts with balances, and transfers between
  accounts.
- **Transactions** — categorised income/expense with month, category, account, kind
  and note-search filters. Creating or deleting a transaction updates the account
  balance in the same request. CSV export of the filtered set.
- **Budgets** — monthly per-category limits (upsert by month + category) with burn
  bars that show projected month-end spend.
- **Savings goals** — target vs saved with animated progress rings; contributions
  are capped at the target.
- **Recurring payments** — monthly/weekly schedules; "Generate due" materialises a
  transaction for each due item, updates balances and advances the next date.
- **Analytics engine (the standout feature)** — `GET /api/analytics/overview`
  computes everything server-side in whole rupees: income/expense/net and savings
  rate, spend by category joined to budgets, per-day trend, run-rate forecast
  (projected month-end spend and projected balance), and plain-language insights:
  top spending category, biggest single expense, month-over-month change per top
  category (flagging any category up > 50% as a spike), and budget-at-risk warnings
  when projected spend exceeds the limit.
- **Hand-rolled SVG charts** — animated spending donut and daily-spend bar chart,
  no chart library.

## Theme — "Ledger desk"

Ivory paper background, deep forest-green ink, gold accents, Georgia serif display
type and tabular numerals, in a 3-column desk layout: left rail (accounts + net
worth), centre (KPIs, charts, transactions), right rail (insights + goals).
Interactive upgrades over the previous project (FoodFleet): count-up KPI numbers,
donut segments that sweep in, bar-chart bars that grow on month change, budget burn
bars with an overspend pulse, animated goal rings, hover tilt on goal cards,
reveal-on-scroll, and an animated month switcher. All animation respects
`prefers-reduced-motion`.

## Tech stack

- **Backend:** Node.js, Express 4, Mongoose 8, JWT (jsonwebtoken), bcryptjs,
  mongodb-memory-server (in-memory fallback for local dev)
- **Frontend:** React 18 + Vite 5, hand-rolled SVG charts, plain CSS
- **Database:** MongoDB (Atlas or in-memory fallback), database name `paisapilot`
  — its own database, so it never collides with other projects' Atlas users

## API overview

Base: `/api` (all routes except register/login/health need a Bearer JWT).

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | `{ ok: true, service: 'paisapilot-api' }` |
| POST | `/api/auth/register` | Register; seeds default categories + Cash account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user |
| GET / POST | `/api/accounts` | List / create accounts |
| PATCH / DELETE | `/api/accounts/:id` | Update / delete an account |
| POST | `/api/accounts/transfer` | Move money between accounts |
| GET / POST | `/api/categories` | List / create categories |
| GET | `/api/transactions?month=&category=&account=&kind=&q=` | Filtered transactions |
| POST | `/api/transactions` | Create (updates account balance) |
| DELETE | `/api/transactions/:id` | Delete (restores account balance) |
| GET | `/api/transactions/export` | CSV download of the filtered set |
| GET | `/api/budgets?month=` | Budgets for a month |
| POST / PUT | `/api/budgets` | Upsert budget by month + category |
| DELETE | `/api/budgets/:id` | Delete a budget |
| GET / POST | `/api/goals` | List / create savings goals |
| POST | `/api/goals/:id/contribute` | Add savings, capped at target |
| DELETE | `/api/goals/:id` | Delete a goal |
| GET / POST | `/api/recurring` | List / create recurring payments |
| PATCH | `/api/recurring/:id` | Toggle active / edit |
| POST | `/api/recurring/generate-due` | Post all due recurring payments |
| GET | `/api/analytics/overview?month=YYYY-MM` | Totals, by-category, daily trend, forecast, insights |

## Run locally

```bash
cd server
npm install
node src/server.js        # API on http://localhost:5000
```

In a second terminal:

```bash
cd client
npm install
npm run dev               # app on http://localhost:5173
```

Sign in with the demo account `demo@paisapilot.example` / `PaisaPilot123!`, or
register a new account. To build the frontend for production: `cd client && npm run build`.

With no `MONGO_URI` set, the server starts an in-memory MongoDB and seeds the demo
user (2 accounts, ~40 transactions across Oct–Nov 2026, Nov budgets, 2 goals,
3 recurring payments).

## Windows on ARM note

The in-memory MongoDB download fails on Windows ARM (aarch64) unless the x64
binary is used, and the default 10-second start timeout is too short under
emulation. This project handles both **in code** (`server/src/server.js` forces
`{ arch: 'x64' }` on Windows ARM and sets `launchTimeout: 60000`), so it works
even if the `.env` file is missing or misnamed. `server/.env` also ships
`MONGOMS_ARCH=x64` as a belt-and-braces default; remove that line on a non-ARM
machine if you like. Definitive bypass with no code change: set a real Atlas
`MONGO_URI` in your own local `server/.env` — the server then skips the
in-memory instance entirely. Run only one project backend at a time (all use
port 5000).

## Secrets — please read

`server/.env` is intentionally committed, but it contains **development defaults
only** (port, an empty `MONGO_URI`, a dev-only JWT secret, `CLIENT_URL`,
`MONGOMS_ARCH`). It never contains a real MongoDB Atlas connection string,
password, or API key. If you want to use a real Atlas database, put the real
`MONGO_URI` in **your own local copy only** and never commit it to a public
repository.

## Notes

- All amounts are whole rupees; no live payments anywhere — payments are mock data only.
- Demo data is illustrative, not real financial data.
