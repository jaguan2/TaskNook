# Standalone catalog modelling approach

The [generated migration ledger](CATALOG_3D_MIGRATION.md) is the item-by-item
coverage record. It follows the live catalog's section order and lists each
authored GLB, triangle count and byte size. Export coverage is separate from
shipping-renderer integration. No catalog key or saved room is renamed.
The [November 12 production integration](ROOM_MODEL_INTEGRATION.md) now uses
all 179 furniture/prop exports in the isometric game, while preserving the
five customized SVG actor types.

## Authoring

Each catalog key has an explicit construction in a focused family module under
`prototypes/furniture/src/models/`. Shared helpers describe actual manufactured or
organic structures: joined timber, hollow vessels, curved cloth, rooted leaves,
closed shells and supported light sources. Unknown keys throw; they never
silently receive a generic box or another item's model.

Models use X/Z on the floor and Y up. Most fronts face +Z; loungers and hammocks declare their native +X direction. Origins are centred within
the existing tile footprint. Catalog seat/surface heights and interaction
metadata are retained separately from authored physical heights. Wall assets
have a local mounting back and are reviewed separately from room elevation.
Organic silhouettes are fitted as a complete connected assembly to their
reserved footprint and authored height; this does not change furniture anchors.

The style reference is the supplied Virtual Cottage 2 screenshots in
`docs/inpso/`: broad readable silhouettes, warm neutrals, one main colour,
limited detail and matte value bands. Reference artwork is not traced or
imported. Geometry and material roles remain editable, and the self-contained
GLBs can be opened in Blender. The viewer applies the illustrated palette;
portable PBR materials remain in the files.

## Review loop

1. Read the source catalog and existing artwork for the next section.
2. Author its distinct forms, including rear/underside construction and visible
   contacts. Containers hold their contents and stems enter their receiving soil.
3. Export deterministic GLBs and reject glTF validator errors or warnings.
4. Check closed topology, winding, volume, floor/footprint bounds, anchors,
   declared solid joints, source/export parity and the per-model triangle limit.
5. Render the complete section in natural finishes and applicable light/dark/sage
   tints at multiple angles. Inspect the resulting sheet and correct visual
   faults. Technical tests alone do not approve artwork.
6. Update the ledger and retained section sheet, then continue to the next
   section. Finish with full-catalog verification rather than stopping for
   approval at every family.

Living things require explicit articulation/animation evidence in addition to
static export. These assets do not replace the shipped character's continuous
wardrobe/customization system; production rig, interaction and render-depth
integration must be tracked separately and described honestly.

## Coverage and source ownership

All 184 entries in the 18 live catalog sections now have explicit constructions.
The ledger is generated from the same manifest as the workshop; it lists every
covered key and asset instead of relying on a manually maintained checklist.
The [review index](model-review/README.md) links the retained section sheets.
Family modules and shared helpers below live under
`prototypes/furniture/src/models/`; `src/models.mjs` remains the stable entry.
Browser-only code lives under `src/viewer/`. Retained 3D snapshots are grouped in
`docs/model-review/catalog-3d/`, separate from production SVG review evidence.

| Catalog family | Main authoring source |
| --- | --- |
| Seating and beds | `models.mjs`, `seating-models.mjs` |
| Tables and desks | `table-models.mjs`, `worktop-cabinets.mjs`, `espresso-machine.mjs` |
| Storage | `storage-models.mjs` and focused storage modules |
| Rugs and floor | `rug-models.mjs`, `ground-water-models.mjs` |
| Light and warmth | `lighting-models.mjs` and focused lamp/hearth modules |
| Plants and greenery | `botanical-models.mjs` |
| Decoration | `decoration-models.mjs` |
| Tech and music | `tech-models.mjs` |
| Architecture | `architecture-models.mjs` |
| On the wall | `wall-models.mjs` |
| Kitchen | `kitchen-models.mjs` |
| Food and drink | `food-models.mjs` |
| Autumn | `autumn-models.mjs` |
| Winter | `winter-models.mjs` |
| Spring, summer and outdoors | `garden-models.mjs` |
| Living things | `living-models.mjs` |

Shared helpers in `organic-parts.mjs`, `object-parts.mjs` and `outdoor-parts.mjs`
describe rooted foliage, frame/vessel construction, branches, crates, baskets
and closed organic bodies. Shared forms are composed explicitly for each key.
Physical heights are authored for the object: a mug does not fill the tall hit
area reserved for edit controls, and a snow impression stays thin. Spherical
and circular pieces receive proportion checks. Seat/surface anchors remain exact.
Material edits are scoped to the selected model, and fixed palettes reject edits
in both illustrated and original shading variants.

The five living models use transform pivots for head, shoulders, elbows, hips,
knees, paws and tails. They export two two-second clips, Idle and Walk. Walk
translations are sampled against each leg's actual bounds to prevent floor
penetration between rotation keys. These are starter articulated assets, with
static outfits/coats; morph targets, wardrobe variants, growth, seated/lying/carry
poses and production navigation are not covered by those two clips.

## Files to retain and clean

Retain the source modules, pinned package/lockfile, exported GLBs/manifests,
reproducible character calibration fixtures, tests, documentation and useful
section review sheets. These are the reviewable deliverables, not scratch files.

Intermediate colour/angle PNGs, assembled HTML sheets and local diagnostic logs
belong in ignored `build/skill-verification/furniture-3d/`. Successful QA removes
intermediates automatically; `npm.cmd run qa:clean` does the same after a detailed
review. Only recognised regular files in that owned directory are removed.
Never remove another task's outputs or the owner's unrelated outgoing changes.
QA closes its own browser/server. Manual preview servers must be stopped when
review is finished. No commit or push is performed automatically.

## November 12 composition and shelf refinement

This follow-up keeps the original construction workflow and adjusts the result at actual game scale. Revised exports are `armchair`, `chair`, `deskchair`, `bookshelf`, `bookcase`, `shelf`, `ladder`, `wallshelf`, `plantshelf`, `plant` and `terrarium`. The section ledger remains the full 184-piece coverage record.

Chair backs are shorter while seat anchors stay fixed. Books have clearer cover colours. Nursery stock has larger, varied ceramic pots and fuller leaves, with foliage hues that remain readable in the room lighting. The Loft composition removes its floating side cabinet and shifts its workstation chair along the desk bay.

Shelves export names for their support boards and removable stock. The game offers per-placement contents using actual catalog book/plant meshes, fitted to those supports. Choice validation, persistent save flow, resource ownership and compatibility are documented in the [integration guide](ROOM_MODEL_INTEGRATION.md) and [codebase guide](CODEBASE_GUIDE.md).

Historical SVG furniture reports/images and the early physical-lighting prototype are preserved under [the modelling archive](archive/modeling/README.md). Current character/pet SVGs and runtime error fallbacks remain supported; they are not obsolete furniture references.

The [direction and layout audit](ROOM_LAYOUT_DIRECTIONS.md) records the later four-facing integration, native axes, reclined occupant calibration and seating/upholstery rules.
