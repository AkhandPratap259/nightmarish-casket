# FlowBoard / Work in motion

**FundForge theme edition — a full-stack MERN collaborative project workspace.**

A redesign of the supplied FlowBoard project, not a static landing page. The existing Express/MongoDB API, authentication, seeded board and task workflows remain in place. The visual direction now clones FundForge's theme: Y2K chrome + Aurora glass — DM Serif Display + DM Sans, magenta/aqua/lavender/butter on an aurora field, chrome-gradient panels, bubbly pills with hard shadows, multi-layer parallax chrome bubbles, a cursor spotlight with lens reveal on cards, and curtain-wipe transitions between views. Dropping a card into a column fires TaskTrove's paper-chip drop burst.

## Quick start (Windows, macOS or Linux)

Install Node.js 18+ (Node 20 or 22 recommended). Extract the ZIP, open a terminal in `FlowBoard_Editorial_Kinetic`, and run:

```sh
npm run setup
npm run build
npm start
```

Open **http://localhost:5000**. The Express server serves both the compiled React site and the API. The first setup downloads npm dependencies and, when using the local fallback, a MongoDB binary. Internet access is required for initial downloads. Do not open `client/index.html` directly.

### Development (hot reload)

After `npm run setup`, open two terminals in the project root:

```sh
# terminal 1
npm run dev:server
# terminal 2
npm run dev:client
```

Open **http://localhost:5173**. Vite proxies `/api` to port 5000.

### Demo sign-in

- Email: `demo-manager@flowboard.example`
- Password: `FlowBoard123!`
- The seeded "Website Redesign Launch" board contains 11 tasks, three teammates, due dates, checklists and a comment. Use the demo credentials button if needed.
- These are public development credentials, not production accounts.

## Experience

- Asymmetric sign-in spread with cursor-reactive lettering, orbital canvas field and staggered typography.
- Dark workspace navigation, cream Kanban workbench, metric strip, animated completion ring and activity timeline.
- Practical scrolling board by default; choose **Canvas** for panning, zooming and fit-to-width. Drag empty canvas to pan; drag cards to move. On touchscreens use card actions or the task detail status selector.
- Card pointer tilt, magnetic primary actions, subtle data-driven particles, right-click radial menu, and sliding task detail drawer.
- Motion on/off preference persists locally; reduced-motion CSS and pointer-sensitive effects reduce animation on supported devices. No external font or animation CDN required.
- Keyboard shortcuts: `/` searches tasks, `N` opens new task, Escape closes details or card menu. Radial actions support arrow keys and Tab.
- Responsive navigation and horizontal board scrolling preserve readable cards on narrow screens.

## Functionality

- JWT registration and sign-in; user-scoped projects, registered team member invitations by email (owner only).
- Four-column Kanban: To Do, In Progress (WIP limit 4), Review (WIP limit 3), Done. Server checks limits on create and move. WIP counters reflect all cards, even when filtering.
- Create tasks; edit title, description, priority, labels, assignee and due date; move, delete, comment and track checklists.
- Search titles, descriptions, labels and assignees. Filter by priority or assigned-to-me.
- Board analytics: total tasks, in progress, overdue, completion, distribution and workload. Activity updates after mutations; Refresh reloads from the server. No WebSocket-based real-time collaboration is claimed.
- Member access check corrected for populated member records; invalid task status and non-member assignments rejected; async API errors handled as JSON.

## Database and security

`server/.env` contains local-only defaults copied from `.env.example`. With empty `MONGO_URI`, the existing MongoDB Memory Server launcher now uses a persistent WiredTiger database in `server/.mongo-data/` (override with `MONGO_DATA_DIR`). Keep that directory across upgrades and restarts; stop the old server before starting the new one. If you already use MongoDB or Atlas, retain your original `MONGO_URI` and JWT secret. The previous ephemeral database cannot be recovered after it has been shut down. Set a private `JWT_SECRET` for shared deployments.

