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

See the [codebase guide](CODEBASE_GUIDE.md) for file ownership and the [modelling archive](archive/modeling/README.md) for superseded furniture references. Runtime SVG fallback and current character/pet documentation are intentionally retained.

### Refinement verification — November 12

The refinement passes 1,541 frontend tests (one gated artwork-generator test intentionally skipped), 116 room API tests, 580 workshop tests, 1,524 catalog colour/angle checks and 27 full browser scenarios. A subsequent direct-GLB shelf test run verifies all six shelf types; additional browser checks cover keyboard use and 390×720 / 320×360 layouts. Lint, build and 28 packaging/checkout checks pass. The reviewed visual baseline was regenerated explicitly.

Main-channel build `0231496e25704dabb47a2b12e75946ca` passes executable/source identity, manifest SHA-256 matching and the isolated frozen self-test (exit 0). Logs and structural-review evidence stay ignored under `build/skill-verification/shelf-refinement/`; temporary databases, helper scripts and raw browser outputs are removed after review. No commit or push is part of this pass.

## Four-direction layout refinement

All ground GLBs now retain `rot: 0..3`; SVG fallback `backView` flags no longer discard a cabinet's, bed's or shelf's rear directions. The renderer keeps the original transpose/rear convention, while `furnitureFacing.js` gives controls, seat occupants and keyboard contacts one compass vocabulary. Recliners and hammocks declare their native X axis. Lying head elevation stays upward and the bed's near headboard joins its foreground cover.

The preset and fixed-place audit corrects outward seating/storage, matches couch upholstery and makes newly added couches inherit the room's existing colour. Existing custom rooms are preserved. See [the full direction/layout audit](ROOM_LAYOUT_DIRECTIONS.md) for every reviewed room, persistence details and verification.

The subsequent [personal-room composition pass](ROOM_LAYOUT_COMPOSITION.md) consolidates all fourteen furnished presets into compact activity groups, retains the three common-place capacities and replaces fixed visit-owner coordinates with actual seat/counter anchors. The current screenshot gallery reflects those arrangements.
