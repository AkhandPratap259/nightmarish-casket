# HireHub — MERN Job Portal

A complete, runnable MERN job portal with two roles: **candidates** who browse, save and apply for jobs, and **recruiters** who post jobs and manage applicants.

## Features

- JWT auth with candidate / recruiter roles (role-checked on every protected route)
- Public job search by keyword, location, job type and work mode, with pagination
- Recruiter job CRUD: post, edit (via API), close and delete only their own postings
- Applications: one per candidate per job, with cover note and resume link; recruiters update status (`applied → reviewed → shortlisted → rejected / hired`)
- Saved jobs (bookmark toggle) for candidates
- Candidate application tracker and recruiter applicant lists
- 8 seeded sample listings on first run

## Tech stack

MongoDB + Mongoose, Express, React (Vite), JWT + bcryptjs. No payment flow — none is needed for a job portal.

## Run locally

```bash
# Terminal 1 — API (http://localhost:5000)
cd mern-job-portal/server
cp .env.example .env   # set JWT_SECRET; leave MONGO_URI empty for in-memory MongoDB
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd mern-job-portal/client
npm install
npm run dev
```

For persistent data, set `MONGO_URI` in `server/.env` to a MongoDB Atlas M0 cluster (free tier) instead of the in-memory fallback. On Windows on ARM, the in-memory download needs `MONGOMS_ARCH=x64`, or use `MONGO_URI` to skip it entirely.

Demo recruiter (seeded on first server run): `demo-recruiter@hirehub.example` / `HireHub123!` — owns the 8 sample listings. Register a new account and choose the candidate role to apply.

## API overview

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Register as candidate or recruiter |
| POST | `/api/auth/login` | Public | Log in, receive JWT |
| GET | `/api/auth/me` | Auth | Current user |
| GET | `/api/jobs?search=&location=&type=&workMode=&page=` | Public | Search open jobs |
| GET | `/api/jobs/:id` | Public | Job detail |
| POST | `/api/jobs` | Recruiter | Post a job |
| GET | `/api/jobs/mine/posted` | Recruiter | Own postings |
| PUT | `/api/jobs/:id` | Recruiter (owner) | Edit / close a job |
| DELETE | `/api/jobs/:id` | Recruiter (owner) | Delete a job and its applications |
| POST | `/api/applications/jobs/:jobId/apply` | Candidate | Apply to a job |
| GET | `/api/applications/mine` | Candidate | Own applications |
| GET | `/api/applications/job/:jobId` | Recruiter (owner) | Applicants for a job |
| PATCH | `/api/applications/:id` | Recruiter (owner) | Update application status |
| GET | `/api/saved` | Candidate | Saved jobs |
| POST | `/api/saved/:jobId` | Candidate | Toggle save / unsave |

## Notes

- Salaries in the seed data are sample figures for demo purposes, not live listings.
- Never commit a real `server/.env` file; only `.env.example` is tracked.
