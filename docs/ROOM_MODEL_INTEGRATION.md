# Live room models — November 12, 2026

The default isometric game now uses the authored GLBs for **all 179 furniture
and prop keys**. This includes home presets such as Loft, visited rooms, the
catalog picker, preset thumbnails and catalog furniture in common places.
No new setting or saved-room conversion is required.

The catalog has 184 exports. The other five keys — `you`, `resident`, `cat`,
`dog`, `bunny` — retain the existing customized SVG artwork in the game.
Their 3D starter rigs do not reproduce the wardrobe, body sliders, growth
stages, coats, held poses or pet forms. The separate classic 2D Cottage and
custom room architecture also retain their existing artwork.

This closes the furniture integration gap identified after the screenshot
refresh. Earlier workshop reports described exports; exporting the catalog
alone had not changed the rooms.

## Rendering and saved-room compatibility

`IsoCatalogModel.jsx` requests a render of the actual GLB. One shared Three.js
renderer produces a transparent image at the game's fixed isometric angle.
The image enters the existing SVG scene, so floors, walls, characters,
partitions and furniture share the established depth order. This is GLB-backed
isometric rendering, not a free-orbit 3D world.

- The 48×24 grid and existing footprints remain authoritative. Centered models
  are translated to each placement's footprint center.
- The camera is calibrated to the existing pixel-based seat/surface heights.
  Saved odd rotations retain their grid transpose; the rear pair uses actual
  rear geometry. Wall props retain their mounting heights.
- Alpha-derived hit paths keep transparent image corners and holes out of
  pointer hit targets. Selection, dragging, carry targets and panning use the
  existing handlers.
- Recoloring changes the named material role; fixed palettes retain their
  opt-out. Switches render the emitted/unlit variant while existing room light
  pools and time/weather layers remain in place.
- A bare desk receives the actual laptop GLB. An equipped desk avoids a
  duplicate. Keyboard geometry follows the shared hand-contact contract.
- A tucked sleeper keeps its customized resident and uses the bed GLB's actual
  duvet mesh as its foreground cover, with the bed's tint and orientation.

Furniture images are static supersampled renders. Workshop orbit controls and
the starter-rig animation player are not added to the game. Character/pet poses
and scene atmosphere continue through their established layers.

## Asset ownership, packaging and lifecycle

Editable authoring source and exports stay in `prototypes/furniture/`.
`frontend/scripts/catalog-model-assets.mjs` verifies each prop against its
manifest SHA-256; Vite emits hashed GLBs under `frontend/dist/models/catalog/`.
The desktop bundle includes these real local files. It needs neither the
workshop server nor a CDN, and the repo carries no duplicate source models.

`catalogRenderer.js` loads each GLB once and serializes GPU work through one
offscreen context. It renders on demand, without a perpetual furniture loop.
`catalogImageCache.js` shares image leases across placements, bounds unused
variants, revokes evicted object URLs and skips abandoned queued recolors.
The visible GLB stays leased until its replacement is ready, so recoloring
does not flash back to an earlier SVG drawing.

If a model or graphics context is unavailable, the game retains earlier
artwork and reports the problem with a retry action. Loading/error fallback
cannot count as a successful model capture or integration check.

Desktop identity and release-pair checks include GLBs, their manifest and the
shared illustrated palette. Model changes require the matching executable
and update manifest.

## Verification and future changes

`e2e/catalog-models.spec.mjs` checks actual requests for all 179 props through
the live picker, one shared graphics context, failure/retry, actual hit targets,
color/light controls, seating at four rotations and unchanged saved-room data
after reload. Bedding checks cover the actual GLB cover in both orientations.
Browser checks use disposable SQLite data.

The initial integration passed 1,534 frontend tests, 26 browser scenarios, 580 workshop checks and 28 packaging/checkout checks. These are dated baseline results; see the refinement verification record below for the subsequent shelf/layout work. Browser checks use the built SPA in Chrome/Chromium; frozen boot success does not constitute a native WebView2 GPU benchmark.

Projection tests compare the real camera against every seat/surface height.
Cache/component tests cover sharing, abandoned work, retries, replacement
images and URL release. Existing app suites and desktop packaging gates remain
required. Screenshot capture waits for finished GLB renders and decoded images,
and refuses failed or loading substitutes.

