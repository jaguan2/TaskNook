# TaskNook model spec

How isometric furniture is drawn here. `docs/DESIGN.md` is the authority on
the app's *visual* decisions (composition, motion, colour, chrome); this file
is the authority on the *models* — the furniture sprites in
`frontend/src/components/IsoItems.jsx` and the character package in
`frontend/src/components/character/` (body rig, hair and garment REGISTRIES,
pose assembly — split out because the character is the fastest-growing
artwork, and a style there is one self-contained registry entry rather than
switch cases).

These are rules, not preferences. Most were paid for: every "learned from"
note below is a sprite that shipped wrong and had to be redrawn.

---

## 1. The five silhouette rules

The conventions cozy isometric games converge on (Animal Crossing, Stardew
Valley, Unpacking, Cozy Grove). A new sprite passes all five or it isn't done.

1. **Silhouette first.** The outline alone must name the object at ~30px. A
   pumpkin is ribs-and-a-stem; a rake is a pole and a fan; a toaster is a box
   with toast sticking out of it.
2. **Two or three tones per material.** Never a gradient ramp. `TintedBox`
   enforces this for boxes; round items do it by hand.
3. **One hero colour per object**, everything else neutral — otherwise a
   shelf of them turns into confetti. Neutrals are WARM, never pure grey.
4. **Detail as a few large shapes.** Fine texture disappears at room scale and
   costs nodes for nothing.
5. **Chunky proportions.** Oversize the readable part — a kettle's spout, a
   mug's handle — rather than staying to scale.

**Learned from:** a leaf pile whose leaves stood on end read as a *campfire*
(fix: low, wide, leaves lying down). A kettle whose spout and handle were thin
strokes leaving the shoulders read as *horns* (fix: cone spout one side, bail
handle over the top). A toaster that was a white box with a dot read as a
*bread bin* (fix: two slices poking out). All three passed every automated
check; only looking caught them.

---

## 2. Geometry

| Constant | Value | Meaning |
|---|---|---|
| `TILE_W` | 48 | floor diamond width |
| `TILE_H` | 24 | floor diamond height (2:1 dimetric) |
| `WALL_H` | 118 | wall height in screen px |
| `SKEW` | 26.565° | `atan(TILE_H / TILE_W)` — the wall plane's skew |

- **One tile along a wall is `TILE_W / 2` = 24px.** A wall item with
  `foot: [1.4, 0.3]` is 1.4 tiles wide, so its artwork is ~33px across.
- Every sprite is drawn for **a footprint anchored at grid (0,0)**. The scene
  places it with `translate(project(gx, gy))`, which works because the
  projection is linear — never bake a position into a sprite.
- `project`/`unproject` are exact inverses. That is what makes grid-dragging
  work; don't add rounding to either.

### Height reference

Heights are screen px, measured from the floor. Match these when adding a
piece so a new item sits correctly beside the existing ones.

| Class | px | Examples |
|---|---|---|
| On a table | 9–20 | pie 9, kettle 15, mug 16, microwave 18, laptop 20 |
| Seat height | 12–26 | log 12, cushion 13, bench 16, chair 19, haybale 26 |
| Low furniture | 19–32 | coffeetable 19*, cafetable 21*, sidetable 28 |
| Table / worktop | 26–44 | diningtable 26.5*, counter 29.5*, oven 40*, desk 44 |
| Tall furniture | 76–96 | coatrack 76, floorlamp 84, wardrobe 92, bookshelf 96 |
| Full height | 104–118 | archway 104, pillar 118, pendant 118 |

\* these are `surface` values (where things stacked on it rest), not `hitH`.

### Persona proportions