The original Windows-on-ARM x64 MongoDB emulation fallback remains. The first local MongoDB startup can take time while the binary downloads. For normal x64 Linux/macOS/Windows you can remove `MONGOMS_ARCH=x64` if your platform needs a native architecture.

For production, set `NODE_ENV=production`, configure `MONGO_URI`, a private `JWT_SECRET` and `CLIENT_URL`, and serve through HTTPS. Demo seeding is disabled in production (also set `SEED_DEMO=false` for a non-demo development database). Do not commit real secrets. This is a portfolio/development project rather than an audited production service. WIP checks use count-then-write; concurrent multi-client requests may race. Production enforcement would need a transactional/atomic capacity design. The card chat uses automatic three-second polling rather than WebSockets. Other board features keep their original refresh behavior.

## Project structure

```text
client/             React + Vite UI
  src/components/   Motion, kinetic field, assembly, curtain, cursor, parallax, drop burst, radial menu, task drawer
  src/styles.css    Complete FundForge visual system (Y2K chrome + Aurora glass)
server/             Express + Mongoose API
  src/models/       User, Project, Task, Activity, CardMessage
  src/routes/       Auth, projects, tasks
  src/seed/         Demo tasks
scripts/            Existing API smoke test and card chat acceptance test
package.json        Root setup/build/start commands
```

## Verification

All modified JavaScript and JSX files were syntax-parsed using a local TypeScript compiler. Node syntax checks were run on the backend. Dependency installation/build and actual browser/API integration testing could not be performed in the authoring environment because npm registry DNS/network access was unavailable and dependencies were not cached. No built `dist/` or `node_modules/` is included. Run `npm run setup` and `npm run build` locally to verify the actual bundle.

After starting the development API, run `npm run test:api` in a second terminal to check login, project membership, WIP rejection, task edit, comments, checklists, analytics and deletion. The smoke test creates and removes an isolated test project. This script is supplied for local verification and was not executed against a running database here.

### Manual browser checklist

1. Sign in with the seeded demo; confirm four columns and summary counts.
2. Search/filter and verify WIP capacity stays based on unfiltered tasks.
3. Drag cards into In Progress until the limit is reached; attempt one more and check the error.
4. Open a card, edit its title and assignee, toggle a checklist item and add a comment.
5. Open Insights; toggle Motion off; refresh and check the preference remains off.
6. Resize to a phone width; use horizontal scroll, mobile navigation and the card status selector.

## Per-card group chat (added feature)

Open an existing task and scroll to **Card group chat** in its details. The existing comments and checklist remain unchanged. Choose Message or Work update, enter text/links, attach files, and Send. Each room is scoped by project and task ID; every project member has identical chat access. The existing owner-only member invitation works with registered emails. All history is returned chronologically and refreshed automatically about every three seconds while the room is open. File downloads require the same authenticated project membership, and file names and timestamps are stored with each post. Files are downloaded rather than rendered inline for safety.

Messages, author snapshots and attachments are stored together in individual MongoDB documents (no TTL or automatic deletion). Each post supports up to 5 nonempty files, totaling 8 MiB, and 12,000 text characters. This keeps a single atomic message within MongoDB’s 16 MiB document limit without adding dependencies. There is no daily or logout reset. An explicit deletion of a card/project through the existing UI still removes that card/project; its chat records remain in the database, but are no longer accessible through the app. Keep backups of your MongoDB database. For members on different devices, everyone must connect to the **same deployed app and database**, not separate localhost installations.

### Verify the chat feature

With the updated development server running, use a second terminal:

```sh
npm run test:chat
```

This creates an isolated project with an owner, two invited members and an outsider, posts different messages to two cards, checks an actual file download, fresh logins, author names, chronological order and membership enforcement. It intentionally keeps the test project and local `.chat-test-state.json` for the restart test. Stop and restart the server with the same database, then run:

```sh
npm run test:chat -- --verify
```

This rechecks the same saved history and attachment after restart (or the next day). Do not run these scripts against production. The source was syntax-checked in the authoring environment, but the integration scripts and browser rendering require installed dependencies and a running MongoDB and have not been executed here.
