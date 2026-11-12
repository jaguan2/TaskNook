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
