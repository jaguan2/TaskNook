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
│       ├── main.jsx      # Entry; <ErrorBoundary><StoreProvider><TimerProvider><App/>
│       ├── App.jsx       # Shell: cottage scene, dock, drawers, HUD cards
│       ├── store.jsx     # SINGLE source of truth (React Context): local account,
│       │                 #   tasks, friends, stats, room, ambient audio
│       ├── timer.jsx     # The focus timer, in its OWN provider (see below) —
│       │                 #   its 1Hz tick must not re-render the whole app
│       ├── lib/
│       │   ├── api.js        # fetch wrapper; token in localStorage
│       │   ├── storage.js    # THE localStorage gateway (never call it directly)
│       │   ├── algorithms.js # task-ordering strategies (pure functions)
│       │   ├── audio.js      # procedural rain/snow/storm via Web Audio API
│       │   ├── weather.js    # Open-Meteo: geolocation/geocoding + current conditions
│       │   ├── musicLink.js  # resolves a pasted link to a YouTube/Spotify station
│       │   ├── youtube.js    # YouTube URL/ID parsing (pure)
│       │   ├── spotify.js    # Spotify URL parsing (pure)
│       │   ├── room.js       # freeform decoration model: catalog, zones, presets
│       │   └── iso.js        # isometric projection math (Sims-style room seed)
│       └── components/   # Cottage (SVG scene + drag engine), RoomItems
│                         #   (item sprites), HudFocusCard (top-left timer/
│                         #   stopwatch), HudTasks (top-right to-do), TopBar
│                         #   (bottom-right clock/toggles cluster — the name
│                         #   is historical), Dock, Drawer, *Panel.jsx,
│                         #   WeatherOverlay, RoomTintPicker
└── docs/preview.png      # README screenshot
```

### Data flow

`component → useStore() action → lib/api.js → Flask /api → SQLAlchemy → SQLite`

Most write actions call an API method then `refreshAll()` (re-fetches tasks +
stats + friends). State lives in `store.jsx`; components are mostly presentational.

`refreshAll()` awaits `listTasks()` **before** the other three, deliberately:
GET `/api/tasks` is what lazily resets daily routines, so a `stats` call racing
alongside it could be answered from pre-reset rows — one wrong completion
number on the first refresh of each new day. Don't fold it back into the
`Promise.all`.

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
`--hidden-import flask_sqlalchemy`,
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

- **Failure feedback**: failed API writes are never console-only — every
  catch also calls the store's `showToast(message)` (one transient glass
  pill, top-centre, auto-dismisses; rendered in `App.jsx`). Refusals toast
  too, not just errors: hitting the item cap, or asking for a piece the drawn
  floor has no room for. A hard bootstrap
  failure sets `bootError` → App shows a retry screen instead of an empty
  cottage. A render that THROWS hits `components/ErrorBoundary.jsx`: one at
  the root in `main.jsx`, plus a second wrapping the scene in `App.jsx` with
  its own `fallback` — a room that can't draw must not take the to-do list
  and the timer with it. Without these a single throw is a blank window, and
  the packaged app is `--windowed`, so a blank window is indistinguishable
  from one that never launched.
- **localStorage goes through `lib/storage.js`** (`readStored`/`writeStored`/
  `readJSON`/`writeJSON`/`removeStored`) — never `localStorage.*` directly.
  Both halves of the API throw for real reasons (QuotaExceededError when the
  profile is full; SecurityError when storage is disabled or partitioned),
  and TaskNook writes from inside effects and setters, so an unguarded throw
  lands in React's commit phase and blanks the app. Reads degrade to "nothing
  saved", writes return `false`. Error text/destructive hovers/"sure?" states use the fixed
  `danger` color, NOT `rose` (rose re-tints per theme and goes grey/tan in
  three of them). Hover-revealed row controls use `.hover-reveal`
  (index.css) — visible on touch, revealed by keyboard focus — never raw
  `opacity-0 group-hover:opacity-100`. Every delete of user data is a
  two-tap armed ✕ ("sure?") via the shared `lib/useArmed.js` hook — tasks,
  custom stations, scene presets, friends, room clear, and the timer reset
  once a block has progress. See docs/DESIGN.md's "Chrome vocabulary" for
  the full delete/selection grammar.
- **Auth**: opaque bearer tokens (table `Token`). Client sends
  `Authorization: Bearer <token>`; `@require_auth` injects the `user` as the
  first arg to a route. Token is persisted in `localStorage` under `tasknook.token`.
  `issue_token` prunes to the newest `MAX_TOKENS_PER_USER` rows per user —
  nothing used to delete them, so the table grew by one on every boot from
  cleared storage, which is exactly what the desktop persistence check
  asserts against.
  The register/login/me endpoints are unchanged, but the frontend has no login UI —
  `store.jsx`'s bootstrap effect calls them itself against the fixed `LOCAL_ACCOUNT`
  credentials (login, falling back to register on first run) instead of a user
  typing anything in. `/api/auth/logout` still exists but nothing calls it.
  There is deliberately NO CORS on the API: every legitimate client is
  same-origin (the packaged app serves the SPA itself; the Vite dev server
  PROXIES `/api`), and a wildcard `Access-Control-Allow-Origin` would let
  any web page in any browser drive the localhost API with the well-known
  local-account credentials. Don't add flask-cors back.
- **Models**: `User`, `Task`, `FocusSession`, `Token`, plus a `friendships`
  association table. `Task.group_name` is the VC2-style to-do group header
  (nullable; a name list for still-empty groups lives client-side in
  `tasknook.taskGroups`). `Task.is_routine` marks daily routines — they reset
  to not-done **lazily in `list_tasks`** whenever their `completed_at` falls
  on a previous LOCAL day (same local-day convention as the stats). The friend graph is a **self-referential many-to-many stored
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
- **Two time windows in `/api/stats`, don't mix them.** `tasksTotal` /
  `tasksDone` / `completion` describe the **current list** — a standing to-do
  list isn't recreated each morning — while `tasksDoneToday` and
  `focusMinutesToday` are bucketed by the LOCAL day. ProgressPanel labels them
  accordingly ("List completion" vs "Done today"); it used to say "Today's
  completion" over lifetime counts, so a task finished a year ago read as
  today's progress and the bar never moved. `local_day_start_utc()` in
  `app.py` is how the day boundary reaches a naive-UTC `completed_at` column.
- **Calendar activity marking**: `GET /api/sessions/days` aggregates focus
  minutes per day (`{day: minutes}`), fetched into `store.jsx`'s `sessionDays`
  as part of `refreshAll()`. `CalendarPanel.jsx` unions that with days derived
  from `task.completedAt` (routed through the same local-date `toISO()` used
  elsewhere) to tint "active" days — filtering on `minutes > 0`, not on the
  key existing. `POST /api/sessions` refuses anything under a minute for the
  same reason (a zero-minute row is not a day you focused).
- **Focus timer** lives in **`timer.jsx`**, its own provider nested inside
  `StoreProvider` (it reads the active task and logs sessions through the
  store). It used to be part of the store, which rebuilt that context every
  second and re-rendered every `useStore()` consumer in the app — the dock,
  the to-do list, the music bar, every open panel — whether or not it showed
  a clock. The nesting is what fixes it: `children` is an element created by
  StoreProvider, which no longer re-renders per tick, so React skips the
  subtree and only context consumers update. There are **two** hooks, and
  picking the wrong one undoes the whole thing:
  `useTimer()` is everything including `remaining`/`elapsed` (HudFocusCard
  and ProgressPanel — they display the clock, so ticking is correct), while
  `useTimerStatus()` is a memoised `{running, phase, timerMode}` for
  components that merely REACT to a session. `App` must use the status hook:
  reading the full context there puts App back on a 1Hz re-render and drags
  the whole tree along.
  The ticking `useEffect`
  depends only on `running` + `timerMode`; the completion callback is read
  through a ref to avoid recreating the interval when the active task changes.
  On completion it POSTs a `FocusSession` (used for "productivity hours"
  stats). `timerMode` is `"timer" | "stopwatch"` (persisted): stopwatch counts
  `elapsed` up open-ended and `finishStopwatch()` logs the rounded minutes as
  a session (sub-minute runs log nothing); mode switching is blocked while
  running. Pomodoro belongs to timer mode only. Mid-session `−1:00/+1:00`
  nudges (`nudgeTimer`) adjust `remaining` AND accumulate `nudgeSeconds`, so
  the progress bar's total stretches and the logged session reflects real
  planned time; nudges reset on start/reset/mode-switch/completion and are
  focus-phase only. Phase edges play a quiet procedural chime (`playChime` in
  `lib/audio.js`) and post a system notification — permission is requested on
  the first ▶ press (never at boot); without that request `notify()` is
  permanently dead ("default" permission). `skipBreak` ends a break early
  into the next round; changing pomodoro settings mid-run no longer resets
  phase/round (only applies when idle). The ✕ reset arms first ("sure?")
  once a block has progress, since it discards unlogged time. The UI is `HudFocusCard`
  (top-left) — a SMALL VC2-style transport card: round pips, the time (nudge
  buttons flanking it), a thin progress bar, `✕ ▶/⏸ ✓ ⚙`, with
  mode/presets/pomodoro tucked behind the
  `⚙` expander, and a chromeless daily-goal/streak chip underneath
  (`🎯 focused/goal · 🔥 streak` — goal lives in `tasknook.dailyGoal`, streak
  math is `lib/stats.js`'s pure `focusStreak`, configured in ProgressPanel).
  The chip and ProgressPanel show `focusMinutesLive` = the DB's completed
  sessions + the CURRENT running block's minutes — without the live part the
  app reads as "not tracking me" (user feedback).
  The active-task name is the heading above it **only when one
  exists** — when idle there is NO heading and NO filler text; don't add any
  back. The card is `z-30` so the expanded options overlay the dock like a
  dropdown on short windows. `HudTasks` (top-right) is drawn straight on the
  backdrop with no card chrome: completed rows stay crossed-out, per-row ✕
  delete, ↻ routine toggle, ⠿ drag-reorder of active rows (within a group),
  quick-add posts a 25-min medium task into a selectable group, and tasks are
  partitioned under VC2-style group headers (`＋ group` creates one; deleting
  a group ungroups its tasks). Both hide via `visibility` while decorating.
  The `Dock` collapses to
  a single ☰ button (`tasknook.dockCollapsed`) and its top is
  `max(172px, calc(50% - 220px))` — clamped so a centred column can never
  climb into the focus card's corner on short windows.
  **Design north star (user preference)**: VC2's UI — prefer chromeless
  on-scene elements (HUD text, small pills, bottom bars, popovers) over new
  drawers/dialogs; panels are for infrequent configuration.
  **Before touching any UI, read `docs/DESIGN.md`** — the full design-rules
  sheet (zone ownership map, motion rules, composition, tinting, the
  new-feature checklist). It is the authority on visual decisions.
- **Ambient audio**: `lib/audio.js` is a procedural **mixer** — channels
  (`SOUND_CHANNELS`: rain, storm, snow, wind, fireplace, birds) play
  simultaneously, each at its own volume, via `setChannel(name, 0..1)` /
  `applyMix`. No audio files, works offline. The mixer's channels are rain,
  storm, snow, wind, fireplace, cafe and paper (birds were replaced — page
  turns and a café suit a study nook better). The noise channels share one
  filtered-noise engine with per-channel presets; storm schedules thunder,
  fireplace schedules crackles, the café murmurs under steam bursts and cup
  clinks, paper is one-shot-only page turns (no bed) — all one-shots
  route through the channel's master gain so its slider scales them.
  **Rain schedules droplet plinks on top of a dark noise bed** — the
  transients are what make it read as rain instead of radio static (user
  feedback, twice: re-tuned 2026-07-26 to a quieter, darker bed with drops
  varied in pitch, loudness (squared random — most far, few near) and
  stereo pan). Keep noise beds dark; brightness comes from one-shots. (A
  separate "soft rain" channel existed briefly and was cut — didn't earn its
  slot; iterate on the main rain instead of adding variants.)
  The mix lives in `soundMix` (`tasknook.soundMix`); since Web Audio needs a
  user gesture, a saved mix resumes on the first `pointerdown` after boot.
  `weatherMode` **and `timeOfDay` are both persisted** (`tasknook.weatherMode`
  / `tasknook.timeOfDay`, each whitelisted on read). Only the time used to be:
  the Weather-conditions matrix exists so ONE tap picks both axes, and a
  relaunch was giving back half the choice — "cloudy night" came back as
  "clear night".
  `weatherMode` (`off`/`rain`/`snow`/`storm`) is **VISUAL-ONLY** — its
  controls are the TopBar cluster's weather popover and the Weather panel's
  "Weather conditions" matrix (5 weather rows × 3 time pills; one tap sets
  BOTH weatherMode and timeOfDay, so "cloudy night" is a single choice —
  SkyOverlay tones clouds per time of day). The Sounds panel deliberately
  has no weather buttons, and neither weatherMode nor "Match my real
  weather" ever touches the sound mix (explicit user decision: a rainy scene
  without rain audio is a legitimate mood). The
  one exception: applying a saved ambience preset restores its snapshot of
  the mix, because that's what a snapshot is. `weatherMode` also has
  `cloudy` (WMO codes 2/3/45/48 map to it): no particles, just
  `SkyOverlay.jsx` — the ambient sky BEHIND the scene (first in App's DOM):
  twinkling stars + cratered moon at night, sun by day (low/warm at sunset,
  muted to 0.3 opacity under clouds), and CSS-keyframe clouds
  (`sky-drift`, deterministic star positions — no Math.random per render)
  that turn storm-dark for rain/storm. A huge iso floor can cover the whole
  sky — that's expected ("you're inside"). `WeatherOverlay.jsx`
  renders the matching full-screen visual (falling rain/snow, storm gets a lightning
  flash), and `Cottage.jsx`'s window shows the same weather via its `weather` prop.
  Music: stations are picked in `MusicPanel.jsx` but PLAY in `MusicDock.jsx` —
  a persistent App-level component (bottom-centre transport bar + an
  off-screen 320×180 player), so music survives closing the panel and hides
  via the same `visibility` wrapper while decorating. YouTube stations use
  the IFrame API: play/pause, volume (`tasknook.music.volume`), a **seek bar
  with times** (a ~1Hz poll of `getCurrentTime`/`getDuration`/`getVideoData`
  also feeds the current TRACK title into the bar; absurd/zero durations mean
  a live stream → LIVE badge, no seeking), and `⏮⏭` that move through
  **tracks** for playlist stations (`previousVideo`/`nextVideo`) but through
  **stations** for single videos. Playlists start via an explicit
  `loadPlaylist()` in `onReady` (more reliable than autoplay playerVars);
  single videos loop via the `playlist` doubling trick; a track that errors
  inside a playlist is auto-skipped (bounded at 5 consecutive) instead of
  killing the station. The 🎧 button opens the Sounds panel. Spotify
  stations embed Spotify's compact 80px player (Spotify keeps its controls).
  Two failure states, deliberately distinct: the API script failing to load =
  "needs internet", a player error = "won't play" (station-specific).
  YouTube bot-flags automated browsers (ERR 150 even headful), so transport
  playback can only be truly verified by a human in the real app. All 7
  built-in stations verified valid + embeddable via YouTube oEmbed
  (2026-07-26).
  Station model: built-ins + pasted YouTube/Spotify links —
  `lib/musicLink.js` resolves a link to a
  `{provider, id, kind?}` station, persisted to `localStorage`
  (`tasknook.music.custom` / `tasknook.music.station`). No API keys or fees involved
  on either side.
- **Ambience conflicts**: manually picking a weather visual or time of day
  while "Match my real weather" is on turns auto-match OFF (the user's pick
  wins; auto-match's internal appliers bypass this). The iso room takes
  `timeOfDay` too (`ISO_TIME`: window sky/orb + string-light brightness) —
  don't let a new scene hardcode night again.
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
  re-tint. Presets are `[data-theme="abyss|shore|linen|walnut"]` blocks in
  `index.css`; `App.jsx` stamps `data-theme` on `<html>` (not its own root) so
  `<body>`'s gradient sees it. The `custom` scheme has **no CSS block** — 
  `lib/palette.js`'s `derivePalette(hex)` builds the ramp from the picked
  colour's hue/saturation and `App.jsx` sets the vars inline on `<html>`
  (inline wins over `[data-theme]`); switching back to a preset must
  `removeProperty` each `PALETTE_VARS` entry or the custom colours would stick.
  The pick maps faithfully onto the ROSE accent (hue, saturation, and its
  lightness within 52–72%); blush/petal grade off it and the dark surfaces
  keep fixed low-lightness stops — that fixed dark floor is what guarantees
  text stays legible for any colour.
- **Room decoration (freeform)**: the scene's decor is not hardcoded — it's a
  layout of `{id, item, x, y, tint?}` placements the user arranges by dragging
  in edit mode (Room panel → Decorate). `lib/room.js` is the pure model: the
  item catalog, `GRID` snapping, `clampToRoom` (**the only placement rule** —
  the origin stays inside `ROOM_BOUNDS` so items stay grabbable; an item's
  `zone` is just its spawn point and panel grouping, never a constraint),
  painter's-order `sortForRender` (**pure depth**: flat `layer:-1` rugs first,
  then by `y` — no per-kind ordering, an item's depth is wherever the user put
  it), presets, and `validatePlacements` (tolerant: unknown items and invalid
  tints are dropped so catalog changes can't brick a saved room).
  **Recolouring**: sprites paint their main material with
  `var(--tint, <classic colour>)`; the placement `<g>` sets `--tint`. The
  picker is `RoomTintPicker.jsx` — an HTML popover (bottom-centre of the
  scene, the spot the focus timer vacates in edit mode) with a hex field,
  full H/S/L sliders and `TINT_SWATCHES` quick picks; hex/sliders are the
  primary controls because the desktop WebView has no native colour dialog
  (same trade-off as SettingsPanel). Items with no sensible material opt out
  via `tintable: false`; shade details are translucent black overlays, not
  fixed darker hues, so they read over any tint.
  **Room size**: `roomScale` (0.6–1.2, Room panel slider) multiplies the
  responsive `SCENE_WIDTH`; it's a display preference so it lives in
  localStorage (`tasknook.roomScale`), not the DB. Fixed items (`fixed: true`, e.g. the garland) are
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
- **Isometric room (beta)**: a real, decoratable Sims-style room toggled from
  the Room panel (`isoPreview`, localStorage) — it swaps in for `Cottage` and
  keeps its OWN layout:
  `{ w, d, placements: [{id, item, gx, gy, rot?, tint?}] }`
  in tile coordinates, resizable 3–48 per axis (resizing re-clamps footprints
  onto the floor; the camera's zoom-out limit scales with the room, and
  IsoRoom is `memo`'d — a 48×48 lot is thousands of SVG nodes and must not
  re-render on the store's per-second timer tick). **The iso room is the DEFAULT scene** (`isoPreview`
  defaults on; the flat cottage is the opt-out throwback, its card
  drop-shadow removed so it sits into the backdrop). Layouts also carry
  `env` ("room" default, stored
  implicitly; "garden" = open-air: grass floor, soil lip, NO walls — wall
  decor is dropped by validation and hidden from the panel) and `mask` —
  **the floor is a tile mask** (d row-strings of w "0"/"1"s) painted in the
  Room panel's drag-to-draw floor-plan grid, so any shape works: the floor
  is per-tile clipPath'd under one gradient sheet, drags refuse void tiles
  (the item stops at the shape's edge), and validation relocates stranded
  items to the nearest free spot or drops them. Legacy corner-`cuts` saves
  convert via `cutsToMask`.
  **Walls and the front lip are asymmetric, and that asymmetry is the whole
  trick.** `lipRuns` is per tile EDGE — every viewer-facing rim gets the
  slab's 7px thickness, including the rim around a hole punched mid-floor,
  because that rim is exactly what you can see of a hole. `wallRuns` is per
  ROW/COLUMN: only the lot's back SILHOUETTE (the first floor tile you meet
  walking away from the camera). It used to be per-edge too, which is wrong
  the moment a floor plan isn't a rectangle — a wall stands 118px tall and
  its face shows through the void it faces, so a notch painted anywhere but
  the true back raised a full-height slab through the middle of the room with
  only a tile's worth of floor to hide its base. Walls belong where there is
  nothing behind them. The lip is drawn BEFORE the floor for the matching
  reason: its skirt hangs straight down in screen space, so at a concave
  corner it reaches into the top corner of the tile in FRONT of it — and that
  tile is nearer, so letting the floor paint over the intrusion IS the
  occlusion. Move it back after the floor and every step in a floor plan
  grows a dark wedge. Edit-mode keyboard: Backspace/Delete removes the
  selection (unless typing in an input), Escape exits decorating (App's
  handler, before panel-closing). A freshly added item is auto-selected
  (`lastIsoAddedId` → `highlightId`), and the selection chrome (dashed
  footprint + ⟳/✕) renders as the LAST svg layer so nearer furniture can't
  bury it. **Personas**: items with `persona: true` (the Resident 🧍) are
  little people — drop one whose CENTRE lands on an item with a `seat`
  height (stool/sofa/bench/cushion/bed) and `seatFor` seats them there at
  render time (snapped to the seat's centre, +0.15 gy so they draw in front
  of the backrest, lifted by the seat height, sitting pose); on open floor
  they idle-wander via a VISUAL-ONLY offset (never persisted — the stored
  spot is home; the interval collision-checks the floor mask AND furniture
  footprints, and pauses in edit mode). Personas use a CSS transform +
  transition (the glide) instead of the attribute transform others use.
  Seated residents TYPE (`.resident-type` arm bob) while a focus block runs
  (`working` prop = `running && phase === "focus"` — a boolean, so the
  memo'd scene only re-renders on start/stop, not per tick). Items with
  `roamer: true` (the cat) share the wander engine with cat rules: awake
  walking pose while out roaming; once its spot overlaps any `layer:-1`
  item (rug/blanket) it curls up asleep and mostly stays (80% per tick).
  Micro-ambience is CSS one-shots: mug steam, aquarium bubbles, pond
  ripple, plus SkyOverlay's rare shooting star (night, clear sky) and
  passing bird (day) — rarity = a long animation cycle where the visible
  part is a sliver. All motion classes are in the `prefers-reduced-motion`
  block, and motion stays OUT of reading zones (HUD corners) by design.
  `ISO_PRESETS` (Loft ⭐ / Cozy study 🕯️ / Cozy cabin 🪵 /
  Morning café ☕ / Secret garden 🌿 / Corner café 🥐 / Reading room 📚 /
  Terrace 🪴 / Empty room 🫙) are whole-layout
  replacements that set floor size, env and shape too and use `tint`/`rot`
  for mood (applied via validate so preset `cuts` shorthand becomes a mask);
  preset coordinates must be
  half-snapped and in-bounds AS WRITTEN — the
  preset test asserts clamp-stability, so a sloppy coordinate fails CI, not
  the user. `DEFAULT_ISO_PRESET` is what a fresh install opens on (the ⭐
  marks it, so move the star if you move the default) and a test asserts it
  survives validation with every item intact — a starter room that quietly
  loses furniture on first paint is the worst possible first impression.
  **Chairs only have two facings**, and preset seating has to be laid out
  around that: a chair's backrest is drawn at its low-gy edge, so `rot: 0`
  looks toward +gy and `rot: 1` (the mirror, which is a grid transpose)
  toward +gx. A chair can therefore only ever look at something at HIGHER
  gx/gy than itself, which is why the café's pairs sit back-left and
  back-right of their table with their sight lines crossing over it rather
  than flanking it — flanking gave two chairs the same facing, both turned
  away. Genuine face-to-face needs four-way `rot`, which needs real back-view
  artwork per item (a 180° grid turn is `scale(-1,-1)` on screen, i.e. upside
  down) plus a backend change (`_clean_layout` validates `rot` as exactly
  0/1). **The scene is full-bleed, not a card**: the SVG fills the
  viewport and a camera flies over it — wheel zoom anchored at the cursor,
  drag-on-empty-space pans, double-click recenters, all plain viewBox math
  (`tasknook.isoView`, clamped so the room's centre can't leave the view).
  The wheel listener is added manually with `{passive:false}` — React's
  onWheel is passive and can't preventDefault. The flat scene's `roomScale`
  slider is hidden in iso mode (the camera replaces it).
  Model in `lib/isoRoom.js` (footprints, half-tile snapping,
  depth sort by front corner, validation), projection in `lib/iso.js` (2:1
  dimetric; `project`/`unproject` are exact inverses — that's what makes
  grid-dragging work), sprites in `IsoItems.jsx` (drawn for a footprint at
  grid (0,0); linear projection makes them relocatable by translate), scene +
  drag engine in `IsoRoom.jsx`.
  **`clampIsoPlacement` is bounds-only and never consults the mask** — that's
  by design (drags stop at the shape's edge; validation relocates on load),
  but it means anything CREATING a placement has to check the floor itself.
  `newIsoPlacement` runs `footprintFree` and falls back to `findFreeSpot`,
  returning `null` when the drawn shape genuinely has no room: it used to
  spawn at the room centre, which in a courtyard/donut layout is the hole, so
  the new item floated over void and then refused every drag (the engine won't
  move a footprint onto void) until a reload silently rehomed it.
  The Room panel's furniture list and preset buttons both render REAL sprites
  (`IsoItemPreview` / `IsoPresetPreview`), sizing themselves via `getBBox`
  rather than a shared viewBox, and the preset thumbnails apply `seatFor` so
  residents sit where they'll actually sit. The list is **sectioned by
  `ISO_ITEM_GROUPS`** (seating / tables / storage / rugs / light / decoration /
  tech / wall / outdoors / living things) — at 90+ entries a flat grid stopped
  being browsable. Grouping lives beside the catalog rather than as a `group:`
  field per entry, and a test asserts every key appears in exactly ONE section:
  the picker is the only way to add an item, so a key missing from the sections
  is furniture that exists and can never be placed. A section whose every item
  is wall decor renders nothing outdoors rather than leaving a bare heading.
  **`env` is duplicated across two languages** — `ISO_ENVS` here and
  `ISO_ENVS` in `backend/app.py` — and has drifted once already: `cafe`,
  `library` and `terrace` were added to the frontend only, so PUT `/api/room`
  400'd for the three presets that use them and those rooms lived solely in
  the localStorage mirror, toasting "couldn't save" on every change. Adding an
  environment means editing BOTH; `test_room.py` parses this file's `ISO_ENVS`
  block and fails if the backend doesn't accept every key it finds.
  **Reshaping deletes, and deletion must be announced**: `setIsoSize`,
  `setIsoEnv` and `setIsoTile` all re-run `validateIsoLayout`, which drops wall
  decor where there's no wall and anything it can't find floor for. That's
  correct, but it used to happen in silence — furniture you owned vanished with
  no word, which reads as data loss rather than as a consequence of the action.
  They now compare placement counts and `showToast` the difference, same rule
  as the item cap.
  **Rendered-PNG sprites**: 14 items (bed, sofa, armchair, nightstand,
  chair, shelf, bookcase, sidetable, radio, fridge, cafetable, counter,
  coffeecounter, tvunit) are pre-rendered isometric views from Kenney's
  Furniture Kit (CC0 — the hand-drawn SVG versions never stopped reading as
  stacked boxes; see `frontend/src/assets/kenney/LICENSE.txt` for the
  file→item map). One `import.meta.glob` pulls in the whole assets/kenney
  folder (everything there gets bundled — don't park unused renders in it);
  each item is a manifest row of LAYERS in `IsoItems.jsx`, so renders can
  stack (`coffeecounter` = bar + espresso machine, `tvunit` = cabinet + TV;
  a layer's `lift` = the parent's scaled render height minus its base
  diamond, width×0.5774 at the kit camera). All are `tintable: false` (no
  CSS var reaches a PNG) and `noMirror: true`. Fixed recolours are done by
  palette-remapping the committed PNGs (the bed's white duvet: remap hue
  2–28°, sat>0.25 pixels, keep lightness order) — arbitrary live tinting
  stays SVG-only. Fabric pieces (bed/sofa/armchair) instead offer
  **colourway variants**: catalog `variants` maps tint-hex → render suffix
  (`bedDouble_rose_SW.png`…), the placement's ordinary `tint` field stores
  the chosen hex (so persistence/validation are untouched; unknown hexes
  fall back to the default render), RoomTintPicker shows a swatch-only
  popover for these items, and only manifest layers flagged `v` respond
  (a composite's counter doesn't recolour with its machine). New Kenney
  items should come from the SAME kit so the modelled style stays
  consistent.
  **Rotation** (`rot: 0|1`, the ⟳ button when selected): a screen-mirror
  `scale(-1,1)` about the sprite origin IS a grid transpose, so one drawn
  facing per item gives both orientations — `footOf(item, rot)` swaps the
  footprint and everything (clamp, depth, highlight) flows from it. `rot` is
  stored only when 1. `noMirror` items skip the flip and get `rot` as a prop
  instead — they ship a REAL second render per orientation, so lighting
  never flips.
  **Wall items** (`wall: true` — frame, wallshelf, mirror): sprites are drawn
  for the RIGHT wall inside a `skewY(+26.565°)` group (that angle is
  `atan(TILE_H / TILE_W)`); `rot` picks the wall (0 = right, pinned `gy: 0`;
  1 = left, pinned `gx: 0` via the same mirror trick) and clamping glues them
  there — dragging slides along the wall, ⟳ hops walls. They paint first
  (layer −2), behind even rugs.
  **Hit-testing is painted-pixels + the
  footprint diamond only** — a bounding-box grab target lets tall items (the
  floor-lamp pole) blanket everything behind them (found the hard way).
  Persistence: `room_config` now stores `{"placements": [...], "iso": {...}}`;
  GET still understands the legacy bare-list shape; the backend's
  `_clean_layout` passes `rot` through only as exactly int 0/1 (dropping 0).
  `IsoRoom` re-declares the
  `lampPool`/`lampCone` gradient ids — RoomPanel previews reference them
  document-wide and only one scene is ever mounted. Built-in wall decor (the
  window, string lights) only renders when the wall is long enough.
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
  a new NOT NULL column on existing rows). Two traps hit for real: (1) a new
  NOT NULL column needs an explicit `server_default`; (2) **add each column in
  its own `batch_alter_table` block** — two `add_column`s in one block work on
  a normal upgrade but die with a column-ordering cycle when the batch
  recreates the table on a legacy-adopted DB (the schema tests catch this).
  When a migration adds a column, also drop it in
  `tests/test_schema.py::make_pre_migrations`, which rewinds a fresh DB into a
  true baseline-era install. Migrations are the **single source
  of truth** for the schema: there is no `create_all()` fallback, so a model
  change without a migration will break on a fresh DB immediately — which is
  the point (better than silently diverging from what shipped users have).
- **New panel**: create `components/XxxPanel.jsx`, register it in the `PANELS`
  map and `Dock` items in `App.jsx`. Panels are `React.lazy` — each is its own
  chunk behind a dock click, and `App` renders them inside one `<Suspense>`.
  Keep new ones lazy; an eager import pulls the panel back into the entry
  bundle.

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
  begins. To hide such chrome temporarily (the HUD cards + signature step
  aside during room decorating), toggle `visibility` on a wrapper: it removes
  the element from hit-testing without restarting animations.
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

- Frontend: `cd frontend && npm run lint` (ESLint — just core recommended +
  the two battle-tested react-hooks rules; the plugin's compiler-era extras
  are deliberately off), `npm test` (Vitest), then `npm run build` for a full
  parse check. CI runs all three.
  Tests are in two flavours. **Pure logic** (ordering algorithms, the palette
  ramp incl. the dark-floor legibility guarantee, iso geometry/validation,
  local-date formatting) runs in the default `node` environment — keep it
  fast. **Component tests** opt into jsdom per file with a
  `// @vitest-environment jsdom` docblock on line 1 and use
  `@testing-library/react` (call `cleanup()` in `afterEach` — `globals` is
  off, so RTL's automatic cleanup isn't registered). They cover the two
  classes of bug that actually shipped here: hook-order crashes
  (`RoomTintPicker.test.jsx`) and sprites/catalog drifting apart
  (`IsoItems.test.jsx` renders every catalog entry in both orientations).
