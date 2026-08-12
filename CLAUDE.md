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
│       │   ├── profile.js    # who you are + how your resident is drawn (pure)
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
than publishing GitHub Releases — the download link never moves.
**Rebuild the exe on EVERY change that reaches it** (owner's decision,
2026-08-01), so the committed binary is never behind the source. Anything
that touches `frontend/`, `backend/`, `desktop.py` or `build-exe.bat`
reaches it; a docs- or test-only commit does not. The cost is real and
accepted: each rebuild adds ~42 MB to git history **permanently** (the repo
was already 470 MB across 24 builds when this rule was adopted), so `.git`
grows by roughly the size of the exe per shipped commit and clones get
slower forever. Git LFS is the escape hatch if that ever bites — it keeps
both this rule and the stable link. `TaskNook.command` remains the
macOS/Linux one-click launcher (build + install + launch from source).
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
  catch also calls the store's `showToast(message, ms = 4000)` (one transient
  glass pill, top-centre; rendered in `App.jsx`). It auto-dismisses after
  `ms` and is also a `<button>` that closes on click — 4s suits a failure you
  just caused and are looking at, while the break nudge arrives unprompted
  and asks for 60s. Only the PILL takes pointer events; its full-width
  wrapper stays `pointer-events-none` (it spans the window and would eat
  clicks on the scene) and carries `aria-live` so each toast is announced.
  Refusals toast
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
  association table. `User.profile` and `User.character` are JSON blobs, not
  columns per field — same bargain as `room_config`/`unlocked`, and the whole
  point of a profile is that questions get added later. `Task.notes` is free text and `Task.due_date` is a
  DEADLINE — which `scheduled_date` deliberately isn't: that one is where you
  put the task on the calendar, and nothing sorts or warns on it. Both go
  through `clean_date`, which replaced a bare `value[:10]` slice that let any
  ten-character string sit in a date column and then fail to compare against
  anything. Editing them is an inline expander on the to-do row (`TaskDetails`
  in `HudTasks.jsx`), not a dialog, per the VC2 north star; it saves on BLUR
  rather than per keystroke because every write refetches, and it lives at
  MODULE scope for the same reason `Row` does — an inner component would
  remount once a second while a focus block runs and wipe the half-written note. `Task.group_name` is the VC2-style to-do group header
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
- **Focus history is SHOWN, not just collected.** `sessionDays` holds full
  per-day minutes; the calendar used to reduce it to one flat tint, so five
  minutes and five hours looked identical, and ProgressPanel was 100% today-only
  — months of data behind a boolean. Both now shade by `intensityOf`/
  `intensityScale` (`lib/stats.js`), whose scale is the TERTILES OF YOUR OWN
  non-zero days: a fixed scale would leave a 20-minute-a-day habit on the palest
  step forever. ProgressPanel also draws an 18-week heatmap plus best-day /
  this-week / vs-last-week (`focusWeeks`, `focusSummary`). Days after today are
  drawn as empty slots, never as zero-focus days — "you did nothing on Friday" is
  a lie when it's Wednesday — and `deltaPct` is `null` rather than 0 when last
  week was empty, because "up 0%" and "your first week" are different statements.
- **Calendar activity marking**: `GET /api/sessions/days` aggregates focus
  minutes per day (`{day: minutes}`), fetched into `store.jsx`'s `sessionDays`
  as part of `refreshAll()`. `CalendarPanel.jsx` unions that with days derived
  from `task.completedAt` (routed through the same local-date `toISO()` used
  elsewhere) to tint "active" days — filtering on `minutes > 0`, not on the
  key existing. `POST /api/sessions` refuses anything under a minute for the
  same reason (a zero-minute row is not a day you focused).
- **The focus journal**: `GET /api/sessions/day?day=YYYY-MM-DD` groups that
  day's sessions by `task_name` (summed, longest first) so the calendar can say
  what a day went ON, not just how long. Its own endpoint rather than folded
  into `/sessions/days`, which is fetched wholesale on every `refreshAll()` and
  paints a whole month — names are wanted one day at a time. `CalendarPanel`
  fetches it per selected day, keyed on `sessionDays[selected]` so finishing a
  block updates the breakdown without an unrelated task tick refetching it.
  A block run with **no active task sends `taskName: null`** and prints as
  "Untitled block": `timer.jsx` used to substitute the literals `"Focus"` and
  `"Stopwatch"`, which made untitled time split across two rows that looked
  like tasks you had named. Rows logged before that fix still carry them.
