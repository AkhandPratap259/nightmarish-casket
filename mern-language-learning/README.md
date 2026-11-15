# LinguaLeap — Gamified Language Learning Platform

A Duolingo-style language learning app: short lessons with hearts and XP,
daily streaks, a spaced-repetition review deck, achievements and a live
weekly leaderboard — in Spanish, French, German and Japanese.

## What it does

- **4 seeded languages** (Spanish, French, German, Japanese) with real,
  correct beginner vocabulary — greetings, numbers 1–10, common verbs, food
  and colours. Japanese words show kana with a romaji reading.
- **Skill-tree courses**: each language has 2 units × 3 lessons (24 lessons
  total). Lessons unlock in sequence — finish one to open the next.
- **Lesson engine**: every lesson is 6 exercises of four types —
  multiple-choice translation, fill-in-the-blank (type the word from memory),
  matching pairs, and listening. Listening uses the browser's Web Speech API
  (`speechSynthesis`) — real text-to-speech, no audio files.
- **Hearts**: 3 hearts per lesson; a wrong answer costs one. Lose all three
  and the lesson fails — retry it.
- **Gamification, all computed on the server**: XP (10 per correct answer,
  plus a completion bonus), levels on a defined curve (level 2 at 100 XP,
  level 3 at 300, level 4 at 600…), daily streaks computed from activity
  dates, a 50 XP daily goal with a progress ring, and achievements awarded
  server-side (first lesson, 100/500 XP, 3/7-day streaks, 5/10 lessons,
  10 correct reviews, flawless lesson).
- **Spaced-repetition review**: words answered wrong in a lesson enter a
  review deck. A correct review doubles the interval (1 → 2 → 4 → 8 → 16 →
  30 days, capped at 30); a wrong answer resets it to 1 day.
- **Weekly leaderboard**: real aggregation over XP earned in the last 7
  days, with live Socket.io updates — rows re-sort and flash when XP changes.
- **Vocabulary bank** per language with example sentences, listen buttons
  and one-click "add to review".
- **Roles**: learners play lessons; instructors create, edit and delete
  lessons and exercises; admins see a platform overview (users, lessons,
  completions, XP in the last 24 hours, top learners).
- **Dashboard**: today's XP ring, streak, level progress, a 7-day XP bar
  chart, a continue-learning card and the badge list.

## Standout feature — the adaptive lesson engine

Hearts + XP + streaks + a spaced-repetition review queue + a live
leaderboard, all driven by server-side rules: lesson gating, an XP/level
curve, streak computation from real activity dates, review scheduling with
a doubling interval, and single-broadcast live updates. This is not a
plain CRUD app — the lesson session itself is stateful (the server holds
hearts, position and wrong words, validates every answer and only then
awards XP), so the client cannot award itself points or skip ahead.

## Theme and interactive upgrades

**Theme: Editorial x Creative Split, electric blue accent.** Warm ivory
background, deep charcoal, muted grey text and one flat electric-blue
accent used only for meaning (section numbers, active states, the
emphasised word, primary actions). Oversized Space Grotesk headlines with
one italic serif phrase each, numbered section labels like (01) LABEL, hard
light/dark splits with a different composition per section — the hero is a
two-column split, the dashboard pairs an ivory stats panel with a dark
continue-learning panel. No rounded-card grids, no bento layouts, no neon
glow, no gradients, no stock photos.

**Interactive upgrades over the previous project (BidSphere):**

- Animated skill-tree path — lessons hang on a winding path alternating
  left and right, the next open lesson pulses gently, completed nodes fill
  with the accent colour.
- XP ring and level bar that animate when XP is gained; the streak flame
  pulses; hearts pop and fade when one is lost.
- Live leaderboard rows re-sort and flash when anyone earns XP.
- Matching-pairs exercise with flip animation on a correct match and a
  shake on a wrong one; listen exercises speak through the browser.
- Lesson-completion celebration as a CSS reveal (no confetti library).
- Small cursor ring only (fading trail dots and click ripples) — no large
  glow orb. All animation respects `prefers-reduced-motion`, and the app
  stays usable with JavaScript animations disabled.

