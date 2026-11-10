# MediBook — Healthcare Appointment Booking

A MERN appointment-booking platform for clinics. Patients browse doctors by speciality, book a real time slot generated from the doctor's weekly schedule, join a waitlist when a day is full, and keep visit notes and prescriptions in one place. Doctors manage their day, confirm and complete visits; admins see live utilisation and booking analytics.

## Features

- **JWT auth with roles** — patient, doctor, admin. One-click demo accounts for each role.
- **Slot-generation engine** — slots are generated from each doctor's weekly schedule (working days, sessions, slot length). Past times are never offered.
- **Conflict-free booking** — a slot is validated against the generated schedule and guarded by a partial unique index, so a slot can never be double-booked.
- **Appointment lifecycle** — booked → confirmed → completed / cancelled / no-show, with rescheduling.
- **Waitlist with auto-promotion** — join a fully booked day; when someone cancels or reschedules, the first person waiting is booked into the freed slot automatically and notified live.
- **Visit records** — doctors complete a visit with notes and a prescription; patients see the full record.
- **Live notifications** — Socket.io pushes bookings, cancellations and waitlist promotions to the right user instantly.
- **Admin analytics** — totals, bookings by speciality, doctor utilisation over the next 7 days (booked slots vs generated slots), and a daily bookings trend, all computed from real data.
- **Doctor directory** — search by name/clinic/city, filter by speciality and max fee, sort by fee or experience.

## Tech stack

- **Backend:** Node.js, Express, Mongoose, Socket.io, JWT (bcryptjs), mongodb-memory-server for zero-config local runs.
- **Frontend:** React + Vite, plain CSS with design tokens, no heavy 3D libraries.

## Design

Editorial x Creative Split: warm ivory, deep charcoal, one electric-blue accent used only for meaning. Oversized Space Grotesk headlines with one italic Instrument Serif phrase per headline, numbered section labels, ruled doctor rows (no card grid), and a hard light/dark split hero. Cursor effect is a small glowing ring only, with a fading trail and click ripples. Reduced-motion is honoured throughout.

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

Open http://localhost:5173. The API starts with an in-memory MongoDB by default — no database setup needed.

### Demo accounts (password `MediBook123!` for all three)

| Role | Email |
| --- | --- |
| Patient | `demo@medibook.example` |
| Doctor | `demo-doctor@medibook.example` |
| Admin | `admin@medibook.example` |

The seed also includes six demo doctors across General Medicine, Cardiology, Dermatology, Orthopaedics, Paediatrics and Dentistry, plus a few demo appointments so dashboards and analytics have real rows. All demo people are fictional and labelled as demo data in the app.

## Environment

`server/.env` ships with safe local-development defaults only (port, empty `MONGO_URI` for the in-memory fallback, a dev-only JWT secret, `MONGOMS_ARCH=x64`). **Never commit a real secret.** To use a real MongoDB Atlas database, put its connection string in your **own local copy** of `server/.env` only — never in a committed file. `MONGOMS_ARCH=x64` is only needed on Windows on ARM machines; it can be removed on other machines.

## API overview

| Method | Endpoint | Role | What it does |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register as patient or doctor |
| POST | `/api/auth/login` | — | Sign in, returns JWT |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/doctors` | — | Doctor directory (`?speciality&q&maxFee`) |
| GET | `/api/doctors/specialities` | — | Speciality list |
| GET | `/api/doctors/:id` | — | Doctor detail |
| GET | `/api/doctors/:id/slots?date=YYYY-MM-DD` | — | Slots with availability |
| GET | `/api/doctors/:id/days` | — | Working days, 14 days ahead |
| GET | `/api/doctors/me/day?date=…` | doctor | Own day: appointments + slots |
| PATCH | `/api/doctors/me/schedule` | doctor | Update weekly schedule |
| POST | `/api/appointments` | patient | Book a slot |
| GET | `/api/appointments/mine` | any | Own appointments |
| PATCH | `/api/appointments/:id/cancel` | owner/admin | Cancel + waitlist promotion |
| PATCH | `/api/appointments/:id/reschedule` | owner | Move to another free slot |
| PATCH | `/api/appointments/:id/confirm` | doctor | Confirm a booking |
| PATCH | `/api/appointments/:id/complete` | doctor | Complete with notes + prescription |
| PATCH | `/api/appointments/:id/no-show` | doctor | Mark no-show |
| POST | `/api/waitlist` | patient | Join a doctor's waitlist for a date |
| GET | `/api/waitlist/mine` | patient | Own waitlist entries |
| GET | `/api/waitlist/for-doctor` | doctor | Who is waiting |
| PATCH | `/api/waitlist/:id/leave` | patient | Leave the waitlist |
| GET | `/api/admin/overview` | admin | Analytics overview |
| GET | `/api/notifications` | any | Own notifications |
| PATCH | `/api/notifications/read-all` | any | Mark all read |

## Status

Completed demo project. No real payments are taken — the consultation fee is paid at the clinic. No real patients or doctors are listed; all seeded people are fictional demo data.

© 2026 Akhand
