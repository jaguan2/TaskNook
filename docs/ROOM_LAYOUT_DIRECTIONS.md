# Furniture directions and room layouts

Ground furniture and props use all four views of their standalone GLBs. The old SVG `backView` flag describes fallback artwork; it no longer limits the production model to two directions. Customized SVG actors keep their existing pose system. Wall fixtures keep their two mounting sides.

## Saved direction contract

Room coordinates define east as `+gx` and south as `+gy`. These project diagonally on screen.

| Saved `rot` | Standard +Z-front model | X-front lounger or hammock |
| --- | --- | --- |
| 0 | South | East |
| 1 | East | South |
| 2 | North | West |
| 3 | West | North |

Odd turns retain the original grid transpose, including the footprint swap. Turns 2 and 3 show actual rear geometry. Replacing these transforms with a new yaw convention would change asymmetric saved arrangements; there is no rotation-value migration. Model metadata identifies X-front items explicitly.

`furnitureFacing.js` owns compass names and vectors. `catalogProjection.js` provides the same orientation matrix used by the renderer. Occupant placement, keyboard reach, common-place poses and the selected item's compass label use this contract. The rotate control accepts pointer input, Enter and Space, cycles through four views and saves the existing `rot` field. Wall fixtures show their mounting wall instead.

Lying figures follow their support's native long axis. Recliner head elevation stays upward in every view; it is not reversed with the floor direction. Lying figures paint above the support, while a bed's foreground duvet and near headboard retain their occlusion. The complete customized resident is reused in these poses.

## Composition rules

- Seats sharing a coffee or dining table face into that group. Opposing seats face each other; corner seating turns toward the same table.
- Edge storage opens toward the usable room. Benches and loungers face their intended view or activity.
- A room's couches and armchairs share a default upholstery. A newly added couch inherits the first sofa's colour, or the first armchair's when there is no sofa. Explicit per-item recolouring remains independent.
- Shared-place seat anchors remain attached to the support, and their front/rear pose and mirroring derive from its rotation. Multi-person sofa slots remain distinct.

## November 12 layout audit

| Layout | Review result |
| --- | --- |
| Shared home | Two coordinated window workstations and one shared lounge; chairs face their own computers. |
| Loft | Adjacent sofa/armchair face the shared table; matching blue upholstery retained. |
| Cozy study | Window workstation and independent reading chair retained. |
| Cozy cabin | Sage sofa faces the hearth; its adjacent armchair faces the same coffee table. |
| Secret garden | Bench and adjacent log face the pond in a compact clearing. |
| Corner cafe | Table partners retain opposing directions. |
| Plant shop | Perimeter display shelves open toward the browsing aisles. |
| Reading room | One window desk and reading seat; bookshelves open inward from the walls. |
| Study studio | One shared worktable with opposing chairs and a single reading corner. |
| Terrace | Two opposing stools face one shared candlelit dining table. |
| Autumn yard | Bench turns into the yard. |
| Winter yard | Bench turns toward the winter scene. |
| Holiday hearth | Armchair turns toward the conversation table and matches the sofa's green. |
| Poolside | Two matching loungers face north toward the water and share a reachable serving table. |
| Empty room | No authored seating group. |
| Common Cottage | Nook chairs face the shared table from opposite sides; lounge upholstery matches. |
| Willow Pond | Patio chairs face their table; the bench faces the pond, with occupied anchors clear of the duck route. |
| Grand Library | Hearth chairs face the fire; couches/armchairs share upholstery; other reading areas and table partners remain supported. |

Changes apply to authored presets and fixed common places. Saved custom rooms retain their furniture, chosen colours and rotations. Reapply a preset to adopt its revised composition; manually decorated rooms are not rewritten.

The subsequent [personal-room composition pass](ROOM_LAYOUT_COMPOSITION.md) fits the floor to these furniture groups and records every revised preset. Common-place capacity remains unchanged.

## Verification

`roomLayoutFacing.test.js` checks target direction, upholstery, all preset rotation round trips and shared-seat agreement. `furnitureFacing.test.js` compares the actual renderer matrix against the named direction for every ground GLB, including native X-axis models. Component checks cover all four lying views and paint order. Browser checks rotate a real cabinet through four distinct rendered images, verify each saved value and reload it, exercise bedding in every direction, and inspect lying supports together.

Use the [integration guide](ROOM_MODEL_INTEGRATION.md), [codebase guide](CODEBASE_GUIDE.md) and [current app gallery](screenshots/README.md) for related implementation and visual evidence.

Current captures: [Cabin conversation group](screenshots/03-cozy-cabin.webp), [Poolside](screenshots/32-poolside.webp), [rotation control](model-review/rotation-controls.webp) and [lying directions](model-review/lying-directions.webp). The lying review shows four stored turns for beds, loungers and hammocks; near headboards correctly occlude sleepers from rear bed views.

The direction pass verified 1,571 frontend tests (one gated art generator skipped), lint/build, 580 model checks, 144 room/packaging checks and 31 browser scenarios. Its main-channel build `6f9d7e9611cc4d1eaa8e99f212917f55` passed identity/hash checks and the isolated frozen self-test. This is historical evidence for that pass; see [personal-room composition](ROOM_LAYOUT_COMPOSITION.md) for the subsequent layout work. Logs remain ignored in `build/skill-verification/facing-refinement/`.
