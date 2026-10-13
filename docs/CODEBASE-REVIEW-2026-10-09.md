# Codebase improvement pass — October 9, 2026

This focused scan covered the 2D cottage/catalog, outfit selection and profile
customization, task and timer write/refresh boundaries, and CI triggers. The
existing uncommitted library, documentation and skill work was preserved.
This is not an exhaustive security, performance or artwork audit.

## October 12 checklist continuation

The follow-up pass completed the first three findings below and expanded the
audit into adjacent reliability, maintainability and visual work:

- [x] Give tasks, stats, study history, events and friends independent request
  generations so an older refresh cannot overwrite a newer result.
- [x] Preserve committed task/event/friend writes when their follow-up read
  fails; serialize task ordering and roll only positions back after rejection.
- [x] Keep rapid profile and resident saves merged and ordered, recover an
  unsynced resident from its device mirror, and suppress obsolete save errors.
- [x] Keep profile XP claims stable through clock rollback/forward changes.
- [x] Extract profile/resident persistence from the store and pet artwork from
  the furniture registry, then split the pet editor and shared choice control
  out of the oversized Profile panel.
- [x] Remove the unused furniture-unlock ledger from the API, model, frontend
  and database schema instead of carrying a second, inert economy.
- [x] Add a reproducible desktop packager, pinned build dependencies and Node
  version, plus strict manifest/artifact verification before and after rebuild.
- [x] Add a real production-browser smoke test using an isolated SQLite file,
  including task creation, completion and reload persistence.
- [x] Give the cottage curtain a fuller rail, rings, gathered panels, folds,
  tiebacks and a softer uneven hem, then refresh its affected screenshots.
- [x] Add regression coverage for every changed boundary and independently
  review the implementation before the final artifact build.

The broader art backlog remains intentionally open: alternate 2D room shells,
a coherent resident in the flat cottage, placeable library architecture and
additional garment silhouettes still need their own designed passes.

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

## Remaining broader work

1. **2D room structure:** the wall/window/desk/monitor remain a fixed shell, and
   the character is integrated into the isometric scene rather than the flat
   cottage. Alternate shells and a coherent 2D resident would make this mode
   substantially more flexible; they need an art and interaction pass.
2. **Catalog and wardrobe expansion:** the library's tall bookcases and ladders
   belong to its fixed architecture, so they cannot yet be placed in an editable
   home. New catalog versions and more garment silhouettes are useful next art
   batches. This pass added four 2D pieces and two complete outfit combinations.

## October 9 verification (historical)

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

## October 12 verification

The completed continuation passed **1,306 frontend tests** with one intentional
art-fixture skip, **288 backend tests**, lint, the production build, and the
Playwright production-browser persistence journey. The final Windows artifact
passed exact bundled-file and source-fingerprint verification plus an isolated
frozen startup/migration self-test (exit code 0). Build
`00ae097fd0654e1e8fbdaf448ac2d884` and its `main` manifest are the matching
release pair. Independent review found no remaining source blocker; the curtain
pass was also approved at room scale in screenshots 39–41.
