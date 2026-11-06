# ResumeForge — AI Resume Builder

Day 9 of the Daily MERN Projects series.

Build an honest, recruiter-ready resume: edit every section, preview it live in
three editorial templates, run a rule-based ATS-style check, and improve each
bullet — with an optional AI layer and a working fallback that needs no key.

## What it does

- **JWT auth** — register / sign in; every resume belongs to its owner only.
- **Resume CRUD** — multiple resumes per account, each with personal details,
  summary, experience (with bullets), education, skills and projects.
- **Three live templates** — Editorial, Split and Classic, switchable while
  editing; the preview updates as you type.
- **ATS-style check** — a deterministic, rule-based score (0–100) from the
  content itself: contact details, headline, summary length, experience,
  education, skills, projects, action-led bullets, quantified results. Paste a
  job description to add keyword coverage. Nothing is invented — every check
  shows its evidence.
- **Bullet improver** — rewrites a bullet with a stronger action verb. Uses
  OpenAI (`OPENAI_API_KEY`) or Gemini (`GEMINI_API_KEY`) when a key is set;
  otherwise the built-in rule-based improver runs instead. The dialog always
  says which engine produced the rewrite, and applying it is your choice.
- **Export** — download the resume as JSON (byte-identical to the stored
  record) or print / save as PDF from the browser.

## Theme and interaction

**Editorial x Creative Split** — warm ivory, deep charcoal, muted grey, one
vivid-orange accent used only for meaning; flat colour, no gradients, no
glassmorphism, no card grids. Space Grotesk display headlines, one Instrument
Serif italic phrase per headline, Inter body. Numbered section labels like
(01) PERSONAL. Cursor effect: small glowing ring only (no large glow orb),
with a fading trail, card spotlights and click ripples. Fully usable with
JavaScript animations disabled; reduced motion honoured.

## Tech stack

- Backend: Express + Mongoose, JWT auth (bcrypt), MongoDB (Atlas or
  in-memory fallback via `mongodb-memory-server`).
- Frontend: React + Vite, plain CSS with design tokens, no heavy 3D libraries.
- All copy and template definitions live in `client/src/data/`; components
  only render data.

## Run it locally

```bash
# Terminal 1 — backend on port 5000
cd mern-resume-builder/server
npm install
npm run dev

# Terminal 2 — frontend on port 5173
cd mern-resume-builder/client
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the demo account:

- Email: `demo@resumeforge.example`
- Password: `ResumeForge123!`

The demo account ships with one sample resume. The sample persona
(Aarav Mehta) is **fictional data**, labelled as such in the app, for trying
the editor.

## Environment

`server/.env` ships with safe local-development defaults only (port, empty
`MONGO_URI` for the in-memory fallback, a dev-only JWT secret, `CLIENT_URL`,
`MONGOMS_ARCH=x64`). It contains **no real secrets**. A real Atlas URI or AI
API key goes in your **own local copy only** and must never be committed.

On Windows on ARM the server forces the x64 mongod binary in code and allows
a 60-second launch window, so the in-memory fallback starts reliably. Run
only one project backend at a time — every project in this series defaults to
port 5000.

## API overview

| Method | Endpoint | What it does |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account, returns JWT |
| POST | `/api/auth/login` | Sign in, returns JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/resumes` | List my resumes |
| POST | `/api/resumes` | Create a resume |
| GET / PUT / DELETE | `/api/resumes/:id` | Read / save / delete one resume |
| POST | `/api/resumes/:id/analyze` | ATS-style check (+ optional `jobDescription`) |
| POST | `/api/resumes/:id/improve` | Improve bullets (`{ bullets: [...] }`) |
| GET | `/api/resumes/:id/export` | Download the resume as JSON |
