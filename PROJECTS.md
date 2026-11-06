# Daily MERN Projects

One new MERN project is added here every day, each in its own folder.

## Projects

| Day | Date | Project | Folder | What it covers |
| --- | --- | --- | --- | --- |
| 1 | 2026-10-31 | ShopKart — MERN E-commerce Store | `mern-ecommerce-store/` | JWT auth + roles, product search/filter/sort/pagination, cart, checkout with stock control, orders, admin dashboard |
| 2 | 2026-10-31 | ChatWave — Real-time Chat App | `mern-realtime-chat/` | JWT auth, public + user-created rooms, Socket.io live messages with persistence, online presence, typing indicators, message history |
| 3 | 2026-11-01 | HireHub — MERN Job Portal | `mern-job-portal/` | JWT auth with candidate/recruiter roles, job search/filter/pagination, recruiter job CRUD, applications with status pipeline, saved jobs |
| 4 | 2026-11-02 | LearnLoop — MERN Learning Platform | `mern-learning-platform/` | JWT auth with student/instructor roles, course search/filter/pagination, instructor course + lesson CRUD, enrolments with per-lesson progress tracking |
| 5 | 2026-11-03 | FlowBoard — Collaborative Project Workspace | `mern-project-workspace/` | JWT auth, projects with members, drag-and-drop Kanban with server-enforced WIP limits, task checklists + comments, activity feed, board health analytics |
| 6 | 2026-11-04 | Orbit — MERN Social App | `mern-social-app/` | JWT auth, follow graph, posts with a transparent scored feed (engagement × freshness decay + follow affinity), time-decayed trending hashtags, likes/comments, Socket.io live notifications |
| 7 | 2026-11-05 | FoodFleet — MERN Food Delivery Platform | `mern-food-delivery/` | JWT auth with customer/restaurant roles, restaurant + menu browsing with cuisine/veg filters, cart checkout with server-side pricing, promo codes and GST, live order tracking over Socket.io (state machine + simulated delivery), owner dashboard with order advance and analytics |
| 8 | 2026-11-06 | PaisaPilot — MERN Personal Finance Dashboard | `mern-finance-dashboard/` | JWT auth, multi-account ledger with transfers, categorised transactions with automatic balance updates, monthly budgets with burn-rate projection, savings goals, recurring payments with due generation, CSV export, server-side analytics engine (totals, spend-by-category vs budget, daily trend, month-end forecast, insights) |

## How to run a project

Each project folder has its own README with setup instructions. In general:

```bash
cd <project>/server && npm install && npm run dev
cd <project>/client && npm install && npm run dev
```
