# LearnLoop — MERN Learning Platform

A complete, runnable online learning platform (LMS): instructors publish courses
with lessons, students enrol, work through lessons and track progress.

## Features

- JWT authentication with **student** and **instructor** roles
- Course browse with search, category and level filters, plus pagination
- Instructor course CRUD (only their own courses) and lesson management
- Enrolment with per-lesson completion and a computed progress percentage
- Student "My Learning" dashboard with progress bars
- Seeded demo data: 6 courses across Web Development, Data Science, Design and DevOps

## Tech stack

MongoDB (Mongoose) · Express · React (Vite) · Node.js · JWT · bcrypt

## API overview

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Service health check |
| POST | `/api/auth/register` | Public | Register as student or instructor |
| POST | `/api/auth/login` | Public | Log in, receive a JWT |
| GET | `/api/courses?q=&category=&level=&page=&limit=` | Public | List courses (search/filter/paginate) |
| GET | `/api/courses/mine` | Instructor | Own courses |
| GET | `/api/courses/:id` | Public | Course detail with lessons |
| POST | `/api/courses` | Instructor | Create a course |
| PUT / DELETE | `/api/courses/:id` | Instructor (owner) | Update / delete a course |
| POST | `/api/courses/:id/lessons` | Instructor (owner) | Add a lesson |
| POST | `/api/enrollments` | Authenticated | Enrol in a course |
| GET | `/api/enrollments/mine` | Authenticated | Own enrolments with progress |
| POST | `/api/enrollments/:id/complete-lesson` | Authenticated (owner) | Mark a lesson complete |

## Run it locally

```bash
# Terminal 1 — API (http://localhost:5000)
cd mern-learning-platform/server
cp .env.example .env   # set JWT_SECRET; leave MONGO_URI empty for the in-memory dev database
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd mern-learning-platform/client
npm install
npm run dev
```

On Windows on ARM, the in-memory MongoDB download may fail: set
`MONGOMS_ARCH=x64`, or set `MONGO_URI` to a free MongoDB Atlas M0 cluster to
skip the download entirely.

Demo instructor: `demo-instructor@learnloop.example` / `LearnLoop123!`

No payment flow is included: all seeded courses are free, and the `price`
field is a plain course attribute.
