# FundForge — Crowdfunding Platform

FundForge is a full-stack crowdfunding platform. Creators launch funding campaigns with a goal, a deadline and reward tiers; backers pledge (mock payments only — no real money moves); campaigns fund or fail when the deadline passes.

## What it does

- **Campaigns** — creators create draft campaigns (title, tagline, story, category, goal, deadline, reward tiers, stretch goals), publish them live, and mark funded campaigns fulfilled. Browse with search, category and status filters, sorting (newest, ending soon, most funded, smallest goal) and pagination.
- **Funding engine** — live pledged totals and backer counts, stretch goals with markers on the funding bar, and reward tiers with limited quantities decremented atomically. A pledge to a sold-out tier is rejected with a clear message, even when several pledges arrive at the same time.
- **Campaign lifecycle** — draft → live → funded / failed → fulfilled. A deadline job closes expired campaigns on a timer: funded when pledges reach the goal, failed otherwise.
- **Pledges** — backers pledge any amount from the campaign minimum, optionally picking a reward tier and pledging anonymously. Every pledge is a mock payment; no card details are collected and no real money moves.
- **Creator dashboard** — my campaigns with status and totals, my pledges, a pledge feed and campaign updates.
- **Community** — comments and creator updates on every campaign, plus a live pledge feed over Socket.io.
- **Admin overview** — totals (users, campaigns, pledges, pledged), campaigns by status, recent pledges and campaigns.
- **Sample data** — 8 sample campaigns ship with the seed (labelled "Sample campaign" in the UI), covering live, nearly funded, funded, failed and draft states.

## Tech stack

- **Backend:** Node.js, Express 4, Mongoose 8, JWT auth (roles: backer / creator / admin), Socket.io, bcryptjs.
- **Frontend:** React 18 + Vite, plain CSS with design tokens, Socket.io client. The Vite dev server proxies `/api` and `/socket.io` to the backend.
- **Database:** MongoDB. With no `MONGO_URI` set, the server starts an in-memory MongoDB (mongodb-memory-server) and seeds demo data automatically.

## Theme and interactions

Editorial x Creative Split: warm ivory, deep charcoal, muted grey text and one accent — vivid orange — used only for meaning (section numbers, active states, the emphasised word, primary actions). Space Grotesk headlines with one italic serif phrase, Inter body, oversized type-led headings, thin rules and numbered section labels.

Interactive upgrades: animated funding bars with stretch-goal markers, a pledge amount slider with live reward preview, a live countdown ring to each campaign's deadline, animated counter numbers, hover tilt on campaign art, a live pledge feed over Socket.io and a funding "thermometer" on the home page. Animations respect `prefers-reduced-motion` and never hide content. The cursor effect is a small glowing ring only — no large glow orb.

## API overview

Base: `/api`. Success bodies are wrapped as `{ data: … }`; errors as `{ error: "message" }`.

| Method | Route | Who | What |
| --- | --- | --- | --- |
| GET | `/health` | public | `{ ok: true, service: "fundforge-api" }` |
| POST | `/auth/register` | public | Register as backer or creator → `{ token, user }` |
| POST | `/auth/login` | public | Sign in → `{ token, user }` |
| GET | `/auth/me` | auth | Current user |
| GET | `/campaigns` | public | List with `search`, `category`, `status`, `sort`, `page`, `limit` |
| GET | `/campaigns/:id` | public | Campaign + recent pledges, updates, comments |
| POST | `/campaigns` | creator/admin | Create a draft campaign |
| PUT | `/campaigns/:id` | owner/admin | Edit title, tagline, story, category (draft/live only) |
| POST | `/campaigns/:id/publish` | owner/admin | Draft → live |
| POST | `/campaigns/:id/fulfill` | owner/admin | Funded → fulfilled |
| DELETE | `/campaigns/:id` | owner/admin | Delete a draft |
| POST | `/campaigns/:id/pledges` | auth | Pledge (mock payment). 400 below minimum, 409 not live / ended / sold out |
| GET | `/campaigns/:id/pledges` | public | Latest pledges |
| GET | `/pledges/mine` | auth | My pledges |
| GET/POST | `/campaigns/:id/updates` | public / owner | Campaign updates |
| GET/POST | `/campaigns/:id/comments` | public / auth | Comments (max 500 chars) |
| GET | `/admin/overview` | admin | Totals, campaigns by status, recent activity |

Socket.io event `pledge:new` is emitted to the `campaign:<id>` room on every pledge, with the new pledged total and backer count.

## Run it locally

Requirements: Node.js 18+ and npm.

```bash
# 1. Start the API (port 5000). Seeds demo users and 8 sample campaigns.
cd server
npm install
npm start

# 2. In a second terminal, start the frontend (port 5173).
cd client
npm install
npm run dev
```

Open http://localhost:5173. The frontend proxies API calls to http://localhost:5000, so both servers must be running.

### Demo accounts

All passwords are `FundForge123!`.

| Role | Email |
| --- | --- |
| Backer | `demo@fundforge.example` |
| Creator | `demo-creator@fundforge.example` |
| Admin | `admin@fundforge.example` |

Use the "Fill demo …" buttons on the sign-in form to fill these in, then submit the form.

### Environment

`server/.env` ships with safe local-development defaults only (`PORT=5000`, empty `MONGO_URI` for the in-memory fallback, a dev-only `JWT_SECRET`, `CLIENT_URL=http://localhost:5173`, `MONGOMS_ARCH=x64`). It contains no real secrets and is safe to commit.

- **A real Atlas URI, if you want one, goes in your own local copy only and must never be committed.** Set `MONGO_URI` in your local `server/.env` and keep that file out of any public commit.
- `MONGOMS_ARCH=x64` helps the in-memory MongoDB download on Windows on ARM machines; it can be removed on a non-ARM machine. The server also forces the x64 binary in code on Windows ARM and allows a 60-second launch window, so the in-memory database starts even if the `.env` file is missing or misnamed.
- `server/.env.example` documents the same defaults as a template.

## Project layout

```
mern-crowdfunding/
  README.md
  .gitignore
  server/
    package.json
    .env            # dev defaults only — safe to commit
    .env.example
    src/
      server.js     # express + socket.io, in-memory Mongo fallback, deadline job
      models/       # User, Campaign, Pledge, Update, Comment
      routes/       # auth, campaigns, pledges, updates, comments, admin
      middleware/   # auth (JWT), requireRole
      utils/        # notify (socket), deadline, campaign helpers
      seed/seed.js  # demo users + 8 sample campaigns
  client/
    package.json
    vite.config.js  # proxies /api + /socket.io to localhost:5000
    index.html
    src/
      App.jsx       # state-based routing, nav, toasts, auth dialog
      api.js        # fetch wrapper + all API calls
      socket.js     # socket.io client
      data/config.js
      components/   # Cursor, Dialog, FundingBar, CountdownRing, PledgeSlider, CampaignArt
      pages/        # Home, Browse, CampaignDetail, CreateCampaign, Dashboard, Admin, Auth
      styles.css
```

© 2026 Akhand
