# Clothing and hair fit review — November 13, 2026

The existing wardrobe suits TaskNook's cute, warm style. Preserve its simple
faces, broad colour areas and readable clothing outlines as the resident moves
toward 3D. The supplied [seated-character reference](inpso/b603fdd9497a472249116e7dc02960438ef96cee.jpg)
is useful for connected sleeves, soft garment volume and quiet shading. It is
an art reference, not a requirement to reproduce another game's assets.

This pass reviews the **production SVG wardrobe**. The [resident mesh pilot](../prototypes/furniture/src/characters/README.md)
still contains only short hair, a sweater, trousers and sneakers. Reviewing an
SVG item does not mean its 3D replacement has been authored or integrated.

## Coverage

Every option below was rendered as a complete resident at two body extremes:
compact female (width 6.2, shoulders -1.6, legs 26, torso 14) and broad male
(width 8.4, shoulders 1, legs 32, torso 20). Each has front/profile/rear standing,
relaxed sitting and ankles-crossed sitting views, at a 19px seat height.
Other slots use the same baseline outfit so the tested item's fit is visible.

| Slot | Reviewed keys | Fit frames |
| --- | --- | --- |
| Tops | sweater, tee, tank, swim, shirt, flannel, blouse, tie, overalls, dress, turtleneck, fleece, vest | 130 |
| Coats | hoodie, jacket, cardigan, blazer, puffer, parka, peacoat, varsity, raincoat, robe; plus none | 110 |
| Bottoms | trousers, dress, jeans, joggers, cargo, wide, shorts, jorts, skirt, pleats, maxi | 110 |
| Shoes | sneakers, loafers, boots, heels, maryjanes, sandals | 60 |
| Hair | short, buzz, messy, bob, long, ponytail, bun, curly, braids, undercut, afro, pigtails, twoblock, wolf, curtains, mullet, spacebuns, locs, highpony | 190 |

All nineteen hairstyles also have front/profile/rear samples with both a
replacing beanie and overlay headphones: another **114 frames**. The existing
dark/cream/mid clothing fixtures add 75 colourway samples, including both swim
cuts. The nineteen baseline hairstyles add 57 front/profile/rear comparisons.
The review inspected the eight generated sheets as well as the numeric checks.

Retained current images:

- [Tops and coat colourways](model-review/characters-and-pets/wardrobe-colourways.png).
- [All hairstyles](model-review/characters-and-pets/wardrobe-hair.png).
- [Bottoms at both body extremes](model-review/characters-and-pets/wardrobe-bottoms-fit.png).
- [Shoes at both body extremes](model-review/characters-and-pets/wardrobe-shoes-fit.png).

## Findings and changes

**Curly and afro hair obscured the face.** Their front/profile drawings filled
the crown with full circles after the skin, covering cheeks and jaw. Eyes drawn
last did not repair that silhouette. Each now has one continuous closed outline
with a carved face opening. The broader afro crown and smaller curly outline
remain distinct, with a few coil marks rather than strand texture.

**Coily hair projected a flat shelf beneath hats.** Those two cuts now compress
inside the skull clip beneath a replacing crown. Loose lengths, braids and other
styles retain their existing fall; overlay headphones keep the full crown.
These fixes apply to the current game, profile previews and choice icons.

**The clothing cuts are useful to retain.** In these samples, long/short/bare
sleeves reach their intended arm sections, waist joins stay covered, skirts
retain a continuous seated lap, boots overlap trousers, and sandals expose skin.
No clothing keys, saved looks, body metrics or recolour channels were changed.
The distinct dress-shirt/jeans/cargo/jogger details become subtle at room scale;
retain one clear cuff, pocket or cut difference when authoring their meshes.
Heels should keep a broad enough heel/toe silhouette to read at that scale.

This is sampled fit coverage, not every possible outfit combination or every
independent slider permutation. It does not approve long coats over every skirt,
all hats/accessories together, every seat height, carrying, sleeping or motion.
The existing production cross-legged choice remains for saved appearances;
the rejected 3D cross-legged clip remains excluded.

## Applying this to 3D wardrobe work

Keep one shared skeleton and the existing appearance keys. Author tops, bottoms,
shoes and hair as replaceable meshes with consistent neck/waist/ankle interfaces.
Reuse topology for related cuts while giving each cut its own meaningful outline.
Keep concealed body surfaces from showing through garments; do not stack a full
body, shirt and coat without fitting their overlaps. Use material roles for
existing recolours rather than separate models for every colour.

