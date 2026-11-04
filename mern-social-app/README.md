# Orbit — MERN Social App

A social app with a feed that shows its maths. Posts are ranked by a visible
score — engagement decayed by age, plus an affinity bonus for authors you
follow — instead of a hidden algorithm. Includes a follow graph, likes,
comments, profiles, search, time-decayed trending hashtags, and live
notifications and new-post updates over Socket.io.

## Standout feature: the transparent feed ranking

`GET /api/feed` scores every post as
`(likes × 3 + comments × 5) × freshness-decay + 20 if you follow the author`,
where freshness decays as `1 / (1 + hours / 12)`. The score and its breakdown
are printed under every post in the UI, and the same decay idea powers the
trending-hashtag list (`/api/feed/trending`, 7-day window). This is deeper
domain logic than a newest-first list: an old viral post cannot outrank fresh
posts forever, and following someone measurably lifts their posts.

## Theme and interactive upgrades (Day 6)

**Theme: Editorial minimal, creative split layout.** A newspaper-style
masthead ("ORBIT" in serif), a three-column split — left navigation rail,
centre feed, right trending rail — on warm paper (`#faf6ef`), ink
(`#211a15`) and coral (`#e4572e`), with serif headlines and sans body text.
This is deliberately different from Day 5 FlowBoard's dark Forge theme
(charcoal/amber/cream, Kanban board) and from Days 1–4's card grids.

**Beyond Day 5:** a scrolling trending-hashtag ticker under the masthead,
reveal-on-scroll feed cards, a heart-pop animation on likes, an expanding
composer that gains a coral glow on focus, slide-in comment drawers, animated
trending bars in the rail, and live Socket.io updates (new posts and
notifications arrive without refreshing). Animations respect
`prefers-reduced-motion` and never hide content.

## Features

- JWT auth (register / login), profiles with bio and follower counts
- Follow / unfollow with live follow notifications
- Posts (500 chars, `#hashtag` extraction), delete your own posts
- Likes with live like notifications, comments with live comment notifications
- Feed tabs: For You (scored), Following, Most active
- Trending hashtags (time-decayed, 7 days), people-to-follow suggestions, user search
- Live notification bell with unread count (Socket.io rooms per user)

## Tech stack

- Backend: Node.js, Express, Mongoose, Socket.io, JWT (bcryptjs)
- Frontend: React + Vite, Socket.io client
- Database: MongoDB — in-memory for zero-setup local runs, or any `MONGO_URI`

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/register`, `/api/auth/login` | Auth, returns JWT + user |
| GET | `/api/auth/me` | Current user (auth) |
| GET | `/api/feed?tab=foryou\|following\|trending` | Scored feed (auth) |
| GET | `/api/feed/trending` | Trending hashtags (auth) |
| POST | `/api/posts` | Create post (auth) |
| DELETE | `/api/posts/:id` | Delete own post (auth) |
| POST | `/api/posts/:id/like` | Toggle like (auth) |
| GET/POST | `/api/posts/:id/comments` | List / add comments |
| GET | `/api/users/search?q=` | Search people (auth) |
| GET | `/api/users/suggestions` | People to follow (auth) |
| GET | `/api/users/:id` | Profile + that user's posts (auth) |
| POST | `/api/users/:id/follow` | Toggle follow (auth) |
| GET/POST | `/api/notifications`, `/api/notifications/read` | Notifications (auth) |

## Run it locally

No database setup needed: with an empty `MONGO_URI` the server starts its own
in-memory MongoDB. A ready `server/.env` is included with safe local
defaults only — **never put a real Atlas URI, password or API key in it**.
A real Atlas URI, if you want persistent data, goes in your own local copy
only and must never be committed. On Windows on ARM the server also forces
the x64 in-memory binary in code and allows 60 seconds for it to start, so
the run does not depend on the `.env` file being loaded correctly.

```bash
cd server && npm install && npm run dev      # API on http://localhost:5000
cd client && npm install && npm run dev      # app on http://localhost:5173
```

Demo account (seeded on first run): `demo@orbit.example` / `Orbit123!`
The demo account already follows the three seeded users, so the Following tab
has posts immediately. Run only one project backend at a time — every daily
project defaults to port 5000.

## Project structure

```
server/src/server.js        Express + Socket.io setup, DB connection
server/src/models/          User, Post, Comment, Notification
server/src/routes/          auth, posts, social (users), feed, notifications
server/src/seed/seed.js     Demo user, 3 users, 8 posts, likes, comments
client/src/App.jsx          Feed, Explore, Profile, notifications, composer
client/src/styles.css       Editorial split-layout theme + animations
```
