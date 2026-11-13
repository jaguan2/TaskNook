# Artwork references and review

Use the supplied photographs in [`inpso/`](inpso/) for style and composition. The folder name is retained because the workshop loads references from it. Design original TaskNook assets from these observations; do not trace or import reference artwork.

| Reference | Useful cues |
| --- | --- |
| [Pink loft](inpso/ss_0910e38ff3bd0815ba99786fd63853dc1d8a84cc.1920x1080.jpg) | Compact activity groups, soft upholstery and controlled accent colour |
| [Timber loft](inpso/ss_11568adac20d4baea389a2e0a1c85137ff403955.1920x1080.jpg) | Connected timber frames, bedding layers and warm material contrasts |
| [Shared loft](inpso/ss_82d9f29a63805ec614dc8262cef91726b1238f21.1920x1080.jpg) | Furniture grouped around work, sleeping and conversation |
| [Close room view](inpso/b603fdd9497a472249116e7dc02960438ef96cee.jpg) | Clear seat, foot and work-surface contacts |
| [Café](inpso/ss_18f591f3e019a2fa4e390c661167a536b08d6ded.1920x1080.jpg) | Stocked shelves, readable appliances and paired table seating |
| [Reading library](inpso/ss_b75b094d60d1450e578baf36ed8afff65ead884e.1920x1080.jpg) | Shelved walls, occupied reading nooks and warm pools of light |
| [Pond study](inpso/ss_2e86b624b56035de6e9bac0c0320ad7c11326dbf.1920x1080.jpg) | One outdoor focal group and a legible approach |
| [Decoration view](inpso/ss_1c3561ee5cf018980ca30228ffaed036ffd20830.1920x1080.jpg) | Distinct plant silhouettes and restrained decorative accents |

## Current implementation

The isometric game uses 179 standalone GLB props alongside the existing customized SVG characters and pets. The separate classic cottage and graphics-failure fallback also use SVG. Those supported render paths remain runtime code.

Start with [model integration](ROOM_MODEL_INTEGRATION.md), [construction approach](CATALOG_3D_APPROACH.md), [the model specification](MODELS.md) and [room composition](ROOM_LAYOUT_COMPOSITION.md). Review the [current model gallery](model-review/README.md) and [actual app screenshots](screenshots/README.md), then verify new work in the running app. Geometry tests establish bounds and contacts; screenshots establish readability and style.

The superseded SVG furniture reports, duplicated roadmap and early physical-lighting screenshots were removed in the November 12 maintenance pass. Their reusable guidance is retained here and in the current model guides; previous file contents remain in Git history. See [maintenance](MAINTENANCE.md) for the cleanup policy and stability checks.
