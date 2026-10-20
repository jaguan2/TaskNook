# Performance and quality review — October 20, 2026

The initial audit was revised after an independent second Codex review and
comparison with all eight photos in `docs/inpso/`. The five accepted UI and
art improvements are now implemented on `dev`; the findings further below
retain the original measurements and the separately deferred opportunities.

The checkout started at `f46971e` on `dev` and advanced to `e07b49e` during the
review. The original audit's final browser checks and frontend tests cover `e07b49e`, including
common-room chat and presence. The backend paths discussed below are unchanged
between those commits. Existing staged, unstaged, and untracked source changes
were absent at both checkpoints.
The implementation checks cover the working-tree changes above that baseline.

**Implemented after the review**

- Preset, furniture and small outfit previews use the existing still-art
  treatment. Preset cards remain immediately visible and clickable; the main
  room and interactive profile preview keep their normal motion.
- Widget mode pauses hidden scene/drawer CSS animations without unmounting
  them. Pet roaming, NPC visual clocks and lightning scheduling stop while
  hidden and resume on return. Timer, audio and store-owned common-place
  population deadlines remain independent.
- The seat chooser returns focus to the resident after selection or closing,
  including after the five-second hint expires. Escape closes the chooser
  before leaving the room. Its opaque, bounded panel paints above the timer,
  task HUD and room chat; every enabled option center receives pointer input
  after scrolling at 1280×800, 900×640, 800×600 and 600×420, without page overflow.
  A final HUD check also found the Return Home chip covering Settings. The
  Dock now reserves the 44-pixel bottom rail; Return Home is a compact arrow
  below 1280 pixels, and narrow-window chat stays clear of the Dock. Settings,
  Widget Mode and Return Home receive pointer input at 600×420, 900×640 and
  1280×800. Return Home remains accessible with expanded or collapsed music.
- Grand Library stops repetitive prop, floor-light and background-resident
  loops. The guest's activity cues, six chandelier flames, sky and drifting
  dust remain animated. Reduced motion still makes the scene fully still.
- Common Cottage gains static contact shadows, wall/floor junction shading,
  warm wall bounce and light clipped to five supporting worktops. The raised
  nook uses its own floor height. Furniture, seat anchors, paths and character
  models are unchanged. The home scene reuses the extracted contact-shadow
  primitive with its original geometry and paint.

Fresh comparisons use the same Node 20 production build, temporarily restoring
the old CSS loops in the browser for the comparison sample. Each number is
Chromium `TaskDuration` over three seconds, not FPS or native WebView2 CPU:

| Scenario | Old loops restored | Implemented | Reduction |
| --- | ---: | ---: | ---: |
| Room drawer, 1280×800 | 1,704.9 ms / 316 animations | 279.9 ms / 71 animations | 84% |
| Grand Library, 800×600 | 1,935.7 ms / 190 animations | 669.4 ms / 62 animations | 65% |
| Library widget, 1280×800 | 159.8 ms / 63 animations | 6.1 ms / 0 animations | 96% |

These are controlled samples, not a cross-machine guarantee. The widget
comparison restores CSS only; its visual JS clocks remain paused in both
samples. No builds or tests ran during these measurements.

Verification evidence is in
`build/skill-verification/quality-visual-review-2026-10-20/` (ignored):
`implementation-results.json`, `art-lifecycle-results.json`, browser scripts,
matched `cottage-with-pilot-*` / `cottage-without-pilot-*` captures and seat
captures at all four sizes. The lighting comparison switches only the new
paint off in the same scene, with motion paused for matching frames.
Both reviewers judged the grounding and worktop warmth a useful, restrained
improvement; it does not establish reference-level model detail.
`scene-boundaries-results.json` additionally confirms paused decoration in both
home scene engines, the same mounted isometric scene/camera on return, and zero
running library animations under the Reduced setting. Dock controls are checked
after scrolling its intentionally bounded list into view.

The browser lifecycle check observed the same running local Web Audio context
before, during and after widget mode. The timer counted down while hidden,
crossed focus→break under an accelerated wall clock, saved exactly one session
to the disposable database, and returned to the same selected seat. No page
exceptions occurred. Full frontend tests: **1,346 passed, one existing opt-in
art test skipped**; lint and the supported Node **20.20.2** production build
passed. The independent structural review found no remaining blocker after
fixing a stale motion assertion and the first small-window chat overlap.
Native animation feel and native performance are not established by these
browser checks.

