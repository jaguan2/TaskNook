# Handoff — 2026-08-08

Where TaskNook stands, what's uncommitted, and what I'd pick up next. Written for
whoever (human or AI) opens this repo cold.

**Read first:** `CLAUDE.md` for architecture and the decisions that are
deliberate, `docs/DESIGN.md` for visual/UX rules, `docs/MODELS.md` for how iso
furniture is drawn. This file is only the *current state* — it goes stale, they
don't.

---

## 1. Uncommitted work in the tree right now

**18 files changed (+1800/−639), plus two new modules and their tests** (and this
file). All verified — see §4.

This is the **Fable scan pass**: `docs/fable_scan_8-7.md` was an audit produced by
a separate model instance, and it has now been worked through and *annotated in
place*. Every one of its 44 items in sections 1–3 carries a note underneath saying
what was done, or why it wasn't. **36 ticked.** That file is the detailed record —
don't duplicate it here, read it.

New modules (all with tests):

| File | Why it exists |
|---|---|
| `frontend/src/lib/time.js` | One `formatClock` (two near-copies existed and differed deliberately — a countdown pads minutes, a track doesn't) plus `remainingFrom`/`elapsedFrom`, the wall-clock derivation the timer now depends on |
| `frontend/src/lib/typing.js` | One `isTypingTarget` — App and IsoRoom had two copies that disagreed, and the shorter one let Backspace delete furniture while you typed in a `<select>` |

The headline fix is **the focus timer no longer counts interval callbacks**. It
keeps an absolute anchor and derives from `Date.now()`; the interval is just a
repaint trigger. Before this, a minimised window (the normal way to put a desktop
app away) stretched a 25-minute block into hours, and the completion notification
never reached the one person it exists for. If you touch `timer.jsx`, the rule is:
**every write to `remaining`/`elapsed` goes through `setClock`/`setStopwatch`**, or
the anchor ends up describing a value that no longer exists and the next tick
undoes your write.

---

## 2. ⚠ The committed `TaskNook.exe` is three rounds stale

Last rebuilt at `edcff09` (2026-08-06). Since then: two commits plus the
uncommitted work above, all of which reach the exe (`frontend/`, `backend/`).

CLAUDE.md's standing rule is to rebuild on **every** change that reaches it, so
the committed binary is never behind the source — that's a deliberate decision
(the download link never moves) with a real cost: **~42 MB of permanent git
history per rebuild**. It's the owner's call whether to batch these or rebuild per
commit. Flagging it because a stale exe is invisible: GitHub visitors download a
binary that silently lacks the fixes.

```bat
build-exe.bat
set TASKNOOK_SELFTEST=1 && TaskNook.exe   :: must exit 0
```

The self-test is not optional. The backend ships as loose `--add-data`, so
PyInstaller's analyzer can't see its imports: a missing `--hidden-import` fails
only at runtime, in the exe, silently, because `--windowed` has no console.

---

## 3. What's open, and why

### One coherent next pass: the deferred render-path work

These four belong **together** — they touch the same code, and doing them
piecemeal means threading the same props twice:

- **2.2** — hoist the scene out of the camera's state (`view` is read only by the
  svg's `viewBox`, so this works)
- **2.8** — extract `memo(PlacedItem)`
- **2.4 (remainder)** — `useCallback` the ~30 store actions and memoise the
  context `value` object. The *derived values* are already done.
- **3.10** — export a shared `resolvePlacements()`; RoomPanel's preview
  re-implements IsoRoom's stack/seat loop

**Measure before starting.** The reason I stopped short is that the budget has
headroom: a realistic room renders at 4.2 ms with motion on, a deliberately
extreme 144-item one at 8.4 ms, against 16.7 ms. The cheap wins already taken
(2.1, 2.3, 2.5, 2.6, 2.7) removed much of the same per-frame work. Get render
counts before and after, or you can't tell whether this helped.

### Two product decisions, not bugs

- **3.8** — `update_task` silently ignores an empty name while the duration branch
  400s. Both behaviours are defensible; pick one deliberately.
- **3.9** — the Kenney `variants`/`noMirror` plumbing is only dead if the
  raster-sprite era is over. Deleting it also means rewriting CLAUDE.md's
  rendered-PNG section.

### Ordinary tidying, no rush

**3.3** (a `useLiveStreak()` hook — still duplicated between `HudFocusCard` and
`ProgressPanel`), **3.5** (`<ArmedChip>`), **3.6** (dead `icon` fields on
`SOUND_CHANNELS`).

### Section 4 of the scan — features, untouched

Twelve ideas, unticked. Three landed separately: **4.2** (calendar intensity + a
trend view) and **4.3** (task editing) are built; **4.1** is half-built — the
calendar shades by minutes now, but `FocusSession.taskName` is still collected and
never read back, so "what did I focus on that day?" has no UI. The cheapest
remaining wins are **4.5** (°C — Fahrenheit is hardcoded in the fetch, and most of
the world isn't American) and **4.7** (catalog search; 144 items is past scrolling).

### Roadmap items in the README, not built

Pets that roam (partly done — cat/dog/bunny wander and now gesture) and
multiplayer study rooms.

---

## 4. How to verify

```bash
cd frontend && npm run lint && npx vitest run && npm run build
cd backend  && python -m pytest tests -q
cd backend  && set FLASK_APP=app.py && python -m flask db check
```

Expected right now: **716 frontend tests, 155 backend tests**, lint clean, build
clean, `No new upgrade operations detected.`

`flask db check` is the one people forget — it's how a model change without a
migration gets caught, and CI runs it.

### Verifying the app itself

Tests won't catch a sprite drawn in the wrong place or a gesture that reads wrong.
Run both servers (`python backend/app.py`, `npm run dev`) and look. If you drive it
with a headless browser, three traps from this session:

- **Read the element you mean.** A probe of the timer matched the TopBar's *time of
  day* and reported the clock frozen when it was fine. Target the node
  (`p.tabular-nums`), not body text.
- **Don't freeze timers with CDP virtual time** to simulate a hidden tab — it also
  suspends the page's network and every subsequent assertion becomes garbage. Test
  wall-clock logic as a pure function instead (`remainingFrom` exists for this).
- **Keep the measurement window clean.** A preset swap or a screenshot landing
  inside a frame-timing sample read as 10 dropped frames that weren't there.

---

## 5. Traps worth knowing before you edit

Most are recorded as comments at the site, and the big ones are in `CLAUDE.md` /
`docs/DESIGN.md`. These are the ones that cost me time this session:

- **Backend tests share one database, and demo seeding has already run.** A test
  helper that registers a fixed username works for the first test and returns
  "username taken" — with no token — for every one after it. It fails as a
  `KeyError` far from the cause, and each test passes in isolation. Use a unique
  name per client (`_ACCOUNTS = iter(range(...))`).
- **Don't put a helper between a route decorator and its function.** Flask
  registers whatever comes next as the view. A misplaced `clean_date` turned every
  task creation into a 500 with a baffling message.
- **A guard test you haven't broken on purpose isn't a guard.** Mutate the real
  code, confirm the *intended* assertion fails and names the right thing, restore.
  Two ways this bites: a mutation that turns out to be a no-op (so MISSED means
  nothing), and a failure raised by a *different* assertion than the one you were
  testing.
- **Scripted edits: check line endings and re-read the result.** A Python rewrite
  normalised `index.css` from CRLF to LF and inflated its diff to 1,645 lines; a
  generated block emitted bare `rotate(0deg)` with no property name and *every test
  still passed* — only the build caught it.
- **SQLite forgives, other databases don't.** It ignores `VARCHAR` length and
  raises `OverflowError` only at bind time for a large int. Both were live holes
  (`clean_int`, and the width constants in `models.py`) that no test noticed.

---

## 6. If I had one more session

1. **Rebuild and self-test the exe** (§2) — or decide explicitly to batch it.
2. **Look at the room.** The winter/spring sets and the break pose were verified in
   a browser, but only as isolated pieces in test rooms; nobody has lived in it.
3. **4.1 — the focus journal.** `taskName` is already on every `FocusSession` and
   the calendar already has a day-selected state to hang it off. Cheapest feature
   with real payoff left, and it makes the history view answer "doing what?"
   instead of just "how long".
4. Then the render-path pass in §3, if — and only if — a measurement asks for it.