- Backend: `cd backend && python -m pytest tests -q` — the schema/upgrade
  guarantees (`test_schema.py`), the room layout contract (`test_room.py`),
  task groups + routines (`test_tasks.py`), and the rest of the API
  (`test_api.py`: auth, the two time windows in `/api/stats`, sessions,
  reorder, friend-graph symmetry, and the JSON error/404 contract).
  `pip install -r requirements-dev.txt` first.
  Two things to remember when adding tests here: **demo seeding has already
  run** (the 4 cottage-dwellers own tasks, sessions and friendships, and every
  new account is auto-friended with them), so scope assertions to your own
  user rather than counting rows globally; and Flask locks its routing table
  after the first request, so a test that registers a route must do so before
  touching `client`.
- **Schema drift**: `flask db check` reports "new upgrade operations" whenever
  `models.py` has changes with no matching migration. CI runs it.
- **The packaged app**: `npm run build` and `import app` can BOTH pass while
  `TaskNook.exe` is completely broken — the backend ships as loose data, so a
  missing `--hidden-import` only fails at runtime, silently (`--windowed` has
  no console). The only real check is running the artifact:
  `set TASKNOOK_SELFTEST=1 && TaskNook.exe` → exit code 0. CI does this on
  every push (`.github/workflows/ci.yml`).
- No UI/component tests yet — verify visual changes by running both servers.
