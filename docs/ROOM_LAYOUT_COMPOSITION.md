# Personal rooms and common places

The November 12, 2026 layout pass makes ordinary presets compact rooms with a clear purpose. Common places remain separate destinations designed for groups. An independent Codex agent reviewed all fourteen furnished personal presets and all three common places, then reviewed the actual revised app captures.

## Approach

Start with the activity and its furniture group, then fit the floor around it. A study needs one usable workstation and a reading corner; a cabin needs a bed and a hearth-facing lounge. Additional furniture should support that purpose. Catalogue coverage belongs in the furniture picker.

Ordinary presets use eleven to twenty placed pieces, including accessories, wall fixtures and pets. They have at most one seating rug. Storage follows walls, chairs face their tables, conversational seats share upholstery, and outdoor seats face their view. Spare floor provides access between groups. The pool requires extra floor because its water footprint is seven by two and a half tiles.

Check both grid geometry and the final isometric image. Bounds and overlap checks cannot detect a table hiding a seated character. The Plant shop stool was moved outward after the independent image review caught that overlap. The Winter yard bench precedes its woodpile so arrivals take the intended seat. Outdoor serving furniture uses an actual table.

## Completed coverage

Dimensions are grid tiles. Piece counts exclude the profile character added by the “In the room” toggle.

| Preset | Previous floor / pieces | Current floor / pieces | Purpose and groups |
| --- | --- | --- | --- |
| Shared home | 10×9 / 27 | 9×8 / 20 | Two coordinated window workstations, sleeping/storage wall, one small lounge |
| Loft | 10×8 / 19 | 8×6 / 16 | Window workstation, sleeping bay, one conversation group |
| Cozy study | 9×7 / 23 | 7×6 / 13 | Window desk and one reading corner |
| Cozy cabin | 9×8 / 22 | 8×6 / 14 | Sleeping/storage wall and hearth-facing seating |
| Secret garden | 16×14 / 17 | 9×7 / 11 | Pond, water-facing bench/log and short planted approach |
| Corner café | 10×7 / 25 | 7×6 / 16 | Counter with staff aisle and one two-person table |
| Plant shop | 12×9 / 32 | 9×7 / 17 | Potting seat, stocked perimeter, one display island and short checkout |
| Reading room | 11×9 / 37 | 8×6 / 15 | Window desk, wall bookshelves and one reading seat |
| Study studio | 16×12 / 64 | 8×6 / 15 | One two-person worktable and one reading seat |
| Terrace | 9×7 / 16 | 8×6 / 13 | One candlelit two-person dining group framed by planting |
| Autumn yard | 10×8 / 16 | 8×7 / 13 | Bench, maples and one harvest area |
| Winter yard | 10×8 / 13 | 8×7 / 11 | Bench with wood storage and one snow-play area |
| Holiday hearth | 9×7 / 14 | 8×6 / 13 | Hearth-facing conversation group and decorated tree |
| Poolside | 14×11 / 15 | 10×8 / 11 | Pool, paired water-facing loungers and shared serving table |
| Empty room | 9×7 / 0 | 9×7 / 0 | Deliberately blank starting floor |

The Study studio retains the saved preset key `hall`. Its screenshot filename also stays `08-study-hall.webp` to preserve existing links.

Common Cottage and Willow Pond keep six seats each. Grand Library keeps its 30×20 floor and thirty-six seats. Their existing grouped layouts passed review; their presence, seat anchors and session state remain unchanged. See [common places](COMMON_ROOMS.md).

## Ownership and compatibility

`frontend/src/lib/isoPresets.js` owns indoor and garden starting arrangements; `isoSeasonalPresets.js` owns seasonal ones. Keep explicit coordinates and short comments identifying furniture groups. `commonRooms.js` owns public destinations separately.

Applying a preset replaces the floor and furniture through the existing room action and save queue. It carries the profile character to a free seat. Existing saved custom rooms are preserved; reapply a preset in the Room panel to adopt its new arrangement. No layout version or database migration is needed. All four saved furniture directions and independent shelf customizations remain supported.

`visiting.js` derives a visiting owner's location from an available seat, or from the café counter for Mochi, rather than keeping coordinates tied to an older preset. An owner's stored `you` placement still takes precedence.

## Verification and maintenance

`presetComposition.test.js` checks compact floors, limited rugs, proper arrival seats, tabletop support and unchanged public capacity. The existing room tests retain bounds, collision, wall and saved-layout validation. Facing tests check actual group targets and matching upholstery. Browser coverage applies every furnished preset through the real controls, saves and reloads it, and verifies the profile character keeps a seated or lying pose.

The [current app gallery](screenshots/README.md) shows the reviewed layouts with real models and customized characters. Captures use disposable databases. Keep the capture pipeline in source; remove one-off helpers, test databases and raw review images after verification. Related implementation details are in the [direction guide](ROOM_LAYOUT_DIRECTIONS.md) and [codebase guide](CODEBASE_GUIDE.md).

November 12 verification: 1,575 frontend tests passed with one gated artwork generator skipped; lint/build, all 32 browser scenarios and 28 packaging/checkout checks passed. Main-channel build `16b183bc855b4a5cba96fb42cb6adb69` matches its embedded/source identity and manifest SHA-256 and passed the isolated frozen self-test with exit 0. Final audit and verification logs remain ignored in `build/skill-verification/layout-composition/`.

The pass refreshed 56 app gallery images, the README hero and two model-contact examples. All 125 documentation images decode and 556 local Markdown links resolve. Temporary capture helpers, provisional layouts, isolated databases and raw browser/review images were removed; verification ports are closed.
