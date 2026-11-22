# FlavorForge — Recipe Sharing & Meal Planner

A MERN app for people who cook: discover recipes, scale servings to your
table, plan the week on a drag-and-drop planner, and get a grocery list that
builds itself from your plan. Cook Mode walks you through each recipe step by
step with a per-step timer and a progress ring.

## Features

- **Recipe library** — search by dish or ingredient, filter by cuisine,
  category, difficulty and max total time; sort by newest, top rated,
  quickest or most cooked; paginated.
- **Serving scaler** — drag the slider on any recipe and every ingredient
  quantity rescales instantly (rounded sensibly, fractions like 0.5 kept).
- **Nutrition estimate** — per-serving calories, protein, carbs and fat
  computed server-side from a built-in ingredient table. Labelled as an
  *estimate* everywhere; ingredients missing from the table are listed as
  "not estimated" and contribute nothing.
- **Ratings & reviews** — one review per user per recipe (update allowed);
  the recipe's average and count are recomputed server-side on every change.
- **My Recipes** — authors create, edit and delete their own recipes in a
  dialog with dynamic ingredient and step rows.
- **Week planner** — 7 days × 3 slots (breakfast, lunch, dinner). Drag a
  recipe onto a slot, drag planned meals between slots, or click a slot to
  change servings or remove it. One recipe per slot; replacing is allowed.
- **Grocery list** — aggregates ingredients across the planned week, scaled
  to planned servings and summed by ingredient + unit, grouped into Fresh /
  Dairy & protein / Pantry, with a persisted checked state and a progress bar.
- **Collections** — named collections per user; add recipes from any recipe
  page, remove them from the Collections page.
- **Cook Mode** — full-screen step-by-step view with a per-step timer,
  progress ring and next/previous navigation; finishing marks the recipe
  cooked once (timesCooked +1).
- **Analytics** — total recipes, most-cooked top 5, top-rated top 5, cuisine
  distribution, and a weekly cooking streak (consecutive weeks, counting back
  from this week, with at least one planned meal).
- **Admin** — user/recipe/review/plan counts, newest users, flagged recipes
  (reported by users) with hide/unhide.
- **Live updates** — Socket.io rooms per recipe (review events) and per user
  (planner and grocery changes).
- **Demo data** — 12 seeded recipes across 6 cuisines (Indian, Italian,
  Mexican, Chinese, Thai, Mediterranean), a few reviews, 2 collections and
  a sample week meal plan for the demo cook, so the planner and grocery list
  are non-empty on first run.

## Tech stack

- Backend: Node.js, Express, Mongoose, JWT auth, Socket.io,
  mongodb-memory-server (in-memory fallback when no `MONGO_URI` is set)
- Frontend: React 18 + Vite, react-router-dom, socket.io-client, plain CSS
- Design: Organic nature (earth tones, blob shapes, grain) with an Editorial
  ivory-and-ink secondary (hairline rules, paper texture); command-centre
  panels with a card-deck stack and swipe; Bricolage Grotesque display type
  with IBM Plex Sans body; pointer-reactive particle field, scroll-scrubbed
  SVG cooking-journey path, slide-stack page transitions, playful-bounce
  motion throughout

## Demo accounts

All demo accounts use the password `FlavorForge123!`.

| Account | Email | Notes |
| --- | --- | --- |
| Demo cook | `demo@flavorforge.example` | Author of several seeded recipes; has a sample week planned |
| Demo chef | `demo-chef@flavorforge.example` | Second cook account with its own seeded recipes |
| Demo admin | `admin@flavorforge.example` | Admin overview, flagged recipes, hide/unhide |

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

Then open http://localhost:5173. The API serves on http://localhost:5000
and `GET /api/health` returns `{ "ok": true, "service": "flavorforge-api" }`.

### Environment

