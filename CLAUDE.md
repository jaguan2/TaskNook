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
│   ├── schema.py         # Startup migration/backup lifecycle (init_schema)
│   ├── migrations/       # Alembic history — SOURCE OF TRUTH for the schema
│   ├── tests/            # pytest (schema lifecycle guarantees)
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
│       │   ├── spotify.js    # Spotify URL parsing (pure)
│       │   └── room.js       # freeform decoration model: catalog, zones, presets
│       └── components/   # Cottage (SVG scene + drag engine), RoomItems
│                         #   (item sprites), TopBar, FocusTimer, Dock,
│                         #   Drawer, *Panel.jsx, WeatherOverlay
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
requirements-desktop.txt`. On Windows the shipping artefact is
**`TaskNook.exe` at the repo root** — a one-file, no-console PyInstaller
bundle that IS committed on purpose (so GitHub visitors can just download and
run it); rebuild it with `build-exe.bat`, which builds the frontend, installs
`requirements-desktop.txt` + `pyinstaller`, then packages `desktop.py` with
`--onefile --windowed --distpath . --workpath build` (hence `build/` and
`*.spec` are gitignored but the `.exe` is not). **Deliberate choice**: TaskNook
is a personal project, so it keeps updating that one committed build rather
than publishing GitHub Releases — the download link never moves. The tradeoff
is that every rebuild adds another ~42 MB to git history permanently, so
rebuild + commit the exe when shipping something worth downloading, not on
every code change. `TaskNook.command` remains the macOS/Linux one-click
launcher (build + install + launch from source).
`desktop.py` is frozen-aware (`sys._MEIPASS`, writable-DB fallback under
`%LOCALAPPDATA%\TaskNook\`). `backend/` and `frontend/dist` are bundled as
loose `--add-data` (not analyzed as source), so **nothing the backend imports
is discoverable by PyInstaller's analyzer** — every one of its third-party
imports needs an explicit flag in `build-exe.bat`, and forgetting one only
fails at runtime *in the exe* (silently, since `--windowed` has no console).
Currently required, each learned from an actual frozen-build failure:
`--hidden-import flask_cors`, `--hidden-import flask_sqlalchemy`,
`--hidden-import flask_migrate`, `--collect-all alembic` (Alembic loads
`env.py` and the `versions/*.py` migrations *dynamically*, so the analyzer
can't see them), and `--hidden-import logging.config` (a stdlib submodule
`migrations/env.py` imports and PyInstaller otherwise omits). If you add a
backend dependency, add its flag **and** re-run the frozen self-test:
`set TASKNOOK_SELFTEST=1 && TaskNook.exe` → exit code 0.
The backend is bundled **file-by-file, never as a whole folder** — an
`--add-data "backend;backend"` would publish your local `tasknook.db` and its
backups inside the committed binary.
Web mode is unchanged and needs neither `pywebview` nor `waitress`.

**Single instance**: `desktop.py`'s `claim_single_instance()` takes an
OS-level lock on `%LOCALAPPDATA%\TaskNook\tasknook.lock` **before importing
`app`** (that import is what runs the migrations) — keep that ordering. A
second launch exits 0 with a "already running" notice. Two instances would
otherwise migrate the same SQLite file concurrently *and* land on different
ports — and since `localStorage` is scoped by origin (host **and** port), the
second window would silently have its own settings and token. This isn't
theoretical: the one-file exe takes seconds to unpack, which is exactly when
people double-click again. The lock is held by the kernel, so it's released
even on a crash — never "clean up" a stale lock file. Dialogs
(`_message_box`) only appear in the **frozen** build; from source you have a
console, and a modal would block scripts and tests.

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
  `(tasks, context) => orderedTasks` functions (the `context` arg only matters for
  `random`). Completed tasks always sink to the bottom.
  Keys: `custom` (manual drag), `shortest`, `longest`, `alternate`, `priority`, `random`.
  The selected key is persisted in `localStorage` (`tasknook.algo`).
  `random` needs an explicit shuffled-ID list (`store.jsx`'s `randomOrder`,
  regenerated by `shuffledIds()` every time "Random" is clicked) rather than
  sorting with `Math.random()` directly — `orderedTasks` recomputes on every
  render (e.g. every timer tick), so a naive random sort would reshuffle
  constantly instead of only on click.
- **Calendar activity marking**: `GET /api/sessions/days` aggregates focus
  minutes per day (`{day: minutes}`), fetched into `store.jsx`'s `sessionDays`
  as part of `refreshAll()`. `CalendarPanel.jsx` unions that with days derived
  from `task.completedAt` (routed through the same local-date `toISO()` used
  elsewhere) to tint "active" days.
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
- **Theming**: `night`/`plum`/`wine`/`rose`/`blush`/`petal` map to
  `rgb(var(--color-x) / <alpha-value>)` — the vars are **space-separated RGB
  channels, not hex**, so Tailwind's opacity modifiers (`bg-rose/40`) keep
  working. Don't change that format. `--color-void` is used only by `<body>`'s
  gradient in `index.css`; `cream`/`glow`/`amber`/`sage` are fixed and never
  re-tint. Presets are `[data-theme="forest|ocean|coffee"]` blocks in
  `index.css`; `App.jsx` stamps `data-theme` on `<html>` (not its own root) so
  `<body>`'s gradient sees it. The `custom` scheme has **no CSS block** — 
  `lib/palette.js`'s `derivePalette(hex)` builds the ramp from the picked
  colour's hue/saturation and `App.jsx` sets the vars inline on `<html>`
  (inline wins over `[data-theme]`); switching back to a preset must
  `removeProperty` each `PALETTE_VARS` entry or the custom colours would stick.
  Only hue + saturation are taken from the pick — the lightness stops are fixed,
  which is what guarantees text stays legible (~9:1 contrast) for any colour.
- **Room decoration (freeform)**: the scene's decor is not hardcoded — it's a
  layout of `{id, item, x, y}` placements the user arranges by dragging in
  edit mode (Room panel → Decorate). `lib/room.js` is the pure model: the item
  catalog, per-zone bounds (`wall`/`desk`/`floor`; `ceiling` items are fixed),
  `GRID` snapping, origin clamping, painter's-order `sortForRender` (zones
  back-to-front, then flat `layer:-1` rugs first, then by `y`), presets, and
  `validatePlacements` (tolerant: unknown items are dropped so catalog changes
  can't brick a saved room). Fixed items (`fixed: true`, e.g. the garland) are
  **singletons pinned to their SPAWN position** — they can't be dragged, so a
  duplicate spawned anywhere else could never be nudged back;
  `validatePlacements` collapses duplicates and re-homes them, healing layouts
  saved before that rule existed. Sprites live in `components/RoomItems.jsx`, each
  drawn around an ORIGIN at (0,0) — the point touching its surface — usually
  by wrapping the original hand-placed artwork in a `translate(-ox,-oy)`; the
  `default` preset therefore reproduces the classic scene exactly. Drag logic
  (pointer events → `getScreenCTM().inverse()` → snap → clamp) is inside
  `Cottage.jsx`. Persistence: DB (`user.room_config` via GET/PUT `/api/room`)
  with a `tasknook.room` localStorage mirror for instant paint; saves are
  debounced 600ms; on boot the server copy wins, and an empty server adopts
  the local layout. RoomPanel previews reuse the same sprites in tiny SVGs
  (no local `<defs>` — `url(#lampPool)` resolves to the Cottage's, which is
  always mounted). Pointer capture is taken on the **`<svg>`**, not the item's
  `<g>`: `sortForRender` reorders those groups as `y` changes mid-drag, and a
  moved/recreated captured element silently drops the capture. `pointercancel`
  is handled alongside `pointerup` (touch drags fire cancel, not up) and
  `touch-action: none` is set while decorating, or a touch drag pans the page
  instead of moving the item. On reconcile, a server layout of `[]` is a
  deliberate empty room and must win — only `null` (never saved) may be
  overwritten by the local layout.
- **Scene sizing & animation**: the SVG's width is `min(90vw, 84vh)`
  (`SCENE_WIDTH`), so the 4:3 room scales with the window instead of being
  pinned to a fixed max-width — verified to grow 588→1176px across window
  sizes. Idle ambience (plant sway, garland twinkle, lamp breathe) is **CSS**
  keyframes, not framer-motion, because the scene re-renders every second (the
  focus timer ticks) and CSS animations live on the element, so they survive
  re-renders for free; all are disabled under `prefers-reduced-motion`. SVG
  needs `transform-box: fill-box` or those rotations pivot about the canvas
  origin. Item pop-in/drag-lift *is* framer-motion, on an **inner** `<g>` —
  framer-motion writes its own inline `transform`, which on the positioning
  `<g>` would overwrite `translate(x,y)` and fling the item to the origin.
  `Cottage` is `memo`'d and the room actions are `useCallback`'d so the
  per-second context change doesn't re-render the whole scene.
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
- **New model field**: edit `models.py`, update the relevant `to_dict()`, then
  **generate a migration** — do not just delete the DB:

  ```bash
  cd backend
  set FLASK_APP=app.py          # PowerShell: $env:FLASK_APP="app.py"
  flask db migrate -m "add task.notes"   # writes migrations/versions/xxxx_*.py
  flask db upgrade                       # apply locally (startup does this too)
  ```

  Read the generated file before committing — autogenerate is a good first
  draft, not gospel (it misses renames, and can't infer a sensible default for
  a new NOT NULL column on existing rows). Migrations are the **single source
  of truth** for the schema: there is no `create_all()` fallback, so a model
  change without a migration will break on a fresh DB immediately — which is
  the point (better than silently diverging from what shipped users have).
- **New panel**: create `components/XxxPanel.jsx`, register it in the `PANELS`
  map and `Dock` items in `App.jsx`.

## Gotchas

- Deleting `backend/tasknook.db` is the dev "reset" — it's rebuilt by running
  the migrations and reseeded. It is gitignored; never commit it. **This is a
  dev-only move**: a shipped user's DB lives in `%LOCALAPPDATA%\TaskNook\` and
  holds real data, which is exactly why schema changes go through Alembic.
- **Schema is managed by Alembic** (`backend/migrations/`, wired up in
  `backend/schema.py`). `init_schema()` runs on every startup and handles three
  cases: a fresh DB (runs migrations from zero), a *legacy* pre-migrations DB
  (has tables but no `alembic_version` → stamped at `0001_baseline` rather than
  replaying history against existing tables), and an up-to-date DB (a cheap
  no-op). It backs the SQLite file up (keeping the newest 3) before applying
  anything. `Migrate(..., render_as_batch=True)` is **required** — SQLite can't
  `ALTER`/`DROP` columns in place, so Alembic rebuilds the table instead.
- `node_modules/`, `frontend/dist/`, and `__pycache__/` are gitignored — keep them
  out of commits.
- Vite proxies `/api` to `:5000` in dev (see `vite.config.js`), so the frontend
  always uses **relative** `/api/...` URLs — don't hardcode `http://localhost:5000`.
- **Never unmount (or `display:none`) chrome that carries `.intro-chrome`** —
  remounting replays its boot animation: 1.5s of invisible UI before the fade
  begins. To hide such chrome temporarily (the focus timer steps aside during
  room decorating), toggle `visibility` on a wrapper: it removes the element
  from hit-testing without restarting animations.
- **CSS animation classes must not share an element with an SVG `transform`
  attribute** — the animation's `transform` property overrides the attribute
  entirely (the desk plant's foliage once dropped 16px into its pot this way).
  Put the attribute transform on a wrapper `<g>` and animate the child.
- Demo seeding only runs when the `luna` user is absent, so it's safe across
  restarts.
- Seeding tolerates `OperationalError` (schema behind models) with a printed
  warning instead of crashing. That's deliberate: `flask db migrate` imports
  the app to autogenerate a revision, at which exact moment the models are
  legitimately ahead of the DB. A *forgotten* migration is still caught — by
  CI's `flask db check`, and by any data endpoint failing loudly.

## Validating changes

- Frontend: `cd frontend && npm test` (Vitest — pure logic: ordering
  algorithms, the palette ramp, local-date formatting), then `npm run build`
  for a full parse check.
- Backend: `cd backend && python -m pytest tests -q` (the schema/upgrade
  guarantees). `pip install -r requirements-dev.txt` first.
- **Schema drift**: `flask db check` reports "new upgrade operations" whenever
  `models.py` has changes with no matching migration. CI runs it.
- **The packaged app**: `npm run build` and `import app` can BOTH pass while
  `TaskNook.exe` is completely broken — the backend ships as loose data, so a
  missing `--hidden-import` only fails at runtime, silently (`--windowed` has
  no console). The only real check is running the artifact:
  `set TASKNOOK_SELFTEST=1 && TaskNook.exe` → exit code 0. CI does this on
  every push (`.github/workflows/ci.yml`).
- No UI/component tests yet — verify visual changes by running both servers.
