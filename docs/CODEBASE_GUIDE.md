# Codebase guide

Start with the state owner for the behavior you want to change. `App.jsx` composes the screens; it should not become a second persistence or modelling layer. [Repository guidance](../.agents/README.md) remains the canonical architecture and delivery contract.

| Area | Entry points | Responsibility |
| --- | --- | --- |
| App composition | `frontend/src/App.jsx` | Home/visit boundaries, panels and scene props |
| Shared state | `frontend/src/store.jsx` | User actions and state ownership; existing storage gateway handles durable saves |
| Room data | `frontend/src/lib/isoRoom.js`, `isoCatalog.js`, `isoPresets.js`, `isoSeasonalPresets.js` | Catalog contracts, validated placements and grouped personal presets |
| Visit arrivals | `frontend/src/lib/visiting.js` | Stored owner positions, available seats and café counter anchors |
| Room interactions | `frontend/src/components/IsoRoom.jsx` | Scene ordering, item selection, carrying and camera input |
| Model display | `frontend/src/components/IsoCatalogModel.jsx` | Image subscriptions, previous-image leases and SVG fallback |
| Image lifecycle | `frontend/src/services/catalogImageCache.js` | Shared lazy renderer, active leases, bounded unused images and URL disposal |
| Model rendering | `frontend/src/services/catalogRenderer.js` | GLB loading, serialized GPU work, orientation, framing and hit masks |
| Furniture facing | `frontend/src/lib/furnitureFacing.js` | Compass names, native model axes and the shared saved-rotation contract |
| Shelf contents | `frontend/src/lib/shelfDecor.js`, `services/catalogShelfDecor.js` | Bounded saved choices; decorations fitted to real authored shelf boards |
| Artwork source | `prototypes/furniture/src/models/` | Standalone closed meshes, materials and explicit contact probes |
| Asset delivery | `frontend/scripts/catalog-model-assets.mjs` | Hash-checked authoring exports emitted as offline app assets |
| Room API | `backend/routes/room_profile.py` | Validates and stores JSON layouts; no separate shelf database |
| Desktop delivery | `scripts/desktop_package.py` | Matching executable/manifest, source identity and frozen checks |

The separate timer provider owns its ticking state; avoid subscribing the whole scene to its one-second tick. Preserve task-first refresh ordering, the private desktop bridge and the storage gateway when making related changes.

## Following a shelf edit

`RoomTintPicker` → `ShelfDecorControls` → `setIsoItemDecor` → existing room save → validated backend JSON. Rendering follows placement `decor` → normalized cache request → serialized GLB render → transparent image and alpha-shaped hit path. Preset thumbnails pass the same decoration data.

The source shelf exports named support boards and removable content parts. Custom contents reuse catalog book and plant meshes, scale within each board's width/depth and available headroom, and rest on its actual top. Each loaded shelf keeps a bounded collection of layouts. Book materials belong to that shelf's custom layout; changing one placed shelf does not mutate another placement's image.

## Comments and units

Comments should explain ownership, invariants, coordinate units and resource lifetime. Keep dated investigation notes in Markdown rather than accumulating bug histories inside render functions. Grid placements use tiles, authoring geometry uses tile units, and scene/contact heights use logical SVG pixels. Projection conversion belongs in `catalogProjection.js`.

Use the [model integration guide](ROOM_MODEL_INTEGRATION.md) for the renderer's limitations and [current gallery](model-review/README.md) for visual evidence. Earlier furniture reports and images are in the [modelling archive](archive/modeling/README.md).

The [direction and layout guide](ROOM_LAYOUT_DIRECTIONS.md) covers four-view model rotation, seat-facing ownership and the preset/common-place audit.

The [personal-room composition guide](ROOM_LAYOUT_COMPOSITION.md) records each preset's purpose, dimensions, covered pieces and visual review method. Keep group comments beside explicit placements; fit the floor to the furniture. Group destinations and their capacity belong in `commonRooms.js`.