First prove short/bare sleeves and boots, then layered outerwear, then skirts and
long hair. Skirts need their own seated deformation/drape; long hair must clear
shoulders and chair backs. Coily crowns need deliberate face openings and hat
compression. Validate these against compact/broad body shapes and supported
poses before connecting the live wardrobe. Full body-slider parity, room
composition and widget performance remain gates in the [roadmap](MODELING_ROADMAP.md).

## Repeatable review

From `prototypes/furniture/`, run `npm.cmd run qa:wardrobe` after installing both
frontend and workshop dependencies. It regenerates the real Resident fixtures,
checks **714 frames** for clipping, probes eyes/cheeks/mouth against actual filled
hair geometry in four front/profile cases, and creates eight sheets plus a
source-fingerprinted `summary.json` under ignored
`build/skill-verification/wardrobe-fit/`. It uses installed Edge by default;
`FURNITURE_BROWSER_CHANNEL` selects another Playwright browser channel.
Inspect the images: passing bounds and face probes cannot judge style.

The fixture owner is [artsheet.fixtures.test.jsx](../frontend/src/components/artsheet.fixtures.test.jsx),
the focused browser review is [review-wardrobe.mjs](../prototypes/furniture/scripts/review-wardrobe.mjs),
and live hair artwork remains [hair.jsx](../frontend/src/components/character/hair.jsx).
Generated SVGs, full diagnostic sheets, temporary databases and UI captures stay
ignored. Only selected current review images are retained here.

Verification: 405 relevant frontend tests, lint/build, all 823 workshop tests,
the built SPA's wardrobe controls and reload persistence, desktop source/bundle/
hash verification, and the isolated frozen self-test pass. The matching main
channel desktop build is `342dcf7590874b12a889a7939e3751f1`.

## Crossed seated boots — November 14

The supplied fall-style screenshot exposed two problems in the live SVG rig:
upright boot shafts missed diagonal calves, and the tightly overlapping soles
made the feet merge. `SeatedLeg` now passes a calf-relative shaft angle to
`FrontShoe`; only the boot upper/cuff rotates around its ankle. The foot retains
its existing turn and vertical anchor. Crossed poses separate the ankle endpoints
slightly so both soles read clearly. Relaxed and standing footwear retain their
alignment, and the outfit, face, hair and upper-body proportions are preserved.

The [boot contact sheet](model-review/characters-and-pets/seated-boot-contact.png)
covers compact and broad residents at 13/17/21/26px seats with relaxed, ankles
crossed and folded-leg poses. The repeated fit matrix also includes skirts,
shorts, trousers and both front/rear views: **144 pairs of calves and boots**.
Browser geometry checks require the real boot fills to cover points 4px and 7px
above each ankle, and bound sole overlap so one foot cannot hide the other.
The existing 714 wardrobe bounds and four face-opening probes also pass. The
bottoms, shoes and resident-preset reference sheets are refreshed.

`e2e/character-seating.spec.mjs` applies the actual fall-style look, uses all three
pose controls, checks persistence and inspects the live avatar on wooden and desk
chairs at all four facings. The generator/QA owners remain the files linked
above. Current character contact fixtures and pilot SVG comparisons are
regenerated; the separate pilot mesh and its clip set are unchanged.

Verification covers 1,647 frontend tests (one optional generator skipped),
lint/build, all 823 workshop tests, the wardrobe/contact checks and the editor/
room browser journey. The sandbox temporary path interrupted the first build
reproducibility check; its native recheck passes. The first browser selector
expected the first pose button's accessible name to match its visible label;
the check now selects the visible label within the named pose group. Structural
self-review follows the project boundaries because the shared toolkit is
unavailable. Evidence remains ignored under `build/skill-verification/crossed-legs/`;
temporary source sheets, capture helpers, databases and raw browser output are
removed after retaining the current review images.

Main-channel desktop build `31e7a7603fb74ee680223bae16dfb766` matches the current
source, embedded bundle and update manifest and passes the isolated frozen
self-test with exit 0. Its executable SHA-256 is
`1f3a751b2f791f8bccc35dacd645791aeff416987c49e632930aadc6544297b7`.

## Pickup pose and motion simulation — November 14

The [motion/contact review](CHARACTER_MOTION_FIT.md) records the connected pickup
pose, low-shoe ankle corrections and a repeatable 4,392-configuration simulation.
The current [pickup sheet](model-review/characters-and-pets/pickup-pose.png) and
[room capture](model-review/characters-and-pets/pickup-in-room.png) show the live
SVG artwork. Bottom/shoe fit sheets and current source comparison assets are
refreshed after the ankle changes.
