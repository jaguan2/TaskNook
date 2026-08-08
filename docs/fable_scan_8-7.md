# Fable codebase scan — 2026-08-07

A full-codebase audit (backend API, frontend state core, iso rendering stack, libs/panels)
looking for optimization opportunities, better implementations, and feature ideas.
Findings were verified against the on-disk code **including uncommitted WIP**, and
anything CLAUDE.md documents as a deliberate decision was excluded.

**Overall verdict**: the codebase is in genuinely good shape — backend validation is
unusually careful, the historical N+1 in `/api/friends` was already fixed, and the big
architectural perf decisions (timer provider nesting, `IsoRoom`'s memo,
CSS-over-framer-motion) all hold up under inspection. What the scan found instead is a
cluster of real-but-quiet bugs, one clear performance theme (drags and pans write
through far more of the app than they need to), and a lot of collected data that never
reaches the screen — which is where the best feature opportunities are.

---

## 1. Bugs (ranked by real-world impact)

### Top tier

- [ ] **1.1 Focus timer counts interval callbacks, not wall-clock time** — `frontend/src/timer.jsx:297-305`
  `remaining`/`elapsed` drop 1 per `setInterval` tick. Browsers throttle hidden-tab
  timers (Chromium's intensive throttling can slow to ~1 tick/minute), so a 25-minute
  block stretches much longer whenever the window is minimized — and the completion
  notification, which exists precisely for someone who stepped away, fires late for
  exactly that person. **Fix**: store an absolute deadline (`endAt`) at start; each tick
  and each `visibilitychange` compute `remaining = endAt - Date.now()`; keep the 1s
  interval purely as a repaint trigger.

- [ ] **1.2 Clicking a focus preset mid-run mis-logs the session** —
  `frontend/src/components/HudFocusCard.jsx:252-266` + `frontend/src/timer.jsx:136-144`
  The preset pills are not `disabled={running}` (the mode toggle at line 238 is), and
  `setFocus` updates `focusMinutes` unconditionally — only the `remaining` reset is
  guarded. Start a 60-min block, tap "15m" mid-run → completion logs
  `focusMinutes * 60 + nudgeSeconds` = 15 minutes for an hour of focus; the progress-bar
  total and pomodoro pips shift immediately. Feeds wrong data into the streak, daily
  goal, sessionDays, and the calendar. **Fix**: `disabled={running}` on the preset pills
  (matching the mode buttons) and/or make `setFocus` a no-op while running.

- [ ] **1.3 Backend: re-sent `completed: true` re-stamps `completed_at`** — `backend/app.py:412-414`
  Any PUT including `completed: true` for an *already-completed* task moves
  `completed_at` to now: inflates `tasksDoneToday`, re-tints today on the calendar, and
  cancels a routine's pending lazy reset. Current frontend callers happen to be safe
  (verified), so this is **latent** — but one "send the whole task object" refactor away,
  and nothing fails loudly. **Fix**: only stamp on an actual state transition
  (`if bool(data["completed"]) != task.completed:`).

- [ ] **1.4 Rotating an iso item can strand it on void tiles** — `frontend/src/store.jsx:450-466`
  `rotateIsoItem` transposes the footprint and calls only `clampIsoPlacement`, which is
  bounds-only by design — nothing checks the floor mask. Rotating a long item (e.g.
  `stairs`, foot [1, 2.5]) near a painted-away region leaves it overlapping void; the
  drag engine then refuses every move, so it reads as "stuck" until a reload silently
  rehomes it — the exact failure `newIsoPlacement` was recently fixed for. **Fix**: after
  clamping, `if (!footprintFree(...))` → `findFreeSpot(...)` or keep the old rot + toast.

- [ ] **1.5 Wanderers restart their animations on every roam step** — `frontend/src/components/IsoRoom.jsx:883`
  `ambienceVars(p.gx, p.gy)` is fed the *offset* position from `effective`, but the
  comment directly above says it must come from the item's HOME square for exactly this
  reason — each ~3.5s glide changes `--phase`/`--dur-scale`, restarting the walking gait
  / `cat-breathe` mid-cycle (a visible hitch on every step). **Fix**: stash home coords
  before offsetting (e.g. `_hx`/`_hy` in `effective`) and feed those to `ambienceVars`.

- [ ] **1.6 YouTube API retry can never succeed after a genuine script-load failure** —
  `frontend/src/components/MusicDock.jsx:46-56`
  On `onerror`, `finish(null)` clears `ytApiPromise` but the dead `<script>` tag stays in
  `<head>`. Every retry hits the `existing` branch, attaches a listener that will never
  fire (browsers don't re-fetch an existing script element), and burns the 12s timeout —
  the retry-after-reconnect scenario the comment claims to handle only works for the
  timeout path. **Fix**: `script.remove()` in the error handler before `finish(null)`.

- [ ] **1.7 Sliding a sound channel to zero hard-cuts the noise bed (audible click)** —
  `frontend/src/lib/audio.js:300-313`
  `stopChannel` stops the looping noise source immediately; the `setTargetAtTime(0, …, 0.1)`
  fade only shapes in-flight one-shots. The continuous bed — the loudest element of
  rain/wind/snow/cafe — ends with a click, in audio hand-tuned twice on user feedback.
  **Fix**: stop bed sources slightly late (`node.stop(ctx.currentTime + 0.4)`) so the
  master fade shapes their exit.

- [ ] **1.8 Ambience presets apply unvalidated `weatherMode`/`timeOfDay`** —
  `frontend/src/store.jsx:987-1006` (vs whitelists at `store.jsx:41-42`)
  Presets from `tasknook.weather.presets` are parsed with only an `Array.isArray` check;
  `applyWeatherVisual(preset.weatherMode)` writes any string into state *and back into*
  the whitelist-guarded `tasknook.weatherMode` key — one corrupt/legacy preset poisons it
  with a value the scene lookup tables don't know. **Fix**: run preset values through the
  same `WEATHER_MODES`/`TIMES_OF_DAY` whitelists, falling back to current values.

### Smaller bugs

- [ ] **1.9 Unbounded integers 500 at the SQLite bind** — `backend/app.py:350`, `:393` (duration), `:402` (position)
  A huge JSON integer (or `1e30` float) passes validation then raises `OverflowError` at
  the bind → generic 500, violating the app's own tested "junk never 500s" contract
  (`log_session` already clamps minutes at `:467`). **Fix**: clamp like minutes; ideally a
  shared `clean_int(v, lo, hi)` helper. Bools also pass as numbers at these sites
  (`int(True)` → 1) while the rest of the file painstakingly excludes them — the shared
  helper fixes both.

- [ ] **1.10 `clean_str` caps exceed declared column widths** — `backend/app.py:255` (username: clamps 80, column is `String(40)`), `:257` (displayName: 80 vs `String(60)`; `save_profile` at `:695` clamps the same column to 60, so two writers disagree)
  SQLite forgives it, but it violates the schema the migrations declare (the stated
  source of truth). **Fix**: clamp to the column sizes via shared constants next to the models.

- [ ] **1.11 Double-clicking a timer nudge in one tick computes from stale state** — `frontend/src/timer.jsx:130-133`
  `setRemaining` composes correctly but the second `applied` is computed from stale
  `remaining`, so `nudgeSeconds` (hence logged minutes) can be off by up to a minute.
  **Fix**: compute `applied` inside the `setRemaining` updater.

- [ ] **1.12 Backspace deletes furniture while typing in a `<select>`/contentEditable** —
  `frontend/src/components/IsoRoom.jsx:264-265` vs `frontend/src/App.jsx:130-139`
  IsoRoom's guard only checks INPUT/TEXTAREA; App's Escape guard checks
  INPUT/TEXTAREA/SELECT/contentEditable. **Fix**: shared `isTypingTarget(e.target)` helper.

- [ ] **1.13 Background auto-match poll failure flips the Weather panel into an error state** —
  `frontend/src/store.jsx:1053-1056` (via the 15-min interval at `:1101-1107`)
  A transient network blip during the *silent* refresh sets `weatherStatus="error"` with
  no user action. **Fix**: a `background` flag that keeps the previous `ready` state on failure.

- [ ] **1.14 No 401 recovery mid-session** — `frontend/src/lib/api.js:47-52`
  If this tab's token is pruned (`MAX_TOKENS_PER_USER`), every call fails with toasts
  until a manual reload — the silent re-login only runs at boot. **Fix**: on 401, clear
  the token and re-run the login-or-register bootstrap once.

- [ ] **1.15 Pending camera-position write dropped on unmount** — `frontend/src/components/IsoRoom.jsx:236`
  Cleanup clears `persistViewTimer` without flushing, so toggling iso↔flat within 300ms
  of a pan/zoom loses the `tasknook.isoView` save. **Fix**: flush the pending write in cleanup.

- [ ] **1.16 Weather disambiguation header interpolates the live input, not the searched name** —
  `frontend/src/components/WeatherPanel.jsx:113-117`
  Clear/retype the field while the list is showing → `More than one "" — which?`.
  **Fix**: store the searched string alongside the results.

---

## 2. Performance / efficiency (ranked)

**The dominant theme: drag and pan interactions write through far more of the app than
they touch.**

- [ ] **2.1 No-op drag moves flow through the entire store at pointer-move rate** —
  `frontend/src/components/IsoRoom.jsx:372-393`, `frontend/src/store.jsx:373-378`
  (`moveIsoItem`), `:1146-1148` (`moveRoomItem`), `frontend/src/components/Cottage.jsx:158-165`
  Positions snap to half-tiles, so most pointermoves produce identical gx/gy — but the
  movers unconditionally build a new layout object, which rebuilds the store context,
  re-renders every `useStore` consumer (TopBar, Dock, HudTasks, MusicDock, open panels),
  and runs the save effect: two full-layout `JSON.stringify` calls + two synchronous
  localStorage writes, per event, at 60–120Hz for the whole drag. **Fix**: one bail-out
  line in each mover (`if (t.gx === gx && t.gy === gy) return prev` — React bails on same
  reference) plus remembering the last-sent position in the drag ref.

- [ ] **2.2 Pan/zoom re-renders the entire scene per frame** — `frontend/src/components/IsoRoom.jsx:229`, `:295-311`, `:401`
  Nothing in the scene subtree reads `view` — only the svg's `viewBox` attribute (`:508`)
  — yet camera state lives in the component, so a 48×48 lot rebuilds ~2,500 SVG nodes of
  vDOM at 60Hz+ during a pan. **Fix**: hoist the scene contents into a memo'd child that
  doesn't receive `view`; the outer svg keeps the viewBox.

- [ ] **2.3 RoomPanel previews aren't memoized — and the panel is open while you drag** —
  `frontend/src/components/RoomPanel.jsx:33` (`IsoItemPreview`), `:74` (`IsoPresetPreview`)
  Every store change re-renders ~132 catalog sprites + 11 whole-room thumbnails (each
  re-running stacking/seating resolution + `sortIso` over up to ~75 items). The panel can
  out-cost the scene itself. **Fix**: `React.memo` on both — props are a string key and
  static preset objects, so memo holds trivially.

- [ ] **2.4 Store context: unmemoized derived values + ~30 unstable action closures** —
  `frontend/src/store.jsx:296-303` (musicStations), `:902-904` (taskGroups), `:944`
  (`orderedTasks` — full `applyAlgorithm` sort per provider render), `:945` (activeTask),
  `:1245` (`unlockBalance` — iterates every recorded day), value object at `:1187`
  Room actions are carefully `useCallback`'d but `addTask`/`toggleTask`/`editTask`/
  `chooseAlgorithm`/`setWeather`/etc. are plain closures — unstable identities that
  poison consumer effect deps. **Fix**: `useMemo` derived values on their real inputs,
  `useCallback` the remaining actions, then memoize the `value` object. Bonus: in
  `algorithms.js:99-103`, `random`'s comparator does `randomOrder.indexOf` per
  comparison — build an id→index `Map` once.

- [ ] **2.5 Static room geometry recomputed every render** — `frontend/src/components/IsoRoom.jsx:327-334`
  (floorTiles loop + `wallSegment`×2), `:600`, `:725`, `:801` (`wallRuns` ×4 total, `lipRuns`)
  Four O(w·d) sweeps + run-merging per render; all depend only on `size`. Runs at pointer
  rate during drags/pans and every ~3.5s from the roam tick. **Fix**: one
  `useMemo(..., [size])` for `{floorTiles, wallRunList, lipRunList, leftSeg, rightSeg}`.

- [ ] **2.6 Floor clip is up to 2,304 polygons even for a rectangle** — `frontend/src/components/IsoRoom.jsx:740-744`
  One `<polygon>` per tile in `#isoFloorClip`; four groups consume it, so the browser
  resolves a thousands-node clip region four times. **Fix**: no mask → one
  `floorPoints(w, d)` polygon; masked → merge horizontal runs per row (same trick
  `lipRuns` uses) → ≤48 polygons.

- [ ] **2.7 `FloorSurface` isn't memo'd** — `frontend/src/components/IsoRoom.jsx:72-153` (used at `:748`)
  The `stone` style is a w·d nested loop (2,304 polygons on a big terrace);
  `boards`/`tiles` are hundreds of lines. Props are three scalars. **Fix**: wrap in `memo`.

- [ ] **2.8 All ~150 placed items re-render whenever anything in the scene changes** —
  `frontend/src/components/IsoRoom.jsx:860-982`
  The roam tick, a selection change, or one item's drag step re-renders every sprite, and
  `startDrag(p)` at `:904` mints 150 new closures each time. Untouched placements already
  keep object identity, so the groundwork exists. **Fix**: extract `memo(PlacedItem)`
  taking `{p, editMode, working, reduceMotion, character, mood, onStartDrag}` — ~149 of
  150 rows skip on a typical update.

- [ ] **2.9 Every task write refetches friends + sessionDays it can't have changed** —
  `frontend/src/store.jsx:833-867` (task actions), `frontend/src/timer.jsx:212`, `:328` (session logging)
  A checkbox tick costs 5 HTTP round-trips (PUT → GET tasks → 3 parallel GETs) including
  the friends aggregation. **Fix**: targeted `refreshTasks()` = listTasks then stats
  (preserving the documented listTasks-first ordering) for task actions; session logging
  adds sessionDays; keep full `refreshAll` for boot/friend actions.

- [ ] **2.10 Backend: `/api/friends` runs ~17 queries per call** — `backend/app.py:771-779` + `build_stats` `:811-857`
  4 aggregate queries per friend × 4 demo friends + 1. Milliseconds on local SQLite, but
  the fix is *simpler* code: one grouped conditional-aggregate query
  (`func.count` + `func.sum(case(...))`, `group_by(Task.user_id)`) + one grouped session
  sum → ~4 queries regardless of friend count.

- [ ] **2.11 Room-save effect re-serializes BOTH scene layouts when either changes** —
  `frontend/src/store.jsx:610-634`
  A flat-cottage drag re-stringifies the (potentially 150-placement) iso layout per move
  and vice versa. **Fix**: split into two effects, each writing its own mirror, sharing
  one debounced PUT. (The synchronous mirror write itself is deliberate — don't re-debounce it.)

- [ ] **2.12 `WeatherOverlay` is not memo'd** — `frontend/src/App.jsx:198`
  App consumes `useStore()` so it re-renders on every store change; WeatherOverlay
  rebuilds ~60–80 particle nodes' vDOM each time though its props rarely change.
  **Fix**: `export default memo(WeatherOverlay)`.

- [ ] **2.13 MusicDock's 1Hz poll re-renders even while paused** — `frontend/src/components/MusicDock.jsx:164-178`
  `setTrack({...})` allocates a fresh object per tick. **Fix**: functional update
  returning `prev` when title/time/duration/live are unchanged. (The poll itself is deliberate.)

- [ ] **2.14 HudFocusCard clones the whole `sessionDays` map every second** —
  `frontend/src/components/HudFocusCard.jsx:60-65`
  `{ ...sessionDays, [today]: focusMinutesLive }` + a `focusStreak` walk per 1Hz tick,
  over a map that grows unbounded (300+ keys after a year). **Fix**: `useMemo` keyed on
  `[sessionDays, focusMinutesLive, dailyGoal]`.

- [ ] **2.15 Minor backend hot-path items** — `backend/app.py:154-160` (auth does 2 queries
  per request; a Token↔User join does it in 1), `:123-151` (`issue_token` commits twice;
  fold `_prune_tokens` into the same transaction), `frontend/src/components/SettingsPanel.jsx:220`, `:231`
  (hue/sat sliders write localStorage per drag tick — debounce or write on pointer-up).

- [ ] **2.16 Iso odds and ends** — `frontend/src/components/IsoRoom.jsx:425-472` (roam
  interval torn down on every layout identity change; use a `placementsRef`),
  `frontend/src/lib/isoRoom.js:398`, `:486` (`seatFor`/`surfaceFor`/`overSoftSpot` are
  O(n²) per render — fine today, folds into 2.8's memo),
  `frontend/src/store.jsx:170` (`applySoundPatch` sync localStorage write per slider event).

---

## 3. Cleanups (no behavior change)

- [ ] **3.1 Local-date formatting implemented twice** — `frontend/src/lib/stats.js:5-20`
  duplicates `frontend/src/lib/dates.js:10-15`. This is the exact UTC-vs-local subtlety
  the app has been burned by before. `stats.js` should import from `dates.js`.
- [ ] **3.2 `storage.js`'s own `readJSON`/`writeJSON` are unused** — `frontend/src/lib/storage.js:45-63`
  vs ~10 hand-rolled `try { JSON.parse(readStored(...)) } catch` blocks across
  `store.jsx` (108, 141, 202, 214, 285, 310, 321, 335, 890) and `timer.jsx:90`.
- [ ] **3.3 Live-streak merge expression duplicated** — `HudFocusCard.jsx:60-65` and
  `ProgressPanel.jsx:53-57` (identical `focusStreak({...sessionDays, [today]: focusMinutesLive}, ...)`).
  Extract a shared `useLiveStreak()` hook or expose from the timer provider.
- [ ] **3.4 Duplicate `h:mm:ss` formatters** — `HudFocusCard.jsx:13-20` and `MusicDock.jsx:62-68`.
- [ ] **3.5 Armed split-pill delete chip markup duplicated** — `MusicPanel.jsx:90-121` and
  `WeatherPanel.jsx:226-247` (`useArmed` centralizes behavior; extract an `<ArmedChip>` for the markup).
- [ ] **3.6 Dead emoji `icon` fields on `SOUND_CHANNELS`** — `frontend/src/lib/audio.js:13-21`
  (only `key`/`label` are read; MusicPanel keeps its own Lucide map deliberately).
- [ ] **3.7 Backend DRY** — profile response dict built twice verbatim (`app.py:677-685`,
  `:722-730` → `_profile_payload(user)`); tolerant JSON-blob parsing hand-rolled three
  times (`:504-517`, `:741-749`, `:665-672` → one `read_blob(raw, default)`); `logout`
  re-parses the Authorization header (`:309-310` → shared `_bearer_value()`).
- [ ] **3.8 `update_task` empty-name handling contradicts its own stated policy** — `backend/app.py:389-390`
  Silently ignores an empty name while the duration branch 400s with a comment saying a
  client bug shouldn't look like a successful save. Either 400, or comment the
  "empty means don't change" intent. (Possibly deliberate.)
- [ ] **3.9 Dead Kenney `variants`/`noMirror` plumbing** — per the WIP comment at
  `frontend/src/lib/isoRoom.js:111-117` no catalog entry uses them anymore, but the
  plumbing survives in `IsoRoom.jsx:973`, `:936-939` (stale comment), `:1046-1047`,
  `RoomPanel.jsx:131`, `RoomTintPicker.jsx:56-78`. Possibly deliberate (future raster
  items); if the PNG era is over, delete in one pass. Note CLAUDE.md's rendered-PNG
  section is behind this WIP tree and would need updating too.
- [ ] **3.10 Shared-geometry extraction in iso** — `IsoPresetPreview` (RoomPanel.jsx:83-96)
  re-implements IsoRoom's stack/seat resolution loop (IsoRoom.jsx:474-499) → export a
  shared `resolvePlacements()` from isoRoom.js; `overSoftSpot` (IsoRoom.jsx:52-58) and
  the roam `blocked` check (:460-466) re-implement `footprintsOverlap` (isoRoom.js:702).
- [ ] **3.11 Dead conditionals in the edit grid** — `IsoRoom.jsx:774-776`, `:788`:
  `editMode ? … : …` ternaries inside a `{editMode && …}` block — false arms unreachable.
- [ ] **3.12 Trivia (noting, not pressing)** — `_prepare_database` (`app.py:92`) swallows
  `KeyboardInterrupt` into a SchemaError (cosmetic, from-source Ctrl-C only);
  `scheduled_date` accepts any 10-char string (`app.py:373`, `:407` — possibly
  deliberate; a `\d{4}-\d{2}-\d{2}` check is one line); App's Escape-listener effect
  resubscribes on every `frontKey`/`roomEditMode` change (`App.jsx:126-154`);
  `addTask` is the only task action without its own catch+toast (`store.jsx:833-836` —
  both current callers wrap it, but a third caller could silently break the convention).

---

## 4. Feature opportunities

### Data you already collect but never show (cheapest, highest value)

- [ ] **4.1 Focus history / journal** — every `FocusSession` stores a `taskName`, but no
  UI ever reads it back. Clicking a calendar day could show what you focused on and for
  how long; the data is already server-side. Turns the calendar from a tint grid into a
  record of your work.
- [ ] **4.2 Calendar intensity + trends** — `sessionDays` holds full per-day minutes but
  is reduced to a boolean tint. A GitHub-style intensity heatmap is nearly free; and
  ProgressPanel has no trend view at all — weekly bars, best day, this-week vs last-week
  would give the goal/streak chip something to build toward.
- [ ] **4.3 Task editing UI** — there is currently no way to rename a task or change its
  duration/priority anywhere in the app. `editTask` exists in the store but only the
  calendar's schedule-date and the routine toggle call it. This is the gap a real user
  hits first.
- [ ] **4.4 Data export / import** — tasks, sessions, and the room live in SQLite with no
  user-facing way out. For a local-first desktop app, a "download my data" JSON export
  (and import) in Settings is both a trust feature and cheap insurance.

### Gaps users will feel (small)

- [ ] **4.5 °C option** — Fahrenheit is hardcoded in the fetch (`frontend/src/lib/weather.js:173`)
  and the display. One toggle; matters to most of the world.
- [ ] **4.6 Custom focus duration + long breaks + chime setting** — presets are fixed at
  15/25/45/60 with no free input (backend accepts any value); pomodoro has no
  "long break every N rounds"; the chime has no volume/off setting anywhere.
- [ ] **4.7 Catalog search in the Room panel** — sections help, but finding "mug" in 130+
  items still means scrolling.
- [ ] **4.8 Scheduled-date visibility** — a task planned for Friday looks identical to an
  unplanned one in the list; a small date badge + "add task on this day" from the
  calendar closes the loop.
- [ ] **4.9 Smaller polish candidates** — custom stations can't be renamed/reordered after
  adding; no master ambience volume; sound-mix presets live in the Weather panel
  (discoverability); goal presets are fixed 60/120/180/240 though the store accepts
  15–960; no date next to the TopBar clock; no visible pomodoro round indicator when the
  focus card is collapsed.

### Bigger swings that fit what's already built

- [ ] **4.10 Room sharing ("room codes")** — layouts are plain JSON with tolerant
  validation (`validateIsoLayout` drops anything unknown), so export/import-as-code
  ("copy room code" / paste a friend's) costs almost nothing and gives the decorating
  system a social outlet the bot-only Friends panel can't. A "photo mode" (hide HUD,
  snapshot the SVG) pairs naturally.
- [ ] **4.11 Activate the store** — the unlocks machinery (ownership, derived balance,
  persistence) is fully built and deliberately inert. The original call ("don't take
  away decorations people have") still holds, but *new* seasonal pieces could launch as
  earnable via focus minutes: one line in `PREMIUM` per item, and focus time feeds the
  room. That's the cozy-gamification loop the app is shaped for.
- [ ] **4.12 Compact desktop mode** — since the shipping artifact is a desktop exe, an
  always-on-top mini widget (timer + top task) would make TaskNook livable *while*
  working instead of alongside it. pywebview supports window sizing/pinning, and the
  timer provider is already isolated enough to render standalone.

---

## Suggested first batch

The natural starting point: bugs **1.1–1.3** (wall-clock timer, mid-run preset guard,
`completed_at` transition guard) plus the one-line drag bail-outs from **2.1** — small,
test-coverable, and independent of the in-flight WIP.
