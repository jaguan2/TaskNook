# Chair options and lower upholstery — November 14, 2026

The catalog adds three distinct chairs: a timber spindle chair, a folding canvas
chair and an open-frame upholstered lounge chair. Each is a standalone GLB with
its own construction, material roles and matching graphics-failure SVG. Existing
wooden and desk chairs remain available. Names are translated in all five app
languages; tint and four-direction rotation use the normal placement fields.

| Item | Footprint | Cushion/seat | Overall model height | Construction |
| --- | --- | --- | --- | --- |
| Spindle chair | 0.7 × 0.7 | 17px | 34px | Shaped board, splayed legs, stretchers, five slender spindles and two back posts under a bowed crest |
| Folding chair | 0.7 × 0.75 | 16px | 31px | Crossed timber frames, shared metal pivots and thin canvas seat/back |
| Lounge chair | 0.9 × 0.9 | 18px | 34px | Open timber arms/supports, low cushion and gently reclined upholstered back |
| Sofa | Existing 2 × 0.85 | 17px, formerly 22px | 34px, formerly 42px | Shallow deck, narrow rail, visible feet and setback arms |
| Closed armchair | Existing 1 × 0.85 | 18px, formerly 22px | 34px, formerly 38px | Same lighter shell/support construction |

The old upholstered deck was 0.38 tile units tall. It is now 0.16: about 58%
thinner. The cushion, deck, rail and feet derive their contact planes from the
catalog seat height. The cushions extend ahead of the side-arm ends, keeping the
back/arm join compact in front and rear views. The arm/back shell remains one
closed mesh. Resized sofas use the same builder, with fixed vertical dimensions
and physical edge thicknesses.

The sofa and armchair retain their item IDs and footprints, so saved layouts
need no migration. Existing dimensions and colours are preserved. Residents and
common-room seats follow `ISO_ITEMS` automatically; the remaining Library
armchair construction reference now reads the catalog height as well.

## Source owners

- [Catalog](../frontend/src/lib/isoCatalog.js): availability, footprint, seat and
  control heights; [translations](../frontend/src/i18n/catalogs.js) supply labels.
- [Chair construction](../prototypes/furniture/src/models/chair-variants.mjs):
  independent mesh parts and explicit physical joint probes.
- [Upholstery](../prototypes/furniture/src/models/upholstered-models.mjs): low
  shell, shallow deck and connected supports for fixed/resized models.
- [Fallback chairs](../frontend/src/components/IsoChairVariants.jsx) and
  [fallback upholstery](../frontend/src/components/IsoSeatingItems.jsx): matching
  silhouettes and catalog-driven cushion planes.
- [Export catalog](../prototypes/furniture/src/catalog.mjs): materials, overall
  heights and fixed-front character contact calibration.

Current scope is **187 standalone exports, including 182 production prop GLBs**.
The five customized actor keys keep their existing live SVG rigs. Current
character calibration fixtures and pilot source comparisons are regenerated;
the separate actor/pet pilot meshes are preserved.

## Review and regression coverage

- [Updated sixteen-piece seating sheet](model-review/catalog-3d/furniture-seating-section.png).
- [Actual placed/recoloured options](screenshots/70-seating-options.webp).
- [Occupied low sofa](screenshots/70-low-sofa-occupied.webp).
- Refreshed [loft](screenshots/01-loft-night.webp),
  [common cottage](screenshots/39-common-cottage.webp),
  [grand library](screenshots/48-grand-library.webp) and
  [resized sofa](screenshots/63-sofa-resize.webp) captures use the current models.

Frontend coverage totals 1,668 passing tests across the full run and focused
recheck, with the optional art generator skipped.
An old 179-prop count assertion was updated to derive coverage from the actual
catalog; its focused recheck passes. Lint/build pass. All 832 workshop cases are
covered across the full run and a focused section-count recheck after adding the
three entries. Checks include closed/outward meshes, connected parts, declared
solid intersections, floor/bounds, colour materials, GLB validation/reload and
all supported sofa resize combinations. The first pass found a lounge-chair arm
joint with insufficient overlap; the final frame connection passes solid probes.

Native model review covers 144 colour/angle renders, front/rear/underside views,
120 actual-character contact captures, material changes and renderer lifecycle
checks. Live app coverage uses the real picker to add the three chairs and a
sofa, saves independent colours, rotates all four directions and verifies reload.
Booted character fit is checked on seven seat types at all four facings, alongside
the editor's sitting controls. Separate cases cover every catalog thumbnail and
a resized/recoloured sofa with its occupant. Native data is disposable; these
checks never launch the user's database.

Local structural self-review follows the project's ownership and persistence
boundaries; the separately installed shared toolkit is unavailable. Evidence is
ignored under `build/skill-verification/seating-refresh/`. Only selected current
images and repeatable source/tests are retained; temporary browser output,
helpers and test databases are removed after verification. Delivery includes a
matching main-channel executable/manifest, exact package verification and an
isolated frozen startup test.

Delivered build `fcaaf4011a384004a7f32421de06a60b` on channel `main` passes
exact package verification and isolated frozen startup. Its executable SHA-256 is
`97508793a283e0d22d25ca43d85ac4afea62714fe9d9824bb7facaeb2bcf39ac`;
`desktop-update.json` records the matching source fingerprint and size.