The people are not furniture and get their own numbers, in **`lib/body.js`**
— the single home of the body's constants, half-widths, limb thicknesses and
torso curve (the sprite, the panel previews and the node-env geometry tests
all read that one copy): `HEAD_R` 7.3, `LEG_H` 29, standing torso at −42 and
head at −50.5 — about 58px tall with the head a quarter of it, and the
visible leg ~43% of the figure. It was 32%, and a figure that is two-thirds
torso-and-head reads squat whatever the shading; the 2026-08 "chunky" retune
raised the legs, shortened the torso, and drew the standing legs as
GARMENTS — tapered trousers with a cuff band ending in deliberately chunky
shoes (the owner's clay-toy reference kits carry nearly half the figure as
leg, and the oversized shoe is half the toy-like read). A first pass at 37%
leg still read as the old body: proportion deltas obey the same
must-be-BIG rule as the model deltas.

Body width and height are **user-tunable** (Profile panel sliders, stored on
the character). `WIDTH_RANGE`/`HEIGHT_RANGE` in `lib/body.js` are
guard-derived, not taste — tests pin each endpoint against the shoulder
floor, the ≤1.55×-head chunky ceiling, the hem-covers-stance rule and the
≥40% leg share, so widening a range without re-deriving it fails CI. Limb
thickness scales gently with width (a wide torso on stick legs reads as
parts pasted together). Stored `build` keys survive as the width's default,
so pre-slider saves keep their silhouette.

