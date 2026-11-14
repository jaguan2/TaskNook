# Character and pet review — November 11, 2026

November 12: [game furniture integration](ROOM_MODEL_INTEGRATION.md) is now
implemented. The customized SVG actors reviewed here remain the production
characters and pets; the 179 props use their GLBs.

The production baby, medium (the `teen` stage) and adult pets retain their
existing cute, rounded artwork. The resident SVG defaults and sampled body
extremes also retain their existing faces, wardrobe and proportions. The 3D
starter residents needed the design adjustment: a more generous head, shaped
knit torso and tapered trousers replace the longer, straighter silhouette.

## Pets and production residents

Reviewed cats, dogs and rabbits across all three growth stages, Natural / Slender /
Round forms, and front / profile / rear / resting / carried poses: **135 cases**.
All frames contain their drawing, and **45 age comparisons** confirm that younger
pets have a proportionally larger head. Growth still uses the existing two-day
medium and seven-day adult thresholds; body form does not distort the face.
No production pet anatomy, palette, saved traits or growth behavior was changed.

The review found a tooling defect: carried tails extended below the art sheet's
old frame. Pet fixtures now have additional bottom clearance. This fixes review
cropping without changing the animals drawn in the game.

The twelve authored resident looks were inspected standing, seated and from behind.
Clothing/body extremes and profile views were reviewed separately. Existing SVG
defaults remain roughly 3.7 heads tall; the soft facial outline and body sliders
are preserved. These are sampled visual checks, not an exhaustive approval of
every possible wardrobe/slider combination.

Current review sheets:

- [Cats](model-review/characters-and-pets/cat-growth-review.png),
  [dogs](model-review/characters-and-pets/dog-growth-review.png),
  [rabbits](model-review/characters-and-pets/bunny-growth-review.png).
- [Resident looks](model-review/characters-and-pets/resident-presets-review.png)
  and [body/clothing extremes](model-review/characters-and-pets/resident-extremes-review.png).
- [Refined standalone 3D residents and pets](model-review/catalog-3d/furniture-living-section.png).

The 3D people now read at approximately **3.9 heads tall**, with a curved shoulder/
waist profile, tapered trouser legs and verified receiving neck/head joints.
Their physical height is 58px; catalog control bounds and identity flags remain
unchanged. Idle/Walk clips, ground clearance and bind-pose restoration still pass.
The three 3D pet GLBs remain adult starter rigs; the production growth variants
reviewed above are SVGs. Production wardrobe, pet growth and navigation are not
silently replaced by these isolated GLBs.

## Organization and repeatable review

- `prototypes/furniture/src/models/` owns model families and geometry helpers.
- `prototypes/furniture/src/viewer/` owns the browser entry, materials, rooms,
  calibration and CSS. `src/models.mjs` remains the authoring entry point.
- `docs/model-review/catalog-3d/` groups the 25 retained 3D section/room/calibration
  images, with its own [index](model-review/catalog-3d/README.md).
- `docs/model-review/characters-and-pets/` holds the five focused source-art sheets.

`npm.cmd run qa:source-art` in the workshop regenerates the actual production art
before checking it in Chrome/Chromium. It uses the existing frontend art generator
and isolates SVG gradients/clip IDs between cards. No backend or user database is
opened by that command. The main workshop smoke flow now settles automatic section
selection before proceeding; explicit stale-response/retry tests remain in place.

CI now validates supplied GLBs against their authoring source in a dedicated job.
The browser job also runs the fresh source-art review. GLBs are explicitly binary
in `.gitattributes`, with checkout preservation checked for all three autocrlf modes.
These workflow changes have been checked locally; no remote CI run was triggered.

## Stability evidence

