# Character motion and contact simulation — November 14, 2026

The production SVG character now has a connected pickup pose: slightly bent
knees, gently pointed profile feet and boot shafts aligned to the actual calves.
The hip roots stay at their authored anchors. Arms turn only three degrees
around their shoulder joints. One 3.2-second CSS clock sways the complete figure
by ±1.2° with a 0.65px lift; independent limb clocks cannot pull it apart.

Pickup takes precedence over sitting, lying, walking, typing and break activity.
Breathing and head/arm gestures yield while held. Reduced motion shows the same
static pose and keeps direct pointer placement available. Pointer following,
landing validation, seat selection and saved room positions retain their existing
owners; this change adds no JavaScript animation loop or React frame updates.

The wider fit sweep exposed small standing ankle gaps with low vamps and a
compact profile sneaker. The shared leg artwork now reaches those shoes while
their soles keep the original floor anchors. Other poses use their own ankle
anchors, including the earlier crossed-boot correction.

- [Pickup and standing comparison](model-review/characters-and-pets/pickup-pose.png).
- [Actual chair-to-chair pickup](model-review/characters-and-pets/pickup-in-room.png).

## Repeatable simulation

From `prototypes/furniture`, run `npm.cmd run qa:character-motion` with installed
Edge. The opt-in fixture matrix renders the actual `Resident` component and loads
the actual production stylesheet. It does not construct substitute characters.
The generated source sheets and numeric results live under ignored
`frontend/art-sheet/` and `build/skill-verification/character-motion/`.

Coverage is **4,392 configurations × 11 fixed times = 48,312 frames**:

- All 11 bottoms × six shoes × compact/broad body extremes.
- Standing, walking and pickup in front, profile and rear views.
- Relaxed, ankles-crossed and folded sitting at 13/17/21/26px seats, front/rear.
- All 12 complete character looks in three pickup views, covering combined
  coats, scarves, headwear and hairstyles.
- Stride/sway quarter cycles and the long idle-gesture peaks, with every CSS
  clock paused and sought to the same times on every run.

The browser checks painted shoe/calf intersections, boot coverage at two calf
points, hip and shoulder contact with the torso, readable separate soles at rest,
finite artwork bounds inside the frame and zero remaining CSS animations in
reduced motion. Walking feet may pass behind each other, and profile shoes may
overlap in depth. Crossing shins, cloth covering legs and hair behind clothing
are intentional overlaps. The checks do not prohibit those layers.

Four deliberately corrupted controls must be detected: displaced footwear, a
missing leg, artwork outside its frame and a carry animation that ignores reduced
motion. Passing fixture counts alone cannot approve the simulation.

This is sampled regression coverage for specific contact and cropping defects.
It does not prove every possible wardrobe combination is free of every visual
intersection. New garments and pose changes still need visual review.

## Ownership and validation

- [Leg and shoe artwork](../frontend/src/components/character/body.jsx) owns
  connected calf/foot anchors; [assembly](../frontend/src/components/character/index.jsx)
  owns carry precedence and gesture gates.
- [Opt-in fixtures](../frontend/src/components/artsheet.fixtures.test.jsx) own
  the coverage matrix.
- [Simulation runner](../prototypes/furniture/scripts/review-character-motion.mjs)
  owns generation, evidence, negative controls and the selected review sheet.
- [Browser probes](../prototypes/furniture/scripts/character-fit-probes.mjs)
  own DOM geometry checks; browser-only operations stay together for serialization.
- [Live carry checks](../e2e/carry.spec.mjs) exercise pickup from a chair, pointer
  movement, full/reduced motion, set-down and persistence using disposable data.
- [Seating checks](../e2e/character-seating.spec.mjs) cover the actual editor
  controls and the lower wooden/desk chairs at every facing.

Structural self-review follows the local project boundaries. The separately
installed shared toolkit is unavailable; no full upstream review is claimed.
Only selected review images and repeatable source/test owners are retained.
Trial sheets, browser profiles, databases, helper configurations and raw browser
results are removed after validation. Existing model pilots remain useful source
assets and are preserved.


Validation: the simulation passes all 48,312 frames, 285,384 joint probes,
32,736 boot probes and 4,392 reduced-motion checks. All four deliberately broken
controls are detected. The 714-frame wardrobe sweep, 144 seated boot-contact
pairs and four face-opening probes also pass. The full frontend suite passes
1,650 tests; the final 389 relevant tests pass again after shoe-contact changes.
Lint/build and all 823 workshop tests pass. Native browser checks cover both the
room carry interaction and the editor/rotated-chair seating journey.

The main-channel desktop build is `52b3f387d7f940f392720be3866289ac`.
Its embedded source/bundle identity and manifest match; the isolated frozen
startup self-test exits 0. Executable SHA-256:
`5f1769cc31afb50179067355a459719894a597abd8275251fc37fa30b4a0a441`.