`server/.env` ships with safe local-development defaults only (port 5000,
empty `MONGO_URI` for the in-memory fallback, a dev-only JWT secret, client
URL, and `MONGOMS_ARCH=x64`). With an empty `MONGO_URI` the server starts an
in-memory MongoDB and seeds the demo data on first run; the code also forces
the x64 mongod binary and a 60-second launch timeout so it works on Windows
on ARM machines.

A real MongoDB Atlas connection string, if you want one, goes in **your own
local copy of `server/.env` only and must never be committed** — the shipped
`.env` contains no real credentials. `server/.env.example` is the documented
template.

## API overview

Base URL: `/api` (proxied by Vite in development).

| Method & path | Auth | What it does |
| --- | --- | --- |
| `GET /health` | — | `{ ok: true, service: "flavorforge-api" }` |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | me: yes | JWT auth; roles `cook` and `admin` |
| `GET /recipes?q&cuisine&category&difficulty&maxTotalTime&sort&page&limit&mine` | optional | Search/filter/sort/paginate; hidden recipes excluded unless admin |
| `GET /recipes/:id?servings=N` | optional | Recipe with ingredients scaled to N servings + nutrition estimate |
| `POST /recipes`, `PUT /recipes/:id`, `DELETE /recipes/:id` | yes | Author (or admin) CRUD |
| `POST /recipes/:id/cooked` | yes | Increment timesCooked |
| `POST /recipes/:id/report` | yes | Flag a recipe for moderation |
| `POST /recipes/:id/hide`, `POST /recipes/:id/unhide` | admin | Hide/unhide a recipe |
| `GET /recipes/:id/reviews`, `POST /recipes/:id/reviews` | POST: yes | One review per user per recipe; upsert |
| `GET /collections`, `POST /collections`, `DELETE /collections/:id` | yes | Named collections per user |
| `POST /collections/:id/recipes`, `DELETE /collections/:id/recipes/:recipeId` | yes | Add/remove a recipe |
| `GET /planner?from&to`, `POST /planner`, `PUT /planner/:id`, `DELETE /planner/:id` | yes | Week planner entries; 409 on duplicate same recipe+slot+date |
| `GET /planner/grocery?from&to` | yes | Aggregated, scaled grocery list for the range |
| `PATCH /planner/grocery/:id`, `DELETE /planner/grocery/checked?weekStart=` | yes | Toggle checked; clear checked items |
| `GET /stats` | — | Public totals (recipes, cuisines, times cooked) |
| `GET /analytics/overview` | yes | Totals, most-cooked, top-rated, cuisine split, weekly streak |
| `GET /admin/overview` | admin | Counts, newest users, flagged recipes |

Socket.io rooms: `recipe:<id>` (review events) and `user:<userId>`
(planner and grocery changes).

## Project structure

```
mern-recipe-platform/
  server/
    src/server.js        # Express + Socket.io + in-memory MongoDB fallback
    src/models/          # User, Recipe, Review, Collection, MealPlan, GroceryItem
    src/routes/          # auth, recipes, collections, planner, analytics, admin
    src/utils/           # nutrition table + estimate, notify, helpers
    src/seed/seed.js     # 12 demo recipes, demo users, reviews, collections, week plan
    .env / .env.example
  client/
    src/App.jsx          # Routes, nav, footer
    src/api.js           # API client (flavorforge_token / flavorforge_user)
    src/socket.js        # Socket.io client
    src/data/            # content.js (copy), config.js (links)
    src/components/      # Dialog (portal, focus trap), Cursor (small ring), Reveal, CountUp
    src/pages/           # Home, Browse, RecipeDetail (+ Cook Mode), MyRecipes,
                         #   Planner, Grocery, Collections, Admin, Auth
    src/styles.css
```

## Notes

- Seed data is labelled demo data in the app. Nutrition figures are
  estimates from a built-in reference table, never measurements.
- No real user data, no payments, no invented metrics or deployments.
- © 2026 Akhand
