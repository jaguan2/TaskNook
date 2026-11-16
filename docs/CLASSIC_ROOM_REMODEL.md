# Classic 2D room remodel

November 15, 2026. The classic cottage remains an illustrated SVG room. It has
its own 37-item catalog and seven presets, separate from the isometric GLB
catalog. The supplied [pink loft and reading-room references](ART_REVIEW.md)
guided the activity groupings, warm timber and soft upholstery.

## What changed

The earlier scene relied on flat wall/floor blocks, broad furniture rectangles
and several nearly empty decorations. This pass adds shallow perspective while
keeping the simple, cozy illustration style:

- Warm plaster, narrow wall returns, inset wainscoting, layered skirting and
  converging floorboards give the room depth. A recessed window and sill have
  visible receiving surfaces; window light responds to day, sunset and night.
- The fixed desk has a joined apron, cabinet side and visible top edges.
  Upholstery has a shallow seat plane, connected arms, a thin timber rail and
  short feet. The study chair has a supported cushion, back and stretchers.
- Wall art contains landscape illustrations. Shelves and the bookcase contain
  seated books, ceramics and greenery. Plants have connected stems, soil and
  planter rims; rugs have woven borders and fringe. The classic sleeping cat
  has a low resting silhouette and a floor-supported tail.

Seventeen placeable sprites were redrawn: sofa, reading chair, study chair,
bookcase, both rugs, desk plant, cactus, hanging plant, monstera, books, mug,
pencil cup, picture frame, polaroids, floating shelf and sleeping cat. The other
20 catalog entries retain their artwork and were included in the contact-sheet
review. Lamps, tables, radio and personal desk objects already had readable
construction; this pass concentrates detail where it makes the scene clearer.

[Current catalog sheet](model-review/classic-catalog.webp).

## Preset coverage

Every preset keeps one chair in the desk's knee bay, leaves the drawers clear
and gives the right side a distinct activity with a reachable table. Wall
decorations stay outside the window. Rugs draw behind standing furniture.

| Preset key | Right-hand activity |
| --- | --- |
| `default` | Reading chair, tea table, lamp, bookcase and landscape print |
| `lounge` | Low sofa, coffee table, woven rug and stocked wall shelf |
| `greenhouse` | Hanging planters, plant stand, monstera and floor-cushion tea spot |
| `library` | Bookcase, reading chair, tea table, lamp and shelf |
| `nightowl` | Beanbag, side table, lamp, bookcase, poster and photos |
| `reading` | Reading chair, tea table, bookcase, shelf and mirror |
| `seaside` | Reading chair, tea table, plant stand, mirror and bunting |

Existing saved arrangements keep their coordinates, item IDs and colours.
Choose a preset in **Room** to apply its new furniture arrangement; applying a
preset replaces the current arrangement through the existing control. The new
artwork appears automatically in existing classic rooms.

## Code ownership and compatibility

| File | Owns |
| --- | --- |
| `frontend/src/components/Cottage.jsx` | Fixed window/desk, scene ordering, selection and placement interaction |
| `frontend/src/components/CottageArchitecture.jsx` | Wall/floor illustration and window light |
| `frontend/src/components/CottageFurniture.jsx` | Upholstery, study chair, bookcase and rugs |
| `frontend/src/components/CottageDecor.jsx` | Plants, ceramics, paper objects, illustrated prints and shelf |
| `frontend/src/components/RoomItems.jsx` | Stable sprite registry and remaining classic props |
| `frontend/src/lib/room.js` | Catalog bounds, preset data, validation and coordinate contracts |

Perspective is visual: the 1152×648 coordinate frame, fixed desk anchors,
surface origins, painter ordering and placement schema stay intact. Revised
hit bounds follow the artwork, including the previously mismatched round rug.
No database migration, asset download, SVG blur filter or new clock was added.
The isometric catalog and live character/pet rigs are separate render paths.
Paused and reduced-motion scenes also suppress the redrawn props' motion.

## Verification and cleanup

The full frontend suite passes 1,679 tests, with one optional test skipped.
Lint and production build pass. Preset tests cover desk/window clearances,
activity groups, table reach and saved-coordinate/tint validation.

`e2e/classic-room-remodel.spec.mjs` runs against a disposable real backend.
Native Edge checks all seven presets, room bounds, SVG paint references,
pointer dragging, keyboard nudging, recolouring, duplication, two-tap removal
and saved-layout reload. It renders all 37 catalog previews, checks the 17
redrawn sprites against their selection bounds, exercises real day/sunset/night
controls and verifies the complete coordinate frame fits a 600×420 window.

The root `TaskNook.exe` and matching `desktop-update.json` were rebuilt on the
explicit `main` channel. Exact artifact verification passes, including bundled
sources and embedded identity; the frozen startup self-test exits successfully
with disposable database/app data. Browser checks above provide the artwork
and interaction evidence separately from that startup check.

Current room captures are in [the screenshot index](screenshots/README.md#2d-room-and-saved-outfits).
Selected WebP captures and the repeatable browser test are kept; disposable
databases, raw captures and temporary browser configuration are removed after
review. Build logs and machine-readable results belong under ignored
`build/skill-verification/classic-room/`.

Local structural self-review keeps illustration, catalog data, interaction and
persistence in their existing owners. The separately installed private shared
toolkit is unavailable in this environment, so this records local project
review and verification rather than claiming the upstream review was run.
