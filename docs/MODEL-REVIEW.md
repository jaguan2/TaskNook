# Catalog and resident modeling review

The main gap from the Virtual Cottage 2 references is the design of each
object: physical construction, distinct silhouettes, layered materials and
characters convincingly settled into furniture. Better colours and more
particles help the atmosphere but cannot replace that work.

## Scope and findings

The subsequent common-room pass adds fitted necklines and smaller shaped
palms to the shared resident while retaining the restored seating. The eight
requested outfit presets are already available in Profile → Looks; their
closeup sheets are refreshed. Loft, Corner café and Reading room use the
refined plant/lamp models more deliberately. The first fixed split-level
Common Cottage is implemented with six seats and three simulated neighbours;
see [the scene and remaining work](COMMON_ROOMS.md). It is a first art pass,
not a claim that the catalog or character modeling is complete.

Reviewed all **161 catalog items across 18 groups**, including advertised
rear views and items not used by any preset. The art generator now renders
that inventory alongside the wardrobe, with actual scene paint definitions
and theme variables so glass, screens and rugs do not turn black in isolation.

| Family | Gap found | Work implemented | Still needed |
|---|---|---|---|
| Resident | The skewed chair prototype looked disconnected and unconvincing in the owner's review. | Reverted the experimental head/torso/leg/arm assembly and chair-specific plumbing; restored the established front/rear seated rig. Earlier shaped head/neck/bun improvements remain. | Author a coherent resting pose and its garment silhouette on actual furniture before introducing joints, gestures and body variation. |
| Storage | Flat monolithic wardrobes, featureless drawers and uniform contents. | Wardrobe door frames/insets, hinges, handles and feet; raised dresser; inset shared drawers with brass pulls; open-shelf pottery/basket; record-crate handle and sleeve labels. | Open crate slats, real ladder-shelf boards, cabinet rear construction and deeper contents. |
| Plants | Generic paddle leaves, bare palm poles, star-shaped succulents and mushroom-like bonsai crowns. | Individual plant leaves; feathered fern/palm fronds; variegated snake-plant swords; branching bonsai with lobed leaf pads; layered succulent; orchid petals and basal leaves; cactus ribs/needles. | Ceramic planter alternatives, fuller asymmetric crowns, terrarium contents and matching miniature plants on the display shelf. |
| Trees and bushes | Stacked ovals repeat the same canopy construction. | Shared irregular leaf-cluster primitive on tree, bush and birch, with broad light/shadow masses; visible tree branches. | Seasonal maple/blossom, pine, coconut palm and hedge still need individual silhouette passes. |
| Light and warmth | Lamps resemble simple icons with little assembly. | Bronze-framed stained-glass table shade and pull chain; fabric floor-shade pleats/binding; articulated desk-lamp joints. | Deeper shade rims, curved metal/glass, socket construction and wall/ceiling fittings. |
| Main furniture | Cloth and timber share sharp box geometry. | Rounded floor cushion; layered bedding and shelf interiors; curved armchair/sofa upholstery on open frames, shaped desk-chair shell and padded seat, and a slatted garden bench. Solid primitive has a small projected top bevel. | Beanbag, stool, hammock and authored raised platform bed; furniture joinery and quarter-view sitter contact. A shared bevel does not count as redesigning every item. |
| Other catalog families | Kitchen, food, wall pieces, rugs and seasonal accessories remain uneven in detail. | Complete review coverage and an explicit task for every catalog key. | Individual construction/silhouette work listed in the roadmap, including sinks, appliances, curtain folds, stairs and dishes. |

The roadmap records **23 entries refined this pass**, **6 refined in the
previous pass** and **132 pending individual passes**. Refined means changed,
not finished. Placement footprints, saved wardrobe data and seat heights
remain stable. People remain settled; carrying, standing, sofas, rugs and
lying on beds retain their existing pose behavior.

## Seating follow-up

The owner found the chair too blocky. The empty-chair comparison confirmed
that the rounded footprint still left tall straight arm/back sides and a
solid lower body. The armchair and sofa now use bowed padded panels with
curved vertical edges, visible shell thickness and an open timber frame.
Their seats remain at 22 px. The desk chair retains its caster base and
24 px seat height, with a thinner padded seat over a separate shell and a
rounded, waisted back with readable rear support.