- **Profile & character** (`lib/profile.js`, `ProfilePanel.jsx`, GET/PUT
  `/api/profile`): who you are (name, pronouns, MBTI, birth date → zodiac
  derived by a pure function, bio) and how your resident is DRAWN (model, skin,
  hair + colour, outfit, expression, and body width/height sliders — `build`
  survives in storage as the width's legacy default; the body's geometry and
  slider ranges live in `lib/body.js`). Same division of labour as the
  room and the unlock list — the backend guarantees only a bounded flat map of
  scalars, this file owns the vocabulary, so a new question or hairstyle is a
  frontend change with no migration. The character drives the `resident` sprite
  in the iso room; a placement's own `tint` still overrides the profile outfit,
  so one differently-dressed resident stays possible. Birth dates are parsed
  from LOCAL parts, never `new Date(str)` — that reads a bare date as UTC and
  hands anyone west of Greenwich the previous day, and therefore the wrong star
  sign on a cusp. **Drawing rules for the two bodies and the three hair layers
  live in `docs/MODELS.md`.**
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
  **Break nudge** (`lib/breaks.js`, toggle in ProgressPanel,
  `tasknook.breakNudge`): after `BREAK_NUDGE_MINUTES` (120) of unbroken
  PRESENCE, a 60s toast suggests standing up. The trigger is neither of the
  two obvious things, and both were tried:
  **focus-timer seconds is too narrow** — plenty of studying happens with a
  textbook and no timer running, and those people got nothing (user
  feedback); **app-open time is too broad** — TaskNook is half ambient
  furniture, people leave it running all day for the room and the rain, so it
  would scold someone out cooking dinner and make a cozy app feel like it was
  watching them. `isPresent()` splits the difference: the window is visible
  AND there's a sign of a human — an interaction within
  `IDLE_GRACE_MINUTES` (2), or a focus block running (deliberate study away
  from the keyboard is exactly what the timer marks). Being away does NOT
  reset the run immediately (a twenty-second alt-tab is not a break); it
  resets after `REST_MINUTES` (5) gone straight.
  It **stands down only while a pomodoro is actually RUNNING** — that already
  stands you up on a schedule and a second reminder would land mid-break, but
  merely having the setting enabled mustn't silence the nudge for someone
  studying without it.
  The sampler is its OWN always-on interval (`PRESENCE_TICK_SECONDS`, 15) and
  not the timer's 1Hz tick, because the whole point is to notice time no
  focus block is measuring; the counters are REFS, since they move on a timer
  and nothing renders from them (state would rebuild this provider's context
  for nothing). Deliberately in-memory — a reload starts the run over, a fine
  approximation of having got up. The rules are pure functions in
  `lib/breaks.js` precisely because they otherwise sit inside a
  `setInterval` that only runs in a live app; `breaks.test.js` covers them,
  including that an unattended app stays quiet. The toast and the toggle both
  word the threshold through `formatSpan`, so retuning the constant can't
  leave one of them claiming the old number ("120 minutes without a break" is
  not how anyone says it).
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
  **Before drawing or changing an iso model, read `docs/MODELS.md`** — the
  declared spec for sprites: the five silhouette rules, the geometry and
  height reference, the shared helpers, the colour/opacity table, and the
  review loop. It is the authority on models.
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
  **The bar RESUMES across launches**: `tasknook.music.on` brings the
  transport back, and `tasknook.music.resume` (station key, playlist index,
  seconds, title/duration — written ~every 5s while playing, on every pause,
  on pagehide, and on player teardown) lets the boot mount CUE the saved spot
  instead of autoplaying. Deliberate: there is no user gesture at boot, so
  autoplay would be blocked anyway — cueing shows the saved track and time
  with ▶ armed, and the first press resumes exactly there. Only the FIRST
  player mount after launch may cue (a later mount is a real station click
  and plays as always); the bar's track state is SEEDED from the record so
  the position shows before the player even loads, and the 1Hz poll skips
  CUED/UNSTARTED states (a cued player reports duration 0, which the bar
  would misread as LIVE and wipe the seed). Singles loop by hand on ENDED —
  cueVideoById drops the constructor's doubled-playlist loop. Spotify
  stations get the bar back but not the position (the embed owns playback).
  Station model: built-ins + pasted YouTube/Spotify links —
  `lib/musicLink.js` resolves a link to a
  `{provider, id, kind?}` station, persisted to `localStorage`
  (`tasknook.music.custom` / `tasknook.music.station`). No API keys or fees involved
  on either side.
