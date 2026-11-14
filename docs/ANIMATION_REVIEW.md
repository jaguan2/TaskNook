# Animation review — November 13, 2026

Reviewed the current built app, build `342dcf7590874b12a889a7939e3751f1`,
alongside its animation owners. This is an investigation and findings report;
it does not change the runtime or complete actor migration. Production residents
and pets still use SVG/CSS. The Blender pilots' clips run only in the workshop.

## Findings, in recommended order

### P2: reduced motion does not reach drawer transitions

[Drawer.jsx](../frontend/src/components/Drawer.jsx) always enters/exits with a
420px horizontal spring. It does not consume the resolved motion preference,
and there is no shared `MotionConfig` applying that preference to this subtree.
Several visit/decorating chips in [App.jsx](../frontend/src/App.jsx) similarly
use unconditional translating transitions.

In Edge, setting Motion to Reduced stopped all sampled CSS loops, but opening
Profile still moved it from `translateX(420px)` to `none` over roughly 370ms.
The same movement occurred with Auto plus the OS reduced-motion preference.
The CSS attribute alone cannot control these JavaScript-driven transitions.

Use the existing resolved preference for both interface and scene motion.
Reduced mode should use an immediate state change or brief opacity-only change;
direct pointer dragging can remain direct manipulation. Extend behavioral
coverage to actual drawer/chip movement, beyond the current CSS selector tests.

### P2: loading a GLB image removes furniture-local animation and live clock hands

[IsoCatalogModel.jsx](../frontend/src/components/IsoCatalogModel.jsx) replaces
its complete SVG child with a cached image once rendering succeeds. That child
also owns steam, flame/ember motion, aquarium bubbles and live wall-clock hands.
Those effects have no separate production layer after the image is installed.

The same four placements were inspected with GLB requests held, then released:

| Prop | SVG effect elements while loading | Once the GLB image is ready |
| --- | --- | --- |
| Mug | 3 steam wisps | 0 |
| Fireplace | 3 flames and 3 embers | 0 |
| Aquarium | 3 bubbles | 0 |
| Wall clock | 2 live hands | 0 |

Static furniture images are an explicit integration choice, so this is a
missing animation/function layer, rather than a failed GLB animation player.
It explains why the migrated room can feel less alive despite improved models.
Keep the cached body image and add small, correctly anchored live overlays for
selected props. Clock hands can update infrequently; steam/flames can use bounded
CSS effects. This does not require encoding a new furniture PNG each frame.

### P2: rabbit movement has no stepping or hop

[Rabbit in IsoPetItems.jsx](../frontend/src/components/IsoPetItems.jsx) gives
`moving` to the torso bob but leaves both paw groups static. All four sampled
times in each front/profile/rear view had `animation: none` and unchanged paw
transforms while the torso moved up to 0.65px. A translating rabbit therefore
slides on fixed feet.

The shared cat/dog `Paw` also uses the profile `leg-trot` rotation in front and
rear views. Their end-on feet sweep sideways instead of using the existing
lift-oriented step. Restore view-appropriate foot motion, give rabbits a small
species-specific hop, and review contact timing against the actual glide.

[Sampled production pet gaits](model-review/animations/pet-gaits.png)
show the real SVGs and built stylesheet at 0, 0.125, 0.25 and 0.375 seconds.
Four samples reveal these issues; they do not approve every breed or growth form.

### P2: sleeping residents retain awake idle gestures

The lying branch in [character/index.jsx](../frontend/src/components/character/index.jsx)
rotates a nested ordinary `Resident` and sets its expression to sleepy. It does
not communicate sleeping to the inner animation gates. That nested resident
still owns stretch, eye-rub, glance and yawn loops beneath its breathing wrapper.

Sampling the actual eye-rub peak shows the sleeper raising an arm toward the
face and tilting the head. The yawn mouth also opens. This is separate from
quiet sleeping breath, and can disturb head/pillow contact or emerge above the
duvet. Give the inner figure an explicit sleeping animation state and suppress
awake gestures while retaining wardrobe identity and subtle breathing.

The [gesture comparison](model-review/animations/sleep-gestures.png) samples
the real standing and lying components at the same gesture peaks.

## What is working

- The app already resolves Auto/Full/Reduced consistently for its main CSS
  layers. Pre-paint handling prevents a startup flash of ambient motion.
- In the sampled isometric room with storm weather, 90 running CSS animations
  became zero after selecting Reduced; Auto with OS reduction also produced zero.
- The sampled classic room's 46 CSS animations were paused in Widget Mode.
  A 1.1-second observation after settling found no hidden-scene style mutations.
  The suspected hidden classic-loop problem was not reproduced and is not a
  finding. This observation does not prove all background work is suspended.
- Weather lightning timers have cleanup and reduced/widget gates. Pet roaming
  and NPC activity timers clean up, and the roaming interval stops in reduced,
  editing and widget modes.
- Resident gait/body/arm clocks and idle-gesture phase offsets already have
  useful timing coverage. The main focus timer remains a separate provider.

## Coverage and evidence

Code tracing covered motion preference ownership, CSS loops, Framer transitions,
home/classic scene composition, pet roaming/glides, resident gesture gates,
weather, common-room calm/pause behavior and the furniture image boundary.
Browser checks used the built SPA, installed Edge and a disposable SQLite
database. Production components were also rendered with production CSS for
36 pet gait frames, 24 resident pose samples and 8 awake/sleeping gesture samples.

All **74** targeted motion/weather/NPC/pet tests pass. They do not catch the
visual issues above: the reduced-motion checks mainly inspect CSS, and the pet
tests do not establish a complete species/view gait. The browser recorded no
uncaught page errors. Existing desktop source/bundle/hash verification passes.
This review makes no frame-rate, battery or native WebView performance claim.

Numeric samples, browser output and test logs are under ignored
`build/skill-verification/animation-review/`. Temporary database and harness
files are removed after review. The local project review guidance was used;
the separately installed shared toolkit is unavailable in this environment.

## November 14 implementation follow-up: character pickup

The [pickup implementation and simulation](CHARACTER_MOTION_FIT.md) replaces
the bounding-box leg rotations with connected knee/ankle anchors and a gentler
whole-body carry clock. It includes deterministic contact probes, reduced-motion
checks and a live pickup/drop persistence journey. This scoped follow-up does
not resolve the four separate findings above.
