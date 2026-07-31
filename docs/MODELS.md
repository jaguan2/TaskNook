# TaskNook model spec

How isometric furniture is drawn here. `docs/DESIGN.md` is the authority on
the app's *visual* decisions (composition, motion, colour, chrome); this file
is the authority on the *models* — the 131 sprites in
`frontend/src/components/IsoItems.jsx`.

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
  only works for the colour you happened to pick.
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
