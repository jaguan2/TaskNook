# Quality review — October 9, 2026

Targeted review of `dev` at `8cc9381`, with existing documentation changes
preserved. The review uses the focused engineering and structural criteria
developed for the new skills: concrete impact, bounded remedies and relevant
verification. TaskNook's own skill folders remain proposed in
[the assessment](../AGENT_SKILLS.md); the installed adaptations are in the
other two projects.

This pass examined frontend save/refresh ownership, challenges and XP, relevant
chat lifecycle, desktop update metadata and packaging/CI. It is not an exhaustive
artwork, audio, performance, security or backend-route audit. No runtime source,
database, executable or update manifest was changed.

## Findings

### P2 — Task creation rejects after its write succeeds

[store.jsx](../../frontend/src/store.jsx) `addTask` at line 1320 performs the
POST and subsequent refresh as one success/failure outcome.
[HudTasks.jsx](../../frontend/src/components/HudTasks.jsx) lines 356–360 restore
the draft and say the task could not be added when that refresh rejects.
TaskPanel also retains its form on that rejection. Retrying therefore sends
another creation for a task already saved.

A reproduction confirmed a successful `createTask`, rejected `listTasks`,
rejected `addTask`, then a second `createTask` on retry. The existing store
challenge test already expects the saved add to reject on a read failure;
it tests reward credit, but does not protect the creation outcome.

**Remedy:** apply the existing `toggleTask` distinction between a committed
write and failed reconciliation. Retain the created row from the POST, treat
creation as successful, and report a separate refresh failure. Cover the two
task-entry forms with that failure sequence. This is a bounded task-action fix.

The same error classification appears in timer session logging at
[timer.jsx](../../frontend/src/timer.jsx) lines 323–327 and 469–472, and in
`editTask`/`removeTask`. A successful session or task mutation can be described
as unsaved merely because a later read failed. Apply the same distinction
when touching those actions; avoid a generic write framework just to share
their error text.

### P2 — Focus refreshes can overwrite newer statistics

[store.jsx](../../frontend/src/store.jsx) `refreshFocus` at lines 1168–1172
commits both responses without a request generation check. Two overlapping
reads can resolve in reverse order and replace newer stats/session history
with older data. Task refreshes already have generation/completion guards,
but those do not protect this writer. `refreshAll` also commits friends,
session days and calendar events outside its guarded task/stat block.

The reproduction completed a newer focus refresh with 90 saved minutes, then
resolved an earlier refresh with 15. Both visible statistics and the session
day map regressed from 90 to 15. Study XP's separate high-water mark does not
repair those displayed source maps.

**Remedy:** define freshness ownership per shared resource and apply it to every
writer of that resource. Preserve the deliberate tasks-before-stats ordering
that resets daily routines. Add overlap cases for focus/focus and focus/task
or full-refresh interactions. Limit this patch to refresh coordination.

### P3 — Clock rollback can reopen daily challenge XP

[progression.js](../../frontend/src/lib/progression.js) line 36 keeps the
progression day from moving backward, but line 90 prunes daily claims against
the current challenge selection. Challenges can roll backward to a different
day's selection, removing a claim still belonging to the retained reward day.

A direct run of the production functions completed `focus-fifteen` on October 8
for 10 XP, moved the local clock to October 7, and returned to October 8.
The first claim had been removed; completing the same challenge again produced
20 total XP instead of 10.

**Remedy:** keep daily claims attached to their credited day. A challenge
snapshot from an earlier day must not prune or reopen eligibility on a retained
later reward day. Add a backward/forward clock case alongside the existing
reset/redo tests. Ongoing-goal deletion and normal daily rollover should retain
their current behavior.

### P2 — CI verifies a replacement EXE instead of the committed download

[ci.yml](../../.github/workflows/ci.yml) lines 91–118 generate fresh metadata,
overwrite `TaskNook.exe` with a new package and self-test that package. This
checks packaging, but a source change shipped with an old committed EXE can
still pass. The job does not check that the downloaded artifact's embedded
build identity and files correspond to the committed sources and public manifest.

The current committed EXE's SHA-256 and size do match `desktop-update.json`;
this finding concerns the missing regression gate, not a demonstrated mismatch
in today's executable.

**Remedy:** verify the committed EXE/manifest before rebuilding, including
embedded identity and relevant bundled source/frontend consistency. Keep the
fresh-build smoke test as a separate check. Reuse one packaging definition
between CI and `build-exe.bat` so dependency flags and bundled paths have one
owner rather than two copies.

### P2 — Direct pushes to dev skip CI

[ci.yml](../../.github/workflows/ci.yml) line 5 restricts push-triggered checks
to `main`. Pull requests and manual dispatch run checks, but a direct push to
the active `dev` branch does not trigger them.

**Remedy:** include `dev` in the push filter if it remains the development
integration branch. Correct the guide's claim that CI checks every push when
making that change. This can be handled independently of runtime patches.

## Recommended order

1. Correct the task-creation success boundary and its form feedback.
2. Coordinate refresh freshness across shared resources.
3. Add the dev push gate and committed-artifact validation.
4. Preserve daily XP eligibility across clock corrections.

Each patch has an observable acceptance check. File size alone does not justify
a broad store or backend rewrite. Consider extracting a subsystem only when
one of these changes demonstrates a clearer owner with fewer moving parts.

## Evidence and limits

Two isolated jsdom store probes reproduced the creation and refresh conditions.
They passed assertions of the observed faulty behavior; they are diagnostic
probes, not passing tests of a fix. The temporary source test was removed;
its fixture is retained under ignored `build/review-2026-10-09/`.
The XP scenario ran the existing pure modules through Node's VM module loader
without editing them. The executable hash/size comparison was read-only.

The full application suites and native GUI were not rerun for this review.
No performance improvement or skill-effectiveness measurement is claimed.
