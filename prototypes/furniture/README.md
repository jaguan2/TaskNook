# Standalone catalog workshop

An isolated 3D catalog design study for TaskNook, covering all 184 entries in
18 sections. The generated GLBs
are real, independently loadable models, generated from editable mesh source.
They can be imported into Blender or another glTF-compatible editor. Blender
is not required to regenerate them: the authoring scripts use Three.js.

Since November 12, the 179 furniture/prop exports also power the actual
isometric game. See [live room integration](../../docs/ROOM_MODEL_INTEGRATION.md).
Customized people/pets keep their existing SVG rigs; the five living GLBs
remain standalone starter-rig studies.

From this directory, with Node 20:

```powershell
npm.cmd ci
npm.cmd run preview
```

Source layout:

```text
src/catalog*.mjs     Catalog metadata and physical-height decisions
src/models.mjs      Stable authoring entry point
src/models/         Family builders and geometry/material helpers
src/viewer/         Browser entry, styling, rooms and character calibration
scripts/            Export, review and scoped cleanup commands
tests/              Geometry, catalog, animation and server contracts
assets/             Generated portable GLBs and comparison fixtures
```

Open [the local workshop](http://127.0.0.1:5188). Choose a catalog section, select a piece, orbit it,
inspect the rear/underside, change its finish, download its GLB, or switch to
the furnished-room view with Lounge, Study, Café, Storage nook, Textile lounge and Hearth & lamps arrangements. Illustrated shading is the default, based on the
Virtual Cottage 2 references; Original lighting retains the previous comparison.
Seven seats offer a fixed-front Seating check with the actual SVG residents,
four looks and three body builds at their real catalog seat heights. It checks scale and style; it is
not a rigged 3D character or an all-angle character renderer.
The separate 3D residents use a generous head, shaped knit torso and tapered
trousers, reviewed at about 3.9 heads tall. Production SVG faces and customization
keep the existing artwork.
All model/rendering resources are local. The two
reference thumbnails are read from the repository's existing image folders.
The lighting family has a Light on/off control. It previews material emission;
scene light pools, daylight scheduling and flame animation remain integration work.
The five living entries have articulated rigid-part Idle/Walk clips. Select
one and use Motion → Play motion; stopping restores the authored pose and
returns to demand rendering. These are standalone starter rigs, separate from
the production Resident's wardrobe/body customization and pet growth system.

To edit and regenerate:

```powershell
# Edit the relevant src/*-models.mjs builder and catalog authoring metadata, then:
npm.cmd run models
# If the frontend character rig or comparison framing changed:
npm.cmd run characters
npm.cmd test
npm.cmd run qa
```

Browser QA uses Playwright's installed Chromium by default. Install that
browser with `npx.cmd playwright install chromium`, or use an installed Chrome:

```powershell
$env:FURNITURE_BROWSER_CHANNEL = 'chrome'
npm.cmd run qa
```

QA starts its own loopback server on an unused port and closes its own browser
and server. Captures and the machine-readable report go under
`build/skill-verification/furniture-3d/` at the repository root.
Successful runs keep section/room/UI summary images and the report, removing
intermediate captures and HTML. Failed runs retain diagnostic images. To inspect
every view, set `$env:FURNITURE_KEEP_CAPTURES = '1'` before QA; afterwards run
`npm.cmd run qa:clean`. Cleanup removes only recognized regular capture files in
that owned output directory. Run `npm.cmd run preview` only while using the
workshop and stop that process with Ctrl+C when finished.
During authoring, `$env:FURNITURE_QA_SECTION = 'light-warmth'` limits model-view
captures to one section; the report records this narrower scope. Remove that
environment variable for the full catalog verification used for delivery.
Comma-separated section IDs such as `'plants-greenery,autumn'` review a small
set of changed families after a full run; unknown section IDs are rejected.

`npm.cmd run qa:source-art` regenerates the production SVG art sheet, checks all
135 pet stage/form/pose frames and 45 age-proportion comparisons, then renders
five focused pet/resident sheets. It requires the frontend dependencies and
the same Playwright browser as normal QA. Outputs stay under ignored
`build/skill-verification/character-pet-review/`; retained documentation snapshots
live in `docs/model-review/characters-and-pets/`.

Regenerating character fixtures requires the frontend's existing dependencies
(`npm.cmd ci` from `frontend/`). `npm.cmd run characters` uses that frontend's
JSX transform and React renderer. The preview itself needs only this package;
the generated self-contained SVG figures are already supplied in `assets/characters/`.
Their source fingerprint makes stale figures fail validation. Sixty source
figures cover five seat heights. Only generator-owned obsolete SVG filenames
are removed when regenerating.

- `src/models.mjs`: continuous upholstery shell, curved cushions, joined timber
  supports, and a shaped tabletop. X/Z are floor axes; Y is up; +Z is front.
- `scripts/export.mjs`: deterministic binary glTF export, Khronos validation,
  triangle/byte counts and SHA-256 manifest.
- `assets/`: all 184 catalog entries, including the 124 pieces added after the
  first five furniture sections. Every key has an explicit builder.
  GLBs have no external textures. The manifest also carries progress for all
  18 catalog sections (184 entries), material roles and declared seat anchors.
- `src/catalog.mjs` and `src/catalog-additions.mjs`: authoring metadata derived
  from the production catalog, keeping control bounds distinct from physical height.
- `src/models/geometry.mjs` and `src/models/seating-models.mjs`: closed primitives and the seating family.
- `src/models/table-models.mjs`, `src/models/worktop-cabinets.mjs` and `src/models/espresso-machine.mjs`:
  worktop family, joined cabinet construction and the open-bay coffee machine.
- `src/viewer/room-layouts.mjs`: original review arrangements, separate from production presets.
- `src/models/storage-*.mjs`: explicit shelf/cabinet/container/fixture builders and shared
  bound books, supported contents, low-detail bevelled boards and closed cloth.
- `src/models/rug-models.mjs`, `src/models/ground-water-models.mjs`, `src/models/ground-shapes.mjs`:
  thin textiles, soft pet bed, contained static ponds and independently grounded stones.
- `scripts/migration-report.mjs`: generated section coverage and per-asset export statistics.
- `src/models/lighting-*.mjs`, `src/models/lamp-models.mjs`, `src/models/decorative-lights.mjs`,
  `src/models/fireplace-model.mjs`: supported lamp/holder/hearth construction, hollow
  shades, portable emission and source metadata.
- `src/models/botanical-models.mjs`, `src/models/decoration-models.mjs`, `src/models/tech-models.mjs`:
  rooted greenery, constructed decorative pieces and equipment.
- `src/models/architecture-models.mjs`, `src/models/wall-models.mjs`: recessed openings,
  solid stairs, receiving rails and locally mounted fixtures.
- `src/models/kitchen-models.mjs`, `src/models/food-models.mjs`: open basins/vessels,
  fitted appliances and contained tabletop contents.
- `src/models/autumn-models.mjs`, `src/models/winter-models.mjs`, `src/models/garden-models.mjs`:
  seasonal props, foliage, pools and outdoor furniture.
- `src/models/living-models.mjs`: articulated transform hierarchies and portable Idle/Walk clips.
- `src/viewer/index.mjs`: GLB loading, materials, camera, lighting and demand rendering.
- `src/viewer/illustrated-style.mjs`: shared matte toon palette, recoloring and shading comparison.
- `src/viewer/seat-contact.mjs`: isolated fixed-front SVG calibration, with rotation disabled.
- `tests/`: topology, physical contact, catalog dimensions, source/export parity
  and the read-only local server boundary.

The production build consumes this directory's exported prop GLBs and shared
illustrated palette. They are desktop build inputs; the workshop server/UI
is not shipped. See [live integration](../../docs/ROOM_MODEL_INTEGRATION.md)
for the actual game renderer, compatibility and verification.

The [catalog migration tracker](../../docs/CATALOG_3D_MIGRATION.md) is generated
by `npm.cmd run models`. It tracks export coverage; QA evidence and production
integration status live in the verification report.
The [approach and cleanup policy](../../docs/CATALOG_3D_APPROACH.md) explains
construction, retained evidence and reproducible review steps.
Ponds and the trail preserve their fixed catalog palettes. Floor-layer and
soft-seat metadata are retained, but the workshop does not implement production
floor-sitting, pet occupancy, swimming or water animation.

Current game behavior and rendering ownership are described in the [live integration guide](../../docs/ROOM_MODEL_INTEGRATION.md) and [codebase guide](../../docs/CODEBASE_GUIDE.md). Earlier experiments are preserved in the [modelling archive](../../docs/archive/modeling/README.md).