| Check | Result |
| --- | --- |
| Frontend lint and production build | Passed |
| Complete frontend suite | 1,525 passed; one intentionally gated art generator skipped |
| Complete backend suite | 308 passed |
| GLB checkout preservation follow-up | Three autocrlf modes passed |
| Complete production browser suite | 18 passed, including adoption/growth, carrying, rooms and wildlife |
| Standalone catalog tests | 580 passed across all 184 assets |
| Living-model browser follow-up | 45 color/angle checks, both clips on five rigs and workshop interactions passed |
| Source-art browser review | 135 bounds checks and 45 age comparisons passed |
| Prototype static checks | No unused declarations or undefined names in 55 modules |
| Existing executable and update manifest | Exact source/bundle/hash verification passed |
| Frozen executable self-test | Exit 0 using disposable DB/app-data and port 5129 |

The first restricted backend run hit MSYS Git and Windows sandbox atomic-rename
restrictions. Native Git and a normal disposable temporary directory passed the
affected tests and the full suite. No product workaround was added for that
environment issue. The shared toolkit remains unavailable; structural review used
the local repository guidance rather than claiming an upstream rubric result.

This round changes no shipping runtime code, so the already matching executable
was verified and self-tested without rebuilding it. The fixture-frame change is
test tooling. Browser and frozen checks used disposable data. Owned processes are
closed after verification; scratch captures, generated art and disposable databases
are removed after useful sheets/reports are retained. No commit or push was made.

## November 13: deforming resident pilot

The [new review sheet](model-review/characters-and-pets/resident-3d-pilot.png)
compares the actual production SVG with a separate Blender-authored resident.
The supplied Virtual Cottage 2 room and seated-character images remain the style
reference: compact proportions, connected clothing, simple faces and restrained
illustrated shading. This is a first art/rig study, not a production migration.

The pilot has continuous sweater/sleeve and trouser/hip surfaces, a shared
twenty-bone skeleton, normalized blended skin weights, independent material
colours and a local torso-fullness shape key. Six clips cover Idle, Walk, Sit,
Type, Sleep and AnklesCrossed. Sleeping closes the eyes and bends
the arms/legs. Standing height remains approximately 58 logical room pixels.
The preview includes the real catalog chair, desk/laptop and bed as fixed
contact studies. Native 3D depth handles those workshop examples.

Full cross-legged sitting is excluded from this pilot after visual review. A
tighter fold still merged the trousers and shoes into an unclear lap shape.
Relaxed sitting and ankles crossed remain available. The rejected pose is
removed from the Blender actions, GLB, selector and generated comparison frames;
the review sheet now shows an additional seated profile instead.

The first visual iteration exposed an obscuring fringe, inflated shoulders and
an incorrectly facing bed. The retained model raises/sweeps the fringe, joins a
tailored shoulder profile, adds a fitted neckline and uses the correct bed end
and pillow bay. These are sampled visual checks; other outfits and seat heights
have not been approved.

The [pilot guide](../prototypes/furniture/src/characters/README.md) records file
ownership, editable `.blend`/GLB assets, source-preserving re-export, comparison
generation and QA commands. The GLB validates with zero errors/warnings. Four
new asset tests cover source hashes, connected surfaces, blended weights,
deformation bounds, floor clearance, sleeping eyes and real morph deformation.
The complete workshop suite passes **810 tests**. Browser QA passes eight
pose/view captures plus stale-load, recolour/fullness, pause/reduced-motion,
room-scale, narrow-layout/focus and failure-feedback checks. It observed at most
82 draw calls and 84,150 triangles with furniture in this single-character
study; this is not a multi-resident performance approval.

The 394 relevant frontend character/catalog tests, frontend lint and production
build pass. The existing executable's source/bundle/hash verification also
passes; this workshop-only change requires no new executable.
The Blender-source re-export reproduces the same GLB bytes, and the Blender
binary checkout rule passes all three autocrlf modes. Structural self-review
used the local repository guidance; the separately installed shared toolkit is
unavailable here. That review also closed a stale-load error path in the preview:
an abandoned bed request cannot turn a newer successful pose into an error.

