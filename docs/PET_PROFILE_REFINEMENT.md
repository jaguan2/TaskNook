# Pet profile and resting poses — November 14, 2026

The live SVG cat, dog and rabbit rigs now have clearer side silhouettes and
grounded resting poses. Their catalog footprints, room anchors, saved colours,
adult sizes, body forms and growth timing retain their existing meaning.

## Changes and ownership

[`IsoPetItems.jsx`](../frontend/src/components/IsoPetItems.jsx) owns the artwork:

- Resting cats and dogs have a low ribcage, tucked forepaws and a folded hind
  leg. Only the torso breathes; the supported head and planted paws stay still.
- Side coat markings follow the chest/neck and clip to the torso. The old large
  belly oval is gone. Cat profile muzzles and inner ears follow the skull.
- Walking profiles distinguish forelegs from bent hind legs. The shoulder
  overlaps the head and the paws emerge from the torso, including slender forms.
- Dog profile heads have a projecting muzzle, one visible eye and a profile ear
  instead of front-facing facial features on a round side head.
- Resting tails lie against the rump and floor. Dog tail roots are authored for
  each facing, correcting the slender corgi's detached front/rear nub.
- Rabbits have a low resting head, tucked forepaw, longer hind foot and a small
  tail meeting the haunch. Their awake profile separates the chest and haunch.

[`pets.js`](../frontend/src/lib/pets.js) continues to own growth/form scaling.
The room's placement and roaming logic is unchanged. The retained 3D pet pilots
are comparison assets; this revision updates the shipping SVG rigs and their
162 source comparison frames without replacing the pilot meshes.

## Review and verification

- [All fifteen coats/breeds, standing and resting](model-review/pet-side-poses.webp).
- Age/form sheets: [cat](model-review/cat-growth.webp),
  [dog](model-review/dog-growth.webp), [rabbit](model-review/bunny-growth.webp).
  Each contains 54 frames: three ages × three forms × six poses.
- [Actual mirrored resting poses in a room](screenshots/71-pet-resting-poses.webp).

Run `npm.cmd run qa:pet-profiles` from `prototypes/furniture/`. It renders the
actual rigs with production animation CSS, using distinct SVG IDs per fixture.
All 810 coat/age/form/pose combinations pass 43,092 checks at eight animation
phases: real filled head/body and paw intersections, tail roots, paw contact and
review framing. Reduced motion stops every fixture animation. The first sweep
caught the corgi tail connection; the corrected anchors pass. These are sampled
geometry checks, not a guarantee against every possible visual overlap.

325 targeted frontend tests, lint/build and 13 pet-pilot/source-contract checks
pass. Native app journeys verify both room orientations, reload, normal clicking,
adoption, independent growth pausing and offline aging. The room fixture uses
six pets and a real sofa; it is a review arrangement, not a new room preset.

Local structural self-review preserves artwork, state and persistence ownership.
The separately installed shared review toolkit is unavailable. Logs and summaries
are ignored under `build/skill-verification/pet-profiles/`; selected current images
and the reusable reviewer are retained. Temporary helper configuration, raw
captures and isolated test data are removed after verification. Delivery includes
a matching main-channel executable/manifest and isolated frozen startup test.
