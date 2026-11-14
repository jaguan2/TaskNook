# Connected pet mesh pilots

The workshop header's **Pet pilots** link opens three Blender-authored studies:
the classic cat, floppy-eared dog and rabbit. They remain separate from the
production SVG pets, named coats/breeds, saved placements and growth clock.

The [growth sheet](../../../../docs/model-review/characters-and-pets/pets-3d-growth-pilot.png)
compares actual SVG adults with baby, medium and adult meshes. The
[pose sheet](../../../../docs/model-review/characters-and-pets/pets-3d-poses-pilot.png)
shows front/profile/rear silhouettes and crouched resting poses. Keep the cozy
reference style: rounded forms, simple readable faces, broad shading and warm
colours. The Blender source remains editable for further silhouette work.

## Ownership

| File | Responsibility |
| --- | --- |
| [anatomy.py](anatomy.py) | Fuses body, neck, head, ears, legs/paws and tail into one closed surface; assigns coat, muzzle and inner-ear materials. |
| [skeleton.py](skeleton.py) | Twenty-one bones, blended weights, local Slender/Round morphs and Idle/Walk/Rest clips. |
| [author.py](author.py) | Regenerates all three seed models and saves their Blender sources. Overwrites manual sculpt edits. |
| [export_asset.py](export_asset.py) | Re-exports an already-saved pet source and records source/model hashes. |
| [appearance.mjs](appearance.mjs) | Applies the existing growth scales and local body forms after pose evaluation without accumulating head scale across repaints. |
| [preview.mjs](preview.mjs) | Bounded three-asset cache, stale-load ownership, live animation, view controls and comparison display. |
| [Shared mesh helpers](../blender_geometry.py) | Closed lofts, sculpt unions and matte materials shared with the resident pilot. |

Editable sources and GLBs live together in [assets/pet-pilot](../../assets/pet-pilot/).
Each species has its own `.blend`, `.glb` and hash manifest. No new production
catalog entries are added. `source-art.json` contains 162 real SVG comparison
frames, the existing age/form vocabulary and measured adult drawing bounds.

## Editing and verification

From `prototypes/furniture/`, with the existing Node 20/frontend dependencies,
Blender 4.5.16 LTS and installed Edge (or `FURNITURE_BROWSER_CHANNEL`):

```powershell
# Refresh the production comparisons and measure their real adult heights first:
npm.cmd run pets:source
# Regenerate seed models; replaces manual sculpt edits:
blender --background --python-exit-code 1 --python src/pets/author.py
# Or edit and SAVE an existing .blend, then export without reconstructing it:
blender assets/pet-pilot/cat.blend --background --python-exit-code 1 --python src/pets/export_asset.py

node --test tests/pet-pilot.test.mjs
npm.cmd run qa:pet-pilot
npm.cmd run preview
```

Source generation and browser QA own their temporary browsers; QA also owns an
ephemeral loopback server. Both close on success/failure. Useful diagnostics stay
under ignored `build/skill-verification/pet-pilot/`; only the two current review
sheets, editable sources, exports and repeatable checks belong in the changes.

## Scale, growth and scope

Blender authoring uses Z up and -Y forward. Pet exports face **+X**, along their
long footprint axis; the viewer turns that to +Z for its front camera. Vertical
scale comes from the actual SVG adults: about 22.95px cat, 26.33px dog and 28.16px
rabbit, at `48 / sqrt(2)` logical pixels per unit. The long axis is compacted as
needed to retain the existing footprint. Source and mesh comparisons share a
fixed coordinate frame; they are not individually fitted to fill their cards.

The November 13 refinement reduces the live cat by 20% and rabbit by 24% through
`PET_DISPLAY_SCALE` in `frontend/src/lib/pets.js`. These measured comparisons and
regenerated meshes include that display factor; saved adult sizes and growth
timing retain their existing meaning.

Baby/medium/adult body scales remain 0.58/0.82/1, with head factors 1.22/1.08/1.
The JSON vocabulary comes from `lib/pets.js`; the preview never advances or saves
growth. Body morphs preserve head, eye, ear and paw anchors. The head's authored
scale channel is sampled directly before applying growth: AnimationMixer may
skip unchanged channel writes, so multiplying the current bone scale repeatedly
would inflate it. Round bodies grow upward without pushing their underside
through the floor. Stride distance follows the available leg length.

Only classic silhouettes/coats are covered. Named breeds/markings, carried poses,
full curled sleeping poses, production room layering, live navigation/carrying
and desktop/widget performance remain integration work. The preview's explicit
Play loop stops under reduced motion or a hidden document; paused views render
on demand. The mesh pilots remain outside the shipping renderer. Production
silhouette size is owned by the shared display factor above; saved pet traits
and lifecycle rules remain unchanged.