The production catalog, room layering, saved profiles and SVG wardrobe remain
unchanged. Remaining gates include full clothing/body-slider parity, carried
and mug/gesture poses, general furniture contact fitting, production composition
and desktop/widget behaviour. See the [rollout roadmap](MODELING_ROADMAP.md).
The live frame loop exists only in this isolated workshop; paused studies render
on demand. Only the current review sheet, useful authoring assets and repeatable
checks belong in the outgoing changes; interim captures remain ignored.

## November 13: connected pet mesh pilots

The original adult-only 3D studies had rigid limb/joint pieces and a generic
palette. The live SVGs already had useful growth, form and coat distinctions.
The new [pet pilots](../prototypes/furniture/src/pets/README.md) retain the classic
cat, floppy-eared dog and rabbit identities while fusing the head/neck, body,
limbs/paws, ears and tail into one painted surface before weighting.

Each species has an editable Blender source, a portable GLB, twenty-one bones,
blended joints, independent coat/muzzle/inner-ear materials and local Slender/
Round morphs. Idle, Walk and crouched Rest are the current clips. The cat's tail
now follows its own joints, and baby heads do not accumulate scale on repeated
renders. Body form changes retain facial/paw anchors and floor clearance.

The workshop previews all **27 species/age/form combinations** using the existing
0.58/0.82/1 stage scales and 1.22/1.08/1 head factors. `pets:source` renders 162
actual SVG comparison frames and measures adult heights. The mesh adults match
those heights (about 28.69px cat, 26.33px dog and 37.05px rabbit), with compact
long axes inside the unchanged placement footprints. This corrects the size gap
between the older catalog studies and the live drawings. The fixed comparison
frame now includes the rabbit's full ears.

Retained evidence:

- [Growth and current-art comparison](model-review/characters-and-pets/pets-3d-growth-pilot.png).
- [Front/profile/rear and resting poses](model-review/characters-and-pets/pets-3d-poses-pilot.png).

The thirteen new tests cover clean Khronos validation, Blender/GLB hashes,
connected geometry, normalized blended weights, source data, real-art height,
growth repaint stability and **324 age/form/pose/time samples** for bounds and
ground contact. The complete workshop suite passes **823 tests**, including the
resident pilot and existing catalog. Browser checks pass 27 combinations, twelve
pose/view captures, all three walking clips, stale-load handling, coat recolour,
reduced motion, room scale, keyboard/narrow-window controls and graphics failure.
The sampled single-pet view uses at most nine draw calls and 46,652 triangles;
this does not establish whole-room performance.

All 162 SVG comparison frames pass fixed-frame bounds checks, including rabbit
ears and cat/dog tails. Static checks pass for the six new JavaScript modules;
the resident generator still builds its fourteen surfaces through the shared
mesh helpers. The existing executable's exact source/bundle/hash verification
passes. No shipping runtime input changed, so no executable rebuild is needed.

Only the classic coats are covered. Named breeds/markings, carrying, fully curled
sleeping, live room layering/navigation and desktop/widget behaviour remain
integration work. Production pet appearances, adoption, age timing and saved
traits remain in the existing SVG/lifecycle path. Shared Blender primitives now
live in `src/blender_geometry.py`; resident/pet anatomy and rig ownership stay
separate. The project guidance was used for structural review because the shared
toolkit is unavailable. Temporary browsers/servers close after verification,
and trial captures are removed after the current sheets are retained.

## November 13: clothing and hair fit

The [wardrobe fit ledger](WARDROBE_FIT_REVIEW.md) records all thirteen tops, ten
coats plus none, eleven bottoms, six shoes and nineteen hairstyles. The review
uses actual complete production residents at compact/broad body extremes,
front/profile/rear and relaxed/ankles-crossed sitting, plus all cuts beneath a
beanie and headphones. It retains four selected current sheets and documents
the mesh interfaces and deformation checks needed for later wardrobe migration.

