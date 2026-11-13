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

Review colour and silhouette at actual game scale before broad material changes. Prioritize legible stock, clear circulation, coherent proportions and correctly supported objects. The furniture pass retained the production character/pet rigs. The character assessment below describes a separate proposed next stage.

## Character assessment — November 13, 2026

Status: source and existing artwork reviewed; no production character replacement has been implemented. This assessment covers residents. Pet growth and artwork remain a separate scope.

### Current construction

| Owner | What it does | Modelling limit |
| --- | --- | --- |
| [Resident assembly](../frontend/src/components/character/index.jsx), [body](../frontend/src/components/character/body.jsx) and [seated artwork](../frontend/src/components/character/seated.jsx) | React assembles SVG paths, gradients and layered wardrobe drawings; CSS supplies motion | Front, profile and rear are separate drawings. Seated figures use front/rear artwork; lying figures reuse a rotated standing figure. There is no deforming 3D surface. |
| [Body metrics](../frontend/src/lib/body.js) and [saved appearance](../frontend/src/lib/profile.js) | Own proportions, wardrobe keys, colours, expressions and body sliders | These are compatibility contracts to preserve when changing the renderer. |
| [Workshop living models](../prototypes/furniture/src/models/living-models.mjs) | Standalone people/pets with pivoted parts and Idle/Walk clips | The exported `you.glb` and `resident.glb` each contain zero skins, weighted primitives or morph targets. They are rigid studies, without the live wardrobe and pose coverage. No Blender authoring file is currently tracked in the repository. |
| [Catalog renderer](../frontend/src/services/catalogRenderer.js) | Renders furniture through Three.js into cached PNGs for the existing room layers | It is a still-image pipeline, not an animated actor renderer. Loading a rigged GLB here alone would not provide live character motion. |

### Art priorities

The [standing presets](screenshots/37-character-presets.webp), [seated presets](screenshots/38-character-presets-seated.webp) and [sampled extremes](model-review/characters-and-pets/resident-extremes-review.png) establish the identity to retain: large heads, simple faces, rounded silhouettes and warm colours. Keep the stylized direction of the [supplied references](ART_REVIEW.md); adding realistic anatomy or skin detail would miss that direction.

- Give shoulders, necks, elbows, hips and knees connected, rounded transitions during bending. Separate 2D layers currently make these contacts depend on pose-specific overlap rules.
- Give hair, sleeves, coats and skirts coherent depth from every view. Keep folds broad and readable at room scale.
- Author actual seated, typing and sleeping poses. Preserve supported feet, hips on cushions, hands reaching keyboards and the existing duvet/foreground occlusion.
- Keep the default proportions as the baseline; review narrow/wide and short/tall combinations before changing them. The current default is already approximately 3.7 heads tall.

### Proposed pilot and rollout gates

Start with one resident wearing short hair, a sweater and trousers. Author an editable Blender source with a shared skeleton and a mesh whose vertices deform around the joints. Export GLB with skin weights, animation clips and suitable shape keys for body variation. Blender supports these exports; Three.js supports their skeletal deformation and animation loading. See the official [Blender glTF guide](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html), [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html) and [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) documentation.

Use the existing saved appearance fields as input. Fit modular clothing to the same skeleton/body variations, retain independent material colours, and account for hidden body surfaces under clothing. Body sliders need coordinated mesh and joint changes; scaling the entire character is insufficient.

Before expanding the wardrobe or enabling this in production:

1. Compare the pilot beside the real SVG character at room and editor scale, from every room facing. Check standing, walking, all three seated styles, typing, sleeping, carrying, expressions and a break mug. Include sampled body extremes and recolours.
2. Prove an animated rendering path with correct room depth ordering, foreground furniture/duvet occlusion, selection and keyboard/seat/bed contacts. Measure multiple residents, pause/reduced-motion behaviour and desktop/widget use. Avoid encoding a PNG on every animation frame; the composition approach remains to be evaluated.
3. Automate repeatable export and checks for valid weights, required bones/clips, deformation bounds and contact anchors. Review bent joints, clothing clipping and silhouettes visually in the actual app; geometry checks alone cannot establish quality.
4. Cover the existing wardrobe, accessories, saved looks and customization controls before switching defaults. Keep the supported SVG path until replacement behaviour and graphics-failure handling are proven. Record coverage in the existing character review rather than treating the two workshop GLBs as completed migration.

This is a substantial actor-rendering and wardrobe project, rather than another static furniture batch. The first deliverable should establish the art style, deformation quality and room integration with one editable model.
