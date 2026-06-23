# CLAUDE.md

Guidance for AI assistants (and humans) working in the TaskNook codebase.

## What this is

TaskNook is a cozy, full-stack task tracker with a *Virtual Cottage*–inspired UI.
A React single-page app talks to a Flask REST API over `/api`. Everything runs
locally — **the database is SQLite (a local file), with no cloud/AWS dependency.**

## Architecture at a glance

```
TaskNook/
├── backend/              # Flask REST API (Python)
│   ├── app.py            # App factory, all routes, auth, seeding, static serving
│   ├── models.py         # SQLAlchemy models + db instance
│   └── requirements.txt
├── frontend/             # React + Vite SPA
│   └── src/
│       ├── main.jsx      # Entry; wraps <App/> in <StoreProvider/>
│       ├── App.jsx       # Shell: cottage scene, dock, drawer, timer, auth gate
│       ├── store.jsx     # SINGLE source of truth (React Context): auth, tasks,
│       │                 #   friends, stats, focus timer, ambient audio
│       ├── lib/
│       │   ├── api.js        # fetch wrapper; token in localStorage
│       │   ├── algorithms.js # task-ordering strategies (pure functions)
│       │   └── audio.js      # procedural rain via Web Audio API
│       └── components/   # Cottage (SVG scene), TopBar, FocusTimer, Dock,
│                         #   Drawer, *Panel.jsx, RainOverlay, AuthScreen
├── requirements.txt      # mirror of backend/requirements.txt (root convenience)
└── docs/preview.png      # README screenshot
```

### Data flow

`component → useStore() action → lib/api.js → Flask /api → SQLAlchemy → SQLite`

Most write actions call an API method then `refreshAll()` (re-fetches tasks +
stats + friends). State lives in `store.jsx`; components are mostly presentational.

## Running it

Two processes in dev. **No database setup needed** — SQLite + demo data are
created automatically on first backend launch.

```bash
# Backend  → http://localhost:5000   (Flask REST API)
cd backend && pip install -r requirements.txt && python app.py

# Frontend → http://localhost:5173   (Vite dev server, proxies /api → :5000)
cd frontend && npm install && npm run dev
```

Single-port / production-style: `cd frontend && npm run build` (emits
`frontend/dist`), then `python backend/app.py` serves the built SPA at `:5000`.

Demo logins (seeded): `luna` / `kai` / `sora` / `mochi`, password `lofi123`.
Or click **"peek inside with the demo account"** on the login screen.

### Useful env vars (backend)

- `FLASK_DEBUG=0` — disable debug mode (default on for dev)
- `PORT=5000` — change the API port

## Conventions & key facts

- **Auth**: opaque bearer tokens (table `Token`). Client sends
  `Authorization: Bearer <token>`; `@require_auth` injects the `user` as the
  first arg to a route. Token is persisted in `localStorage` under `tasknook.token`.
- **Models**: `User`, `Task`, `FocusSession`, `Token`, plus a `friendships`
  association table. The friend graph is a **self-referential many-to-many stored
  as two directed rows** (A→B and B→A) — adding/removing a friend must touch both
  directions to stay symmetric. This is intentional; don't "simplify" to one row.
- **Ordering algorithms** live in `lib/algorithms.js` as pure
  `(tasks) => orderedTasks` functions. Completed tasks always sink to the bottom.
  Keys: `custom` (manual drag), `shortest`, `longest`, `alternate`, `priority`.
  The selected key is persisted in `localStorage` (`tasknook.algo`).
- **Focus timer** is driven entirely from `store.jsx`. The ticking `useEffect`
  depends only on `running`; the completion callback is read through a ref to
  avoid recreating the interval when the active task changes. On completion it
  POSTs a `FocusSession` (used for "productivity hours" stats).
- **Ambient audio**: rain is generated procedurally with the Web Audio API
  (`lib/audio.js`) — no audio files, works offline. Lofi music is a YouTube embed
  in `MusicPanel.jsx`. Web Audio must start from a user gesture (it does — toggled
  by a button).
- **Dates**: format dates with **local** parts, not `toISOString()` (which is UTC
  and shifts the day for negative-UTC users). See `toISO()` in `CalendarPanel.jsx`.
  The backend buckets focus time by local `date.today()` for "today" stats.
- **Styling**: Tailwind with a custom cozy palette in `tailwind.config.js`
  (`night`, `plum`, `wine`, `rose`, `blush`, `glow`, etc.). Reusable classes
  `.glass`, `.pill`, `.cozy-scroll` are defined in `src/index.css`.
- **The cottage** in `Cottage.jsx` is hand-authored SVG (no image assets).
  Remember SVG quirks: `skewY()` takes only an angle; use `rotate(angle cx cy)`
  for centered rotation.

## Adding things

- **New API endpoint**: add the route in `register_routes()` in `app.py`
  (use `@require_auth` for authed routes), then a method in `lib/api.js`, then
  consume it via an action in `store.jsx`.
- **New model field**: edit `models.py` and update the relevant `to_dict()`.
  SQLite has no migrations here — during development, deleting `backend/tasknook.db`
  recreates the schema (and reseeds demo data) on next launch.
- **New panel**: create `components/XxxPanel.jsx`, register it in the `PANELS`
  map and `Dock` items in `App.jsx`.

## Gotchas

- Deleting `backend/tasknook.db` is the dev "reset" — it's recreated + reseeded.
  It is gitignored; never commit it.
- `node_modules/`, `frontend/dist/`, and `__pycache__/` are gitignored — keep them
  out of commits.
- Vite proxies `/api` to `:5000` in dev (see `vite.config.js`), so the frontend
  always uses **relative** `/api/...` URLs — don't hardcode `http://localhost:5000`.
- Demo seeding only runs when the `luna` user is absent, so it's safe across
  restarts.

## Validating changes

- Frontend: `cd frontend && npm run build` is a fast full type/parse check.
- Backend: `cd backend && python -c "import app"` imports/creates the app and DB.
- There is no automated test suite yet; verify UI changes by running both servers.
