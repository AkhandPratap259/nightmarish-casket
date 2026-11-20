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
| 2026-11-11 | NestHunt — Real Estate Listing Platform | `mern-real-estate/` | JWT auth with buyer/agent/admin roles, property search with server-side filters/sort/pagination, favourites, comparison matrix with server-computed summary, EMI calculator (live sliders + server endpoint), price analytics by locality from live listings, saved searches with Socket.io match alerts, enquiries with agent replies, admin overview |
| 2026-11-14 | BidSphere — Real-Time Auction Platform | `mern-auction-platform/` | JWT auth with bidder/seller/admin roles, lot browse with search/category/sort/pagination, live bidding engine with atomic bid validation and anti-sniping auto-extension, Socket.io live bid feed with outbid alerts, watchlist, seller dashboard with my-bids win/lose status, admin overview |
| 2026-11-15 | LinguaLeap — Gamified Language Learning Platform | `mern-language-learning/` | JWT auth with learner/instructor/admin roles, 4 languages with 24 skill-tree lessons (unlock in sequence), lesson engine with 4 exercise types incl. speech-synthesis listening, server-side hearts/XP/levels/streaks/achievements, spaced-repetition review deck, weekly leaderboard with Socket.io live updates, vocabulary bank, instructor lesson authoring, admin overview |
| 2026-11-16 | FundForge — Crowdfunding Platform | `mern-crowdfunding/` | JWT auth with backer/creator/admin roles, campaign discovery with category/status filters, funding engine with live pledged totals, stretch goals and atomic reward-tier pledges (race-safe), campaign lifecycle state machine with deadline auto-close, mock pledges, comments + creator updates, Socket.io live pledge feed, creator dashboard with analytics, admin moderation |
| 2026-11-17 | PulseFit — MERN Fitness Tracker | `mern-fitness-tracker/` | JWT auth with member/trainer/admin roles, 28-exercise library with custom exercises, workout templates with drag-to-reorder, live session logging with rest timer and live volume ring, automatic personal records with Epley 1RM and progressive-overload suggestions, analytics (8-week volume chart, muscle split, week streak), challenges with auto-tracked progress and leaderboards, trainer multi-week plans, Socket.io live session feed, admin overview |
| 2026-11-18 | TaskTrove — Local Services Marketplace | `mern-services-marketplace/` | JWT auth with customer/provider/admin roles, service discovery with match-score ranking, conflict-proof slot booking, live booking updates via Socket.io, reviews, provider dashboard with earnings, admin overview |
| 2026-11-20 | FairShare — Group Expense Splitter | `mern-expense-splitter/` | JWT auth with member/admin roles, groups with email member invites, expenses with 4 server-validated split modes (equal/exact/percentage/shares, penny-exact), live net balances, greedy min-cash-flow debt simplification into a minimal settlement plan, settlements with over-payment rejection, category/month analytics, dashboard, Socket.io live updates, admin overview |

## How to run a project

Each project folder has its own README with setup instructions. In general:

```bash
cd <project>/server && npm install && npm run dev
cd <project>/client && npm install && npm run dev
```
