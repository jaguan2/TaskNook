# Stability, readability and file retention

Use the [codebase guide](CODEBASE_GUIDE.md) to find the owner of a behavior before changing it. Keep current instructions and useful references easy to distinguish from dated review evidence.

## Model-image ownership

The catalog uses one offscreen Three.js renderer. `catalogModels.js` normalizes a placement into a cache request. `catalogImageCache.js` starts rendering on subscription, shares work between consumers and keeps a bounded number of unused images. Active subscriptions protect their object URLs from eviction.

`IsoCatalogModel.jsx` has two subscriptions with different lifetimes: the current request follows the store snapshot, while an extra lease keeps the previous image visible until a turn, recolour or shelf edit finishes rendering. Cleanup releases that lease and clears its reference. React effect replay must be able to acquire it again, even when the request ID is unchanged.

The November 12 stability pass reproduced an early-release defect when mounting an already cached model under StrictMode and then recolouring it. The old image remained in the DOM after its URL was released. Resetting the released lease reference fixes the replay; the regression checks that both old and replacement images are released exactly once, after their final use.

Cache and request code now separates initialization, status updates, subscription changes and pruning into readable statements. Shelf choices are normalized once per request. The renderer, saved layout format and furniture geometry remain unchanged by this pass.

## What belongs in source

| Keep | Reason |
| --- | --- |
| Runtime sources, tests, migrations, dependency locks and license files | Required for behavior, reproducible builds and upgrades |
| All 184 authored GLBs, their manifest and model builders | Production props and supported workshop studies |
| Generated character comparison fixtures and their manifest | Actively used by workshop calibration and freshness checks |
| Supplied photographs in `docs/inpso/` | Original style references, indexed in [artwork references](ART_REVIEW.md) |
| Current app screenshots, model sheets and contact captures | Reviewable evidence of the shipped artwork |
| SVG actors, classic cottage and graphics-failure fallback | Supported runtime paths |
| Matching `TaskNook.exe` and `desktop-update.json` | The repository's intentional downloadable desktop release |
| Selected dated reviews under `docs/archive/` | Useful persistence, performance and rejected-design reasoning |

Do not keep raw browser console/DOM dumps, one-off capture scripts, temporary databases, intermediate images or duplicated reports describing superseded furniture. Store verification logs under ignored `build/skill-verification/`. Inspect references before deleting a source file; a file used only by packaging, tests or authoring can still be necessary.

The maintenance pass removed ten tracked browser dumps and twenty-two superseded modeling reports/images, totaling 1,386,643 bytes. Reusable style observations were consolidated into the existing artwork reference guide. Four useful dated engineering reviews moved from the active documentation directory into the [history index](archive/README.md), with their relative links repaired. Browser-tool output is now ignored. Previous removed contents remain recoverable from Git history.

A static import scan of 268 frontend JavaScript/JSX modules found no unreferenced application-module candidates. Every retained documentation image has a Markdown reference. These checks identify cleanup candidates; they do not establish that every export or execution branch is used.

## Verification

Run frontend lint, behavior tests and production build; backend tests against disposable SQLite; standalone model tests without regenerating assets first; browser scenarios against the built app; and documentation link/image validation. Runtime changes also require a matching desktop rebuild, embedded/source identity and manifest hash checks, and an isolated frozen self-test.

Preserve the separate timer provider, task-before-stats refresh ordering, committed-write feedback, home/visit/common boundaries, existing persistence gateway and private native bridge. Cleanup must not reset user data or remove old Alembic migrations.

The shared upstream review toolkit was unavailable at the documented local installation paths during this pass. The project-specific engineering, structural-review and verification rules were followed; no upstream-toolkit execution is claimed. Final results and cleanup evidence are retained under ignored `build/skill-verification/code-cleanse/`.

November 12 results:

| Check | Result |
| --- | --- |
| Full frontend | 1,576 passed; one gated artwork generator skipped |
| Frontend lint and production build | Passed; existing bundle-size advisory remains |
| Full backend, including packaging/checkout contracts | 326 passed |
| Standalone models and workshop server | 579 geometry/asset checks plus the server check passed |
| Built-app browser scenarios | 32 passed; visual baseline unchanged |
| Documentation | 506 local links resolve; all 109 retained images decode |
| Main desktop build | `9038c0be2645417f90df6c4f731b9dee`; embedded/source identity and manifest verified |
| Isolated frozen self-test | Exit 0 |

The executable is 49,322,517 bytes with SHA-256 `d3054e3ab46077ff1d558cdb8904fe3c13a1e3b807054b08ef29168069b2a9c5`. The initial restricted backend run was interrupted and replaced by the complete passing run with normal subprocess permissions. The workshop server check likewise passed after enabling loopback; geometry validation did not require rerunning unchanged checks.

The later [furniture resizing passes](ROOM_MODEL_INTEGRATION.md#shelves-sofas-and-desks) record the current release and verification. Their shared builders participate in the executable source fingerprint and release-pair checks through `FURNITURE_RUNTIME_SOURCES`. Keep reusable behavior tests and screenshot captures 62–65; temporary capture/frozen databases, process helpers, raw browser results and the generated root spec are removed after review. Per-placement sizes use the existing room JSON and need no database migration.