## Tech stack

- **Backend**: Node.js, Express, Mongoose, JWT auth (bcryptjs), Socket.io,
  `mongodb-memory-server` for the local in-memory fallback.
- **Frontend**: React 18 + Vite, plain CSS with design tokens, no router
  library (App-level view state), Socket.io client.
- **Speech**: browser Web Speech API (`speechSynthesis`) for listening
  exercises and vocabulary pronunciation.

## API overview

| Route | What it does |
| --- | --- |
| `GET /api/health` | `{ ok: true }` |
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | Auth (registration is learner-only; instructor/admin accounts are seeded) |
| `GET /api/languages` · `GET /api/languages/:code` | Language list / one language with units, lock states and vocabulary |
| `GET /api/lessons` · `GET /api/lessons/:id` | Lesson list / one lesson (answers stripped) |
| `POST /api/lessons` · `PUT /api/lessons/:id` · `DELETE /api/lessons/:id` | Instructor/admin lesson authoring |
| `POST /api/learn/start/:lessonId` | Start a lesson (checks the lock, 3 hearts) |
| `POST /api/learn/answer` | Submit one answer — server validates, awards XP, drops a heart |
| `POST /api/learn/complete` | Complete a lesson — bonus XP, streak/level, review items, badges |
| `GET /api/review` · `POST /api/review/answer` · `POST /api/review/add` | Spaced-repetition deck |
| `GET /api/leaderboard/weekly` · `/all-time` · `/my-week` | Weekly / all-time boards, own 7-day XP |
| `GET /api/admin/overview` | Admin-only platform counts and recent users |

Socket.io events (each emitted once): `leaderboard:update` (to everyone,
after any XP award) and `lesson:completed` (to the learner's room only).

## Run it locally

```bash
cd server
npm install
npm run dev        # API on http://localhost:5000

cd ../client
npm install
npm run dev        # App on http://localhost:5173
```

The server starts with an in-memory MongoDB when `MONGO_URI` is empty, so
no database setup is needed. A ready `server/.env` ships with the project
with safe local-development defaults only.

**Database note:** a real MongoDB Atlas connection string, if you want one,
goes in your OWN local copy of `server/.env` only and must never be
committed. The shipped `.env` contains no real secrets.

**Windows on ARM note:** the in-memory MongoDB download is forced to the
x64 binary in server code (independent of `.env`) with a 60-second launch
timeout, so it starts under Windows-ARM emulation. The `MONGOMS_ARCH=x64`
line in `.env` can be removed on a non-ARM machine.

## Demo accounts

All passwords are `LinguaLeap123!`:

| Role | Email |
| --- | --- |
| Learner | `demo@lingualeap.example` |
| Instructor | `demo-instructor@lingualeap.example` |
| Admin | `admin@lingualeap.example` |

Four sample learners (Aarav, Meera, Rohan, Sara) are seeded with a week of
XP history so the leaderboard is not empty on first run.

## Project structure

```
mern-language-learning/
  server/
    src/
      server.js            # Express + Socket.io + in-memory Mongo fallback
      models/              # User, Language, Lesson, Progress, ReviewItem, XpEvent
      routes/              # auth, languages, lessons, learn, review, leaderboard, admin
      middleware/auth.js   # JWT auth + role checks
      utils/               # gamify (XP/levels/streaks/badges), progress (lesson gating), notify
      seed/seed.js         # 4 languages, 24 lessons, demo + sample users
    .env / .env.example    # dev defaults only, no real secrets
  client/
    src/
      App.jsx              # view routing, nav, toasts, socket listeners
      api.js               # API service (strips empty query values)
      socket.js            # one shared Socket.io connection
      data/config.js       # all copy + config (speech langs, achievements)
      components/          # Cursor (small ring), Dialog (portal + focus trap),
                           # XpRing, SkillTree, LessonPlayer, WordCard
      pages/               # Home, Learn, Lesson, Review, Leaderboard,
                           # Dashboard, Auth, Instructor, Admin
      styles.css           # Editorial x Creative Split, electric blue
```

© 2026 Akhand