For another furniture change, edit/export/test its workshop source, build the
frontend, inspect its real game placement/rotation/contact, run relevant checks,
refresh affected images, and rebuild/self-test the executable/update pair.

See the [asset ledger](CATALOG_3D_MIGRATION.md),
[current app gallery](screenshots/README.md),
[standalone model sheets](model-review/catalog-3d/README.md) and
[character/pet review](CHARACTER_PET_REVIEW.md).

## Shelf and composition refinement

Click a shelf at home to open its item customizer, or select it while decorating. Choose original contents, books, plants, mixed or open shelves. Finish colour remains independent; book colours apply to the chosen shelf. Escape/Close dismiss the controls. A drag beginning on the shelf still pans outside edit mode. Visiting provides no customization callback and cannot write these choices.

`decor: { layout?, bookColor? }` is optional placement data. `shelfDecor.js` normalizes it, the room store writes through its existing save path, and the backend bounds the fields and allowed shelf keys. No database migration or save reset is needed. Preset thumbnails forward the same data. Missing decor keeps the original authored arrangement.

The GLBs export support-board names and removable-content names. `catalogShelfDecor.js` reuses real catalog book/plant geometry and fits groups to the boards' measured top, width, depth and available headroom. Layout groups and their book materials belong to the loaded shelf; image cache keys include normalized decor. Rendering remains serialized, so the mutable source asset is never painted for two placements simultaneously. Layouts are bounded; slider colours do not accumulate new geometry.

The Loft's isolated dark side cabinet and lamp were removed from the preset, and the desk chair moved along the desk bay. Armchair, wooden-chair and desk-chair backs are shorter; physical seat anchors remain unchanged. Plant racks have larger pots/leaves and varied ceramic colours. Book covers and foliage now have clearer colour at room scale. Existing saved custom layouts are preserved; reapply a preset to adopt its composition changes.

See the [codebase guide](CODEBASE_GUIDE.md) for file ownership and [artwork references](ART_REVIEW.md) for supplied style photographs. Runtime SVG fallback and current character/pet documentation remain supported.

### Refinement verification — November 12

The refinement passes 1,541 frontend tests (one gated artwork-generator test intentionally skipped), 116 room API tests, 580 workshop tests, 1,524 catalog colour/angle checks and 27 full browser scenarios. A subsequent direct-GLB shelf test run verifies all six shelf types; additional browser checks cover keyboard use and 390×720 / 320×360 layouts. Lint, build and 28 packaging/checkout checks pass. The reviewed visual baseline was regenerated explicitly.

Main-channel build `0231496e25704dabb47a2b12e75946ca` passes executable/source identity, manifest SHA-256 matching and the isolated frozen self-test (exit 0). Logs and structural-review evidence stay ignored under `build/skill-verification/shelf-refinement/`; temporary databases, helper scripts and raw browser outputs are removed after review. No commit or push is part of this pass.

## Four-direction layout refinement

All ground GLBs now retain `rot: 0..3`; SVG fallback `backView` flags no longer discard a cabinet's, bed's or shelf's rear directions. The renderer keeps the original transpose/rear convention, while `furnitureFacing.js` gives controls, seat occupants and keyboard contacts one compass vocabulary. Recliners and hammocks declare their native X axis. Lying head elevation stays upward and the bed's near headboard joins its foreground cover.

The preset and fixed-place audit corrects outward seating/storage, matches couch upholstery and makes newly added couches inherit the room's existing colour. Existing custom rooms are preserved. See [the full direction/layout audit](ROOM_LAYOUT_DIRECTIONS.md) for every reviewed room, persistence details and verification.

The subsequent [personal-room composition pass](ROOM_LAYOUT_COMPOSITION.md) consolidates all fourteen furnished presets into compact activity groups, retains the three common-place capacities and replaces fixed visit-owner coordinates with actual seat/counter anchors. The current screenshot gallery reflects those arrangements.

## Furniture colours

A chair, sofa or bed remains one catalog item. At home, click a paintable piece or focus it and press Enter/Space to open its colour controls; dragging it still pans outside Decorate. Powered decorations retain their click-to-toggle behavior and can be recoloured in Decorate. Visitors and common places do not receive home customization callbacks.

