# Current character and pet source art

These captures review the production SVG rigs, which remain in the game alongside the new GLB furniture.

November 13 size refinement: cat and rabbit source sheets and pet mesh pilot
comparisons include the smaller live silhouettes (20% and 24% respectively).
Dog size and saved growth rules are preserved. See [the refinement review](../../CHARACTER_PET_REVIEW.md#november-13-smaller-cats-and-rabbits).

- [Resident presets](resident-presets-review.png)
- [Resident body extremes](resident-extremes-review.png)
- Growth stages: [cats](cat-growth-review.png), [dogs](dog-growth-review.png), [rabbits](bunny-growth-review.png)

See the [character/pet audit](../../CHARACTER_PET_REVIEW.md) for the reviewed proportions and source-art verification method.

## Deforming resident pilot — November 13

[Pilot review sheet](resident-3d-pilot.png): the actual current SVG alongside the new Blender-authored resident, including front/profile/rear, furniture poses and room-scale views. This is one outfit and six clips in the isolated model workshop. It is not a replacement of the production wardrobe. See the [pilot guide](../../../prototypes/furniture/src/characters/README.md) for the editable model, preview and verification commands.

## Connected pet pilots — November 13

- [Growth comparison](pets-3d-growth-pilot.png): actual SVG adults beside baby, medium and adult meshes.
- [Silhouettes and rest](pets-3d-poses-pilot.png): front, profile, rear and crouched rest for the cat, dog and rabbit.

The [pet guide](../../../prototypes/furniture/src/pets/README.md) records editable sources, current coverage and verification. These are classic-coat studies with three body forms, rather than a replacement of the live pet wardrobe or lifecycle.

## Wardrobe fit — November 13

November 14 refresh: seated boot shafts now follow crossed calves, with separate
readable feet. The current [boot contact sheet](seated-boot-contact.png) and the
refreshed bottoms/shoes/preset sheets use the corrected production rig. See the
[fix and regression checks](../../WARDROBE_FIT_REVIEW.md#crossed-seated-boots--november-14).

- [Tops and coat colourways](wardrobe-colourways.png).
- [All nineteen hairstyles](wardrobe-hair.png), with corrected curly/afro face openings.
- [Bottoms fit](wardrobe-bottoms-fit.png) and [shoes fit](wardrobe-shoes-fit.png) at compact/broad body sizes and supported poses.

The [coverage ledger and fitting approach](../../WARDROBE_FIT_REVIEW.md) distinguish this production SVG review from the single-outfit 3D pilot. `npm.cmd run qa:wardrobe` regenerates the full review under ignored build evidence; only these selected sheets are retained.

## Pickup and motion fit — November 14

- [Connected pickup pose beside standing](pickup-pose.png).
- [Actual chair-to-chair pickup](pickup-in-room.png).

The [simulation record](../../CHARACTER_MOTION_FIT.md) covers 4,392 wardrobe/pose
configurations at 11 animation times, contact/cropping probes and negative controls.
