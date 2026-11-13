# Codebase structure review — November 10, 2026

Reviewed clean checkout `ec732a8`. This is a structure and maintainability scan,
with targeted behavior investigation. It is a report-only pass; runtime source,
the executable and the update manifest were not changed.

## Assessment

The overall architecture fits a local desktop productivity app. React/Vite owns
the interface and authored SVG rooms; Flask exposes a same-origin API;
SQLAlchemy/Alembic persist the local SQLite database; pywebview packages the same
application into a native window. Simulated neighbours, visits and chat add life
to the task tracker rather than providing networked multiplayer.

The principal maintainability problem is concentrated frontend ownership. The
domain contexts are separated, but most state, asynchronous coordination and
persistence still live in one `StoreProvider`. Improve those ownership boundaries
incrementally, beginning with room synchronization, where a real stale-read
defect was reproduced. The existing framework and top-level directory layout
can support these changes.

## Current ownership map

| Area | Main owners | Responsibility |
| --- | --- | --- |
| Application composition | `frontend/src/main.jsx`, `App.jsx` | Providers, scene selection, lazy panels, HUD and desktop mode |
| Shared domain state | `store.jsx`, `storeContexts.jsx`, focused hooks | Account, tasks/calendar, room, social, weather, audio and preferences |
| Focus timer | `timer.jsx`, `lib/time.js`, `lib/breaks.js` | Clock, sessions, Pomodoro and presence reminders |
| Domain rules and art | `lib/`, `components/character/`, `Iso*Items.jsx` | Placement, catalogs, progression, simulated behaviour and SVG drawing |
| External boundaries | `services/` | API, guarded browser storage, audio and desktop bridge |
| API and persistence | `backend/routes/`, `models.py`, `schema.py`, migrations | Request handling, data models and safe schema upgrades |
| Desktop delivery | `desktop.py`, `desktop_updates.py`, `scripts/desktop_package.py` | Native lifecycle, update notices and artifact verification |

## Findings, in priority order

### 1. Room hydration can replace a newer, successfully saved edit

Location: `frontend/src/store.jsx:1018–1067`; save acknowledgement at
`store.jsx:824–828`.

The room-loading effect awaits `api.getRoom()` without capturing a local-edit
generation or checking whether that effect is obsolete. Its recovery decision
uses the dirty marker at response time. If a user edits while the GET is pending
and the debounced PUT succeeds first, that acknowledgement clears the marker.
The older GET then replaces the current layout and its device mirror.

A disposable component probe reproduced this sequence: hold the initial room
read, add a mug, wait for the save acknowledgement, then return the older empty
room. The saved mug disappears from both React state and the local mirror. The
probe checks the actual save payload to establish that the edit was acknowledged
before delivering the stale read. SQLite still holds the newer layout at that
point; a subsequent full-layout edit can propagate the stale layout back to it.

Capture and check both read lifetime and local-edit generation before applying
hydration or clearing recovery markers. Keep flat and isometric snapshots in
the same persistence owner because they share one API payload. The existing
`useProfileCharacter` generation checks are a useful local precedent. Add a
permanent regression for this ordering when implementing the fix.

### 2. Domain contexts separate subscriptions, but the store still owns too much

Location: `frontend/src/store.jsx:165`; domain value composition begins around
`store.jsx:2563`.

The 2,726-line file owns room transformations and persistence, account bootstrap
and reauthorization, task mutation/reconciliation, social presence and visits,
chat reply timers, weather scheduling, and music preferences. These features
share lexical state and refs, so changing one lifecycle requires understanding
unrelated effects in the same provider. This is an ownership problem beyond
file length. Narrow contexts already protect consumers from unrelated updates;
preserve that useful work.

Extract focused controllers with explicit inputs and returned actions, following
the existing `useProfileCharacter`, `useCommonPresence`, `useAppearanceSettings`
and `useSoundMixer` pattern. Start with room persistence, then weather and task
coordination. Keep chat/knock timers mounted at application lifetime, retain
task-first refresh sequencing, and keep challenge/XP credit after committed
writes. Leave the outer store responsible for deliberate cross-domain wiring.

### 3. Active tasks and completion history share an unbounded data boundary

Location: `backend/routes/tasks.py:16–43`, `frontend/src/store.jsx:930–1010`,
`frontend/src/components/CalendarPanel.jsx:94–141`.

Every task read loads and serializes the full archive. Task mutations and focus
logging invoke those reads. The store sorts the combined array, while the task
UI filters archived rows away and the calendar scans the same array for history.
Consequently, retaining more history increases routine task work even when the
visible list remains small. This confirms the still-applicable opportunity in
the October 21 review; this pass did not benchmark large archives.

Introduce a separate bounded history query and month/day completion summaries
together with calendar consumers. Then make ordinary task reads return the
active list. Filtering archived rows from the current endpoint alone would
remove calendar history. Keep all-history study-minute aggregation available
for existing progression and lifetime-time semantics.

### 4. Continue the existing sprite-family decomposition as art changes

Location: `frontend/src/components/IsoItems.jsx` (2,824 lines).

Seasonal, kitchen, plant, rug and other families already have dedicated modules,
but many seating, storage, lighting, architecture and technology drawings remain
inline beside the central sprite registry. Related families are therefore split
between files, making it harder to locate or compare their drawing conventions.

Move related inline drawings into their existing family modules when working on
that family, leaving `ISO_SPRITES` as a small assembly point. Preserve sprite
identity, shared geometry helpers, both orientations and catalog coverage. This
is lower-priority navigation debt; large declarative artwork registries alone
do not justify changing rendering behaviour or reorganizing every component.

## Boundaries worth preserving

- The timer has separate ticking and status contexts; `App` uses the latter.
- Production components use domain hooks; the broad `useStore` hook remains a
  compatibility/testing surface.
- Browser storage access is centralized and guarded.
- Models, migrations and startup backup handling have separate owners.
- Backend domain blueprints avoid importing the application module directly.
- Pure geometry/catalog logic and SVG artwork are substantially separated.
- Desktop bridge methods and native state have an explicit boundary, with
  artifact and frozen-startup checks in CI.

A simple scan of relative imports across 153 production JS/JSX modules found
no dependency cycles or unresolved relative imports. This is source-level
dependency evidence, not a complete runtime dependency or security audit.

## Verification and limits

- Frontend lint: passed.
- Node 20.20.2 production build: passed.
- Fresh frontend run with `--no-cache --maxWorkers=2 --minWorkers=1`:
  **1,478 passed, one existing art-fixture skip**.
- Backend on Python 3.11.4: **303 passed**, including schema lifecycle tests.
- Separate room-race probe: reproduced the stale-read overwrite.

The first cached frontend run reported 29 translation-related failures and an
older test count. Current resource files contained the required labels. A fresh
targeted run and then the full cache-disabled run passed. These failures are
therefore recorded as a cache-related observation, not a confirmed source defect.
Evidence reports and the temporary probe source snapshot are retained under
ignored `build/skill-verification/structure-2026-11-10/`; the probe was removed
from frontend test discovery after use.

The shared structural-review toolkit was unavailable in the installed skill
directories, so this pass followed repository guidance and the local skill
adapters; it does not claim a completed upstream rubric review. No browser UI,
native widget, frozen executable or external music/weather check was performed.
The report changes documentation only and requires no executable rebuild.
