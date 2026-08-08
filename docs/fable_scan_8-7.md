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

- [x] **1.1 Focus timer counts interval callbacks, not wall-clock time** — `frontend/src/timer.jsx:297-305`
  `remaining`/`elapsed` drop 1 per `setInterval` tick. Browsers throttle hidden-tab
  timers (Chromium's intensive throttling can slow to ~1 tick/minute), so a 25-minute
  block stretches much longer whenever the window is minimized — and the completion
  notification, which exists precisely for someone who stepped away, fires late for
  exactly that person. **Fix**: store an absolute deadline (`endAt`) at start; each tick
  and each `visibilitychange` compute `remaining = endAt - Date.now()`; keep the 1s
  interval purely as a repaint trigger.

  **DONE.** `timer.jsx` now keeps an absolute anchor (`clockRef = {at, base}`) and
  DERIVES `remaining`/`elapsed` from `Date.now()`; the interval survives only as a
  repaint trigger, plus a `visibilitychange` sync so returning to a hidden window
  snaps to the truth instead of waiting out a throttled tick. Every write goes
  through `setClock`/`setStopwatch`, so the anchor can never describe a stale
  value, and `currentRemaining()`/`currentElapsed()` give callers the live figure.
  A throttled tab now shows a correct clock that merely updates coarsely. Side
  effect worth noting: a stopwatch left running while hidden now measures real
  wall time instead of under-counting, which is what a stopwatch is.

- [x] **1.2 Clicking a focus preset mid-run mis-logs the session** —
  `frontend/src/components/HudFocusCard.jsx:252-266` + `frontend/src/timer.jsx:136-144`
  The preset pills are not `disabled={running}` (the mode toggle at line 238 is), and
  `setFocus` updates `focusMinutes` unconditionally — only the `remaining` reset is
  guarded. Start a 60-min block, tap "15m" mid-run → completion logs
  `focusMinutes * 60 + nudgeSeconds` = 15 minutes for an hour of focus; the progress-bar
  total and pomodoro pips shift immediately. Feeds wrong data into the streak, daily
  goal, sessionDays, and the calendar. **Fix**: `disabled={running}` on the preset pills
  (matching the mode buttons) and/or make `setFocus` a no-op while running.

  **DONE.** Guarded in `setFocus` itself (`if (running) return;`) rather than only
  on the button — `focusMinutes` is what the completion path logs, so the VALUE is
  what's unsafe and any future caller inherits the guard. The pills also take
  `disabled={running}` with a title, matching the mode toggle above them: a pill
  that highlights on tap and changes nothing is worse than one plainly unavailable.

- [x] **1.3 Backend: re-sent `completed: true` re-stamps `completed_at`** — `backend/app.py:412-414`
  Any PUT including `completed: true` for an *already-completed* task moves
  `completed_at` to now: inflates `tasksDoneToday`, re-tints today on the calendar, and
  cancels a routine's pending lazy reset. Current frontend callers happen to be safe
  (verified), so this is **latent** — but one "send the whole task object" refactor away,
  and nothing fails loudly. **Fix**: only stamp on an actual state transition
  (`if bool(data["completed"]) != task.completed:`).

  **DONE.** `update_task` now stamps only on an actual transition
  (`if done != task.completed`). Two tests cover both directions — a repeated
  `completed: true` keeps the original timestamp, and un-completing then
  re-completing (what a daily routine does every morning) still stamps a new one.

- [x] **1.4 Rotating an iso item can strand it on void tiles** — `frontend/src/store.jsx:450-466`
  `rotateIsoItem` transposes the footprint and calls only `clampIsoPlacement`, which is
  bounds-only by design — nothing checks the floor mask. Rotating a long item (e.g.
  `stairs`, foot [1, 2.5]) near a painted-away region leaves it overlapping void; the
  drag engine then refuses every move, so it reads as "stuck" until a reload silently
  rehomes it — the exact failure `newIsoPlacement` was recently fixed for. **Fix**: after
  clamping, `if (!footprintFree(...))` → `findFreeSpot(...)` or keep the old rot + toast.

  **DONE**, and it was reachable in the shipped default room — the Loft is
  L-shaped, and about 5% of legal positions for a bed/sofa/desk/bookcase/stairs
  strand on one turn. `rotateIsoItem` now checks `footprintFree` after clamping and
  prefers `findFreeSpot` (keep the turn, move the piece — the turn is what was
  asked for), refusing with a toast only when the drawn floor genuinely has no
  room. Four tests in `isoRoom.test.js`, including one that asserts the PREMISE —
  that a clamp alone can still strand — so the guard cannot quietly become dead
  code.

- [x] **1.5 Wanderers restart their animations on every roam step** — `frontend/src/components/IsoRoom.jsx:883`
  `ambienceVars(p.gx, p.gy)` is fed the *offset* position from `effective`, but the
  comment directly above says it must come from the item's HOME square for exactly this
  reason — each ~3.5s glide changes `--phase`/`--dur-scale`, restarting the walking gait
  / `cat-breathe` mid-cycle (a visible hitch on every step). **Fix**: stash home coords
  before offsetting (e.g. `_hx`/`_hy` in `effective`) and feed those to `ambienceVars`.

  **DONE.** Correct, and it was mine from the same session. `effective` overwrites
  gx/gy with the wander offset, so the render site was handed a value that changes
  every few seconds: the comment above the call stated the requirement and the code
  two lines later violated it. `_hx`/`_hy` now carry the stored square through both
  wander branches, and `ambienceVars(p._hx ?? p.gx, ...)` reads those. Pinned by a
  test in `motion.test.js`.

- [x] **1.6 YouTube API retry can never succeed after a genuine script-load failure** —
  `frontend/src/components/MusicDock.jsx:46-56`
  On `onerror`, `finish(null)` clears `ytApiPromise` but the dead `<script>` tag stays in
  `<head>`. Every retry hits the `existing` branch, attaches a listener that will never
  fire (browsers don't re-fetch an existing script element), and burns the 12s timeout —
  the retry-after-reconnect scenario the comment claims to handle only works for the
  timeout path. **Fix**: `script.remove()` in the error handler before `finish(null)`.

  **DONE.** `script.remove()` before `finish(null)` in the error handler. The dead
  tag was the whole problem: a script's `error` fires once at load time and browsers
  will not re-fetch an existing element, so every retry attached a listener that
  could never fire and burned the full 12s. (The TIMEOUT path always self-healed via
  the `window.YT?.Player` short-circuit — only `onerror` was unrecoverable.)

- [x] **1.7 Sliding a sound channel to zero hard-cuts the noise bed (audible click)** —
  `frontend/src/lib/audio.js:300-313`
  `stopChannel` stops the looping noise source immediately; the `setTargetAtTime(0, …, 0.1)`
  fade only shapes in-flight one-shots. The continuous bed — the loudest element of
  rain/wind/snow/cafe — ends with a click, in audio hand-tuned twice on user feedback.
  **Fix**: stop bed sources slightly late (`node.stop(ctx.currentTime + 0.4)`) so the
  master fade shapes their exit.

  **DONE**, and the ORDER is the fix: the fade starts first, then the sources stop
  at `currentTime + FADE * 4` (about 98% of the way down), so the ramp is what ends
  them. The aggravating factor checks out too — `setChannel` retunes with a 0.2s
  constant, so a quick drag to zero was cutting the bed while it was still loud.

- [x] **1.8 Ambience presets apply unvalidated `weatherMode`/`timeOfDay`** —
  `frontend/src/store.jsx:987-1006` (vs whitelists at `store.jsx:41-42`)
  Presets from `tasknook.weather.presets` are parsed with only an `Array.isArray` check;
  `applyWeatherVisual(preset.weatherMode)` writes any string into state *and back into*
  the whitelist-guarded `tasknook.weatherMode` key — one corrupt/legacy preset poisons it
  with a value the scene lookup tables don't know. **Fix**: run preset values through the
  same `WEATHER_MODES`/`TIMES_OF_DAY` whitelists, falling back to current values.

  **DONE as hardening.** Verified NOT reachable today (presets are only ever
  written from already-whitelisted live state) and it self-heals on the next launch
  via the read guard — but the appliers write back into the guarded keys, so preset
  values now pass through `WEATHER_MODES`/`TIMES_OF_DAY` as well, falling back to
  the current value. That makes "these two keys only ever hold known values" true on
  every path rather than by luck.
### Smaller bugs

- [x] **1.9 Unbounded integers 500 at the SQLite bind** — `backend/app.py:350`, `:393` (duration), `:402` (position)
  A huge JSON integer (or `1e30` float) passes validation then raises `OverflowError` at
  the bind → generic 500, violating the app's own tested "junk never 500s" contract
  (`log_session` already clamps minutes at `:467`). **Fix**: clamp like minutes; ideally a
  shared `clean_int(v, lo, hi)` helper. Bools also pass as numbers at these sites
  (`int(True)` → 1) while the rest of the file painstakingly excludes them — the shared
  helper fixes both.

  **DONE**, and there was a FOURTH site the scan missed: `/api/tasks/reorder`
  (`Task.id.in_(ids)`), which the existing junk test could not catch because its
  cases use wrong types and small values, never magnitude. One shared
  `clean_int(value, lo, hi, default)` covers all four; it also excludes bools
  (`isinstance(True, int)` is True in Python) and orders its checks so the bounds
  comparison happens before anything that would raise on a huge int. Durations CLAMP
  rather than 400 — a huge number carries a clear intent — and five tests cover
  magnitude, negatives, infinities, NaN and bools.

- [x] **1.10 `clean_str` caps exceed declared column widths** — `backend/app.py:255` (username: clamps 80, column is `String(40)`), `:257` (displayName: 80 vs `String(60)`; `save_profile` at `:695` clamps the same column to 60, so two writers disagree)
  SQLite forgives it, but it violates the schema the migrations declare (the stated
  source of truth). **Fix**: clamp to the column sizes via shared constants next to the models.

  **DONE.** The widths now live in `models.py` as `USERNAME_MAX`,
  `DISPLAY_NAME_MAX`, `AVATAR_MAX`, `TASK_NAME_MAX`, `TASK_NOTES_MAX` and
  `GROUP_NAME_MAX`; the columns are declared FROM them, and every `clean_str` call
  in `app.py` uses them. The bound and the column can no longer drift, and the two
  writers that disagreed about `display_name` now agree by construction.

- [x] **1.11 Double-clicking a timer nudge in one tick computes from stale state** — `frontend/src/timer.jsx:130-133`
  `setRemaining` composes correctly but the second `applied` is computed from stale
  `remaining`, so `nudgeSeconds` (hence logged minutes) can be off by up to a minute.
  **Fix**: compute `applied` inside the `setRemaining` updater.

  **DONE**, though the verified magnitude was about 1 second (it rounds away at
  `Math.round(... / 60)`), not up to a minute: `click` is a discrete event at
  React's SyncLane, so two clicks do not batch into one render. Fixed anyway as a
  consequence of 1.1 — `nudgeTimer` reads the live value from the anchor via
  `currentRemaining()` instead of its render closure, so there is no stale value
  left to disagree with.

- [x] **1.12 Backspace deletes furniture while typing in a `<select>`/contentEditable** —
  `frontend/src/components/IsoRoom.jsx:264-265` vs `frontend/src/App.jsx:130-139`
  IsoRoom's guard only checks INPUT/TEXTAREA; App's Escape guard checks
  INPUT/TEXTAREA/SELECT/contentEditable. **Fix**: shared `isTypingTarget(e.target)` helper.

  **DONE.** One `isTypingTarget(target)` in `lib/typing.js`, imported by both App's
  Escape handler and IsoRoom's Backspace/Delete handler. The shorter copy was the
  dangerous one: Backspace deleted the selected furniture while you were using a
  `<select>`, in an app where every other deletion is a two-tap armed cross. Three
  tests.

- [x] **1.13 Background auto-match poll failure flips the Weather panel into an error state** —
  `frontend/src/store.jsx:1053-1056` (via the 15-min interval at `:1101-1107`)
  A transient network blip during the *silent* refresh sets `weatherStatus="error"` with
  no user action. **Fix**: a `background` flag that keeps the previous `ready` state on failure.

  **DONE.** `refreshRealWeather(coords, { background })`; the 15-minute poll passes
  `background: true`, and a failure there returns early, keeping the last good
  reading and the `ready` status. Only a refresh the user asked for reports failure.

- [x] **1.14 No 401 recovery mid-session** — `frontend/src/lib/api.js:47-52`
  If this tab's token is pruned (`MAX_TOKENS_PER_USER`), every call fails with toasts
  until a manual reload — the silent re-login only runs at boot. **Fix**: on 401, clear
  the token and re-run the login-or-register bootstrap once.

  **DONE.** `api.js` gained a `setReauthorizer` hook that the store fills with the
  same login-or-register the boot path uses. A 401 with a token present (and not on
  `/auth/*`, and not already retrying) clears the token, re-authenticates ONCE — a
  shared in-flight promise, so `refreshAll`'s four parallel calls produce one login
  rather than four — and replays the request. The failure is now invisible instead
  of a wall of toasts until a manual reload.

- [x] **1.15 Pending camera-position write dropped on unmount** — `frontend/src/components/IsoRoom.jsx:236`
  Cleanup clears `persistViewTimer` without flushing, so toggling iso↔flat within 300ms
  of a pan/zoom loses the `tasknook.isoView` save. **Fix**: flush the pending write in cleanup.

  **DONE.** A `pendingViewRef` holds what the debounce owes, and cleanup FLUSHES it
  rather than only clearing the timer.

- [x] **1.16 Weather disambiguation header interpolates the live input, not the searched name** —
  `frontend/src/components/WeatherPanel.jsx:113-117`
  Clear/retype the field while the list is showing → `More than one "" — which?`.
  **Fix**: store the searched string alongside the results.

  **DONE.** A `searchedFor` state is stamped when the search is submitted (after
  the empty guard, not per keystroke) and the header interpolates that instead of
  the live input.
---

## 2. Performance / efficiency (ranked)

**The dominant theme: drag and pan interactions write through far more of the app than
they touch.**

- [x] **2.1 No-op drag moves flow through the entire store at pointer-move rate** —
  `frontend/src/components/IsoRoom.jsx:372-393`, `frontend/src/store.jsx:373-378`
  (`moveIsoItem`), `:1146-1148` (`moveRoomItem`), `frontend/src/components/Cottage.jsx:158-165`
  Positions snap to half-tiles, so most pointermoves produce identical gx/gy — but the
  movers unconditionally build a new layout object, which rebuilds the store context,
  re-renders every `useStore` consumer (TopBar, Dock, HudTasks, MusicDock, open panels),
  and runs the save effect: two full-layout `JSON.stringify` calls + two synchronous
  localStorage writes, per event, at 60–120Hz for the whole drag. **Fix**: one bail-out
  line in each mover (`if (t.gx === gx && t.gy === gy) return prev` — React bails on same
  reference) plus remembering the last-sent position in the drag ref.

  **DONE**, in both layers. Each mover bails out on an unchanged position
  (`return prev`, so React bails on the identical reference), and the drag ref
  remembers the last position SENT so a no-op never reaches the store at all.
  Half-tile snapping meant most of the 60-120 pointermoves in a drag were
  identical, and each one rebuilt the store context, re-rendered every consumer,
  and ran two whole-layout `JSON.stringify` calls plus two synchronous localStorage
  writes.

- [ ] **2.2 Pan/zoom re-renders the entire scene per frame** — `frontend/src/components/IsoRoom.jsx:229`, `:295-311`, `:401`
  Nothing in the scene subtree reads `view` — only the svg's `viewBox` attribute (`:508`)
  — yet camera state lives in the component, so a 48×48 lot rebuilds ~2,500 SVG nodes of
  vDOM at 60Hz+ during a pan. **Fix**: hoist the scene contents into a memo'd child that
  doesn't receive `view`; the outer svg keeps the viewBox.

  **DEFERRED, deliberately.** The premise checks out — `view` is read only by the
  svg's `viewBox` — so the proposed fix would work. But it only bites on the large
  lots, it is the most invasive change in this section (hoisting the whole scene
  into a memo'd child), and the measured frame budget has headroom: a realistic
  room sits at 4.2ms with motion on, and a deliberately extreme 144-item room at
  8.4ms against a 16.7ms budget. The cheaper items here (2.1, 2.3, 2.5, 2.6, 2.7)
  remove much of the same per-frame work. Worth doing when there is a measured
  reason, not before.

- [x] **2.3 RoomPanel previews aren't memoized — and the panel is open while you drag** —
  `frontend/src/components/RoomPanel.jsx:33` (`IsoItemPreview`), `:74` (`IsoPresetPreview`)
  Every store change re-renders ~132 catalog sprites + 11 whole-room thumbnails (each
  re-running stacking/seating resolution + `sortIso` over up to ~75 items). The panel can
  out-cost the scene itself. **Fix**: `React.memo` on both — props are a string key and
  static preset objects, so memo holds trivially.

  **DONE.** Both previews are `memo`'d. Confirmed the panel really is mounted while
  dragging — "Decorate" is toggled from inside it — so this was about 132 catalog
  sprites plus 11 room thumbnails re-rendering per pointer event, on top of the
  scene itself.

- [x] **2.4 Store context: unmemoized derived values + ~30 unstable action closures** —
  `frontend/src/store.jsx:296-303` (musicStations), `:902-904` (taskGroups), `:944`
  (`orderedTasks` — full `applyAlgorithm` sort per provider render), `:945` (activeTask),
  `:1245` (`unlockBalance` — iterates every recorded day), value object at `:1187`
  Room actions are carefully `useCallback`'d but `addTask`/`toggleTask`/`editTask`/
  `chooseAlgorithm`/`setWeather`/etc. are plain closures — unstable identities that
  poison consumer effect deps. **Fix**: `useMemo` derived values on their real inputs,
  `useCallback` the remaining actions, then memoize the `value` object. Bonus: in
  `algorithms.js:99-103`, `random`'s comparator does `randomOrder.indexOf` per
  comparison — build an id→index `Map` once.

  **DONE for the derived values and the comparator.** `musicStations`,
  `taskGroups`, `orderedTasks`, `activeTask` and `unlockBalance` are now `useMemo`d
  on their real inputs, and `algorithms.js`'s `random` builds an id-to-index `Map`
  once instead of calling `indexOf` per comparison (that was O(n squared log n)
  inside a value recomputed on every render). The roughly 30 unstable action
  closures and the `value` object are NOT memoised: that is a large mechanical
  change to the file everything else depends on, and with the derived values fixed
  the remaining cost is object identity rather than work. It deserves its own pass
  with render counts measured before and after.

- [x] **2.5 Static room geometry recomputed every render** — `frontend/src/components/IsoRoom.jsx:327-334`
  (floorTiles loop + `wallSegment`×2), `:600`, `:725`, `:801` (`wallRuns` ×4 total, `lipRuns`)
  Four O(w·d) sweeps + run-merging per render; all depend only on `size`. Runs at pointer
  rate during drags/pans and every ~3.5s from the roam tick. **Fix**: one
  `useMemo(..., [size])` for `{floorTiles, wallRunList, lipRunList, leftSeg, rightSeg}`.

  **DONE.** One `useMemo(..., [size])` returns the floor clip, the wall runs, the
  lip runs and both wall segments. `wallRuns` alone was being called four times per
  render, at pointer rate during a drag and again on every roam tick.

- [x] **2.6 Floor clip is up to 2,304 polygons even for a rectangle** — `frontend/src/components/IsoRoom.jsx:740-744`
  One `<polygon>` per tile in `#isoFloorClip`; four groups consume it, so the browser
  resolves a thousands-node clip region four times. **Fix**: no mask → one
  `floorPoints(w, d)` polygon; masked → merge horizontal runs per row (same trick
  `lipRuns` uses) → ≤48 polygons.

  **DONE.** `floorClipRuns` merges each row's consecutive painted tiles into one
  polygon — the same trick `lipRuns` uses — so a rectangle is one polygon per row
  instead of w times d. The per-tile list is gone entirely, since the clip path was
  its only consumer.

- [x] **2.7 `FloorSurface` isn't memo'd** — `frontend/src/components/IsoRoom.jsx:72-153` (used at `:748`)
  The `stone` style is a w·d nested loop (2,304 polygons on a big terrace);
  `boards`/`tiles` are hundreds of lines. Props are three scalars. **Fix**: wrap in `memo`.

  **DONE.** `memo(FloorSurfaceInner)`; three scalar props, so the comparison is
  exact and free.

- [ ] **2.8 All ~150 placed items re-render whenever anything in the scene changes** —
  `frontend/src/components/IsoRoom.jsx:860-982`
  The roam tick, a selection change, or one item's drag step re-renders every sprite, and
  `startDrag(p)` at `:904` mints 150 new closures each time. Untouched placements already
  keep object identity, so the groundwork exists. **Fix**: extract `memo(PlacedItem)`
  taking `{p, editMode, working, reduceMotion, character, mood, onStartDrag}` — ~149 of
  150 rows skip on a typical update.

  **DEFERRED.** Real, and the groundwork does exist — but extracting
  `memo(PlacedItem)` means threading eight props through the hottest render path in
  the app, and the wins already taken address the same symptom far more cheaply
  (2.1 removes the no-op re-renders that triggered most of these; 2.3 removes the
  panel's share). Same reasoning as 2.2: measure first.

- [x] **2.9 Every task write refetches friends + sessionDays it can't have changed** —
  `frontend/src/store.jsx:833-867` (task actions), `frontend/src/timer.jsx:212`, `:328` (session logging)
  A checkbox tick costs 5 HTTP round-trips (PUT → GET tasks → 3 parallel GETs) including
  the friends aggregation. **Fix**: targeted `refreshTasks()` = listTasks then stats
  (preserving the documented listTasks-first ordering) for task actions; session logging
  adds sessionDays; keep full `refreshAll` for boot/friend actions.

  **DONE.** `refreshTasks()` (listTasks, then stats — preserving the documented
  ordering) for the five task actions, and `refreshFocus()` (stats + sessionDays)
  for the timer's two session-logging paths. A checkbox tick no longer fetches the
  friend aggregation or the per-day session map. `refreshAll` stays for boot and for
  friend actions.

- [x] **2.10 Backend: `/api/friends` runs ~17 queries per call** — `backend/app.py:771-779` + `build_stats` `:811-857`
  4 aggregate queries per friend × 4 demo friends + 1. Milliseconds on local SQLite, but
  the fix is *simpler* code: one grouped conditional-aggregate query
  (`func.count` + `func.sum(case(...))`, `group_by(Task.user_id)`) + one grouped session
  sum → ~4 queries regardless of friend count.

  **DONE**, and it is less code than the loop it replaced. `build_stats_for(ids)`
  answers everyone in TWO grouped queries using conditional aggregates
  (`sum(case(...))`), regardless of friend count. Three tests, the important one
  asserting it agrees with `build_stats` per user on the seeded demo data —
  including a user with no rows at all, where the zero-fill is what stops the panel
  500ing.

- [x] **2.11 Room-save effect re-serializes BOTH scene layouts when either changes** —
  `frontend/src/store.jsx:610-634`
  A flat-cottage drag re-stringifies the (potentially 150-placement) iso layout per move
  and vice versa. **Fix**: split into two effects, each writing its own mirror, sharing
  one debounced PUT. (The synchronous mirror write itself is deliberate — don't re-debounce it.)

  **DONE.** Two mirror effects, each depending on its own layout, plus ONE debounced
  PUT that reads the refs (the two layouts travel together on the wire). A flat-scene
  drag no longer re-stringifies the 150-placement iso layout. The synchronous mirror
  write is untouched, as the comment there instructs.

- [x] **2.12 `WeatherOverlay` is not memo'd** — `frontend/src/App.jsx:198`
  App consumes `useStore()` so it re-renders on every store change; WeatherOverlay
  rebuilds ~60–80 particle nodes' vDOM each time though its props rarely change.
  **Fix**: `export default memo(WeatherOverlay)`.

  **DONE.** `export default memo(WeatherOverlay)`.

- [x] **2.13 MusicDock's 1Hz poll re-renders even while paused** — `frontend/src/components/MusicDock.jsx:164-178`
  `setTrack({...})` allocates a fresh object per tick. **Fix**: functional update
  returning `prev` when title/time/duration/live are unchanged. (The poll itself is deliberate.)

  **DONE.** A functional update returning `prev` when nothing changed, and the
  position is floored to whole seconds — the bar renders m:ss, so sub-second
  precision was guaranteeing a fresh object every tick even for a paused player.

- [x] **2.14 HudFocusCard clones the whole `sessionDays` map every second** —
  `frontend/src/components/HudFocusCard.jsx:60-65`
  `{ ...sessionDays, [today]: focusMinutesLive }` + a `focusStreak` walk per 1Hz tick,
  over a map that grows unbounded (300+ keys after a year). **Fix**: `useMemo` keyed on
  `[sessionDays, focusMinutesLive, dailyGoal]`.

  **DONE.** `useMemo` keyed on `[sessionDays, focusMinutesLive, dailyGoal, today]`.

- [x] **2.15 Minor backend hot-path items** — `backend/app.py:154-160` (auth does 2 queries
  per request; a Token↔User join does it in 1), `:123-151` (`issue_token` commits twice;
  fold `_prune_tokens` into the same transaction), `frontend/src/components/SettingsPanel.jsx:220`, `:231`
  (hue/sat sliders write localStorage per drag tick — debounce or write on pointer-up).

  **DONE.** `current_user` is now one join rather than a token query plus a lazy
  load; `issue_token` flushes and lets `_prune_tokens` share its transaction, so
  there is no window in which the new token is committed and the stale ones are not.
  The hue/sat slider writes are covered by the debounce in 2.16. Also folded in the
  shared `_bearer_value()` from 3.7.

- [x] **2.16 Iso odds and ends** — `frontend/src/components/IsoRoom.jsx:425-472` (roam
  interval torn down on every layout identity change; use a `placementsRef`),
  `frontend/src/lib/isoRoom.js:398`, `:486` (`seatFor`/`surfaceFor`/`overSoftSpot` are
  O(n²) per render — fine today, folds into 2.8's memo),
  `frontend/src/store.jsx:170` (`applySoundPatch` sync localStorage write per slider event).

  **PARTLY DONE.** `applySoundPatch` debounces the localStorage write by 250ms
  while keeping the state update and the gain change immediate — you can hear a
  lagging slider; you cannot hear a delayed disk write. The roam interval's teardown
  and the O(n squared) `seatFor`/`surfaceFor`/`overSoftSpot` passes are left as the
  scan itself suggests: they fold into 2.8, which is deferred.
---

## 3. Cleanups (no behavior change)

- [x] **3.1 Local-date formatting implemented twice** — `frontend/src/lib/stats.js:5-20`
  duplicates `frontend/src/lib/dates.js:10-15`. This is the exact UTC-vs-local subtlety
  the app has been burned by before. `stats.js` should import from `dates.js`.

  **DONE** (earlier the same day, while adding the history view): `stats.js` imports
  `toISO` from `dates.js`. Worth doing for correctness rather than tidiness — the
  whole point of that helper is the UTC-vs-local subtlety the app has already
  shipped a bug for.

- [x] **3.2 `storage.js`'s own `readJSON`/`writeJSON` are unused** — `frontend/src/lib/storage.js:45-63`
  vs ~10 hand-rolled `try { JSON.parse(readStored(...)) } catch` blocks across
  `store.jsx` (108, 141, 202, 214, 285, 310, 321, 335, 890) and `timer.jsx:90`.

  **DONE.** All ten hand-rolled `JSON.parse(readStored(...))` sites now use
  `readJSON`. The surrounding `try`/`catch` blocks were KEPT where they still do
  something — several also shape-check the result (`Array.isArray(saved) ? ... : []`)
  or call a validator that could throw — so removing them would add risk for no
  gain. The duplicated parse logic, which was the actual problem, is gone.

- [ ] **3.3 Live-streak merge expression duplicated** — `HudFocusCard.jsx:60-65` and
  `ProgressPanel.jsx:53-57` (identical `focusStreak({...sessionDays, [today]: focusMinutesLive}, ...)`).
  Extract a shared `useLiveStreak()` hook or expose from the timer provider.

  **NOT DONE — worth doing, low risk.** The live-streak merge is still duplicated
  between `HudFocusCard` and `ProgressPanel`, and the ProgressPanel copy now feeds
  the new heatmap too. A `useLiveStreak()` hook is the right shape. Left out of this
  pass to keep it to behaviour-affecting changes plus the cleanups that guard
  against drift.

- [x] **3.4 Duplicate `h:mm:ss` formatters** — `HudFocusCard.jsx:13-20` and `MusicDock.jsx:62-68`.

  **DONE.** One `formatClock(seconds, { padMinutes })` in `lib/time.js`. The two
  were NOT the same function — a countdown reads `05:00` so its digits do not shift
  at ten minutes, a track reads `5:00` — so the option preserves both rather than
  flattening one. Six tests, including that neither renders `NaN:NaN` for the absurd
  duration YouTube reports on a live stream.

- [ ] **3.5 Armed split-pill delete chip markup duplicated** — `MusicPanel.jsx:90-121` and
  `WeatherPanel.jsx:226-247` (`useArmed` centralizes behavior; extract an `<ArmedChip>` for the markup).

  **NOT DONE.** Markup duplication only, and an `<ArmedChip>` has to be designed
  around the two call sites' differing labels and layouts. Worth its own small pass
  rather than a rushed extraction.

- [ ] **3.6 Dead emoji `icon` fields on `SOUND_CHANNELS`** — `frontend/src/lib/audio.js:13-21`
  (only `key`/`label` are read; MusicPanel keeps its own Lucide map deliberately).

  **NOT DONE.** The dead `icon` fields on `SOUND_CHANNELS` are harmless; deleting
  them is best done when someone is next in that file for another reason.

- [x] **3.7 Backend DRY** — profile response dict built twice verbatim (`app.py:677-685`,
  `:722-730` → `_profile_payload(user)`); tolerant JSON-blob parsing hand-rolled three
  times (`:504-517`, `:741-749`, `:665-672` → one `read_blob(raw, default)`); `logout`
  re-parses the Authorization header (`:309-310` → shared `_bearer_value()`).

  **DONE for two of the three.** `_profile_payload(user)` replaces the verbatim
  duplicate (GET and PUT both return it, so two copies is one edit away from a PUT
  whose response omits a field), and `_bearer_value()` replaces `logout`'s
  hand-rolled re-parse of the Authorization header. The three tolerant JSON-blob
  parsers are left alone: they have genuinely different fallbacks and shapes, so one
  `read_blob` would need enough parameters to be no clearer than what is there.

- [ ] **3.8 `update_task` empty-name handling contradicts its own stated policy** — `backend/app.py:389-390`
  Silently ignores an empty name while the duration branch 400s with a comment saying a
  client bug shouldn't look like a successful save. Either 400, or comment the
  "empty means don't change" intent. (Possibly deliberate.)

  **NOT DONE — needs a decision, not a fix.** `update_task` silently ignores an
  empty name while the duration branch 400s. Both behaviours are defensible ("empty
  means do not change" versus "a client bug should not look like a save"), so
  picking one is a product call and wants an explicit choice rather than my guess.

- [ ] **3.9 Dead Kenney `variants`/`noMirror` plumbing** — per the WIP comment at
  `frontend/src/lib/isoRoom.js:111-117` no catalog entry uses them anymore, but the
  plumbing survives in `IsoRoom.jsx:973`, `:936-939` (stale comment), `:1046-1047`,
  `RoomPanel.jsx:131`, `RoomTintPicker.jsx:56-78`. Possibly deliberate (future raster
  items); if the PNG era is over, delete in one pass. Note CLAUDE.md's rendered-PNG
  section is behind this WIP tree and would need updating too.

  **NOT DONE — deliberately.** The Kenney `variants`/`noMirror` plumbing is only
  dead if the raster-sprite era is over, and that is a design decision. Deleting it
  also means rewriting CLAUDE.md's rendered-PNG section. Leave it until someone
  decides.

- [ ] **3.10 Shared-geometry extraction in iso** — `IsoPresetPreview` (RoomPanel.jsx:83-96)
  re-implements IsoRoom's stack/seat resolution loop (IsoRoom.jsx:474-499) → export a
  shared `resolvePlacements()` from isoRoom.js; `overSoftSpot` (IsoRoom.jsx:52-58) and
  the roam `blocked` check (:460-466) re-implement `footprintsOverlap` (isoRoom.js:702).

  **NOT DONE.** `resolvePlacements()` would be a genuine improvement — the preview
  re-implements IsoRoom's stack/seat loop — and it pairs naturally with 2.8's
  `memo(PlacedItem)` extraction. Both touch the same code, so they belong in one
  pass.

- [x] **3.11 Dead conditionals in the edit grid** — `IsoRoom.jsx:774-776`, `:788`:
  `editMode ? … : …` ternaries inside a `{editMode && …}` block — false arms unreachable.

  **DONE.** Three `editMode ? ... : ...` ternaries removed from inside the
  `{editMode && ...}` block, where the false arms were unreachable — three ways to
  describe a state that cannot happen.

- [x] **3.12 Trivia (noting, not pressing)** — `_prepare_database` (`app.py:92`) swallows
  `KeyboardInterrupt` into a SchemaError (cosmetic, from-source Ctrl-C only);
  `scheduled_date` accepts any 10-char string (`app.py:373`, `:407` — possibly
  deliberate; a `\d{4}-\d{2}-\d{2}` check is one line); App's Escape-listener effect
  resubscribes on every `frontKey`/`roomEditMode` change (`App.jsx:126-154`);
  `addTask` is the only task action without its own catch+toast (`store.jsx:833-836` —
  both current callers wrap it, but a third caller could silently break the convention).

  **PARTLY DONE.** `scheduled_date` now goes through `clean_date`, which is the
  date-shaped check this asks for (added with the due-date work: a bare `[:10]` let
  any ten-character string into a date column). The `KeyboardInterrupt` swallow,
  App's Escape-listener resubscription and `addTask`'s missing catch are left as
  noted — all three are cosmetic or already covered by their callers.
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

---

## Status — worked through 2026-08-08

Every item above now carries a note saying what was done, or why it wasn't.
**36 of 44 are ticked**; the 8 left open are listed with a reason rather than
silently skipped.

Verified before starting: each top-tier finding was re-checked against the code
rather than taken on trust. The scan held up unusually well — no false positives
among the important ones. Four corrections worth recording:

* **1.9 understated it.** There is a FOURTH unbounded-integer site,
  `/api/tasks/reorder`, which no test covered.
* **1.11 overstated it.** The mechanism is real but the error is bounded at about
  a second, and it rounds away before anything is logged. `click` is a discrete
  event at React's SyncLane, so two clicks don't batch into one render.
* **1.4's wording.** The item is sticky, not immovable — a drag large enough to
  land the whole footprint back on floor recovers it, so it's every SMALL nudge
  that is silently ignored.
* **1.8 is inert.** The mechanism is real, but no in-app path can produce a bad
  preset, and the value self-heals on the next launch via the read whitelist.
  Closed anyway, as hardening.

Deferred, all for the same reason — invasive, and the measured frame budget has
headroom (4.2ms for a realistic room, 8.4ms for a deliberately extreme one,
against 16.7ms): **2.2** (hoist the scene out of the camera's state), **2.8**
(`memo(PlacedItem)`), the closure half of **2.4**, and **3.10** (which pairs with
2.8). Left as product decisions: **3.8** (empty-name policy) and **3.9** (whether
the raster-sprite era is over). Left as ordinary tidying: **3.3**, **3.5**, **3.6**.

Section 4 was out of scope for this pass, but three of its items landed
separately: **4.2** (calendar intensity + a trend view) and **4.3** (task editing)
are built, and **4.1** is half-built — the calendar shades by minutes now, though
`FocusSession.taskName` still isn't read back anywhere.

## Suggested first batch

The natural starting point: bugs **1.1–1.3** (wall-clock timer, mid-run preset guard,
`completed_at` transition guard) plus the one-line drag bail-outs from **2.1** — small,
test-coverable, and independent of the in-flight WIP.

**Done** — and then the rest of sections 1 and 2, plus the cleanups that guard
against drift. See the Status section above for what was left and why.

---
---

# Fable codebase scan — 2026-08-08

A second full pass, run after the 8-7 scan was worked through. Focus this time:
**animation and design** (per request), plus a correctness review of the
uncommitted WIP (focus journal, character models/hair, `taskName: null`).
Three independent reviewers swept animation, design/UI, and the WIP diff; the
top findings were then re-verified by hand against the on-disk code. Anything
CLAUDE.md or docs/DESIGN.md documents as deliberate was excluded.

**Overall verdict**: the motion system's hard rules (phase-after-shorthand,
prime cycles, duty budget, wrapper-vs-child transforms) all hold — the tests
pin them and the tests are right. What this pass found is the *edges* of that
system: places the rules were written after some code shipped and never
back-applied (the flat cottage, the cottage window, the particle one-shots),
one tooling problem that quietly turns off the exact tests guarding the WIP,
and a handful of design-grammar drifts in newer UI.

---

## 0. The red flag first: the component tests are not running on this machine

- [ ] **0.1 All six jsdom test suites silently fail to execute locally** —
  environment, not code. Local Node is v20.15.0, which lacks `require(ESM)`;
  jsdom 29.1.1 pulls `html-encoding-sniffer@6` → `@exodus/bytes` (ESM-only
  entry), so every `// @vitest-environment jsdom` file — `IsoItems.test.jsx`,
  `motion.test.js`, `RoomTintPicker.test.jsx`, `WeatherOverlay.test.jsx`,
  `ErrorBoundary.test.jsx`, `storage.test.js` — dies at environment setup and
  is counted as an "unhandled error", NOT a failure. `npm test` prints
  **"502 passed"** and exits 1 with 6 identical `ERR_REQUIRE_ESM` errors, which
  is easy to read as green. Consequence: the sprite-catalog render test and the
  motion duty-cycle pins have **never executed against the large Resident/hair
  rewrite sitting in the WIP** — locally it is verified by lint and build parse
  only. **Fix**: upgrade Node to ≥ 20.19 (or 22.12+); confirm what Node CI runs
  before trusting its green as coverage. Do this before shipping the WIP.

---

## 1. Animation (the main concern)

### Bugs

- [ ] **1.1 Reduced motion leaves one-shot particles frozen VISIBLE** —
  `index.css:837-841` (`.shooting-star`), `:863-866` (`.bird-fly`),
  `:334-337` (`.steam-puff`), `:375-378` (`.bubble-rise`), plus `.pond-ripple`
  and Cottage's `.window-rain`/`.window-snow`.
  These classes rest at invisible only inside their keyframes (0% and 100% are
  `opacity: 0`); none carries that rest state as a base style. Under
  `data-motion="reduced"` the `:is()` block applies `animation: none` — which
  drops each element to its base style, i.e. **fully visible**: a permanent
  46px star-streak parked in the night sky, an opaque bird frozen at the left
  edge, static bubbles in the aquarium *brighter* than their animated peak,
  a frozen ripple ring on the pond, a static steam wisp on every mug, rows of
  raindrops parked at the top of the cottage window. This is exactly the
  failure mode the CSS's own comment block (`index.css:458-462`) warns about —
  the yawning mouth got the presentation-attribute fix; these never did, and
  `motion.test.js` only pins the mouth. **Fix**: give each class a base
  `opacity: 0` in its CSS rule (keyframes outrank it while running; it takes
  over under `animation: none`). For `.steam-puff` put it on the class — the
  animation rides the wrapper `<g>`. Then extend the motion test's rest-state
  pin beyond the mouth so the next one-shot can't regress this.

- [ ] **1.2 Cottage window snow/leaves use POSITIVE delays — visible flakes
  park, then pop** — `Cottage.jsx:327-328` (snow, up to 2.5s delay against
  4-8s durations), `:348-349` (leaves, up to 3.2s against 6-9s).
  With a positive delay and no `fill-mode: backwards`, each flake renders its
  base style (fully opaque, parked at the top of the glass) until its animation
  starts, then snaps to the 0% keyframe's `opacity: 0`. `WeatherOverlay.jsx`
  documents this exact lesson for the full-screen overlay ("a positive delay
  parks a flake at its start position") and uses negative delays; the cottage
  window never got the fix. Rain survives only because its durations are
  sub-second. **Fix**: negative delays scaled to each duration, same as
  WeatherOverlay — and it makes the window "already snowing" on frame one.

### Rule violations (the system exists; these opted out)

- [ ] **1.3 The flat Cottage scene never sets `--phase`/`--dur-scale` — every
  ambient loop runs in lockstep** — `Cottage.jsx:437-441` (placement groups set
  only `--tint`), vs `IsoRoom`'s `ambienceVars`.
  Place three plants in the flat scene and they sway as one body — the exact
  "45 plants swayed as one" bug the iso room fixed, still live in the legacy
  scene. RoomItems' garland stagger offsets *relative to* a `--phase` that is
  always 0 here, so every placed garland repeats the identical pattern too.
  The flat cottage is the opt-out throwback, so severity is moderate — but
  DESIGN.md's "instances must disagree" is unqualified. **Fix**: spread
  `ambienceVars(...)` (exported from `lib/motion.js`) into each placement
  group's style, fed from the placement's x/y.

- [ ] **1.4 LightJar's five fairy lights blink in perfect lockstep** —
  `IsoItems.jsx:4122-4130`. All five bulbs are bare `className="room-twinkle"`
  circles sharing the placement's single inherited `--phase` — the
  "screensaver tell", inside the one item whose entire point is scattered
  twinkle. Both sibling sprites already solve it (IsoRoom's string lights and
  RoomItems' garland use an additive `calc(var(--phase, 0s) - …)` per-bulb
  delay); the motion test's scan only rejects *bare* inline delays, so it
  can't see a missing stagger. **Fix**: the same additive per-bulb delay,
  derived from the bulb index.

- [ ] **1.5 WIP: ponytail/braid crowns sit outside the gesture wrappers and
  detach from the head** — `IsoItems.jsx:~3326` (`HairLength` static) vs
  `:3447-3452` (head + `HairBehind` inside `gesture-yawn`→`rub-head`→`look`).
  The static-hair comment is right for the long/bob *curtain*, but the new
  ponytail puts its gathering knot — and the braids their top knots — on the
  skull, in the static layer. Every glance/yawn/rub translates the head 2-3px
  while the knot stays pinned: hair visibly slides off the skull for the
  3-4 seconds of each gesture, and the yawn lifts `HairBehind` over the
  ponytail bobble entirely. **Fix**: move the crown-anchored pieces (knots,
  braid tops down to the jaw) into `HairBehind`, leaving only the hanging
  tail/plaits in `HairLength`. (Being outside `body-breathe` is sub-pixel and
  fine — leave that.)

- [ ] **1.6 WIP: no test renders the new hair styles or the `fem` model** —
  `IsoItems.test.jsx` draws the Resident only with the default character; none
  of `messy`/`ponytail`/`braids` nor `model: "fem"` is ever rendered. This is
  precisely the "sprites and catalog drifting apart" class the file exists
  for — a future `HAIR_STYLES` key with no drawing branch falls through to the
  default cap silently. **Fix**: loop `MODELS × HAIR_STYLES` rendering
  `<Resident>`; blocked on 0.1 actually letting it run.

### Animation cleanups

- [ ] **1.7 Doc drift: CLAUDE.md says `--dur-scale` is "spent only by the sway
  family"** — in reality all six gesture classes, `ear-twitch`, `pool-breathe`
  and `pool-flicker` multiply by it (`index.css:486-928`, nine sites). Not a
  bug (both halves of each two-part gesture scale identically, and the test
  confirms the shared clock) — but the sentence will mislead the next reader
  into "fixing" a gesture that uses it. Update CLAUDE.md.

- [ ] **1.8 The `.pill` hover lift is a third transform transition, undocumented
  and ungated** — `index.css:999-1008`. DESIGN.md claims exactly two
  transitions exist (lightning flash, wander glide). A 1px response to the
  user's own pointer is defensibly exempt from reduced-motion — but then the
  doc should name it as a deliberate exemption, or the transition should
  collapse under `data-motion="reduced"` like `.clock-tick` does. Pick one.

---

## 2. Design / UI

- [ ] **2.1 High priority is painted `rose` — the one color that must never
  carry meaning** — `TaskPanel.jsx:6-10`
  (`high: "bg-rose/30 text-rose border-rose/40"`). Rose re-tints per theme:
  grey-blue in shore, tan in linen — a "high" badge that stops reading as
  urgent and drifts toward medium's amber in the warm themes. The documented
  rose exception is the pomodoro cluster, not priority. **Fix**: base the high
  badge on fixed `danger` (e.g. `bg-danger/20 text-danger border-danger/40`).

- [ ] **2.2 Icon-only buttons missing `aria-label`** (DESIGN.md: `title` is a
  last-resort accessible name) — the omissions are inconsistencies, not
  policy, because each has a labelled sibling:
  `HudFocusCard.jsx:187-193` (Play — its sibling Pause *has* the label),
  `:215-223` (⚙ options), `MusicDock.jsx:272-294` (prev/play-pause/next —
  the other three transport controls are labelled), `TopBar.jsx:134-152`
  (`IconToggle` never renders one; give it `aria-label` defaulting to
  `title`), `HudTasks.jsx:206-214` (routine toggle), `:147-157` (the complete
  toggle's accessible name is the literal "✓" glyph). Related: armed deletes
  keep `aria-label="Delete task"` while visibly showing "sure?" — swap the
  label when armed so screen readers hear the state.

- [ ] **2.3 Clicking a ProfilePanel caption activates the first option button** —
  `ProfilePanel.jsx:67-76`. `Field` is a `<label>` wrapping the whole control;
  for `Choices`/`Swatches` the children are `<button>`s, so clicking the word
  "MODEL" silently picks "Guy", "SKIN" picks porcelain. Pre-existing, but the
  new Model field extends it. **Fix**: grouped controls get a `<div>` +
  `<span id>` caption + `aria-labelledby` on the group; keep `<label>` only
  for single inputs (Name, Bio, Birthday).

- [ ] **2.4 WIP: "1 minutes" in the focus journal** — `breaks.js:77-83`
  pluralizes hours but not minutes (`` `${m} minutes` ``), and its docstring
  says it exists to word the *break-nudge threshold*, where the value is never
  1. The journal borrowed it (`CalendarPanel.jsx:191`, `:210`), so a 1-minute
  session reads "1 minutes". Fold into 2.5.

- [ ] **2.5 WIP: two duration vocabularies inside one panel** — CalendarPanel
  already has compact `spanFor` ("2h 5m") for day-cell tooltips at `:89-94`,
  while the new journal rows use prose `formatSpan` ("2 hours 5 min"); the
  `tabular-nums` on the prose does nothing. **Fix**: one shared lib formatter
  with compact (data rows) and prose (sentences) registers — the same
  "surfaces can't disagree" reasoning `formatSpan` itself was built on —
  used by CalendarPanel, ProgressPanel and the break nudge.

- [ ] **2.6 WIP: the journal section flickers out on same-day refetch** —
  `CalendarPanel.jsx:38-55`. The effect runs `setJournal(null)`
  unconditionally, including when `selectedMinutes` changes — finishing a
  block with the panel open, the exact case that dep was added for. The
  section unmounts, "Planned for" jumps up, then everything pops back after
  the round-trip. **Fix**: clear only when the *day* changed
  (`setJournal(j => j && j.day === selected ? j : null)` — the endpoint
  already returns `day`; add it to the error fallback too). Bonus: a day with
  `selectedMinutes === 0` cannot have entries (server refuses sub-minute
  sessions), so skip the guaranteed-empty fetch entirely.

- [ ] **2.7 WIP: long task names break the day view's older rows** — the new
  journal rows correctly truncate (`min-w-0 flex-1 truncate`), but the
  pre-existing "Planned for" (`CalendarPanel.jsx:241`) and "Unscheduled"
  (`:269`) rows beside them don't — a long name pushes "Unschedule"/"+ add"
  out of the row. Give them the same classes.

- [ ] **2.8 Decide: legacy `"Focus"`/`"Stopwatch"` rows now read as fake task
  names** — `timer.jsx` correctly sends `taskName: null` now, but every
  session already in the DB holds the old literal placeholder, so historical
  days will show a task called "Focus" forever — the exact ambiguity the
  change exists to remove, frozen into old data. **Fix if wanted**: one-time
  Alembic data migration `task_name IN ('Focus','Stopwatch') → NULL` through
  the normal migration pipeline. Small risk of catching a genuinely-named
  task; probably acceptable for a single-user app — but it's a decision, so
  it's flagged rather than assumed.

- [ ] **2.9 Note (deliberate, but worth one line of UI)** — a failed journal
  fetch is indistinguishable from an empty day (`CalendarPanel.jsx:46-49`
  catches into `{entries: [], total: 0}`, console-only; the comment declares
  the choice, and reads aren't covered by the writes-must-toast rule). Still:
  a day tinted "3h focused" with a silently absent breakdown is a small lie.
  A muted inline "couldn't load what you focused on" would be truthful
  without a toast.

Verified compliant this pass (no action): toast wrapper pointer-events/
aria-live, storage.js as the only localStorage gateway, no `toISOString` day
math outside the lib, no raw `opacity-0 group-hover`, armed-delete coverage
across all destructive surfaces, `.intro-chrome` hidden via visibility only,
z-order ladder coherent, the new endpoint's auth/validation/scoping and its
8 tests, the `character.model` vocabulary end-to-end, and the Resident
geometry arithmetic (shoulders, hems, hair clearances) for all 6 build×model
combos.

---

## 3. Suggestions — animation & design polish worth adding

Small, each fits the existing system:

- [ ] **3.1 Ear-twitch for the dog and bunny** — CLAUDE.md's "ear-twitch on the
  near ear" only exists on the cat. The bunny especially: alert ears are its
  entire awake silhouette, and its ear wrappers already have their own
  transform (so the class goes on an inner group, per the wrapper rule).
- [ ] **3.2 Sync a flame to its own pool** — `flame-dance` runs 1.5s,
  `pool-flicker` 2.6s, so a candle's cast light guts out of step with the
  flame casting it. Same base period (they already share `--phase`) makes the
  pool answer the flame.
- [ ] **3.3 Wing-flap for the passing bird** — the sky bird is a rigid glyph
  sliding on a line; a 0.4s `scaleY` oscillation on the path *inside* the
  already-animated svg (separate element — no conflict) sells the flight for
  one keyframe block.
- [ ] **3.4 Vary the shooting star** — it fires from the identical point on the
  identical 24° line every 150s, so catching one is learnable rather than
  lucky. Two spans with different fixed positions and offset negative delays
  keeps it deterministic (no Math.random) and un-memorizable.
- [ ] **3.5 Day-cell journal popover** — hovering/long-pressing a tinted
  calendar day shows its top 2 "focused on" entries in a small glass popover
  (TopBar's weather-popover pattern) — the story without opening the section.
  Chromeless, on-scene: exactly the VC2 grammar.
- [ ] **3.6 Feed the journal to the HUD chip** — the 🎯/🔥 chip could carry
  today's top task in its hover title ("mostly: thesis notes") — state on the
  scene, zero new chrome.
- [ ] **3.7 Journal rows as actions** — an entry whose `taskName` matches a
  live task sets it active on click ("pick it back up"), reusing the
  active-task grammar instead of being inert text.

Carried over, still open from the 8-7 scan: data export/import (4.4), °C
option (4.5), custom focus duration / long breaks / chime setting (4.6),
catalog search (4.7), scheduled-date badge (4.8), room codes (4.10), store
activation (4.11), compact desktop mode (4.12), and the deferred perf items
(2.2 / 2.8) which remain measure-first.

---

## Suggested first batch (8-08)

1. **0.1** — fix Node so the component tests actually run; then **1.6** (the
   hair×model render loop) lands with teeth.
2. **1.1 + 1.2** — the reduced-motion base-opacity pass and the window's
   negative delays: small CSS-only diffs, big correctness win for the
   accessibility mode.
3. **1.4 + 1.5** — the two WIP sprite fixes (jar stagger, ponytail crown)
   before the WIP commits, so they never ship.
4. **2.1** (danger, not rose, for high priority) and **2.4/2.5** (one duration
   formatter) — small, self-contained design-grammar fixes.
