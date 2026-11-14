# Current modelling roadmap

All 184 catalog entries have standalone authored GLBs across 18 sections. The live isometric game uses 179 prop/furniture assets. Five customized actors (`you`, `resident`, `cat`, `dog`, `bunny`) continue using the established SVG rigs; their standalone rigs remain workshop studies.

Separate Blender-authored [resident](../prototypes/furniture/src/characters/README.md) and [pet](../prototypes/furniture/src/pets/README.md) mesh pilots now explore deforming surfaces. These additional studies are outside the 184-entry catalog and are not production actor replacements.

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

The [November 13 refinement](ROOM_MODEL_INTEGRATION.md#screen-chair-and-pet-proportions-explicit-editing--2026-11-13)
connects the folding-screen leaves, further shortens and slims the wooden/desk
chairs, reduces cat/rabbit display size and makes furniture customization
exclusive to Decorate mode. Current review sheets and app captures are refreshed.

Review colour and silhouette at actual game scale before broad material changes. Prioritize legible stock, clear circulation, coherent proportions and correctly supported objects. The furniture pass retained the production character/pet rigs. The character assessment below describes a separate proposed next stage.

## Character assessment — November 13, 2026

Status: the first [deforming resident pilot](../prototypes/furniture/src/characters/README.md) is implemented in the model workshop, with [reviewed captures](model-review/characters-and-pets/resident-3d-pilot.png). Production characters still use SVG; wardrobe and room integration remain pending. This work covers residents. Pet growth and artwork remain a separate scope.

### Current construction

| Owner | What it does | Modelling limit |
| --- | --- | --- |
| [Resident assembly](../frontend/src/components/character/index.jsx), [body](../frontend/src/components/character/body.jsx) and [seated artwork](../frontend/src/components/character/seated.jsx) | React assembles SVG paths, gradients and layered wardrobe drawings; CSS supplies motion | Front, profile and rear are separate drawings. Seated figures use front/rear artwork; lying figures reuse a rotated standing figure. There is no deforming 3D surface. |
| [Body metrics](../frontend/src/lib/body.js) and [saved appearance](../frontend/src/lib/profile.js) | Own proportions, wardrobe keys, colours, expressions and body sliders | These are compatibility contracts to preserve when changing the renderer. |
| [Original workshop living models](../prototypes/furniture/src/models/living-models.mjs) | Standalone people/pets with pivoted parts and Idle/Walk clips | The catalog `you.glb` and `resident.glb` each contain zero skins, weighted primitives or morph targets. They remain rigid studies. The new pilot has its own editable Blender source and skinned GLB, outside the catalog. |
| [Catalog renderer](../frontend/src/services/catalogRenderer.js) | Renders furniture through Three.js into cached PNGs for the existing room layers | It is a still-image pipeline, not an animated actor renderer. Loading a rigged GLB here alone would not provide live character motion. |

### Art priorities

The [standing presets](screenshots/37-character-presets.webp), [seated presets](screenshots/38-character-presets-seated.webp) and [sampled extremes](model-review/characters-and-pets/resident-extremes-review.png) establish the identity to retain: large heads, simple faces, rounded silhouettes and warm colours. Keep the stylized direction of the [supplied references](ART_REVIEW.md); adding realistic anatomy or skin detail would miss that direction.

- Give shoulders, necks, elbows, hips and knees connected, rounded transitions during bending. Separate 2D layers currently make these contacts depend on pose-specific overlap rules.
- Give hair, sleeves, coats and skirts coherent depth from every view. Keep folds broad and readable at room scale.
- Author actual seated, typing and sleeping poses. Preserve supported feet, hips on cushions, hands reaching keyboards and the existing duvet/foreground occlusion.
- Keep the default proportions as the baseline; review narrow/wide and short/tall combinations before changing them. The current default is already approximately 3.7 heads tall.

### Pilot approach and rollout gates

The pilot uses one resident wearing short hair, a sweater and trousers. Its editable Blender source has a shared skeleton and meshes whose vertices deform around the joints. The GLB contains skin weights, six pose clips and one local torso-fullness shape key. Blender supports these exports; Three.js supports their skeletal deformation and animation loading. See the official [Blender glTF guide](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html), [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html) and [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) documentation.

Use the existing saved appearance fields as input. Fit modular clothing to the same skeleton/body variations, retain independent material colours, and account for hidden body surfaces under clothing. Body sliders need coordinated mesh and joint changes; scaling the entire character is insufficient.

Before expanding the wardrobe or enabling this in production:

1. Compare the pilot beside the real SVG character at room and editor scale, from every room facing. Check standing, walking, the supported seated styles, typing, sleeping, carrying, expressions and a break mug. Include sampled body extremes and recolours.
2. Prove an animated rendering path with correct room depth ordering, foreground furniture/duvet occlusion, selection and keyboard/seat/bed contacts. Measure multiple residents, pause/reduced-motion behaviour and desktop/widget use. Avoid encoding a PNG on every animation frame; the composition approach remains to be evaluated.
3. Automate repeatable export and checks for valid weights, required bones/clips, deformation bounds and contact anchors. Review bent joints, clothing clipping and silhouettes visually in the actual app; geometry checks alone cannot establish quality.
4. Cover the existing wardrobe, accessories, saved looks and customization controls before switching defaults. Keep the supported SVG path until replacement behaviour and graphics-failure handling are proven. Record coverage in the existing character review rather than treating the two workshop GLBs as completed migration.

Completed for this pilot: editable `.blend` and GLB, connected sweater/trouser surfaces, normalized blended weights, six clips, recolours, torso fullness, a live animated workshop, actual SVG comparisons, fixed furniture studies and repeatable asset/browser QA. The [character review](CHARACTER_PET_REVIEW.md#november-13-deforming-resident-pilot) records the evidence and remaining scope. These checks establish a first model and preview, not production room-layer integration or full customization parity.

## Pet mesh pilots — November 13

The classic cat, floppy-eared dog and rabbit now have editable Blender sources,
connected anatomy, blended skeletons and Idle/Walk/Rest clips. Their separate
workshop preview covers all three ages and body forms, with actual SVG comparison
frames. Models match measured live-art heights and retain the existing placement
footprints. See [growth](model-review/characters-and-pets/pets-3d-growth-pilot.png),
[poses](model-review/characters-and-pets/pets-3d-poses-pilot.png) and the
[pet authoring guide](../prototypes/furniture/src/pets/README.md).

Before production integration, cover named coat/breed silhouettes and markings,
carrying and curled sleeping, room composition, navigation, saved appearance and
desktop/widget performance. Growth timing, permanent adult size and pet forms
remain owned by the current production lifecycle; the workshop previews them
without writing to it.

## Wardrobe fit review — November 13

The [wardrobe fit review](WARDROBE_FIT_REVIEW.md) covers every current top, coat,
bottom, shoe and hairstyle in the production SVG rig, fixes coily-hair face/hat
fit, and records the component fitting approach for future 3D pieces. It does
not extend the resident pilot beyond its existing single outfit.