Beds offer a Part selector for Blanket, Frame, Sheets and Pillows. Each part uses the existing swatches, hex field and H/S/L sliders. Classic resets the selected part independently. The blanket keeps the existing `tint`; optional `colors: { frame?, sheets?, pillows? }` holds the other choices. Legacy beds retain their colours, and the room JSON needs no schema migration. Choices belong to the placed bed, so two copies can look different.

`lib/furnitureColors.js` declares the material roles, defaults and bounded placement values. The existing `setIsoItemTint(id, hex, part)` action updates one part through the same room save queue. Both frontend normalization and backend validation preserve valid colours and reject unsupported keys or values. The bed GLB has separate frame, linen, sheet and pillow materials; its dimensions and seat anchors are unchanged.

Model requests include normalized colours in their cache identity. Every serialized render restores secondary materials to authored defaults before applying that placement's colours, preventing a shared source mesh from carrying one bed's finish into another. The occupied bed's foreground duvet/headboard receives the same choices. SVG fallback and preset previews also receive the saved colours.

The [current gallery](screenshots/README.md#furniture-colours) shows the actual controls. Browser coverage edits every material on an occupied bed, compares the rendered pixels, verifies an unchanged second bed, reloads the saved choices, resets a single part, recolours a chair and checks a small window.

The colour pass verified 1,581 frontend tests (one gated generator skipped), 125 room API tests, 581 model checks and all 33 browser scenarios. After refining the popover header and foreground layer, seven picker tests and two focused bed/shelf browser checks passed again, including a real close-button click at 320×360. Lint/build pass; the existing visual baseline is unchanged. Main-channel build `6b108e298eae4a9b8c9f136e09ed3f28` matches its embedded/source identity and manifest and passes the isolated frozen self-test with exit 0. Evidence stays ignored under `build/skill-verification/furniture-colors/`.

## Resizable beds

In Decorate, select a bed and drag the green diagonal-arrow handle beside Rotate/Remove. “Resize bed” in its colour panel clears that panel and focuses the handle, keeping it usable in short windows. Select the bed again to reopen its colours. Width snaps from 1–4 tiles and length from 2–4 tiles, both in half-tile steps. Focus the handle for Left/Right width, Up/Down length, or Home to restore the original authored size. The label shows the size; “No space” means the attempted size crosses an obstacle, a partition or missing floor. A blocked drag keeps its last clear preview. Escape or pointer cancellation discards a drag; releasing commits once through the existing room save queue.

The first pass covered beds. Existing beds stay 2×2.8 until explicitly resized. Each bed remains one catalog item with optional canonical `dimensions: { w, d }` before rotation. Room JSON carries this alongside `tint` and `colors`; both frontend and backend bound the dimensions. No schema migration, preset replacement or saved-room reset is needed. Restoring the original size also checks that it fits. The following extension adds sofas, desks and shelves.

The shared bed builder produces the exported default GLB and resized standalone meshes. Only the flat interiors expand: frame thickness, rounded edges, cloth thickness and pillow sizes stay physical. Wider beds gain evenly spaced pillows. The frame, mattress, headboard, feet and draped blanket remain joined at every supported size. The unchanged character rig stays near the pillow end of longer beds; sleepers follow resizing, moving and turning. Foreground bedding, SVG fallback and previews receive the same dimensions and colours.

The existing single renderer paints sized meshes into the same image/alpha-hit layers. Size belongs to the image-cache identity. An eight-size source-mesh LRU releases evicted geometry and palette materials inside the serialized render queue; the existing image-lease cache remains responsible for PNG URLs. Default beds still load their GLB. No per-bed canvas or continuous GPU loop is added.

The [gallery](screenshots/README.md#bed-resizing) records a real 1×2 → 2×2 drag. `screenshots.mjs 62` reproduces both images against an isolated database and checks that the dragged size was saved. Verification covers all 35 size combinations, bounded mesh disposal, floor/partition/obstacle rules, drag cancellation, all four facings, independent colours, sleepers and reloads. Logs and final release identity stay ignored under `build/skill-verification/furniture-resize/`.

This pass verified 1,592 tests in the full frontend run (one gated generator skipped), 141 room API tests, 616 workshop checks, 32 packaging/checkout checks and all 35 browser scenarios. After the compact-window refinement, 56 focused component/hook tests, lint/build and five real-browser bed/colour/facing checks passed again, including pointer access at 320×360. All 516 local documentation links resolve and 112 referenced images decode. Temporary capture databases, helpers and raw browser results are removed after inspection.

Main-channel build `3675d56211324aac99428b9d08a1bf4c` matches its embedded/source identity and manifest SHA-256 and passes the isolated frozen self-test with exit 0. The executable is 49,341,700 bytes with SHA-256 `b08494a0223defe6bd6b1c50ac39aca5731b477c883a907ca5191a857f45d977`. No commit or push is part of this pass.

## Decorate interaction workflow

The editor now groups browsing, placement and customization into one flow. Enter Decorate to browse searchable furniture categories; Room setup contains room shape, floors, walls, lighting and presets. A successful addition closes the drawer and selects the new piece. Furniture on the bottom toolbar reopens the remembered catalogue search/category.

Select a piece for labelled Turn left, Turn right, Copy and Remove actions, plus Move, Colours and Size tools. Copy retains the selected finish, bed material colours, shelf contents, dimensions and facing, then finds clear nearby space. Characters, pets and unique pieces cannot be copied. Colours starts at the authored material; beds retain independent blanket, frame, sheets and pillow channels. Size offers half-tile steppers, the drag handle and Original size within the existing per-type limits.

Movement uses a local ghost with green/red footprint feedback. Only a real release commits; Escape, cancelled pointers or lost capture restore the original. Rugs and wall mounts retain layering, surface props can rest on furniture, and attached occupants/equipment travel with their support. New solid intersections are refused. Move and Drag resize handle collapse the inspector so short windows retain usable canvas space; selecting the piece reopens it.

| Shortcut | Action in Decorate |
| --- | --- |
| R / Shift+R | Turn right / left |
| Period / comma | Turn right / left |
| Arrow keys | Move half a tile |
| Shift+D | Copy the selected furniture |
| Delete / Backspace | Remove selected furniture |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y | Redo |
| Escape | Cancel a gesture or deselect |

Text fields keep their editing keys. The resize handle retains its own arrow/Home controls. Undo/redo holds 40 room edits during the current session, groups continuous colour adjustments, and preserves unrelated automatic pet/character updates using property patches. Reload/account bootstrap clears history. Existing room persistence, visit/common-place read-only boundaries and widget behavior remain in place.

Implementation owners and save boundaries are recorded in [the codebase guide](CODEBASE_GUIDE.md#following-a-decorate-action). Browser coverage includes the full persisted workflow, cancellation and compact windows; the screenshot script refreshes capture 25 and furniture size examples 62–65 and adds capture 66 for bed material controls.

## Shelves, sofas and desks

All eight additional catalog types now use the same Decorate handle, half-tile snapping, keyboard controls, cancellation and original-size reset. Select the piece, choose its Resize button or drag its green handle. Sizes are canonical width/depth before rotation; furniture height, seating height and working height stay fixed.

| Covered pieces | Width | Depth | Construction that adapts |
| --- | --- | --- | --- |
| Sofa | 1.5–5 | 1–1.5 | Continuous upholstered shell, evenly sized cushion pairs, timber base and extra middle feet on wide sofas |
| Workstation desk | 2–5 | 1–2 | Worktop and rear rail spans, right-side drawer pedestal, left panel and a rear middle support for broad tops |
| Bookshelf, Wide bookcase, Open shelf | 1–5 | 0.5–1.5 | Joined boards/case, extra support dividers and contents fitted within the resulting bays |
| Ladder shelf | 1–5 | 0.5–1.5 | Leaning and rear rails, tapered boards, intermediate supports and refitted complete objects |
| Plant display | 1–5 | 0.5–1.5 | Uprights, trays, additional supports and pots/plants resting on the actual tray tops |
| Wall shelf | 1–5 | 0.5–1 | Board, wall cleat, bracket spacing/count and fitted contents; keeps its two wall orientations |

The original footprints remain implicit until edited, including the 2×0.85 sofa and 2.2×1.2 desk. Defaults are checked against the catalog. The frontend registry and backend limits are checked against each other. Resize metadata stays on one placement alongside its tint and shelf decorations; no extra catalog entries or database migration are introduced.

Sofa occupants follow resizing, moving and turning. Independent desktop equipment keeps its size and local position, clamping onto a smaller top; it follows desk moves/turns with the matching orientation. A rotated monitor can require extra depth, so a resize refuses newly increased equipment overhang. Keyboard contacts use the same transpose/rear coordinate transform as the models, including the built-in laptop on a wide rear-facing desk. Floor/partition/obstacle rules still apply; a wall shelf stays on its wall and may hang above floor furniture.

`resizable-models.mjs` dispatches the shared builders. Sofa and desk builders are extracted from their original source; storage and display shelves share their authored construction. `shelf-layout.mjs` owns receiving boards, bay slots and complete-object/stack refitting. Books and pots retain physical proportions, and custom layouts still use the real catalog templates. Default GLBs remain the normal path. Sized SVG fallback rebuilds spans rather than scaling the original drawing.

The renderer's eight-entry LRU is shared across all sized furniture. A shelf's own meshes, materials and book accents are released on eviction; borrowed catalog plant/book geometry and materials retain their original owner. Tests exercise every shelf layout and eviction, so resizing does not dispose resources still used by other models. `FURNITURE_RUNTIME_SOURCES` is the single desktop fingerprint/release-gate list for the shared modelling modules.

See [the updated gallery](screenshots/README.md#sofa-desk-and-shelf-resizing). Captures 63–65 reproduce real pointer resizing and check the saved dimensions for the sofa, desk and all six shelves. Evidence stays ignored under `build/skill-verification/furniture-resize-round2/`; capture databases, raw results and process helpers are removed after review.

Verification: 1,606 frontend tests pass (one gated generator skipped), plus lint/build, 151 room API tests, 806 workshop checks and 44 packaging/checkout checks. All 38 browser scenarios are covered: the broad run passed 37, with one preset reload interrupted by an in-progress production rebuild returning 404; the fixed final build then passed all seven preset/furniture/colour scenarios. All 522 local documentation links resolve and 115 referenced images decode.

Main-channel build `24e275a28ba54818843a67c7750cf800` matches its embedded/source identity and update manifest and passes the isolated frozen self-test with exit 0. The executable is 49,353,450 bytes with SHA-256 `c33ea6aa9db845911826d6469f3c3ccdcf30b769583a26cbff226f70632aabf2`. Owned capture/frozen databases, helpers, raw browser results and the generated root spec are removed; verification ports are free. No commit or push was performed.

## Decorate workflow verification — 2026-11-13

The [interaction workflow](#decorate-interaction-workflow) is implemented and documented, with refreshed captures 25 and 62–65 and new capture 66. Visual review covers the desktop inspector and small windows. In narrow Decorate windows the music controls stand down, letting the toolbar sit directly above the dock; the inspector scrolls above it. Move and Drag resize handle return the full canvas.

Verification: 1,619 frontend tests pass (one gated generator skipped), followed by a passing rerun of 49 gesture tests after the final pointer-capture change. Lint/build and 44 packaging/checkout checks pass. The full browser run passed 40 of 41 scenarios; one existing recolouring test still expected immediate colour fields after selection. It now opens Colours explicitly. The final build passes all six targeted model/editor/bed scenarios, including actual clicks at 890×650, 390×720 and 320×360 and inspector/toolbar bounds. Together these runs cover all 41 browser scenarios. Initial new-test material selectors and a narrow toolbar overlap were corrected during verification; no production rebuild ran during a browser suite.

Main-channel build `26ec199aa16e41499d09eb78abf47996` matches the embedded/source identity and update manifest and passes the isolated frozen self-test with exit 0. The executable is 49,358,958 bytes with SHA-256 `53c441818b786dae3a029fc5b92ef207d4100f473d92a9eca25bc787fee3da26`. Documentation checks resolve 518 local links and decode 67 unique referenced raster images. Evidence is ignored under `build/skill-verification/decorate-ux/`; owned disposable databases, raw browser output directories, helper scripts and the generated root packaging spec are removed after review. No commit or push was performed.
