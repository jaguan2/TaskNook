<!-- Produced 2026-08-09: three parallel design threads (body silhouette / wardrobe system / integration+UX) each proposed, then critiqued each other's proposals and revised, then one synthesis resolved the conflicts. Companion to fable_scan_8-7.md. -->

All disputed facts verified against the code on disk (app.py:806–897, IsoItems.jsx 2891–3383, isoRoom.js resident placements, MODELS.md:91). Here is the synthesized plan.

---

# Character models: body types & outfits — the plan

## 1. Diagnosis — why the models read chunky

Three real causes, verified in `IsoItems.jsx` (~3199–3512):

1. **The hem line is too low.** The torso bottom sits at y −18 on a ~56px figure, so visible legs are only 32% of total height. Cozy references (Unpacking, Cozy Grove adults) sit nearer 40–45%. A figure that is two-thirds torso-and-head reads squat no matter how it's shaded.
2. **The torso is wider than it is tall.** Masc/average shoulders are 23.2px across a 22px-tall torso (fem's hem is 23.2px against the same 22). A near-square block is a chunky block regardless of how the sides taper.
3. **The build axis is cosmetically dead.** `BUILD_HALF_W = {slim: 8, average: 9, sturdy: 10}` is a ±1px half-width spread — *below* the ±1.5px delta MODELS.md documents as invisible ("the same body twice on the contact sheet") — and build touches nothing else: arms are fixed 5×12 rects, standing legs fixed 5.6-wide rects, seated thighs fixed 7.5px strokes, and the lying pose is a fixed 34px slab that ignores build and model entirely. Every resident is effectively the same near-square body, so "chunky" is the only body on offer.

And on outfits: `character.outfit` is one hex painted on one hard-coded garment (crew-neck sweater + fixed `TROUSER #4a3a5b` trousers). All wardrobe "variety" in the app is colour variety — the picker even reuses `HAIR_COLORS` as the outfit swatch row.

**Not the problem** (don't re-litigate): head ratio (26% — the toddler-head bug is already fixed), shoulder:head ratios (1.59 masc / 1.32 fem, both healthy), 5px arm thickness, thigh-thicker-than-shin seated strokes.

### Fact adjudications (where threads disagreed)

- **Character value cap is 32 chars**, not 280 (`app.py:897`: `_clean_json_map(..., PROFILE_MAX_KEYS, 32)`; 280 is the *profile* blob's cap at :807). Systems was right; wardrobe's original citation was wrong.
- **The Loft places no resident.** Verified: 12 `resident` placements across 7 presets (isoRoom.js 1026–1401); Loft has none. Wardrobe/systems were right; silhouette self-corrected.
- **Two preset residents are untinted** (Cozy study line 1026, Corner café line 1192) — they render `DEFAULT_CHARACTER` raw and are the purest before/after specimens. Study hall has 5 residents, three sharing `#6fb8cf`.
- **`TROUSER_FAR` is exactly `TROUSER × 0.82`** (#4a3a5b × 0.82 → #3c2f4a; same for `SHOE_FAR`). The far leg was hand-derived as #000@0.18 all along, so switching to a runtime overlay is pixel-neutral at the default. Verified.
- **MODELS.md §2 explicitly sanctions `TROUSER_FAR`** ("Depth colours, not overlays, separate near from far" — line 91). Wardrobe was right that today's constants are doctrine, not a violation; the doc sentence must be rewritten in the same commit that changes the practice.
- **Silhouette's "round" build as tabled is invisible against sturdy.** Wardrobe's math is correct and I re-verified it: with `{halfW 9.4, waist +3.4}`, masc round vs masc sturdy differs by ≤1px full-width everywhere (rendered waist 23.3 vs 22.3), below the documented threshold — and the "convex belly" protrudes only ~0.05px past the shoulder. The corrected table below fixes it (waist +5.5 → belly curve max ≈12.86 per side, ~1.7px full-width past the shoulder; rendered waist 25.4 vs sturdy's 22.3).

## 2. Recommended target design

### The axes

| Axis | Field | Values | Status |
|---|---|---|---|
| Model | `model` | masc / fem | unchanged |
| Build | `build` | slim / average / sturdy / **round** (new) | geometry rebuilt behind stable keys |
| Garment | `garment` (new) | sweater / tee / dress / hoodie / cardigan | new axis; sweater = today's look |
| Top colour | `outfit` | any hex; new `OUTFIT_COLORS` suggestions | field never renamed |
| Bottom colour | `bottomColor` (new) | curated `BOTTOM_COLORS` swatches; default `#4a3a5b` | later phase; owner can veto the row |

New fields need no migration and no backend change: character values are keys/hexes well under the 32-char cap (9 of 24 keys used after everything ships). `validateCharacter` gains `garment: pickKey(...)` and `bottomColor: pickHex(...)`; unknown values fall back tolerantly.

### The shared substrate: `lib/body.js` (new module, lands first)

One pure module, importable by node-env tests (no jsdom, no PNG imports), consumed by the torso, arms, `SeatedLeg`, every garment function, the dress drape, and every guard:

```js
export const HEAD_R = 7.3;
export const LEG_H = 22;             // → 25 in Phase 1
export const TORSO_H = 22;           // → 20 in Phase 1
export const TORSO_OVERLAP = 4;
export const HEAD_LIFT = 8.5;        // headY = torsoY − HEAD_LIFT, BOTH poses
export const WAIST_DROP = 13;        // → 12 in Phase 1; waistY = top + WAIST_DROP, never a function of a garment's drop
export const MIN_SHOULDER = 8.6;
export const MODEL_SHAPE = { masc: {shoulder:+2.6, waist:−0.4, hem:+0.4},
                             fem:  {shoulder:+0.6, waist:−3.0, hem:+2.6} };  // moved, unchanged
export const BUILD_SHAPE = {         // Phase-0 values reproduce today exactly
  slim:    { halfW: 8,  waist: 0, limb: 0 },
  average: { halfW: 9,  waist: 0, limb: 0 },
  sturdy:  { halfW: 10, waist: 0, limb: 0 },
};
export function figureMetrics(ch) → { sh, wa, hem, armW, legW, thighW, shinW, kneeX }
export function torsoGeom({ sh, wa, hem, top, bot = top + TORSO_H, waistY = top + WAIST_DROP })
```

Derivations: `sh = max(MIN_SHOULDER, halfW + shape.shoulder)`; `wa = halfW + shape.waist + b.waist`; `hem = halfW + shape.hem`; `armW = 5 + b.limb`; `legW = 5.6 + b.limb`; `thighW/shinW = 7.5/6.5 + b.limb`; `kneeX = max(8.5, hem − 0.5)`. `torsoGeom` is the IIFE at IsoItems 3353–3401 verbatim, including the Bezier-midpoint band math (`edgeX = 0.25sh + 0.5wa + 0.25hem`), symbolic in its inputs so a longer/wider garment gets a correctly-seated shade band for free. `STAND_TORSO_Y = −(LEG_H − TORSO_OVERLAP + TORSO_H)` — derived, not literal.

**`armW`, `legW`, `kneeX` are exported contract values.** Garments take sleeve widths from `armW`, the dress lap drape flares to `±(kneeX + 2.2)`, and every garment vertical is an offset from `top`/`bot`/`WAIST_DROP` — never a re-hardcoded literal. This is what makes builds and garments compose instead of collide.

### The base re-proportion (the actual fix for "chunky")

Constants only: `LEG_H 25, TORSO_H 20, WAIST_DROP 12` → `STAND_TORSO_Y = −41`, standing head −49.5; seated `torsoY = −19`, `headY = −27.5` (this unifies the accidental 8.0 seated head-lift with the standing 8.5 — verified real at IsoItems 3310–3311). Average `halfW 9 → 8.4` (masc/average shoulders 23.2 → 22.0). **Only average moves** — slim/sturdy get their retune in the build-axis phase so those users' bodies change once, not twice.

Effect: hem −18 → −21, visible legs 32% → 37%, torso 22.0w × 20h. Total height 56.8px, so nothing seat/camera/wall-tuned moves. Knock-ons, all verified by the threads: walking lifted-leg top stays covered (leg-step is −2.2px); seated ankle math never references LEG_H; arms keep `y = top+5, h 12` so the tuned `gesture-rub` angles land unchanged; thought-bubble spots become derived (`STAND_HEAD_Y − HEAD_R − 8.7 ≈ −65.5`); `resident` hitH 56 → 57 (isoRoom.js:299).

### The build table (Phase: build axis)

```js
const BUILD_SHAPE = {
  slim:    { halfW: 7.2, waist: -1.2, limb: -0.8 },
  average: { halfW: 8.4, waist:  0.0, limb:  0.0 },
  sturdy:  { halfW: 9.8, waist: +1.6, limb: +0.8 },
  round:   { halfW: 9.4, waist: +5.5, limb: +0.6 },   // corrected per wardrobe's critique
};
```

Slim↔sturdy shoulder spread is 5.2px full-width — past the invisibility threshold — compounded by waist and limb deltas. Round's +5.5 waist puts the one-quadratic torso side visibly convex (belly ~1.7px full-width past the shoulder on masc; unwaisted A-line on fem; rendered waist 25.4 vs sturdy's 22.3). `MIN_SHOULDER` fires only on fem+slim (raw 7.8), as designed. Keys are **never renamed** — new geometry behind stable keys; `BUILDS` gains `{key:"round", label:"Round"}`.

Per-pose: standing leg *centres* stay ±4 (stance is gait, not girth) with `x = ±4 − legW/2, width = legW`; seated strokes take `thighW/shinW` and `SeatedLeg` gains a `kneeX` prop (default 8.5, because fem sturdy/round hems reach 12.0–12.4 and a knee at 8.5 would tuck the thigh under the torso); lying varies thickness only — `lyH = clamp(11 + (halfW − 8.4) + waist×0.6, 9, 14)`; arms generalise to `x = ±(sh + 0.9) − armW/2`, hands `r = 2.5 + limb×0.3`; the mug anchor translates from `sh` and flows through.

**Hair rule — derive from `sh`, tested on the hair:** `long halfW = max(14.4, sh + 2.4)`, `bob halfW = max(13.2, sh + 1.8)` (formulated as max(today, derived) so every current combo is pixel-identical). Ponytail/braids/bun/curly/messy hug the skull and are body-independent. No static `sh ≤ 12.6` ceiling — it asserts on the wrong side and bans future axes. Honest cost: the long/bob crossbars are literal `l28.8 0`/`l26.4 0` path segments, so this is a small path-to-function rewrite, not just a clamp.

### The garment vocabulary

`GARMENTS` (keys+labels) in profile.js; `GARMENT_SPECS` in IsoItems.jsx; the Resident branches on **fields, not keys**:

```
sweater:  { sleeve: "long",  collar: "round" }                                   // today, byte-identical
tee:      { sleeve: "short", collar: "round" }                                   // skin lower arms — proves the sleeve mechanism
dress:    { sleeve: "short", collar: "round", drop: TORSO_H + 13, flare: 3.5, lap: true }
cardigan: { sleeve: "long",  collar: "round", placket: true }                    // cream #f2e9dd vertical placket
hoodie:   { sleeve: "long",  collar: "hood",  pocket: true }                     // hood mass breaks the shoulder line ~5px
```

Construction (all torso-relative; verified anchors: arms `armW×12 rx2.5` at `x = ±(sh+0.9)−armW/2, y = top+5`; hands r2.5 at `(±(sh+0.9), top+17.5)`; mug at `translate(sh+0.9, top+19.4)` inside the near-arm group; collar ellipse `cy top+1.5, rx sh−3.4`):

- **Tee:** per arm, full-length skin rect (`armW×12`) + sleeve rect (`armW×6.5`) in outfit on top, then the existing depth overlay (far `#000 .16` / near `#fff .10`) so both halves read as one limb. Hand circle untouched — mug/typing/gestures unaffected. Lying: split the arm rect at x −5.
- **Dress:** `torsoGeom({sh, wa, hem: hem+3.5, top, bot: top + TORSO_H + 13})` — the quadratic keeps flaring past the waist, so the A-line is free (masc reads as a straight tunic). Legs unchanged ("dress over leggings"). Seated: lap drape — rounded trapezoid `±hem` at y −2 → `±(kneeX+2.2)` at y +7 in outfit, `#000 .14` band on the lower half; low seats clamp the bottom to `min(7, ankle−3)`. **Band edge needs its own rule:** the naive formula shades 52% of the garment vs the sweater's 41% and lands at hip level — tune the edge (scale with drop) until the shaded fraction matches ~41%, verified on the sheet.
- **Cardigan:** body → cream placket (V-open to ±1.2 by the waist) → white catch → band, so the band dims the placket with the garment.
- **Hoodie:** hood lozenge `M −(sh−2.4) top+2 Q −(sh−1) top−4.5 0 top−5 Q sh−1 top−4.5 sh−2.4 top+2 Z` + `#000 .13` lower crescent; rim ellipse `rx sh−2.6 ry 2.9` replacing the collar; pocket rect ±5 at `bot−7…bot−1.5`, `#000 .10`. Arms sit at |x| ≥ sh−1.6, outside the hood; head gestures move the head inside a static hood — free.

**Cut:** collared shirt (sub-3px collar points are texture, MODELS.md rule 4). **Deferred:** overalls (only viable after bottomColor, colour-blocked bib+straps; straps remain borderline).

Zero new animation classes anywhere — motion.test.js and the reduced-motion block untouched.

### Colour model

Outfit stays **one hero hex** through the first garment phase; garments add only fixed warm neutrals (cream `#f2e9dd`, the trouser constants) and translucent #000/#fff. Placement `tint` keeps overriding the hero material only, same as furniture — every shipped preset's tinted residents recolour every garment with zero edits.

`bottomColor` ships in the late garment phase: default `#4a3a5b` (the TROUSER constant verbatim), swatch-only via curated `BOTTOM_COLORS` (`classic #4a3a5b, denim #4a5b7b, khaki #8a7a5b, brown #5b4536, slate #565663, black #33303d`) so far-leg contrast is audited per swatch. Far leg/thigh = same path in `bottomColor` + `#000 @ 0.18` (pixel-neutral at the default — unit-tested). Shoes stay fixed constants. Not tint-overridable.

`OUTFIT_COLORS` replaces the borrowed HAIR_COLORS row: the six field-proven preset tints (`#7faf8f` sage — the default, must light the active dot — `#6fb8cf, #e0774a, #8a5346, #e0a374, #c9a24b`) + wine `#8a4a5b` + navy `#4a5b7b`. Old stored hexes keep working (pickHex accepts any).

### Panel UX (ProfilePanel.jsx)

- **Garment picker: a grid of real sprites** — each button renders `ISO_SPRITES.resident` with `{...character, garment: key}` (the user's own skin/hair/colours; truthful preview), standing, **sized via getBBox** (the fixed viewBox `-17 -62 34 66` has 0.5px headroom today and clips the bun the moment the head rises — verified). Label beneath, `aria-pressed`.
- **Preview card: standing AND seated (seatH 19) side by side** — seated is where every garment risk lives and the pose users actually occupy.
- Build stays a pill row (upgrade to sprite grid later if the deltas earn it). The hint "Only this one looks like you — the other residents stay themselves" stays exactly as written.

## 3. Implementation plan (each phase = one commit = one exe rebuild; batch adjacent phases that finish together)

**Phase 0 — substrate (no visual change).**
Files: `lib/body.js` (new), `IsoItems.jsx`, `docs/MODELS.md`.
Extract constants/figureMetrics/torsoGeom at today-reproducing values; convert far leg/thigh to derived (`bottomColor`-ready) colouring; rewrite MODELS.md §2's "Depth colours, not overlays" sentence in the same commit ("fixed materials may use fixed FAR hues; user-colourable materials derive the far limb with a translucent-black overlay — the far arm is the precedent").
Verify: DEFAULT_CHARACTER torso and band path `d` strings **byte-identical** before/after; `TROUSER × 0.82 → TROUSER_FAR` equivalence unit test; node-env figureMetrics tests at today's values; before/after contact-sheet pair.

**Phase 1 — the re-proportion (everyone changes, deliberately; owner sign-off gate).**
Files: `lib/body.js` (constants), `IsoItems.jsx` (derived offsets, bubble spots), `lib/isoRoom.js` (hitH 57), `docs/MODELS.md` §2 numbers.
`LEG_H 25, TORSO_H 20, WAIST_DROP 12`, seated/standing head-lift unified at 8.5, average halfW → 8.4.
Verify: geometry pins (figureMetrics snapshot + d-strings) re-baselined **once, in this commit, visibly in the diff**; sign-off artifact = before/after pairs of the two **untinted** residents (Cozy study, Corner café) + the Study hall five. Real rooms: Cozy study, Study hall, Corner café, Secret garden — **not Loft** (no resident).
Ship 0+1 as one push if they finish together.

**Phase 2 — the build axis + round.**
Files: `lib/body.js` (BUILD_SHAPE), `IsoItems.jsx` (per-build limbs, SeatedLeg kneeX prop, lying thickness, hair derive-from-sh), `lib/profile.js` (+round).
Nothing visible until a build is picked (average = the Phase-1 silhouette; DEFAULT_CHARACTER untouched).
Verify (node, each guard checked by mutation): `sh ≥ MIN_SHOULDER` and `sh > HEAD_R + 1` per combo; slim↔sturdy spread ≥ 2px half-width (the anti-invisible-axis guard); **round↔sturdy rendered-waist delta ≥ 3px full-width** (the guard wardrobe's critique implies); `hem ≥ 4 + legW/2` per combo (parameterised — a constant stops guarding when legW varies); hair `halfW ≥ sh + 1.8` asserted on the hair paths. jsdom: model×build×{standing, seated 19, lying} throw-grid. Sheet: builds × models × poses, hair-clearance rows (fem long × builds, masc bob × builds).

**Phase 3 — garments, first tranche.**
Files: `lib/profile.js` (GARMENTS, garment field, OUTFIT_COLORS), `IsoItems.jsx` (GARMENT_SPECS, tee + dress branches), `ProfilePanel.jsx` (sprite grid, dual preview, OUTFIT_COLORS row), `docs/MODELS.md` (Outfits section: neck-box rule, hero/neutral colour rule, never-rename-`outfit`, retired-key contract), CLAUDE.md Profile bullet (one sentence).
Shipped rooms: pixel-identical (default sweater).
Verify: GARMENTS keys === GARMENT_SPECS keys; garment × model × build × pose throw-grid (≤180 renders); distinct-markup Map per garment (the existing hair trick); **arm-box invariance across garments for a fixed character** (relative to the same character's sweater, never literal 5×12); neck-box test evaluating **quadratic-Bezier extrema**, not control points (the hood's Q controls sit outside the box but the curve doesn't — three lines of math); dress band-fraction ≈ sweater's on the sheet; dress drape on seatH 12–13; hair×hoodie sheet slice (ponytail tail and braid roots pass through the neck box, so those cells can't be closed by the test).

**Phase 4 — garments, second tranche + bottoms.**
Files: `IsoItems.jsx` (hoodie + cardigan + lying tee sleeve), `lib/profile.js` (bottomColor, BOTTOM_COLORS), `ProfilePanel.jsx` (Trousers row — one `<Field>` the owner can veto with the schema lying dormant).
Verify: every BOTTOM_COLORS swatch's far-leg contrast on the sheet; hood vs braids at the widest shoulder.

**Phase 5 — deferred, feedback-driven:** height axis (`{petite: −2, tall: +2}` on LEG_H only — Phase 1's derived constants make it one field), overalls, per-placement garment/build variety for presets. Not designed now.

Every push ends with `build-exe.bat` + the `TASKNOOK_SELFTEST=1` gate.

### Conflict decisions (one line each)

| Conflict | Decision | Why |
|---|---|---|
| Ship order | refactor → retune → builds → garments | The retune is a one-day constants diff and the owner's actual complaint; builds are a cheap table on already-parameterized code; garments (the long pole) then get photographed once against final metrics. |
| Base body changes for everyone? | Yes, gated on the sign-off sheet | "Chunky" is a complaint about the default body; "design rules are revisable" covers the doc contract, and the veto point is cheap. |
| bottomColor | Ship it, curated swatches, Phase 4 | Trousers are ~21px of visible figure after the retune and the swatch-only panel defuses the contrast risk — but after the garment axis proves out, and the doc rewrite lands with the practice change (Phase 0). |
| Field name | `garment` (not `outfitStyle`) | `outfit`/`outfitStyle` invited which-is-which confusion; `outfit` is never renamed. |
| Per-build limbs | Keep; everything consumes exported `armW/legW/kneeX` | Hard-coded 5px sleeves and literal-pinned tests were the only obstacles, and both parameterise cleanly. |
| Shared geometry home | `lib/body.js`, Phase 0, including `torsoGeom` with `waistY` as a defaulted param | Three copies of the same numbers is how ISO_ENVS drifted. |
| waistY under long drops | `waistY = top + WAIST_DROP`, never a function of garment drop | The natural waist doesn't move when a hem lengthens; the dress band gets its own edge rule instead. |
| Hair clearance | Derive-from-sh inside HairLength, tested on the hair; no static sh cap | The static ≤12.6 tripwire asserts on the wrong side and bans the very axes being added. |
| Seated knee | `kneeX = max(8.5, hem − 0.5)` in figureMetrics; drape flares to `kneeX + 2.2` | Fem-sturdy/round hems reach 12.0–12.4; a fixed drape leaves knees poking out of the dress. |
| Round's numbers | waist +5.5 (not +3.4) | As originally tabled, round is within ~1px of sturdy — below the project's own documented invisibility threshold. |
| Preview mechanics | getBBox everywhere, no fixed viewBox | The proposed fixed box clips the bun the day the head rises 1px; the "optimization" saves nothing in a lazy panel. |
| Default pins | Colours pinned permanently; geometry pinned by figureMetrics + d-string snapshots re-baselined only in the retune commit | Makes the retune's blast radius a reviewable diff instead of nowhere. |
| Garment picker | Real-sprite grid | A garment's look depends on your own skin/hair/hex; a text pill answers none of that, and the Room panel already sets the sprites-in-pickers precedent. |
| Review rooms | Cozy study + Study hall + Corner café + Secret garden | Loft has no resident; the two untinted placements and the 5-resident stress case are the specimens that matter. |

## 4. Risks and containment

- **The retune changes 12 shipped preset residents.** Contained: it's the point of the request; the sign-off sheet (untinted pairs + Study hall) is the veto; geometry pins make the change a reviewable diff; total height stays ~56–57px so nothing camera/seat/wall-tuned moves.
- **The dress is the riskiest garment** (band fraction, lap drape, low seats, walking hem). Contained: its own sheet cells (seatH 12–13, band-fraction target ~41%, drape × builds), and it can slip to Phase 4 without blocking anything — the tee alone proves the sleeve mechanism.
- **Round may still not earn its slot** even at waist +5.5 — the sheet is the judge; it's one table row and one pill entry to cut.
- **Hair × hood cells can't be fully machine-checked** (ponytail tail and braid roots legitimately cross the neck box). Contained: the neck-box test closes the garment side; the 9-hair × hoodie sheet slice closes the rest by eye; "tucked-in hair" is the accepted read.
- **Guards that pass while art is wrong.** Every guard is verified by mutation (project memory rule): set BUILD_SHAPE back to ±1 and the spread test must fail; bump legW and the hem test must fail; break the ×0.82 equivalence and the far-leg test must fail.
- **Old exe strips unknown character keys on its next save** (store revalidates on boot). Accepted: rare under single-exe distribution, and the fallback is the classic sweater, not data loss.
- **Each shipped phase costs ~42 MB of git history.** Contained: phase batching (0+1 together; 3+4 if they finish close), per the owner's stated rebuild rule.

## 5. DON'T-do list (rejected, with reasons — so they don't come back)

- **Don't rename stored keys** (`outfit`, build keys): the tolerant fallback silently resets/body-swaps every existing user. If a rename is ever unavoidable, use a `LEGACY = {old: new}` alias in `validateCharacter`. Never reuse a retired key.
- **No collared shirt**: collar points are sub-3px texture (rule 4 territory).
- **No overalls yet**: first chromatic fixed material or a bottomColor-blocked bib — either way the 1.5px straps are still texture; revisit only after bottomColor proves out.
- **No patterns, lapels, belts, buttons, drawstrings**: hard cut at 40px.
- **No static `sh ≤ 12.6` hair tripwire**: bans future body axes; the derive-from-sh rule replaces it.
- **No fixed picker viewBox**: stale-constant trap; getBBox is the codebase's own pattern.
- **No fixed FAR hues on user-colourable materials**: derived overlay only (and the doc sentence changes with the practice).
- **No `hem ≥ 7.0`-style literal guards**: they stop guarding the moment the value they encode varies; parameterise (`hem ≥ 4 + legW/2`).
- **No slim/sturdy "down-payment" in Phase 1**: two visible mutations of one stored choice across two ships is worse than one.
- **No garment tuning before the retune lands**: every constant would be tuned twice and every sheet photographed twice.
- **Don't touch model deltas, head ratio, or arm thickness** — measured healthy; the toddler-head fix must not be re-litigated.
- **Don't put per-placement garments/builds into presets by default** — repaints shipped rooms and needs a `_clean_layout` contract change; owner decision only (see below).

## 6. Open questions for the owner

1. **Sign-off on the retune sheet** (Phase 1 gate): the before/after of the two untinted residents and the Study hall five — this is the one moment every shipped room changes.
2. **Is "round" wanted as a fourth build?** It's the cheapest genuinely-different silhouette the construction supports (with the corrected +5.5 waist), but each build multiplies the contact sheet and the picker row.
3. **Height axis (petite/tall, ±2 on LEG_H)** — cheap after Phase 1; is build + the retune enough body variety, or ship it?
4. **Should preset residents ever get variety** (per-placement `garment`/`build` the way `tint` already works, or hash-the-placement-id)? It would fix the Study hall's near-clones (three of five share one tint today) but repaints shipped preset photos and needs a backend whitelist change — exactly what "presets are deliberately left alone" guards.
5. **Dress sleeves: short or long?** Short is more distinct from the sweater and exercises both mechanisms in one garment; long is arguably cozier for the app's autumn register. Pure taste.
6. **bottomColor veto**: if you prefer one-hero-colour purity, the Trousers row is one `<Field>` to omit — the derived far-leg machinery ships regardless and costs nothing.