# Current modelling roadmap

All 184 catalog entries have standalone authored GLBs across 18 sections. The live isometric game uses 179 prop/furniture assets. Five customized actors (`you`, `resident`, `cat`, `dog`, `bunny`) continue using the established SVG rigs; their standalone rigs remain workshop studies.

See the [section ledger](CATALOG_3D_MIGRATION.md) for individual coverage and [construction approach](CATALOG_3D_APPROACH.md) for closed geometry, contact probes, bounds and style checks.

## Renderer decisions

The game uses one offscreen Three.js renderer to compose real GLBs into its existing isometric depth and interaction layers. This preserves saved placements, continuous character customization, carry/seating contacts and the existing camera. Models load locally in the desktop build. GPU or asset failures expose the SVG fallback and a retry action. See [the integration guide](ROOM_MODEL_INTEGRATION.md) for the complete pipeline and its limits.

The [renderer evaluation](archive/RENDERER-EVALUATION-2026-08-19.md) preserves earlier projection constraints. Use the [artwork references](ART_REVIEW.md) for style; superseded furniture roadmaps and prototype captures have been removed.

## November 12 refinement

- Removed the floating dark side cabinet and its lamp from the Loft preset. Shifted the desk chair along its desk bay so it reads farther right while retaining keyboard reach.
- Shortened armchair, wooden-chair and desk-chair backs without changing their seat anchors or saved placement footprints.
- Enlarged plant-rack foliage and pots, added contrasting ceramic colours, and brightened book-cover/leaf palettes.
- Added independent shelf contents: original arrangement, books, plants, mixed or open. Finish and book colours are separate. These choices persist per placement and apply to bookshelves, bookcases, open shelves, ladder shelves, wall shelves and plant racks.

Preset edits apply when choosing a preset; existing saved custom layouts remain owned by their users. Reapply Loft to adopt its revised arrangement.

## Further art work

Review colour and silhouette at actual game scale before broad material changes. Prioritize legible stock, clear circulation, coherent proportions and correctly supported objects. Keep current character/pet proportions and customization intact. No character renderer replacement is scheduled by this furniture pass.