The main-channel desktop pair was rebuilt with PyInstaller **6.21.0**:
build `0e405becd6bd41a1ba446a88b81b1938`, EXE SHA-256
`1102c762637c116cb6e0f42bf7ec43c83e56749faf3e78ce42d6f374f7c6f0f2`.
`desktop_package.py verify` passed the manifest hash/size, embedded identity,
source fingerprint and bundled-file checks. The frozen self-test exited **0**
with a separate database, app-data directory and unused port. No backend
runtime files changed; the original audit's 288 passing backend tests remain
applicable. No commit or push was made.

**Performance findings, in proposed implementation order**

1. **P1 — Preset thumbnails animate an entire second collection of rooms.**
   [RoomPanel.jsx](../frontend/src/components/RoomPanel.jsx#L523) mounts every
   preset preview together. [IsoRoomPreviews.jsx](../frontend/src/components/IsoRoomPreviews.jsx#L157)
   renders full sprite trees without the existing `cottage-preview` still-art
   treatment. Opening Room produced about **17,700 DOM nodes and 317 running
   animations**, even with the furniture catalog collapsed. Many previews are
   below the drawer's visible scroll area.

   In the same browser session, temporarily disabling animation only in drawer
   SVGs reduced task time from **2,359 ms to 419 ms per three-second interval**,
   approximately **82%**. The visible home remained animated. This is the
   strongest measured first patch: make miniature previews still and retain
   immediately visible preset cards. Those cards are the main discovery
   surface in [the Room screenshot](screenshots/23-room-panel.webp). Collapsing
   the whole collection behind another click was not justified by the probe:
   it measured animation cost, not mount latency. Measure opening/scrolling
   after the still-preview fix before adding deferred mounting. Keep the
   existing SVG models, selection feedback, and customization.

2. **P2 — Widget mode retains animation work behind its invisible scene.**
   [App.jsx](../frontend/src/App.jsx#L320) hides the room without pausing its
   animation or scene clocks. The measured library/widget scenario, with the
   seat chooser still open, retained **210 running animations**. A temporary
   `animation-play-state: paused` rule on the invisible region reduced task
   time from **289 ms to 8 ms over three seconds**; the focus timer continued
   running. This is a browser widget check, not a native-window measurement.

   Pause decorative CSS animation while hidden.
   Preserve the mounted timer, music playback, saved positions, and existing
   widget/window lifecycle. Prefer pause/resume to remounting the room or
   restarting its animation phases. Suspending visual pet/NPC scheduling is a
   separate extension: measure that work, reconcile poses on return, and do not
   suspend store-owned population deadlines. Separately verify minimized
   native windows before extending this policy to them.

3. **P2 — Grand Library bypasses the dense-scene animation budget.**
   [App.jsx](../frontend/src/App.jsx#L164) deliberately makes `activeIsoLayout`
   null in common places. The calm treatment used for large home/visited rooms
   therefore never applies to the 30×20 library. The library had about
   **12,000 DOM nodes and 187–189 running animations**. At 800×600, its normal
   scene used **1,305 ms of browser task time per three seconds**; disabling
   only its SVG animation for comparison reduced this to **44 ms**.

   A selective common-place animation policy is worth a measured trial. Keep
   the guest's focus/break feedback and a restrained selection of ambient
   motion. Compare recordings and native WebView2 interaction before accepting
   it. The all-still result does not establish the performance or appearance
   of that unimplemented compromise. Do not simply apply the all-still
   dense-home gate to every common place or lower model detail.

4. **P2 — Every task refresh reloads the complete archive.**
   [GET /api/tasks](../backend/app.py#L482) materializes and serializes all of a
   user's tasks. Task writes then call `refreshTasks()`, so ordinary edits get
   more expensive as archived history grows, even with a short active list.

   | Active tasks | Archived tasks | Returned rows | Response bytes | Median local request |
   | ---: | ---: | ---: | ---: | ---: |
   | 20 | 0 | 20 | 5,462 | 1.0 ms |
   | 20 | 1,000 | 1,020 | 342,254 | 12.9 ms |
   | 20 | 10,000 | 10,020 | 3,402,305 | 318.2 ms |

   Separate the active working set from requested history. The calendar's
   [completed-day journal](../frontend/src/components/CalendarPanel.jsx#L137)
   intentionally uses archived completions, so simply filtering archived rows
   out of the existing API would break it. Add a bounded day/history read and
   preserve the task-first daily-routine reset ordering, committed-write
   feedback, request-version guards, and progression credit boundaries.

5. **P2 — Chat history lacks an index matching its cursor order.**
   [list_messages](../backend/app.py#L1453) filters by conversation and orders
   by `(created_at DESC, id DESC)`. [Message](../backend/models.py#L256) has
   individual indexes, not a matching composite index. SQLite's query plan
   reported `USE TEMP B-TREE FOR ORDER BY` despite the 200-message page limit.

   On the same synthetic 50,000-message database, adding only an audit index on
   `(conversation_id, created_at DESC, id DESC)` removed the temporary sort and
   reduced median reads from **34.9 ms to 2.3 ms**, about **15×**. Implement this
   through an Alembic migration, retaining membership checks and tied-timestamp
   cursor behavior. The chat-list ranking query still examines history; do not
   claim this index makes every chat operation constant-time.

Lower-impact or less-proven follow-ups:

- **P3 — Common-room clock and interaction updates rebuild static artwork.**
  [CommonRoom.jsx](../frontend/src/components/CommonRoom.jsx#L91) updates root
  `now` state every 30 seconds and also owns drag targets and seat selection.
  [Its layers](../frontend/src/components/CommonRoom.jsx#L185) recreate prop
  elements. Function-entry counters confirmed **126 prop renderers, 15
  bookcases, and all 13 people** ran for one clock update. That proves redundant
  work, not a visible stall or repaint. The 70.5 ms diagnostic window included
  active animations and a wait; it was not React-render duration. Profile a
  normal clock transition and drag before prioritizing a refactor. If warranted,
  reuse `useNpcActivity`, cache stable props, and preserve furniture/person
  depth interleaving. Do not extract all people into a layer that paints over
  nearer furniture just to obtain a memoization boundary.

- [TaskPanel.jsx](../frontend/src/components/TaskPanel.jsx#L69) subscribes the
  whole task editor to the full timer context. Counters confirmed four panel
  renders in four running-timer seconds, although the displayed focus total
  changes only by the minute. Isolate the live goal/break controls so task rows,
  filtering, and streak calculations do not repeat on each second. This has
  less measured impact than the animation findings.
- The initial bundle was **891 KB minified / 260 KB gzip**; the latest audit
  bundle is approximately **912 KB / 266 KB**, including small render counters.
  `App` eagerly imports both room engines and common-place architecture, while
  its startup effect also warms every drawer. Defer unused engines and consider
  warming drawers on intent. No startup-latency improvement was measured, so
  bundle size alone does not justify a sprite-loader rewrite or adding
  `manualChunks` while retaining all the same eager dependencies.

**Quality and visual findings after the performance pass**

- **P3 — Two statistics implementations disagree about archived completions.**
  [build_stats_for](../backend/app.py#L1559) excludes archived tasks before all
  its aggregates; [build_stats](../backend/app.py#L1649) includes them in
  `tasksDoneToday`. With just one task completed and archived today, the same
  user returned **1 completed today** through the self path and **0** through
  the friend path. This is a real API-contract inconsistency, but tracing the
  consumers lowers its immediate priority: the current Friends panel renders
  `npcDailyStats`, not this API daily count. Only the self Task panel currently
  displays `tasksDoneToday`. Preserve its completed-today history when aligning
  the contracts; simply excluding archived rows everywhere would change that
  behavior. Reuse one aggregation policy and cover both an archived completion
  today and an older completion when this subsystem is next changed.
- **P2 — Keyboard focus is lost after choosing a seat once the hint expires.**
  [CommonRoom.jsx](../frontend/src/components/CommonRoom.jsx#L103) focuses the
  chooser after selection, but [its visibility condition](../frontend/src/components/CommonRoom.jsx#L356)
  unmounts that control when the five-second hint has expired and the list
  closes. A fresh real-browser check waited 5.5 seconds, opened the list using
  the guest's Enter control, and selected Gallery window chair using Enter.
  The seat changed to `gallery-right`, while focus moved to **BODY**. The
  existing focus test acts before the hint expires, so it misses this path.
  Return focus after the update to the newly seated guest or another control
  that remains mounted. This affects desktop and browser use.
- **P2 — The seat chooser has partial pointer obstruction at the browser floor.**
  The 800×600 overlap was initially a P3 readability finding. Fresh checks at
  1280×800, 900×640, and 800×600 found clear option centers after scrolling.
  At the documented **600×420 browser floor**, the center of the enabled
  **Gallery globe chair** option hit the to-do HUD instead. This proves partial
  target obstruction, not that every part of the button is unreachable.
  Reserve space for persistent HUD controls. Keep the seat list scrollable,
  give its open-state action an accurate accessible name, and preserve guest
  placement and the room's authored geometry. The native Windows minimum is
  **900×640**, so distinguish this browser-floor defect from desktop coverage.
- **P3 — Comments still describe retired behavior.**
  [HudTasks.jsx](../frontend/src/components/HudTasks.jsx#L41) and
  [SkyOverlay.jsx](../frontend/src/components/SkyOverlay.jsx#L9) still claim the
  whole app/HUD rerenders every second. The narrow timer provider already
  prevents this. [App.jsx](../frontend/src/App.jsx#L319) also names a retired
  `CLAUDE.md` document. Correct these comments while touching their owners;
  preserve module-scope component definitions and widget mount guarantees.
  The motion sections in `MODELS.md` and `DESIGN.md` also overstate how freely
  scene/CSS animation work can run. Treat this as accompanying documentation
  maintenance, not a separate high-priority cleanup project.

**What the reference comparison changes**

Both reviewers inspected all eight `docs/inpso/` photos, current room/catalog
and character screenshots, and the dated `docs/model-review/` sheets. The
October 4 contact sheets retain older proportions and are historical evidence,
not proof of a current character regression. Static photos establish composition,
material, pose, and lighting differences; they cannot establish animation
quality, FPS, or how Virtual Cottage 2 implements its renderer.

The references give a clearer art direction than “more detail”:

| Reference | Visible cue | Meaningful TaskNook follow-up |
| --- | --- | --- |
| [Pink loft](inpso/ss_0910e38ff3bd0815ba99786fd63853dc1d8a84cc.1920x1080.jpg), [timber loft](inpso/ss_11568adac20d4baea389a2e0a1c85137ff403955.1920x1080.jpg) | Work, sleeping and lounge areas form usable groups; the raised structure creates a separate occupied volume. | Improve one authored vignette and its light hierarchy before adding more furniture to a preset. A real loft-bed/platform asset is a separate larger feature. |
| [Shared loft](inpso/ss_82d9f29a63805ec614dc8262cef91726b1238f21.1920x1080.jpg), [close room view](inpso/b603fdd9497a472249116e7dc02960438ef96cee.jpg) | People turn into their laptops/books; feet, hands, seats and work surfaces form one believable pose. | Eventually test one coherent static study pose on real furniture. Do not restart the rejected skewed rig or expand every garment before that pose proves useful at room scale. |
| [Common study/café](inpso/ss_18f591f3e019a2fa4e390c661167a536b08d6ded.1920x1080.jpg), [reading library](inpso/ss_b75b094d60d1450e578baf36ed8afff65ead884e.1920x1080.jpg) | Light falls across walls and worktops; dark recesses and material masses organize occupied nooks. | Try one static Common Cottage grounding/lighting pass; evaluate it before extending to Grand Library. |
| [Pond study](inpso/ss_2e86b624b56035de6e9bac0c0320ad7c11326dbf.1920x1080.jpg), [decoration view](inpso/ss_1c3561ee5cf018980ca30228ffaed036ffd20830.1920x1080.jpg) | Distinct plant silhouettes and visible previews carry the design; the room remains the subject. | Preserve readable silhouettes and visual discovery. Do not substitute particle density or hide all choices to improve a benchmark. |

A **bounded Common Cottage art pilot is worth trying**, separately from the
performance fixes. [CommonRoom's Prop](../frontend/src/components/CommonRoom.jsx#L29)
does not draw the scene-level contact shadows used by
[the home renderer](../frontend/src/components/IsoRoom.jsx#L300). Current
[Common Cottage](screenshots/39-common-cottage.webp) and
[Grand Library](screenshots/48-grand-library.webp) have broader, more evenly
lit fields than the references. Grounding furniture and making light fall on
the study area has a concrete visual purpose. Success remains unproven until
there are room-scale before/after captures.

Start with unchanged geometry, seating and wardrobe. Compare sunset/night at
the same camera, with static directional/contact shading and useful work-surface
light. Keep residents and paths readable; add no blur filters or animation.
The library must retain its intentionally large capacity: the intimate reference
does not justify shrinking it or scattering props across its circulation paths.
The existing compact character silhouettes in
[the seated looks](screenshots/38-character-presets-seated.webp) do not justify
another global body-proportion rewrite.

**Revised next-work decisions**

| Work | Decision | Acceptance before calling it an improvement |
| --- | --- | --- |
| Still miniatures | Recommended first performance patch; low risk. | Zero running preview animations; cards remain visible/discoverable, the real room still moves, and real-sprite appearance/selection/tints are preserved. Repeat the comparison after implementation. |
| Widget decorative pause | Recommended second performance patch; lifecycle checks required. | Hidden decorative animations stop; the timer crosses a phase boundary correctly, music continues, and the same room/camera resumes without a new entrance. Do not promise native savings from the browser probe. |
| Seat focus and HUD obstruction | Recommended first quality/interaction patch; bounded scope. | Enter selection after the hint expires retains meaningful focus; option label centers receive pointer input at 600×420, with desktop checks at 900×640; no page scrolling or seat-state change outside the selection. |
| Library motion policy | Measured trial after the narrow fixes. | Compare a recording and browser/native measurements; preserve guest focus/break cues, calm ambient life and fully still reduced-motion mode. The all-still benchmark is not the target visual design. |
| Common Cottage light/contact pilot | Worth a separate art trial. | A clear room-scale before/after improvement in grounding and study-area focus at sunset/night, without changing seats, paths, catalog identity or adding animated effects. Expand only if the result is convincing. |
| Static-art caching, timer-panel extraction and startup splitting | Defer pending interaction/startup evidence. | A measured stall, unnecessary work during an actual gesture, or startup latency should justify the added structure. Renderer counts and bundle size alone are insufficient. |
| Archive loading and chat index | Retain as separate performance work. | The original scaling/query-plan evidence remains; history, cursor ties and lazy routine resets must remain correct. These are not evidence of a visual-design improvement. |
| Catalog-wide redesign, new particles, renderer migration, global character rig | Defer. | First prove one reference-driven visual change at room scale. Do not treat the older per-item backlog as approval for a blanket rewrite. |

**Original audit verification and limits**

Evidence and repeatable probes are under the ignored
`build/skill-verification/performance-2026-10-20/` directory. They use disposable
SQLite databases, a separate Vite output, and isolated browser contexts.
Candidate CSS/index changes existed only inside those probes. The first
browser run used `f46971e`; `browser-results.json`, `visual-results.json`, and
the latest screenshots cover `e07b49e`. Render counts come from temporary
function-entry counters, not inferred React commit flags.

The original widget probe tried to close the chooser by the accessible name
“Done choosing”; its conditional did not run because the button retained the
“Drag and drop … Click to choose” aria-label. That explains the retained seat
target animations in that scenario. The widget comparison is valid for that
recorded scenario, not an established baseline animation count for every widget
visit. The separate still-library probe closed the list by its visible text.

The fresh keyboard/viewport checks for this second review are in
`build/skill-verification/quality-visual-review-2026-10-20/seat-results.json`
with captures at 1280×800, 900×640, 800×600 and 600×420. They used the same
isolated audit build and data and recorded no page exceptions. The second
Codex reviewer independently inspected the references, source and saved
evidence, and confirmed these two newly reproduced interaction findings. It
did not run a second native performance benchmark or independently review the
backend findings.

Browser task time is Chromium DevTools `TaskDuration`, not GPU time, FPS,
native WebView2 CPU usage, or a guaranteed improvement on every machine.
Measurements used headless Chromium 151 and the installed Node 24.11.1.
Release builds require Node 20; these are audit builds, not replacement release
artifacts. Synthetic archive/chat volumes demonstrate scaling costs and do not
describe the owner's database. Samples were taken without the test suites
running concurrently.

- Frontend lint: passed.
- Frontend suite: **1,345 passed; one existing opt-in art fixture skipped**.
- Browser: no page exceptions in the exercised home, drawers, common-place,
  seating, and browser-widget journey. Small-window seat controls were checked
  after scrolling.
- Backend suite: **288 passed** with a fresh audit `--basetemp`. The initial
  attempt hit an access error in the existing system pytest temp directory;
  the isolated rerun passed, with one nonfatal existing-cache write warning.

The scan traced both scene engines, store/timer subscriptions, previews,
animation gates, task/calendar history, chat queries, and common-place state.
It is not an exhaustive security audit, a native widget test, or a full 2D
artwork/preset review. The original audit was documentation-only; the subsequent
implementation and its verification are recorded at the top of this document.
