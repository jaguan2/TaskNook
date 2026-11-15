# Standalone catalog review sheets

Current illustrated GLB snapshots for all 187 catalog keys. The [coverage ledger](../../CATALOG_3D_MIGRATION.md) lists each source key and asset; [the approach](../../CATALOG_3D_APPROACH.md) describes construction and checks. The 182 prop GLBs also power the [actual isometric game](../../ROOM_MODEL_INTEGRATION.md); customized actors keep their SVG artwork.

November 14 seating refresh: the [current seating sheet](furniture-seating-section.png)
contains sixteen entries, including spindle, folding and lounge chairs. Sofas and
armchairs use the new low, shallow-base construction. See the
[approach and validation](../../SEATING_REFRESH.md).

Refreshed November 12, 2026: all 18 section sheets, five illustrated room
arrangements and the bed/seated calibration views were rendered from the current
assets. The full workshop capture passed 1,524 color/angle checks plus browser
interactions. Existing image paths are preserved. Run `npm.cmd run qa` from
`prototypes/furniture/` to regenerate section sheets under the ignored
`build/skill-verification/furniture-3d/` directory.

November 13 refresh: the seating and decoration sheets now show the shorter,
slimmer wooden/desk chairs and connected folding screen. The affected sections
pass 216 colour/view checks plus geometry contacts and browser interactions.
See [the refinement record](../../ROOM_MODEL_INTEGRATION.md#screen-chair-and-pet-proportions-explicit-editing--2026-11-13).

The seating sheet also includes the subsequent chair-base correction: wooden
and desk-chair seats are now 17px and 21px above the floor, with shorter legs
and pedestal. Seat and occupant contact checks use those same catalog heights.

| Section | Review sheet |
| --- | --- |
| Seating & beds | [Open sheet](furniture-seating-section.png) |
| Tables & desks | [Open sheet](furniture-tables-section.png) |
| Storage | [Open sheet](furniture-storage-section.png) |
| Rugs & floor | [Open sheet](furniture-floor-section.png) |
| Light & warmth | [Open sheet](furniture-lighting-section.png) |
| Plants & greenery | [Open sheet](furniture-plants-section.png) |
| Decoration | [Open sheet](furniture-decoration-section.png) |
| Tech & music | [Open sheet](furniture-tech-section.png) |
| Architecture | [Open sheet](furniture-architecture-section.png) |
| On the wall | [Open sheet](furniture-wall-section.png) |
| Kitchen | [Open sheet](furniture-kitchen-section.png) |
| Food & drink | [Open sheet](furniture-food-section.png) |
| Autumn | [Open sheet](furniture-autumn-section.png) |
| Winter | [Open sheet](furniture-winter-section.png) |
| Spring | [Open sheet](furniture-spring-section.png) |
| Summer | [Open sheet](furniture-summer-section.png) |
| Outdoors | [Open sheet](furniture-outdoors-section.png) |
| Living things | [Open sheet](furniture-living-section.png) |

Room arrangements: [study](furniture-3d-study.png), [café](furniture-3d-cafe.png), [storage](furniture-3d-storage.png), [textiles](furniture-3d-textiles.png), [hearth](furniture-3d-lighting.png).

Current calibration views: [illustrated bed](furniture-illustrated-bed.png) and
[actual SVG resident seated on the 3D armchair](furniture-illustrated-seated.png).

The [character and pet review](../../CHARACTER_PET_REVIEW.md) covers the preserved production SVGs and the compact 3D resident refinement. Supplied style photographs are indexed in [artwork references](../../ART_REVIEW.md).
