# Resident mesh pilot

This is a separate modelling study, outside the production catalog and room renderer. The live characters still use the SVG wardrobe. Start the existing workshop with `npm.cmd run preview` from `prototypes/furniture/`, then open **Character pilot** in its header.

Use the supplied Virtual Cottage 2 [room](../../../../docs/inpso/ss_11568adac20d4baea389a2e0a1c85137ff403955.1920x1080.jpg) and [seated-character](../../../../docs/inpso/b603fdd9497a472249116e7dc02960438ef96cee.jpg) references for compact silhouettes, connected clothing and quiet shading. Keep TaskNook's own faces and palette. Review at room scale as well as close up.

## Owners and editable assets

| File | Responsibility |
| --- | --- |
| [geometry.py](geometry.py) | Closed lofts and sculpt unions: continuous sweater/sleeves, trousers/hips, skin and hair. Construction volumes are fused before weighting. |
| [Shared mesh helpers](../blender_geometry.py) | Matte materials, closed lofts and sculpt unions reused by the resident and pet generators. |
| [rig.py](rig.py) | Twenty-bone skeleton, normalized blended weights, torso fullness and six authored pose clips. |
| [author.py](author.py) | Regenerates the seed model, saves the editable Blender file and invokes export. This overwrites manual model edits. |
| [export_asset.py](export_asset.py) | Exports the already-saved Blender source without reconstructing it; records source/model hashes. |
| [preview.mjs](preview.mjs) | Live WebGL study, illustrated materials, fixed furniture examples, comparison framing and motion lifetime. |
| [Editable source](../../assets/character-pilot/resident.blend) / [GLB](../../assets/character-pilot/resident.glb) | The model to edit and its portable animated export. Both belong in the repository. |

Blender uses Z up and -Y forward; glTF uses Y up and +Z forward. Standing height is approximately 58 logical room pixels at `48 / sqrt(2)` pixels per tile unit. Unit conversion is baked into mesh vertices/shape keys and the skeleton transform. Skinned meshes export at the scene root; the armature modifier retains their skeleton relationship. Blender's exporter prints a parent advisory for this arrangement; Khronos validation and the loaded deformation tests must remain clean.

## Editing and verification

Tested with Blender **4.5.16 LTS** from the [official Blender releases](https://download.blender.org/release/Blender4.5/). From the workshop directory:

```powershell
# Regenerate the original pilot; replaces any hand edits:
blender --background --python-exit-code 1 --python src/characters/author.py

# Or edit and SAVE resident.blend in Blender, then export that saved source:
blender assets/character-pilot/resident.blend --background --python-exit-code 1 --python src/characters/export_asset.py

# Regenerate the actual production SVG comparisons after their source changes:
npm.cmd run characters:source
node --test tests/character-pilot.test.mjs
npm.cmd run qa:character-pilot
```

QA uses installed Edge by default; `FURNITURE_BROWSER_CHANNEL` selects another Playwright-supported channel. It owns an ephemeral loopback server/browser and closes both. The [review sheet](../../../../docs/model-review/characters-and-pets/resident-3d-pilot.png) is retained; diagnostic evidence stays under ignored `build/skill-verification/character-pilot/`.

Only short hair, a sweater, trousers and sneakers are covered. Material names match existing appearance fields, but saved profiles are not connected to this preview. Torso fullness is one local mesh adjustment, not parity with the production body sliders. The six clips cover standing, walking, relaxed sitting, typing, sleeping and ankles crossed. Full cross-legged sitting is excluded because the knees and shoes merge into an unclear shape at room scale. Sleeping eyes close through the rig. Furniture examples are fixed studies, not a general seat/keyboard fitting system.

The preview renders on demand while paused. Explicit Play enables one animation frame loop; OS reduced motion and hidden documents stop it. This is a workshop exception to the production SVG/CSS motion policy. The cached furniture PNG renderer remains unchanged. Production depth ordering, all wardrobes/body ranges, carried/mug/gesture poses, failure fallback and desktop/widget performance remain rollout gates in the [roadmap](../../../../docs/MODELING_ROADMAP.md).