The nearby garden bench had the same construction problem: two solid panels
with tiny feet. It now has individual back/seat slats, support rails and
four legs, preserving its 16 px seat and placement footprint. Reviewed all
four pieces front/rear in cream, dark and sage, plus seated body extremes
in idle/focus/break. The shared character pose is unchanged. Its frontal
front/rear drawing still limits perspective and desk contact; improving
furniture alone does not finish the resident rig.

## Evidence and validation

`npm run art` generates 684 SVG review pieces: the full catalog, complete
wardrobe, material colour variants, body extremes, preset scenes and eight
looks in front/rear seated views for idle/focus/break. The sheet groups catalog
items by their actual catalog family and labels each item/view.
It also renders 48 furniture-contact views and six bench colour/facing views.

The normal screenshot gallery is refreshed from the built app using an
isolated database and browser. The committed comparison sheets in
`model-review/` show the changed plant, storage and lamp families plus the
restored seated rig. These captures expose remaining weaknesses; they are
not a claim of reference parity or proof that animation is flawless.

| Comparison | Captured views |
|---|---|
| [Plants](model-review/plants.webp) | Every plant catalog entry |
| [Storage](model-review/storage.webp) | Every storage catalog entry |
| [Lighting](model-review/lighting.webp) | Every light/warmth catalog entry |
| [Seated front](model-review/seated-front.webp) | Eight looks, break/focus/idle |
| [Seated rear](model-review/seated-back.webp) | Eight looks, break/focus/idle |
| [Live Loft focus](model-review/loft-focus.webp) | The restored seated rig in the actual built app while its timer is running |
| [Seating comparison](model-review/seating-comparison.webp) | Before/after armchair, sofa, desk chair and garden bench, front/rear |
| [Seating colours](model-review/seating-colours.webp) | Cream/dark/sage in both facings |
| [Seated contact front](model-review/seating-contact-front.webp), [rear](model-review/seating-contact-back.webp) | Body extremes on the four pieces, idle/focus/break |

All 1,147 frontend tests pass after the common-room and seating follow-ups. Existing
wardrobe, palette, seat height, placement and rendering checks remain in
place. The rejected prototype's reach/mirror tests were removed with its
implementation. Lint, production build, art generation and the frozen desktop
self-test complete the review loop.

Live checks cover all three open seats, timer continuity, unchanged home
layout/camera, the fixed-room decoration guard, reduced motion and the
600 × 420 seat controls. Tabletop objects reuse catalog surface heights and
supporting-furniture paint order; the scene supplies every referenced SVG paint.

The original seated rig is the current baseline. The rejected skewed torso
and profile-head substitution must not be treated as a completed model
improvement. The next approach is a coherent static pose and garment design,
then furniture contact and occlusion, and only then animation/customisation.

See [the complete per-item roadmap](MODELING_ROADMAP.md) for what to do next,
[the model spec](MODELS.md) for current contracts and
[the earlier reference pass](ART_REVIEW.md) for the bedding/profile work.

---

## Earlier seated clothing review

### Findings addressed

- Seated skirts, pleated skirts and maxi skirts reused separate cloth thighs,
  making them look like shorts. They now share a continuous lap panel, with
  distinct hems and folds. The maxi length follows the seat height.
- Sitting removed denim's rolled hems and stitching and dress trousers'
  pressed creases. The seated drawing now preserves these material details.
  Bare shins also draw behind shorts, preserving the cloth hem at the knee.
- The desk chair's dark spokes disappeared against dark floors and had no
  wheels. Its base now has visible casters and warm metal edge highlights.
- Artwork comparison tests counted unique React IDs as visual differences.
  Comparisons now ignore instance IDs and descriptive data attributes, and
  check that every bottom remains distinct at three seat heights.

### Review coverage

Inspected rendered SVG contact sheets for clothing and furniture, light and
dark skirt colours, both character models, and minimum/maximum body sizes.
Checked the seated clothing and desk chair together in rendered Loft scenes.
These are static render checks; they do not exercise live drag or animation.

The opt-in art-sheet generator includes the expanded fixtures for future
reviews. The model spec records the seated clothing rules. No profile data
format, furniture placement geometry or saved wardrobe selections changed.