The 2026-08-19 **slimming retune** (owner: "they look like blobs", "make the
two models more different"): every build's base half-width came down ~0.6px
(the old average torso was 19.2 wide × 17 tall — nearly square, and no
shading rescues a square), both waists pinched (masc −1.0 so the male body
is a V rather than a slab; fem −3.2), limb bases came down ~0.2, and `limb`
became a MODEL axis too — fem's arms and legs run 0.6px finer than masc's,
because a sub-half-pixel model delta is invisible at 57px. Old saves with
widths above the new 8.4 ceiling clamp down on load: that is the retune
applied, not data loss.

**Learned from:** the first figure was a 15.6px head over a 15px leg — a third
of its height was skull, which is toddler proportion, and no amount of shading
fixed it ("blocky and lifeless", user). Three things carried the redraw, in
order of effect: **legs to 22px** (the single biggest change), a **neck and a
collar** so the head stops sitting directly on the shoulders, and a **tapered
torso** — shoulders proud, waist drawn in — because a constant-width rect
reads as a pill whatever colour it is.

Two rules that come out of it:

- **The figure obeys the light like everything else.** It was the one object
  in the room with a single flat tone while every `TintedBox` neighbour had
  three: light catch across the shoulders, flat shade on the lower body.
- **Depth colours separate near from far.** Two limbs in one colour read as
  one block, so the far limb is always a darker pair. FIXED materials (the
  shoes) may keep a hand-tuned FAR constant; a USER-COLOURABLE material must
  DERIVE its far hue (`farColor` in `lib/body.js` — the trousers pair this
  way), because a fixed darker hue only matches the one colour it was tuned
  against. The near arm gets a white catch so it doesn't vanish into a torso
  it shares a colour with.
- **Limbs are SEGMENTS meeting at joints** (owner call, 2026-08-16 — this
  revises the old "a bend is invisible noise" line). The way Roblox split R6
  limbs into R15 parts: an arm is upper + forearm meeting at an elbow, a
  standing leg is thigh + shin meeting at a knee, and the joint reads from
  the SEAM — the width step and the angle change — not from anatomical
  detail. Rest poses are Sims-soft: the elbow bows slightly out and returns
  to the hand, the knee sits a hair off the hip-ankle line; a limb is never
  a straight column. **Each limb is ONE CONTINUOUS POLYLINE bent at the
  joint, washed ONCE** — never per-segment capsules with per-segment washes:
  where round caps overlap, translucent layers double into lens-shaped blobs
  and the limb reads as sausage links (v2 shipped exactly that; the owner's
  in-app screenshot caught it). Joint creases go on the INSIDE of the bend
  and faint (centred, they read as stains). Each limb stays ONE `<g>` so the
  walk/gesture/held wrappers rotate it whole; a short sleeve ends AT the
  elbow, which is what makes bare forearms read. **Parts NEST, and one light
  runs through them** (owner: "it should look like one cohesive piece"): a
  limb's root is buried INSIDE the part it hangs from — the shoulder starts
  within the torso outline, the hip under the hem — with a faint occlusion
  crease where they meet, and every limb carries the same outer-light /
  inner-shade edge treatment. A capsule started beside the torso leaves a
  step at the armpit and reads as a part from a different kit. Hair
  masses carry the same three-tone treatment as every box (`volumeFor` in
  `character/hair.jsx`): lit upper curve, shadowed underside — one flat
  colour is a decal whatever its outline.

**Hair is built with the WIG METHOD** (researched 2026-08-16; the previous
cap-plus-temple-tabs construction was the textbook amateur tell — assembled
pieces instead of one mass). A style is one `HAIR_REGISTRY` entry
(`character/hair.jsx`) drawn with the kit: **one inflated closed silhouette**
(`wigPath` — a dome hugging the skull low and growing toward the crown,
carved into 3–6 VARIED round teeth; even teeth read as a comb; a
negative-depth tooth carves the curtains' parting notch), **back masses in
the SHADOW TONE** (`farColor` — the cheapest depth move there is), and an
interior budget of at most three marks (the `brow` shadow, one crown `shine`,
the odd anchored line). Same-tone shapes may compose freely — a seam only
exists where tones meet. The kit THROWS if a style's clumps don't close its
own outline. Layers: `front` (over the head, inside the gesture wrappers),
`length` (behind the torso), `back` (replaces everything when the figure
turns away — see the `away` prop). Garments mirror the scheme in
`GARMENT_REGISTRY`: outer layers draw a `shell` BIGGER than the body with an
under-shadow at the hem (`OUTER_BULK`), a `collar` slot renders after the
body's own neck, and a `back` slot serves the turned-away view (the hoodie's
hood hangs down it). Registry keys are pinned against the catalog both ways.

**Learned from:** every style once put its length in `HairFront`, which paints
after the head. Side pieces ran to `headY + 9…13` against a 7.3px head radius —
past the chin — so all six hairstyles closed around the face and read as a hood
or a headscarf rather than hair ("the hair sometimes shows up in front", user).
Three follow-on traps, each found by rendering the set rather than one sprite:

- **Length must clear the SHOULDER, not the head.** At ±11.4 against a masc
  shoulder of up to 12.6 the torso swallowed everything below the jaw and long
  hair rendered as a bob.
- **Anything centred behind the head is invisible.** The first ponytail sat at
  x ≈ −4.4…+1.0, behind both the head and the torso, and showed as a 2px nub.
  A tail hangs to one side; braids clear the skull at ±6.6.
- **Put length behind the body, not on it.** In the head group it lay across
  the chest as a bib.

**Two bodies, silhouette only.** `MODEL_SHAPE` gives `masc` broad shoulders
dropping nearly straight and `fem` narrow shoulders, a drawn-in waist and a hem
that flares back out; the sides are ONE quadratic through the waist, because a
straight taper can only narrow. It constrains nothing else — every hairstyle,
outfit and expression works on both.

**Learned from:** the first deltas were ±1.5px, invisible at this size — both
rows of the contact sheet were the same body twice. Then `fem` + `slim` gave
shoulders of 14.4px against a 14.6px head, the exact top-heavy proportion this
section exists to prevent; hence `MIN_SHOULDER`, and the narrow read now comes
from waist-to-hem contrast rather than from shrinking the shoulders. Anything
hung off the body — arms, hands, collar — derives from the model's shoulder, not
the build's half-width, or it floats in a gap beside the chest.

**`seat` and `surface` are contracts, not decoration.** `seat` makes personas
sit on it; `surface` makes `stacks` items rest on it. Both resolve at RENDER
time only — the stored gx/gy never changes.

---

## 3. Construction

Reach for a shared helper before drawing faces by hand. There are eight, and
between them they cover most of the catalog:

| Helper | For | Why it's shared |
|---|---|---|
| `TintedBox` | any box | contact shading + correct face tones in one place |
| `PlantPot` | potted plants | taper + lip + soil (see §5) |
| `Vessel` | cylinders | kettle, stockpot, cake — bottom ellipse, side, top ellipse |
| `RugGround` | rugs | ground + inset lighter field, so the border is an AREA |
| `Fringe` | rug edges | strands in GRID space, so they land at the right screen angle |
| `Planks` | tabletops | seams; a bare slab reads as flat-pack |
| `ScreenFace` | screens | glass inset in its bezel + a hint of picture |
| `isoBox` | raw geometry | when a helper genuinely can't say it |

**Detail belongs in the helper before the individual sprite.** One edit to
`TintedBox` raises the whole catalog; an over-detailed bookshelf beside a
hundred flat boxes looks *worse* than uniform.

- **Boxes**: `TintedBox`, never hand-rolled faces.
- **Round things**: `Vessel`, or bottom ellipse → straight side → top ellipse.
- **Wall items**: draw inside `<g transform={skewY(SKEW)}>`, y=0 at the floor
  line, negative y upward.
- **Flat things**: `floorPatch(gx, gy, dx, dy)` — a diamond in the floor plane.
- **Derive texture from POSITION, never `Math.random`.** The scene re-renders
  on the timer tick; a randomised floor would crawl.

---

## 4. Colour

- Main material: `var(--tint, <fallback>)` via the `tinted()` helper.
- **Shading is translucent BLACK; highlights are translucent WHITE.** Never a
  fixed darker hue — the user can tint almost anything, and a hard-coded shade
  only works for the colour you happened to pick. (The CHARACTER refines this
  pair to cool-dark/warm-light — see §10; furniture keeps plain #000/#fff.)
- Items with no sensible single material opt out with `tintable: false`
  (6 of 131 — screens, the Kenney PNG renders, multi-coloured things like a
  stack of books).

Standard opacities, so faces match across the catalog:

| Surface | Value |
|---|---|
| Left face (front-left) | `#000` @ 0.16–0.20 |
| Right face (front-right) | `#000` @ 0.30–0.34 |
| Top face | no overlay — it faces the light |
| Top-edge light catch | `#fff` @ 0.13 |
| Contact band at the base | `#000` @ 0.15 |
| Sunk panel / recess | `#000` @ 0.13–0.20 |

**Light is cast by the SCENE, not by the sprite.** A light source declares
`glow: [radius, strength]` (20 items do) and `IsoRoom` draws one warm pool per
source, dimmed together by `ISO_TIME.glow`. Never draw a light pool into a
sprite: five once did, and they stayed at full brightness at noon, which is
exactly what made them read as stickers rather than as light.

---

## 5. Plant pots

Called out because every plant got this wrong until it was fixed. A
straight-sided box with leaves in it reads as *a box with leaves in it*. Three
things make it a pot, and all three are silhouette rather than surface:

1. **Taper** — the foot is ~70% of the rim, so the sides slope inward.
2. **A lip** standing slightly proud of the body at the top.
3. **Soil sunk below the rim**, so you are looking INTO something.

`PlantPot` does all three; `PlantBase` wraps it for the leafy ones. A bonsai
keeps its shallow rectangular tray — that IS what a bonsai grows in.

---

## 6. Motion

- CSS keyframe classes only: `room-sway`, `steam-puff`, `animate-flicker`,
  `room-flicker`, `resident-type`. The scene re-renders every second, and CSS
  animations live on the element, so they survive it for free.
- **A CSS animation's `transform` overrides an SVG `transform` attribute
  entirely.** Put the attribute transform on a wrapper `<g>` and animate a
  child. (Hit twice; the desk plant's foliage once dropped 16px into its pot.)
- Every animation class must appear in the `prefers-reduced-motion` block.

---

## 7. The review loop

Automated checks cannot tell you a kettle looks like a goat. Do both passes:

1. **Contact sheet, at 2× or better.** Render every affected sprite into one
   labelled grid and look at them side by side. This is how five rugs were
   caught being untextured diamonds next to two properly woven ones, and how
   the campfire/horns/bread-bin trio were caught.
2. **Then in a real room.** Scale, occlusion and depth only show up in place —
   that is where a staircase was found ascending toward the viewer, a monitor
   painting over its own tower, and an archway hidden behind a bookshelf.

Then the mechanical checks: `npm run lint`, `npx vitest run`,
`npm run build`. `IsoItems.test.jsx` renders every catalog entry in both
orientations, so a throw is caught — but it says nothing about whether the
thing is recognisable.

---

## 8. Adding an item — checklist

- [ ] Catalog entry in `lib/isoRoom.js` with `foot`, `hitH`, and any of
      `stacks` / `surface` / `seat` / `wall` / `glow` / `tintable: false`
- [ ] Listed in exactly ONE `ISO_ITEM_GROUPS` section (a test enforces this —
      a key missing from the sections can never be placed)
- [ ] Sprite in `IsoItems.jsx`, drawn for a footprint at (0,0)
- [ ] Registered in `ISO_SPRITES`
- [ ] Passes the five silhouette rules at 30px
- [ ] Reviewed on a contact sheet, then in a room
- [ ] **Not** added to a preset room by default — see `docs/DESIGN.md`; presets
      are deliberately kept clean at ~15 pieces and are not a shop window

## 9. The profile view (2026-08-17)

Personas draw THREE facings — front, profile, back — plus mirrors; animals
draw profile (their walking pose), front and back. Rules the profile round
established:

- **A profile is its own drawing, never a squeezed front.** Torso narrows to
  ~0.6× and is an ASYMMETRIC S, not the symmetric `torsoGeom` slab (a slab
  read as a plank — owner, 2026-08-17): the chest carries forward above the
  waist, the belly tucks in below it, the seat sits back at the hem — each
  deviation under a px. The head unit leans 0.7px forward with the chest,
  or it reads as a slump. Both legs stand near the centre line (near a
  half-step ahead of far); knees bend FORWARD; shoes point where the body
  faces (long toe, stub heel); ONE arm shows, hanging at the centre line
  with the elbow bowed back (`Arm` with a tiny `sh` does this for free) and
  casting a soft shadow onto the torso behind it — without one the sleeve
  reads as a stripe painted down the body; the face is `SideFace` — the
  nose bump breaking the skull's front edge is the single mark that says
  "side view".
- **Profile hair is the wig method in profile space.** `sideWigPath` walks
  fringe tip → over the inflated crown → down the BACK of the skull → carved
  forward along the nape → up the cheek. Styles override `side` (and
  `sideLength` for masses hanging behind the shoulders — never reuse the
  symmetric front `length`, half of it would cross the face). High-rim cuts
  (two block, undercut) need a LEVEL bottom edge — the generic's cheek dip
  painted a blindfold across the eyes.
- **Bottoms are `PANTS_FORM` entries** (body.jsx): geometry flags
  (shorts/bare/slim/wide/straight) plus marks (crease, turn-up, cuffBand).
  Skirt kinds render bare legs; the flare is the ASSEMBLY's, drawn at hip
  level under the torso.
- **Coats are the same registry with the colours rewired**: shell in
  `coatColor`, opening shows the top's colour. A coat's `side` must run its
  opening sliver to the shell's own front edge, or it reads as a stripe.
- **Shoes are a slot** (`FrontShoe`/`SideShoe`, switched on `SHOES` kinds):
  the classic chunky oval IS the sneaker; each other kind is an outline
  change (boot shaft, heel spike + lifted arch) or one mark (loafer band,
  Mary Jane strap). Boots draw after the trouser, so legs tuck in for free.
- **Facing comes from the screen direction of a glide** (IsoRoom's roam
  tick): vertical-dominant → front/back, otherwise profile. In a 2:1 room
  every single-axis grid walk is horizontal-dominant, so profiles carry most
  of the wandering — which is exactly why they exist.

## 10. The wardrobe's light (2026-08-17)

Research-backed doctrine (cel-shading + fashion-flat practice, adapted to
user-picked colours). The torso was the only unshaded surface on the figure,
which is most of why clothes read flatter than the body wearing them.

- **ONE light: above, slightly in front, from screen RIGHT.** Every form
  shadow and highlight on the figure answers to it — hair sheen, torso
  crescent, both arms (lit on their screen-right edge, NOT their outer
  edges), both legs. A mark that disagrees reads as a part from another kit.
- **Three paints, one module** (`character/body.jsx`): `SHADE` (#221638,
  cool violet-dark) for FORM shadow — translucent black scales a colour
  toward grey, a cool dark keeps it alive with less value drop; `GLINT`
  (#fff3e0, warm off-white) for highlights — pure white reads as chalk;
  neutral `#000` stays for CREVICES (under a hem, inside a pocket mouth,
  armpits — occlusion is airless, not cool). All translucent, so any picker
  colour survives.
- **The assembly casts the light, the registry declares the fabric.** The
  form-shadow crescent, lit shoulder, chin shadow and hem-onto-bottoms band
  are drawn ONCE in `character/index.jsx`, over whatever is worn — a new
  garment models correctly with zero shading code. A registry entry declares
  `finish: {shade, glint}` (knit is matte, nylon sheens — material is an
  axis separate from colour), `cuffs: true` (ribbed wrist), and
  `drape: true` (cloth hangs past the hem → the hem band stands down:
  dress, cardigan).
- **Luminance-adaptive strengths** (`toneFor` in lib/tint.js): on near-black
  fills the shadow dies, so the highlight carries the form; on cream, the
  reverse. Multiply every form mark by the matching factor.
- **Occlusion at EVERY overlap** — under the chin, under the hood, under the
  top's hem onto the trousers, a coat's edge onto the shirt, the sleeve hem
  at the elbow. These 1–2px dark bands are the highest-value marks per pixel
  and read at any scale.
- **Folds: two per figure, at real gather points only** (a skirt's waist),
  drawn as tapering SHADOW WEDGES, never stroked lines, never symmetric.
  Everything else stays smooth — a taut plane at 57px has no folds.
- **Fixed anchors the tint never touches**: shoe soles, `STITCH` ochre
  topstitch (denim's one defining mark), `BRASS` dungaree buckles. A small
  fixed material is what makes a recolour look designed.
- **Guards**: `character/palette.test.jsx` lints every garment's paints
  against the allowed set (colour slots + anchors + overlays) — mutation
  verified; the art sheet renders tops and coats in three colourways
  (mid/dark/light), because single-colourway review is exactly how the
  first too-faint mark set shipped.

## 11. Soft volume (2026-08-19)

The "actual modelling" pass (decision record: docs/MODELING_ROADMAP.md).
`character/volume.jsx` defines two reusable gradients — a SPHERE (off-centre
radial: highlight biased up toward screen right, cool core shadow at the
lower-left rim) and a CYLINDER (horizontal linear: shaded left edge, lit band
just inside the right edge, easing off at the very edge — the ease is what
separates a cylinder from a box). They draw UNDER the hard cel marks: on the
resident's head and torso in every view, and on every pet mass (`vol` prop
on CatFace/DogHead, overlay ellipses on the body masses).

Rules, each load-bearing:

- **Translucent neutral stops only** (GLINT/SHADE with opacity, never a
  solid mid-tone) — the same recolour bargain as every crescent.
- **Subtle by rule.** The furniture is deliberately flat three-tone; a
  figure shaded much softer than its sofa reads as pasted from another kit.
  Gradient + crescent together model; either alone fails differently.
- **Per-instance ids** via useId — SVG ids are document-global and one room
  renders many bodies (the print-clipPath lesson).
- **Marks paint under the volume**, so stripes and patches curve with the
  body instead of sitting on it; crisp features (eyes, nose, whiskers) stay
  ON TOP.
- **Never SVG filters** (feGaussianBlur/feDropShadow): they force
  filter-region re-rasterization every animation frame — gradients are free
  GPU paint servers, filters are the CPU bill the memo'd scene avoids.
