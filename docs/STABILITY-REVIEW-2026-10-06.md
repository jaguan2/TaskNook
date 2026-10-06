# Handoff review and stability patch — October 6, 2026

Reviewed `docs/HANDOFF-2026-10-06.md` against `f30e062`, covering the seven
commits after the October 4 modeling push (`05b1d06`). The working tree was
clean when the review started. The character, wardrobe and headgear work
follows the handoff's room-scale design decisions; the complete looks still
preserve skin, and body templates change geometry without changing identity
or clothing. Willow Pond shares the common-place state boundaries correctly.

## Confirmed gaps and fixes

| Gap | Impact | Patch |
|---|---|---|
| Willow terrace material translated its room-coordinate clip | The stone polygons were completely outside the mask, leaving a flat terrace | Keep the clip in room space and translate only its local material child |
| Raised light pools moved independently of their floor clip | The reading nook's sconce pool disappeared; other raised pools were cut incorrectly | Put the floor lift and clip on the shared light-layer parent |
| A chosen seat button unmounted while holding keyboard focus | Focus fell to the document body, making another seat change awkward | Return focus to the persistent chooser with scrolling suppressed |
| An obsolete friend-room request could still show a failure toast | Leaving for a common place could be followed by an unrelated visit error | Ignore failures invalidated by a newer destination; retain feedback for the current request |

The new regressions failed before the fixes and passed afterward. Clipping
checks resolve the actual rendered ancestor translations against the floor
geometry; checking that a clip ID exists was insufficient. The interaction
checks cover both stale/current failures and focus after the seat list closes.
No backend schema, room layout, furniture placement or character-art change
is part of this patch.

## Stability validation

| Check | Result |
|---|---|
| Full frontend suite | 1,175 passed; one opt-in art fixture skipped in the ordinary run |
| Full backend suite | 274 passed, using isolated databases |
| ESLint | Passed |
| Production build | Passed; existing bundle-size advisory remains |
| Catalog/wardrobe fixture generation | 709 SVG pieces rendered successfully |
| Schema drift | No new upgrade operations |
| Live common-place flow | All three open seats in each place, keyboard selection, stable neighbours, decoration guard, timer continuity and preserved home layout/camera |
| Live body templates | All four persisted while preserving skin and wardrobe |
| Reduced motion/small windows | Both places checked at 600 × 420 |
| Desktop package | Rebuilt on the main channel; frozen self-test exited 0; manifest hash/size, embedded identity, every frontend asset and bundled backend source matched |

Browser/server checks and packaging self-tests use their own data directories.
The user's database and browser profile are not involved. Common Cottage and
Willow Pond screenshots are refreshed from the patched built app.

Packaged build: `9710ed42378346feb3abd4a57da89caa`. SHA-256:
`77e858ebc3a8e00b7338fd16f55bbf57778e29f1be3ea084b1a401e0ebf83754`.

## Remaining improvements

- Keep the handoff's silhouette/detail decisions as the current character
  baseline. Seated perspective, desk contact and more natural garment drape
  remain larger modeling work in `MODELING_ROADMAP.md`.
- Some October 4 furniture-contact comparison images show the older resident
  proportions. Use screenshots 37/38 and the handoff for the current character,
  and regenerate contact comparisons before the next seating-art pass.
- Broad coats, maxi-skirt flare and the closeup thumb bump are optional art
  refinements, not failures found by this stability pass.
- Future authored places need checks for transformed clipping, not only
  valid paint IDs and seat counts.
