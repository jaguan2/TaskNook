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
│       ├── App.jsx       # Shell: cottage scene, dock, drawer, timer
│       ├── store.jsx     # SINGLE source of truth (React Context): local account,
│       │                 #   tasks, friends, stats, focus timer, ambient audio
│       ├── lib/
│       │   ├── api.js        # fetch wrapper; token in localStorage
│       │   ├── algorithms.js # task-ordering strategies (pure functions)
│       │   ├── audio.js      # procedural rain/snow/storm via Web Audio API
│       │   ├── weather.js    # Open-Meteo: geolocation/geocoding + current conditions
│       │   ├── musicLink.js  # resolves a pasted link to a YouTube/Spotify station
│       │   ├── youtube.js    # YouTube URL/ID parsing (pure)
│       │   └── spotify.js    # Spotify URL parsing (pure)
│       └── components/   # Cottage (SVG scene), TopBar, FocusTimer, Dock,
│                         #   Drawer, *Panel.jsx, WeatherOverlay
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

**Desktop app**: `desktop.py` (repo root) boots the same Flask app on a local
port via `waitress` and opens it in a native window with `pywebview` (WebView2
on Windows). Requires `frontend/dist` to exist + `pip install -r
requirements-desktop.txt`. One-click launchers: `TaskNook.bat` (Windows) /
`TaskNook.command` (macOS/Linux) build + install + launch. It's also
PyInstaller-packageable into a single `.exe` — run `build-exe.bat` (builds the
frontend, installs `requirements-desktop.txt` + `pyinstaller`, then packages
`desktop.py` into `dist\TaskNook.exe`, one-file + no console window).
`desktop.py` is frozen-aware (`sys._MEIPASS`, writable-DB fallback under
`%LOCALAPPDATA%\TaskNook\`). `backend/` and `frontend/dist` are bundled as
loose `--add-data` (not analyzed as source), which is why `flask_cors` and
`flask_sqlalchemy` need explicit `--hidden-import` flags — nothing in
`desktop.py` itself references them for PyInstaller's analyzer to find.
Web mode is unchanged and needs neither `pywebview` nor `waitress`.

**Desktop persistence (two easy-to-reintroduce bugs, both fixed in `desktop.py`):**
1. `pywebview`'s `webview.start()` defaults to `private_mode=True` (incognito-style —
   wipes `localStorage` on close). Must pass `private_mode=False` and an explicit
   `storage_path` (under `APP_DATA_DIR`, i.e. `%LOCALAPPDATA%\TaskNook\webview`) or
   nothing persists across launches — not the token, not any preference.
2. `localStorage` is scoped by **origin** (host *and* port). The server used to bind
   to a random free port every launch (`find_free_port()`), so even with storage
   fixed, every relaunch was a "new origin" and couldn't see its own previous data.
   `desktop.py` now binds a stable `DEFAULT_PORT = 39217` (falling back to a random
   port only if that one's taken). Verified by checking the `Token` table doesn't
   grow across a close+relaunch cycle — if it does, one of these two regressed.

There's no login screen — TaskNook is a single-user local app, so on first
launch the frontend silently signs into (or creates) one fixed local account
(`store.jsx`'s `LOCAL_ACCOUNT`, username `you`). Seeded demo users `luna` /
`kai` / `sora` / `mochi` (password `lofi123`) still exist purely to populate
the Friends panel with someone to compare productivity against — the local
account is auto-friended with them on creation, same as the old sign-up flow.

### Useful env vars (backend)

- `FLASK_DEBUG=0` — disable debug mode (default on for dev)
- `PORT=5000` — change the API port
- `TASKNOOK_DB=/path/to.db` — override the SQLite file location (used by the
  packaged desktop app to keep data in a user-writable dir)

## Conventions & key facts

- **Auth**: opaque bearer tokens (table `Token`). Client sends
  `Authorization: Bearer <token>`; `@require_auth` injects the `user` as the
  first arg to a route. Token is persisted in `localStorage` under `tasknook.token`.
  The register/login/me endpoints are unchanged, but the frontend has no login UI —
  `store.jsx`'s bootstrap effect calls them itself against the fixed `LOCAL_ACCOUNT`
  credentials (login, falling back to register on first run) instead of a user
  typing anything in. `/api/auth/logout` still exists but nothing calls it.
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
- **Ambient audio**: `weatherMode` (`off`/`rain`/`snow`/`storm`) drives procedurally
  generated audio via the Web Audio API (`lib/audio.js`, `startWeather`/`stopWeather`) —
  no audio files, works offline. Rain/snow/storm are the same filtered-noise engine
  with different filter/gain presets; storm additionally schedules random thunder
  bursts. Web Audio must start from a user gesture (it does). `WeatherOverlay.jsx`
  renders the matching full-screen visual (falling rain/snow, storm gets a lightning
  flash), and `Cottage.jsx`'s window shows the same weather via its `weather` prop.
  Music is an iframe embed (YouTube or Spotify) in `MusicPanel.jsx`: a few built-in
  YouTube lofi stations, plus users can paste any YouTube or Spotify
  (playlist/album/track/show/episode) link — `lib/musicLink.js` resolves it to a
  `{provider, id, kind?}` station, persisted to `localStorage`
  (`tasknook.music.custom` / `tasknook.music.station`). No API keys or fees involved
  on either side — both are just public iframe embeds.
- **Real-world weather**: `WeatherPanel.jsx` + `lib/weather.js` hit Open-Meteo
  (free, no API key) for current conditions — browser geolocation first, falling
  back to manual city search via Open-Meteo's geocoding endpoint. This is the one
  feature that needs internet + a location; everything else in TaskNook is fully
  local/offline. "Match my real weather" (`autoMatchWeather` in `store.jsx`) maps
  the fetched WMO weather code to `weatherMode` and the sunrise/sunset window to
  `timeOfDay` (`night`/`sunset`/`day`), refreshing every 15 minutes while enabled.
- **Dates**: format dates with **local** parts, not `toISOString()` (which is UTC
  and shifts the day for negative-UTC users). See `toISO()` in `CalendarPanel.jsx`.
  The backend buckets focus time by local `date.today()` for "today" stats.
- **Styling**: Tailwind with a custom cozy palette in `tailwind.config.js`
  (`night`, `plum`, `wine`, `rose`, `blush`, `glow`, etc.). Reusable classes
  `.glass`, `.pill`, `.cozy-scroll` are defined in `src/index.css`.
- **The cottage scene** in `Cottage.jsx` is hand-authored flat 2D SVG (no image
  assets, no isometric projection) — a desk by a window. It takes `focused`
  (glows the monitor screen + flickers the lamp), `weather` (`off`/`rain`/`snow`/`storm`,
  matches `WeatherOverlay`), and `timeOfDay` (`night`/`sunset`/`day`, swaps the sky
  gradient/building colors/sun-or-moon position/lamp prominence via `TIME_PRESETS`).
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
