# MERN Projects

MERN projects, each in its own folder.

## Projects

| Date | Project | Folder | What it covers |
| --- | --- | --- | --- |
| 2026-10-31 | ShopKart — MERN E-commerce Store | `mern-ecommerce-store/` | JWT auth + roles, product search/filter/sort/pagination, cart, checkout with stock control, orders, admin dashboard |
| 2026-10-31 | ChatWave — Real-time Chat App | `mern-realtime-chat/` | JWT auth, public + user-created rooms, Socket.io live messages with persistence, online presence, typing indicators, message history |
| 2026-11-01 | HireHub — MERN Job Portal | `mern-job-portal/` | JWT auth with candidate/recruiter roles, job search/filter/pagination, recruiter job CRUD, applications with status pipeline, saved jobs |
| 2026-11-02 | LearnLoop — MERN Learning Platform | `mern-learning-platform/` | JWT auth with student/instructor roles, course search/filter/pagination, instructor course + lesson CRUD, enrolments with per-lesson progress tracking |
| 2026-11-03 | FlowBoard — Collaborative Project Workspace | `mern-project-workspace/` | JWT auth, projects with members, drag-and-drop Kanban with server-enforced WIP limits, task checklists + comments, activity feed, board health analytics |
| 2026-11-04 | Orbit — MERN Social App | `mern-social-app/` | JWT auth, follow graph, posts with a transparent scored feed (engagement × freshness decay + follow affinity), time-decayed trending hashtags, likes/comments, Socket.io live notifications |
| 2026-11-05 | FoodFleet — MERN Food Delivery Platform | `mern-food-delivery/` | JWT auth with customer/restaurant roles, restaurant + menu browsing with cuisine/veg filters, cart checkout with server-side pricing, promo codes and GST, live order tracking over Socket.io (state machine + simulated delivery), owner dashboard with order advance and analytics |
| 2026-11-06 | PaisaPilot — MERN Personal Finance Dashboard | `mern-finance-dashboard/` | JWT auth, multi-account ledger with transfers, categorised transactions with automatic balance updates, monthly budgets with burn-rate projection, savings goals, recurring payments with due generation, CSV export, server-side analytics engine (totals, spend-by-category vs budget, daily trend, month-end forecast, insights) |
| 2026-11-06 | ResumeForge — AI Resume Builder | `mern-resume-builder/` | JWT auth, resume CRUD, 3 live editorial templates, rule-based ATS-style score + keyword coverage, bullet improver with optional OpenAI/Gemini layer and working rule-based fallback, JSON export + print/PDF |
| 2026-11-07 | MediBook — Healthcare Appointment Booking | `mern-appointment-booking/` | JWT auth with patient/doctor/admin roles, slot-generation engine from doctor weekly schedules, conflict-free booking (partial unique index), appointment lifecycle with rescheduling, waitlist with auto-promotion on cancellation, visit notes + prescriptions, Socket.io live notifications, admin analytics (bookings by speciality, doctor utilisation, daily trend) |
| 2026-11-09 | Gatherly — Event Discovery & Ticketing | `mern-event-ticketing/` | JWT auth with attendee/organizer/admin roles, event discovery with category/city/date filters, interactive SVG seat map with tiered zones, 5-minute seat holds with expiry countdown and conflict-proof booking, mock checkout with e-tickets, waitlist with auto-promotion, Socket.io live seat updates, organizer + admin analytics |
| 2026-11-10 | Voyara — Travel Itinerary Planner | `mern-travel-planner/` | JWT auth, trips with auto-generated day shells, day-by-day itinerary with server-side time-conflict detection (409 on overlap), drag-to-reorder activities, live budget burn-down with over-budget warnings, packing checklist with essentials template + progress ring, collaborator invites (viewer/editor), Socket.io live updates, trip analytics |

## How to run a project

Each project folder has its own README with setup instructions. In general:

```bash
cd <project>/server && npm install && npm run dev
cd <project>/client && npm install && npm run dev
```