- **Ambience conflicts**: manually picking a weather visual or time of day
  while "Match my real weather" is on turns auto-match OFF (the user's pick
  wins; auto-match's internal appliers bypass this). The iso room takes
  `timeOfDay` too (`ISO_TIME`: window sky/orb + string-light brightness) —
  don't let a new scene hardcode night again. **Time of day has to reach the
  BACKDROP and the room's own surfaces**, not just the window: `SkyOverlay`'s
  `DAY_LIFT` brightens the sky behind everything and `ISO_TIME.lift` washes the
  walls and floor (never the furniture — that would flatten every colour the
  user picked). Both were once so timid that day and night looked identical.
  `DAY_LIFT` is a **measured ceiling, not a taste knob**: the to-do list is
  drawn straight onto the backdrop in cream with no card behind it, so
  `SkyOverlay.test.js` composites the wash over every theme's darkest stop and
  fails if contrast drops below WCAG AA — and also fails if the value creeps
  back down to invisible.
- **Time of day can follow the CLOCK** (`autoTimeOfDay`,
  `tasknook.timeOfDay.auto`; bands in `lib/daylight.js`) — no location, no
  network, so it works offline like everything else. Mutually exclusive with
  "Match my real weather", which also owns the time of day and does it better
  when available (real sunrise/sunset knows your latitude and the season); both
  writing one value would just be two appliers racing. A manual pick switches
  both off, same rule the weather setters already follow. "Sunset" covers dawn as
  well as dusk — there is no separate sunrise scene and the warm low sun reads as
  either.
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
  `.cozy-scroll` paints a plum scroll-shadow at both edges, which only works
  INSIDE a glass card — on the backdrop it has nothing to blend into and reads
  as a dark slab laid over the room. Chrome drawn straight on the scene (the
  HUD to-do list) adds `.cozy-scroll--bare`, which keeps the scrollbar styling
  and drops the wash. The fade isn't reproduced with a mask: the list is
  auto-height under a cap, so with two or three tasks nothing scrolls and the
  first and last rows would be washed out permanently to hint at a state that
  rarely happens.
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
- **The furniture store** (`lib/unlocks.js`): **nothing costs anything today,
  and that's deliberate.** The first cut priced most of the catalog and gated
  it behind focus minutes; the call was that you don't take away decorations
  people already have. So the rule inverted — everything is free unless listed
  in `PREMIUM`, and `PREMIUM` is empty. With it empty the feature is INERT:
  `owns()` is true for everything, the picker shows no locks, and the balance
  chip doesn't render (`storeIsOpen()` gates it — a balance you can't spend is
  a confusing number). What survives is the machinery, because it's the fiddly
  part and it's already migrated into the DB: ownership, persistence,
  validation, and a balance that is **derived, never stored** — focus minutes
  earned minus the cost of what's owned, so it can't drift out of step with
  the sessions it came from, clamped at zero so a re-price can't put an owner
  in debt. Adding a premium piece later is one line in `PREMIUM`. The tests
  price something temporarily to exercise the arithmetic, or it would sit
  untested until the day it first matters. Backend (`user.unlocked`) stores the
  key list and nothing else — pricing there would duplicate catalog knowledge
  across two languages, exactly how `ISO_ENVS` drifted. **If a store never
  happens, this file and the column are what to delete.**
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
  **Room size**: gone with the card. The flat scene is full-bleed now, so
  the old `roomScale` slider had nothing left to scale and was removed from
  the Room panel (2026-08-10); `tasknook.roomScale` lingers in old storage,
  read by nothing. Fixed items (`fixed: true`, e.g. the garland) are
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
- **Scene sizing & animation**: the flat scene is **FULL-BLEED** (owner
  decision, 2026-08-10 — the card era's centred `min(90vw, 84vh)` sizing is
  gone): the svg fills the viewport with `viewBox "-320 0 1280 480"` and
  `preserveAspectRatio="xMidYMax slice"`, so the wall runs edge to edge, the
  desk anchors the BOTTOM of the window (first-person at your desk), wide
  windows crop the wall's sides and ultra-wide ones crop upward into wall
  that extends above the viewBox for exactly that reason. Decor coordinates
  were untouched — the viewBox widened symmetrically about the old canvas,
  so saved placements land where they always did, and `clampToRoom` still
  bounds them to the original room area around the desk. Verified by
  headless screenshot at 16:9. Idle ambience (plant sway, garland twinkle, lamp breathe) is **CSS**
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
  decor is dropped by validation and hidden from the panel). **The Room panel
  sells envs as FLOOR choices** (Boards 🪵 / Dark boards 🟫 / Terracotta 🧱 /
  Stone 🪨 / Grass 🌿 — owner decision, 2026-08-10: "setting" was a second
  room-identity concept fighting the presets for the same job, and the floor
  material is what you actually see); each floor still brings its env along
  (window, string lights, lip colours) and sets a walls DEFAULT, which the
  panel's separate WALLS row overrides — `walls` on the layout, one of
  full/low/none, stored only when it differs from the floor's default and
  mirrored in app.py's `ISO_WALLS` (same both-languages drift contract as
  env). Open air hides the window and string lights, and turning walls off
  drops wall decor via the same announced reshape as everything else.
  Layouts also carry `mask` —
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
  **Things on tables**: an item marked `stacks` whose centre lands on one with
  a `surface` height renders lifted onto it (`surfaceFor` →
  `stackedPlacement`) — render-time only, same as seating, so persistence and
  the drag engine know nothing about it. It **keeps the spot it was put down
  on**, clamped so its footprint stays on the surface; it used to snap to the
  surface's dead centre, which meant one table could only ever show ONE thing
  — a second item drew at exactly the same point and was invisible however far
  apart the two were written. Eight items across the shipped presets were
  hidden this way (a mug inside a computer; four hall tables each with a mug
  inside a bookstack). The test that guards this compares RESOLVED positions,
  not written coordinates, because the clamp can bring two different ones
  together. RoomPanel's preset thumbnails resolve stacking too, or they show
  the mug on the floor beside the desk.
  Micro-ambience is CSS one-shots: mug steam, aquarium bubbles, pond
  ripple, plus SkyOverlay's rare shooting star (night, clear sky) and
  passing bird (day) — rarity = a long animation cycle where the visible
  part is a sliver. All motion classes are in the `prefers-reduced-motion`
  block, and motion stays OUT of reading zones (HUD corners) by design.
  **Ambient loops are desynchronised per item by two inherited custom
  properties** that IsoRoom's `ambienceVars(gx, gy)` sets on each placement
  group: `--phase` (a negative `animation-delay`) and `--dur-scale` (period
  ×0.90–1.12, spent by the long loops — sways, gestures, ear flicks, the light
  pools, and the flame/pool pair, whose periods must MATCH so a flame and the
  light it casts stay on one clock). CSS variables inherit, so those
  two properties reach every animation inside the sprite — a new sprite is
  desynchronised for free, but a new ambient *class* must declare
  `animation-delay: var(--phase, 0s)` AFTER its `animation` shorthand (which
  resets delay) or it silently reverts to lockstep. Without this 45 plants
  swayed as one body and 44 stars shared 9 delays, blinking in groups of five.
  Derive from the tile, never `Math.random` — the scene re-renders on a timer
  and a changed value restarts every animation. The phase is in HUNDREDTHS
  because it's only worth what it is modulo the loop it delays: tenths gave the
  0.5s loops (`leg-step`, `resident-type`) five positions, so eight seated
  residents typed on four beats. `room-breathe` pulses OPACITY
  and is for lamp pools and water, not bodies (a person went half-transparent
  every three seconds); living things scale, via `body-breathe`/`cat-breathe` —
  which now includes the birdcage's bird, the last living thing left fading.
  **Residents have IDLE GESTURES** — yawn (head back + an opening mouth),
  stretch (both arms), glance (head turn) and rub an eye (one arm up to the face
  + the head leaning into it). Pure CSS, four cycles of PRIME length
  (53/79/89/101s) drifting against each other so the sequence takes hours to
  repeat; each action is 3.2–4.0s, adding up to ~19% of the time in motion (the
  first cut held percentages instead of seconds and hit 37%, which is a fidget).
  Three rules a new gesture must follow, each learned here: `--phase` is
  MULTIPLIED to cover its own cycle (raw, it makes the whole room yawn in the
  same 7s window and then freeze together); keyframes start AND end neutral, and
  a rest state that can't be a transform goes in a presentation attribute (the
  mouth, or reduced motion leaves everyone gaping); and one element per moving
  cycle, so the head is three nested wrappers. Arm gestures yield to
  `resident-type` while a focus block runs — hands on a keyboard are already the
  animation — but the head never does, because yawning at your desk is the point.
  `motion.test.js` pins the duty cycle and the two-part gestures' shared clock.
  **A BREAK is visible in the room.** The prop is `activity`
  (`"focus" | "break" | null`) — one string rather than two booleans, because the
  states are exclusive and it still changes rarely enough that the memo'd scene
  only re-renders on a phase edge. On focus the seated resident types; on a break
  they put the keyboard down, a steaming mug appears in the near hand, and
  `break-stretch` plays ONCE as a cue (no `--phase`: it answers something you did,
  so it lands when it happens rather than somewhere in the next 89 seconds). The
  mug lives INSIDE the arm group so it tracks the hand through every gesture, and
  both halves of the eye-rub stand down while it's held — at 186° the arm would
  swing a cup over the face upside down. Before this, `working = running && phase
  === "focus"` meant a break was indistinguishable from idle in the room; the only
  break-specific visual anywhere was the `you` persona's thought bubble.
  **Animals gesture too**: `tail-sway` on the WALKING poses (a continuous
  counterbalance — `tail-flick` is a rare twitch and was only ever on the sleeping
  poses, so a prowling cat's tail was frozen stiff over its back while its legs
  stepped underneath) and `ear-twitch` on the near ear.
  See docs/DESIGN.md's "Motion" for the full rules and the measured budget.
  `ISO_PRESETS` (Loft ⭐ / Cozy study 🕯️ / Cozy cabin 🪵 /
  Secret garden 🌿 / Corner café 🥐 / Reading room 📚 /
  Study hall 🧑‍🤝‍🧑 / Terrace 🪴 / Autumn yard 🍂 / Empty room 🫙) are whole-layout
  replacements that set floor size, env and shape too and use `tint`/`rot`
  for mood (applied via validate so preset `cuts` shorthand becomes a mask);
  preset coordinates must be
  half-snapped and in-bounds AS WRITTEN — the
  preset test asserts clamp-stability, so a sloppy coordinate fails CI, not
  the user.
  **A room can pass every footprint check and still read wrong**, because
  the collision test works in GRID space and the eye works in SCREEN
  space: anything taller and further back lands visually ON what's in
  front of it. In the Secret garden a flowerbed two rows behind the
  hammock sat inside its sling, and a rock behind the bench grew out of
  the resident's head — both legal, both wrong. Look at the room.
  **Four rooms were decluttered after being photographed** (user feedback,
  "a little too cluttered"): Cozy cabin 27 → 15 (its back quadrant was a
  storage pile — crates, ladder, basket, radio and two oversized monsteras in
  one corner, plus three rugs and four light sources), Corner café 47 → 17,
  the Autumn yard recomposed, and Secret garden 27 → 15 (it had an
  office DESK and laptop standing on the grass, with a stool and stacked
  crates beside them). Two lessons worth keeping:
  **cutting alone can overcorrect** — at 17 pieces the café rattled around a
  12×9 floor and read as empty, so the ROOM shrank to 9×7 rather than the
  furniture growing back; and **a preset can be the right size and still read
  as random** — the Autumn yard was always 15 pieces, but evenly distributed.
  Grouping them into three clusters (the sitting corner, the job half-done,
  the harvest) with open ground between is what made it a place. Count is
  necessary, composition is not optional.
  **Autumn yard** is the seasonal preset and the reason the autumn set exists
  as a set. Open air (garden env), FOURTEEN pieces — the temptation
  with a themed room is to use every piece in the theme, and the wreath is
  deliberately left out because there is no wall to hang it on. Two things
  needed fixing after looking at it: three pumpkins half a tile apart read as
  one STACKED on another (they're 16px tall and the grid is 24px, so anything
  short wants a full tile between it and its neighbour), and a summer-green
  birch and bush beside two maples made the season read as ambiguous — both
  now carry autumn tints.
  **Preset rooms are meant to be clean and functional — a target of about
  FIFTEEN pieces, not a showcase** (user decision).
  **NPC residents live only in the COMMUNAL presets** — the cafés, the
  Reading room, the Study hall (owner decision, 2026-08-09). Personal rooms
  ship their seats empty: a stranger studying at your desk reads wrong when
  the app has a `you` persona, while an empty desk chair or pond bench is an
  invitation. A café with nobody in it reads as closed, so the communal
  rooms keep their people. **The two café presets merged** (owner decision,
  2026-08-10): Morning café's facing-chair table sets joined Corner café's
  counter run — two cafés that each had half of a café was a preset slot
  spent twice — and the Morning café preset was retired; its customer moved
  with its tables. The presets are NOT a
  shop window. A new piece belongs
  in the picker; it does not have to be placed in a built-in room, and the
  built-in rooms are deliberately left alone. There WAS a test asserting every
  catalog key appeared in some preset, and following it produced exactly what
  the user then rejected twice — crowded rooms ("more minimal is better than
  crowded", then "we do not need to touch our preset rooms"). The test is
  gone; don't reintroduce it. A room gets ONE rug, and when a piece has
  nowhere to go without crowding, the answer is to leave it in the picker.
  Placing into a preset at all is not eyeballing: dump the floor occupancy
  first (tile map of what's taken), because the two bugs this produced — a jar
  stacked invisibly on a mug, a cat spawned inside a chair — both came from
  guessing coordinates. Wall decor needs its own check: the Reading room and
  Study hall had bookshelves along the ENTIRE back wall, so an arch and a
  window placed there were drawn behind the shelving and invisible. A wall
  that's already full has no room for architecture.
  Placing into a preset is not eyeballing: dump the floor occupancy first
  (tile map of what's taken), because the two bugs this produced — a jar
  stacked invisibly on a mug, a cat spawned inside a chair — both came from
  guessing coordinates. Wall decor needs its own check: the Reading room and
  Study hall had bookshelves along the ENTIRE back wall, so an arch and a
  window placed there were drawn behind the shelving and invisible. Opening a
  bay (dropping three shelves) is the fix; a wall that's already full has no
  room for architecture.
  `ISO_MAX_ITEMS` is **150** (backend bounds a payload at 200). It was 60,
  which silently truncated the Study hall — a 16×12 room with four tables,
  sixteen chairs, people in them and shelving along two walls is ~75 pieces.
  Room SIZE was never the constraint: the floor has gone to 48×48 all along,
  and a full hall renders in ~2,500 SVG nodes. `DEFAULT_ISO_PRESET` is what a fresh install opens on (the ⭐
  marks it, so move the star if you move the default) and a test asserts it
  survives validation with every item intact — a starter room that quietly
  loses furniture on first paint is the worst possible first impression.
  **Two of the four facings are free; the other two are drawn.** Rot 0 and 1
  are one sprite (a screen mirror IS a grid transpose), but the half turn to 2
  is `scale(-1,-1)` on screen — the sprite upside down — so the away-facing
  pair needs REAL back-view artwork. Seating that has it is marked
  `backView: true` (sofa, armchair, chair, deskchair, bench) and gets all
  four; everything else stays two-way, and `rotationsFor` / `normalizeRot` are
  what guarantee a rot an item can't be *drawn* in never reaches the renderer.
  Wall decor is always two-way — there `rot` picks the wall, not a facing.
  This is why the café's chairs can finally sit ACROSS a table from each other
  (`rot: 2` on the near one) instead of both being tucked behind it. **The scene is full-bleed, not a card**: the SVG fills the
  viewport and a camera flies over it — wheel zoom anchored at the cursor,
  drag-on-empty-space pans, double-click recenters, all plain viewBox math
  (`tasknook.isoView`, clamped so the room's centre can't leave the view).
  The wheel listener is added manually with `{passive:false}` — React's
  onWheel is passive and can't preventDefault.
  Model in `lib/isoRoom.js` (footprints, half-tile snapping,
  depth sort by front corner, validation), projection in `lib/iso.js` (2:1
  dimetric; `project`/`unproject` are exact inverses — that's what makes
  grid-dragging work), sprites in `IsoItems.jsx` (drawn for a footprint at
  grid (0,0); linear projection makes them relocatable by translate), scene +
  drag engine in `IsoRoom.jsx`.
  Screens share one helper: `ScreenFace` draws the glass inset into its
  bezel plus a hint of a picture, and the television, the TV unit's set and
  the monitor all call it — the unit's set was visibly plainer than the
  standalone TV the moment that existed. `tv` and `laptop` are placeable
  and `stacks`, as well as being parts of `tvunit` and `desk`: what sits ON
  furniture should be movable. A desk therefore still draws its own laptop,
  so putting a second one on it doubles up — splitting that out would
  change how three shipped presets look, which is why it hasn't been done.
  **Thematic sets get their OWN picker section** (kitchen, food & drink, and one
  per season: autumn, winter, spring). Seven seasonal pieces scattered alphabetically through a 130-item
  catalog are seven unrelated things; under one heading they read as a set and
  give someone a reason to redecorate. A section is also where `fridge` and
  `mug` finally landed — both had been sitting in "Storage" and "Decoration"
  because nothing better existed.
  **What "clean" means for a model** — the five silhouette rules, the height
  reference, the shared helpers and the standard face opacities all live in
  `docs/MODELS.md` now rather than being restated here.
  **Detail lives in the shared helpers first.** Nearly every piece is built
  from `TintedBox`, so its contact shading — a short dark band where each box
  meets whatever it stands on — gives the WHOLE catalog weight from one edit;
  without it a box looks pasted onto the floor rather than resting on it. Same
  reasoning for `RugGround` (ground + inset lighter field, so the border is an
  AREA and not a hairline), `Fringe` (strands expressed in grid space, so they
  land at the right screen angle for free) and `Planks` (seams across a
  tabletop — a bare slab reads as flat-pack). Reach for a per-sprite fix only
  when the shared one can't say it. To judge the catalog, render every sprite
  into one labelled contact sheet rather than hunting item by item through
  rooms: that is how five rugs were found to be untextured solid diamonds
  while the two newest ones were properly woven.
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
  `ISO_ITEM_GROUPS`** (seating / tables / storage / rugs / light / plants /
  decoration / tech / architecture / wall / kitchen / food & drink / autumn /
  outdoors / living things) — at 100+ entries a flat grid stopped being
  browsable. Plants earned their own section
  once there were a dozen of them; before that they were swamping "Decoration",
  which is where anything unclassified had been landing. Grouping lives beside the catalog rather than as a `group:`
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
  **Architecture: openings are RECESSES, not holes.** `archway`, `doorway` and
  `bigwindow` are ordinary wall items (`wall: true`, so `rot` picks the wall
  and clamping glues them to it) drawn in the same `skewY(SKEW)` space as a
  picture frame. They are deliberately NOT punched through the wall geometry:
  a real hole would show the sky behind an interior wall, which is wrong,
  whereas a dark reveal with a sliver of lit floor beyond reads as another room
  and costs one sprite. A room of nothing but flat walls reads as a box — the
  reference art always gives the eye somewhere to look through.
  **Depth in an opening comes from TWO rings, not one.** Each of the three
  draws an outer moulding and a second frame stepped in from it, so the glass
  or the dark reveal sits INSIDE the wall; with a single ring they read as a
  shape cut out with scissors. The same pass gave the arch a keystone and a
  threshold, the door an architrave standing proud of the wall plus panels
  with a light top edge and a dark bottom one (a flat dark rectangle is a
  sticker; the two edges make it a recess), and the window a sill with a
  return and a transom.
  `stairs`, `railing` and `pillar` are architecture that stands ON the floor
  rather than hanging on a wall, so they're ordinary placements. The stair is
  a **solid stepped mass** — every tread is a box running from the floor up to
  its own height, so each nearer step overlaps the base of the one behind it;
  built as slabs floating at their tread height you see daylight under the
  flight. It climbs AWAY from the camera (the first version ascended toward
  the viewer, which left the head of the flight hanging in mid-room), and it
  is six steps rather than a full storey's eight, because at wall height it
  swallowed whatever stood behind it. Where it goes at the top is deliberately
  not modelled: a real upper floor means giving every placement a level, and
  the depth sort and drag engine would both have to learn about height.
  **Light is cast by the SCENE, not by each sprite.** A catalog entry declares
  `glow: [radius, strength]` and IsoRoom draws one warm pool per light source
  on the floor, clipped to it, under the furniture — so a new lamp needs one
  field, not artwork, and every source dims together via `ISO_TIME.glow` (1 at
  night, 0.7 at sunset, 0.25 by day). Five sprites used to draw their own pool:
  they doubled up with this pass and, worse, stayed at full brightness at noon,
  which is what made them read as stickers rather than light. Don't add a
  `lampPool` ellipse to a sprite — add the field.
  **The pools also MOVE, and how is a second field.** `flicker: true` (flames:
  fireplace, candle, candelabra, jack-o'-lantern, sconce, garden lantern) casts
  `pool-flicker` — uneven keyframe stops and a slight scale wobble, so it guts
  and recovers; everything else gets the near-invisible `pool-breathe`. They
  were static, which left a candle's dancing flame sitting over a dead circle
  of light. The pool's real opacity (`strength × ISO_TIME.glow`) stays on a
  WRAPPER `<g>` with the animation on the child ellipse: keyframes animate
  opacity absolutely, so animating the same element would override the
  daylight dimming and put lamplight back at full strength at noon.
  **Surfaces carry a MATERIAL, not just a colour.** Each env names a
  `floorStyle` (`boards` / `tiles` / `stone` / `grass`) that `FloorSurface`
  draws over the colour gradient, inside the same floor clip: planks with
  staggered brick-bond end joints, half-tile tiling, per-tile flagstones whose
  joints wander by tile index, mown stripes. Walls get one panel seam per tile
  plus a skirting band and a picture rail. It is all `<line>`/`<polygon>` in
  GRID space — `project()` puts it on the right plane for free — and every
  value is derived from the tile index, never `Math.random`, because the scene
  re-renders and a reshuffling floor would crawl. This was the biggest gap
  against the reference art: the floor is the largest surface on screen and a
  flat gradient reads as a coloured plane. **The tile grid is now an edit-mode
  aid only** — out of edit mode the grain speaks for itself and the grid just
  muddied it.
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
  **Rotation** (`rot: 0-3`, quarter turns anticlockwise; the ⟳ button cycles
  through however many the item has). ODD turns are a screen-mirror
  `scale(-1,1)` about the origin, which IS a grid transpose, so `footOf`
  transposes the footprint on 1 and 3 and everything (clamp, depth, highlight)
  flows from that; a half turn covers the SAME tiles and only changes which
  way the thing looks. The sprite gets `back` for rot ≥ 2 and draws its real
  back view — the near-edge parts are painted LAST there, since a backrest
  that was behind the seat is now in front of it. `rot` is stored only when
  non-zero. The backend bounds it to 0-3 and nothing more: which items have
  four facings is artwork knowledge, so `normalizeRot` on the client is what
  folds an unsupported turn back to a drawable one.
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
