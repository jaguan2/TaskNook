# Character workstation and rear-hair review

November 16, 2026. The reported rear-facing Mochi pose exposed three problems:
the generic seat offset placed the body beside the office cushion, a folded-arm
approximation could stretch its forearms to distant keys, and the Curtains
hairstyle inherited a smooth circular rear cap.

## Seating and keyboard contact

`seatedPlacement` now centres office-chair sitters on the authored GLB cushion
instead of applying the generic forward seat offset. The cushion keeps its
existing 21px height; the torso's lower edge overlaps it by the existing 1px
contact allowance. All four saved facings retain their meaning.

`typingArms.js` solves two joined segments from shoulder to wrist. Elbows bend
outward, sleeve hems follow those segments, and small palms lie along the
projected keyboard direction. The fingertip targets still come from the
existing shared keyboard-deck contract. Arm lengths have a bounded allowance
for the stylized body instead of allowing arbitrarily long forearms.

The workstation resolver checks reach against the actual resident's body.
An identified keyboard that is out of reach produces a resting pose. The
chair/desk depth order still applies, so an unreachable laptop cannot also
make the cushion disappear behind the desk. A tiny fully folded reach stays
finite rather than creating an invalid elbow.

The current Loft preset moves its desk chair half a tile along the desk to
align it with the keyboard. **Existing saved layouts keep their coordinates.**
The model/contact fixes apply immediately; applying Loft again also uses the
new chair arrangement and replaces the layout through the usual preset control.

## Rear hair

Every one of the 19 hairstyle entries now owns rear artwork. The eight cuts
that inherited the generic circle—Messy, Ponytail, Braids, Pigtails, Wolf,
Curtains, Mullet and Locs—use distinct silhouettes with nape clumps, overlapping
shadow shapes and restrained flow marks. Unknown styles use the authored short
cut. Buzz also follows a shaped scalp instead of a circular overlay.

The rear skull uses the same continuous crown-to-nape outline as the shaped
head system. Curtains, including Mochi's grey version, has an uneven soft edge
and short tonal marks; full-length parallel grooves were removed during visual
review because they read as helmet seams. These are vector form/texture cues,
with no raster texture downloads, filters or new animation clocks.

`character/hairRear.jsx` holds the new rear artwork; the existing hair registry
still owns each style's front/profile/rear dispatch. Instance-scoped clips keep
the shading inside each silhouette and prevent one resident clipping another.
The existing hat clip and long-hair layering remain in place.

## Verification and retained references

The full frontend suite passes **1,705 tests**, with one optional fixture test
skipped. Lint and production build pass. New tests cover bounded arm segments,
fingertip contacts, unreachable layouts, cushion centring, the actual Loft
preset and all rear-style entries. The source-based motion check retains its
busy-hands guards while allowing the additional reachability condition.

`e2e/character-workstation.spec.mjs` passes three native Edge scenarios using
an isolated backend and the actual GLB furniture. It reproduces Mochi's body
and wardrobe, probes the rendered hip against the cushion at all four facings,
checks both keyboard hands and arm lengths, exercises an old misaligned layout,
verifies reload persistence and applies the real Loft preset.

The existing art-fixture generator also renders the full wardrobe. This pass
adds grey rear views and Curtains fit samples. A native browser contact sheet
reviews all 19 rear styles and seven Curtains body/headwear variants.

- [Workstation close-up](screenshots/77-character-workstation.webp)
- [Furnished Loft](screenshots/01-loft-night.webp)
- [Rear-hair and fit sheet](model-review/hair-rear.webp)

The root executable and matching main-channel update manifest are rebuilt,
verified against the bundled source and checked with an isolated frozen startup.
Local structural review keeps seating, reach math, artwork and persistence in
their respective owners. The private shared toolkit is unavailable here, so
this records local project review. Selected WebP references and repeatable
tests remain; temporary art fixtures, browser captures/configuration, probes
and disposable databases are cleaned. Logs and summaries stay under ignored
`build/skill-verification/character-workstation/`.