Curly/afro front and profile geometry covered the skin; the eyes being drawn last
had hidden how much of the face was obscured. Both now use continuous outlines
with face openings. Under replacing headwear, those short coily crowns compress
inside the skull rather than leaving a wide flat shelf. Existing wardrobe keys,
saved appearance and colouring remain intact. The other clothing cuts fit the
sampled silhouettes; this is not exhaustive outfit/slider/pose coverage.

`qa:wardrobe` passes 714 frame checks, four browser geometry checks at facial
landmarks, and creates eight sheets for visual inspection. The 405 relevant
frontend tests, frontend lint/build and all 823 workshop tests pass. The built
SPA passes real hair/clothing/shoe selection, front/seated/back previews, 420px
keyboard use and reload persistence, with no uncaught page errors. A restricted
loopback connection caused the first workshop server check to fail; it passed
with local loopback access. The independently installed shared review toolkit
remains unavailable; structural self-review follows the repository boundaries.

The shipping hair change includes rebuilt `TaskNook.exe` and `desktop-update.json`
on the main channel, build `342dcf7590874b12a889a7939e3751f1`. Exact source/bundle/
hash verification and the frozen executable's isolated self-test pass. The
resident/pet 3D pilots retain their previously documented scope; this pass does
not create additional 3D clothing assets or switch the live actor renderer.

## November 13: smaller cats and rabbits

Cats are now 20% smaller and rabbits 24% smaller in the live SVG artwork. Dogs
retain their size. `PET_DISPLAY_SCALE` in `lib/pets.js` owns these render-only
factors; the SVG assembly and room shadow share them. All growth stages, body
forms and carried/resting poses inherit the adjustment around the ground anchor.
Saved adult sizes, growth clocks and placement footprints are preserved.

Measured classic adult drawing heights are now approximately 22.95px cat,
26.33px dog and 28.16px rabbit. The [current source sheets](model-review/characters-and-pets/README.md)
and [mesh pilot comparisons](model-review/characters-and-pets/pets-3d-growth-pilot.png)
are regenerated, including editable Blender sources and matching GLBs. The
pilot remains a separate workshop study with its previously documented limits.

Source-art QA passes 135 growth/form/pose bounds and 45 age-ratio checks. Pet
pilot QA passes 27 age/form combinations, 12 pose views and 162 SVG comparison
bounds, plus playback, recolour, reduced-motion, small-window and asset-failure
checks. The smaller animals and both occupied chairs were inspected in the
built room at four furniture rotations. All 1,639 frontend and 823 workshop
tests pass; one optional frontend generator test is gated. The matching
main-channel desktop build `2e30909ad1c14792bfa8b51d96fceb14` passes exact package
verification and its isolated frozen self-test. See the
[full refinement record](ROOM_MODEL_INTEGRATION.md#screen-chair-and-pet-proportions-explicit-editing--2026-11-13)
for furniture changes, edit-only customization and evidence ownership.

## November 14: crossed-leg boot fit

The fall-style seated reference exposed boot uppers that stayed upright beside
diagonal calves and soles that hid one another. Both are corrected in the live
SVG rig. The [wardrobe follow-up](WARDROBE_FIT_REVIEW.md#crossed-seated-boots--november-14)
records the shared shoe/pose changes, 144 native boot-contact pairs and the
editor/room regression journey. Current preset, bottoms and shoe sheets are
refreshed; [the dedicated contact sheet](model-review/characters-and-pets/seated-boot-contact.png)
shows relaxed, ankles-crossed and folded-leg poses at four seat heights.

## November 14: pickup pose and contact regression

Characters now use gently bent, connected legs when lifted, with one small sway
and all competing activity/gesture clocks suppressed. The [motion fit record](CHARACTER_MOTION_FIT.md)
tracks the full bottom/shoe simulation, complete outfit samples, negative controls
and real chair-to-chair pickup checks. Pet pickup artwork is preserved.
