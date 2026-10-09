# Codebase improvement pass — October 9, 2026

This focused scan covered the 2D cottage/catalog, outfit selection and profile
customization, task and timer write/refresh boundaries, and CI triggers. The
existing uncommitted library, documentation and skill work was preserved.
This is not an exhaustive security, performance or artwork audit.

## Implemented

- **2D furniture:** Cozy sofa, Coffee table, Floor cushion and Glass terrarium,
  bringing the flat catalog to 35 items. The Cozy lounge preset uses them with
  the woodland window setting. All use the existing tint and placement model.
- **2D editing:** keyboard selection, arrow nudges (Shift moves five grid
  steps), visible directional controls, colour-preserving duplication and
  two-tap removal. Fixed string lights remain singletons. A copy near an edge
  moves inward, retains a fresh identity and respects the 60-item cap. The old
  immediate SVG delete control and its unused CSS were removed.
- **Outfits:** Winter reader and Garden helper expand the authored looks to
  ten using existing garments and the accepted rig. Profile's My outfits can
  store twelve named snapshots on the device, update a snapshot by name,
  restore it while preserving skin tone and confirm deletion. Storage failures
  retain the draft. Focused controls stay clear of the sticky character preview.
- **Durable writes:** creating a task formerly rejected when its POST succeeded
  but the next list read failed, encouraging duplicate retries. Creation now
  retains the returned row and resolves successfully. Edits and deletions also
  retain their committed state, and task/session refresh failures explain that
  the write succeeded. A failed stopwatch save no longer announces that its
  minutes were logged. Older task reads are invalidated after committed writes.
- **CI:** pushes to both `main` and `dev` now trigger checks. No push or remote
  workflow run was performed here.

## Findings still worth pursuing

1. **Refresh freshness:** `store.jsx`'s `refreshFocus` still commits stats and
   session-day results without coordinating request generations with other
   refresh writers. `refreshAll` also commits several resources outside its
   guarded task block. Give each shared resource one freshness owner while
   retaining deliberate tasks-before-stats sequencing. The earlier review's
   overlap reproductions remain relevant; this pass addressed write outcomes.
2. **Committed executable gate:** CI currently overwrites the committed EXE
   before its smoke test. Add verification of the downloadable EXE/manifest
   identity and embedded assets before packaging a replacement. Local artifact
   checks protect this handoff but do not replace that future CI gate.
3. **Clock corrections and XP:** daily challenge claims are still pruned against
   the current challenge selection in `progression.js`. The earlier review
   demonstrated a backward/forward clock case that could reopen credit. Keep
   claims tied to their credited local day and add that regression coverage.
4. **2D room structure:** the wall/window/desk/monitor remain a fixed shell, and
   the character is integrated into the isometric scene rather than the flat
   cottage. Alternate shells and a coherent 2D resident would make this mode
   substantially more flexible; they need an art and interaction pass.
5. **Catalog and wardrobe expansion:** the library's tall bookcases and ladders
   belong to its fixed architecture, so they cannot yet be placed in an editable
   home. New catalog versions and more garment silhouettes are useful next art
   batches. This pass added four 2D pieces and two complete outfit combinations.

## Verification and review

The task-creation test reproduced the rejection before the fix and passed
afterward. Regression coverage checks durable creates/edits/deletions, timer
feedback, keyboard placement, copying materials and two-tap removal, outfit
storage/reload/update, malformed snapshots, storage failure and skin preservation.
The full frontend suite passed **1,261 tests**, with one existing art-fixture
skip. Lint and the production build passed; affected UI tests were repeated
after correcting the sticky-preview focus behavior.

Live checks used a disposable SQLite database and a separate browser origin.
The sofa's copied colour and final position survived a reload. Named outfits
saved and restored, and the profile controls fit a 900×600 window without page
overflow. Screenshots are in `docs/screenshots/50`–`52`.

Structural review used the pinned Thermos rubric against this pass's baseline.
The new outfit model/persistence and 2D toolbar have separate owners; existing
catalog, storage, typing and confirmation helpers were reused. No runtime file
crossed the 1,000-line threshold. No new dependency, database schema or character
rig was introduced. The review replaced a duplicate typing-target check with
the canonical helper and removed stale timer comments and unused delete CSS.
Remaining findings above are follow-ups, not claims of completed fixes.

The full backend suite passed **278 tests** against isolated data. The rebuilt
`TaskNook.exe` passed its frozen startup self-test with exit code 0. Its SHA-256,
size, build identity and `main` channel match `desktop-update.json`; all 16
frontend assets and 15 bundled backend Python sources match the current files.
The archive contains no database or backup files. The executable and manifest
are ready to commit together. Native widget interactions, security and
networked multiplayer were outside this pass's verification scope.
