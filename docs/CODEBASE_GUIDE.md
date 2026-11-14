# Codebase guide

Start with the state owner for the behavior you want to change. `App.jsx` composes the screens; it should not become a second persistence or modelling layer. [Repository guidance](../.agents/README.md) remains the canonical architecture and delivery contract.

| Area | Entry points | Responsibility |
| --- | --- | --- |
| App composition | `frontend/src/App.jsx` | Home/visit boundaries, panels and scene props |
| Room entry | `frontend/src/components/CommonRoomEntry.jsx`, `RoomLoadingScreen.jsx` | Common-place image preparation, scoped progress and cancellation; shared scene-chunk loading feedback |
| Shared state | `frontend/src/store.jsx` | User actions and state ownership; existing storage gateway handles durable saves |
| Neighbour profiles | `frontend/src/lib/npcProfiles.js`, `components/FriendProfile.jsx` | Stable fictional facts and inline details; existing daily/weekly simulation supplies study totals |
| Room data | `frontend/src/lib/isoRoom.js`, `isoCatalog.js`, `isoPresets.js`, `isoSeasonalPresets.js` | Catalog contracts, validated placements and grouped personal presets |
| Visit arrivals | `frontend/src/lib/visiting.js` | Stored owner positions, available seats and café counter anchors |
| Room interactions | `frontend/src/components/IsoRoom.jsx` | Scene ordering, item selection, carrying and camera input |
| Model display | `frontend/src/components/IsoCatalogModel.jsx` | Image subscriptions, previous-image leases and SVG fallback |
| Image lifecycle | `frontend/src/services/catalogImageCache.js` | Shared lazy renderer, active leases, bounded unused images and URL disposal |
| Model rendering | `frontend/src/services/catalogRenderer.js` | GLB loading, serialized GPU work, orientation, framing and hit masks |
| Furniture facing | `frontend/src/lib/furnitureFacing.js` | Compass names, native model axes and the shared saved-rotation contract |
| Shelf contents | `frontend/src/lib/shelfDecor.js`, `services/catalogShelfDecor.js` | Bounded saved choices; decorations fitted to real authored shelf boards |
| Furniture colours | `frontend/src/lib/furnitureColors.js` | Primary tint and optional bed frame/sheet/pillow colours, material roles and defaults |
| Furniture sizing | `frontend/src/lib/furnitureDimensions.js`, `hooks/useFurnitureResize.js` | Per-type canonical tile limits, legacy defaults and local drag previews that commit on release |
| Artwork source | `prototypes/furniture/src/models/` | Standalone closed meshes, materials and explicit contact probes |
| Character mesh pilot | `prototypes/furniture/src/characters/` | Isolated Blender authoring, weighted skeleton, export and live comparison preview; production actors remain SVG |
| Wardrobe fit | `frontend/src/components/character/`, `prototypes/furniture/scripts/review-wardrobe.mjs` | Live SVG clothing/hair and repeatable full-figure fit samples; coverage and future mesh interfaces in [the review](WARDROBE_FIT_REVIEW.md) |
| Pet mesh pilots | `prototypes/furniture/src/pets/` | Connected animal anatomy, weighted rigs and source-calibrated age/form previews; shared Blender primitives live in `src/blender_geometry.py` |
| Asset delivery | `frontend/scripts/catalog-model-assets.mjs` | Hash-checked authoring exports emitted as offline app assets |
| Room API | `backend/routes/room_profile.py` | Validates and stores JSON layouts; no separate shelf database |
| Desktop delivery | `scripts/desktop_package.py` | Matching executable/manifest, source identity and frozen checks |

The separate timer provider owns its ticking state; avoid subscribing the whole scene to its one-second tick. Preserve task-first refresh ordering, the private desktop bridge and the storage gateway when making related changes.

## Following a neighbour profile

In Friends, the name/avatar button expands one inline `FriendProfile`.
`FriendsPanel` owns the selected friend ID and returns focus to that button when
Close or Escape dismisses the details. Chat, Visit and removal are separate
buttons. The disclosure stays within the existing scrolling drawer and uses its
normal keyboard/touch flow; it adds no visit, profile-save or storage action.

`npcProfiles.js` owns character-world birthdays, gender/pronouns, joined dates
and a short interest description. The four familiar neighbours have authored
facts; additional local NPCs receive deterministic facts keyed by username.
These joined dates belong to the fictional character, independently of when the
local database was created. Facts survive reload, removal/re-addition and outfit
changes without storing another copy. Dates parse as local calendar parts before
locale formatting, avoiding UTC birthday shifts. All five interface languages
provide the labels, gender text and interest descriptions.

The expanded card receives the row's existing `npcDailyStats` result and obtains
week-to-date minutes through `npcWeeklyFocusMinutes`, the same policy as the
Weekly board. The panel retains its existing 30-second clock; the profile does
not subscribe to the focus timer or schedule another clock. Current captures are
[desktop](screenshots/68-friend-profile.webp) and
[390px touch layout](screenshots/68-friend-profile-small.webp), generated by
`e2e/friend-profiles.spec.mjs` against an isolated real backend.

Verification covers stable dates and generated identities (including unusual
usernames), a single open profile, keyboard focus/close, touch at 390px/320px,
reload, localized dates, independent Chat/Visit and weekly-board agreement.
The full frontend suite passes 1,647 tests (one optional generator skipped), plus
lint/build and all five profile browser scenarios. Review preserves the existing
store, visit and timer boundaries; the separately installed shared toolkit is
unavailable. Ignored evidence is under `build/skill-verification/friend-profiles/`;
temporary browser outputs, helper configuration and frozen-test data are removed.

The November 14 main build `ec088e354cb549398ac5fdc4d269e581` includes these
profiles and the corrected chair bases. Source/bundle/manifest verification and
the installed executable's isolated startup self-test pass. Its SHA-256 is
`16e3c03ea0d3c7e83ec44d69927b148a571c96eace2209df8a560e10b84a632f`.

## Following a shelf edit

Decorate selection → `IsoItemInspector` Colours → `RoomTintPicker` → `ShelfDecorControls` → `setIsoItemDecor` → existing room save → validated backend JSON. Rendering follows placement `decor` → normalized cache request → serialized GLB render → transparent image and alpha-shaped hit path. Preset thumbnails pass the same decoration data.

The source shelf exports named support boards and removable content parts. Custom contents reuse catalog book and plant meshes, scale within each board's width/depth and available headroom, and rest on its actual top. Each loaded shelf keeps a bounded collection of layouts. Book materials belong to that shelf's custom layout; changing one placed shelf does not mutate another placement's image.

## Comments and units

Comments should explain ownership, invariants, coordinate units and resource lifetime. Keep dated investigation notes in Markdown rather than accumulating bug histories inside render functions. Grid placements use tiles, authoring geometry uses tile units, and scene/contact heights use logical SVG pixels. Projection conversion belongs in `catalogProjection.js`.

The [maintenance guide](MAINTENANCE.md) explains model-image leases, effect replay, stability checks and which generated/reference files remain useful. Cache snapshots do not start GPU work; subscriptions do. Keep the previous image leased until its replacement is ready, and clear a released lease reference so effect replay can reacquire it.

Use the [model integration guide](ROOM_MODEL_INTEGRATION.md) for the renderer's limitations, [current gallery](model-review/README.md) for visual evidence and [artwork reference guide](ART_REVIEW.md) for the supplied photographs.

The [direction and layout guide](ROOM_LAYOUT_DIRECTIONS.md) covers four-view model rotation, seat-facing ownership and the preset/common-place audit.

The [personal-room composition guide](ROOM_LAYOUT_COMPOSITION.md) records each preset's purpose, dimensions, covered pieces and visual review method. Keep group comments beside explicit placements; fit the floor to the furniture. Group destinations and their capacity belong in `commonRooms.js`.

## Following a Decorate action

`DecorateToolbar` opens the furniture catalogue or invokes undo/redo/Done. `RoomPanel` opens on Furniture during editing, remembers search/category through the shell, and closes after a successful addition. Room setup retains the floor, wall, lighting and preset tools. `IsoItemInspector` owns labelled selected-piece actions and Move, Colours and Size tools; its Colours view embeds `RoomTintPicker`. `IsoRoom` only supplies furniture customization callbacks and keyboard selection while editing. Ordinary room clicks cannot open the inspector or colour controls.

`useFurnitureMove` owns captured-pointer previews and cancellation. It validates against `moveIsoPlacements`, then calls the store once on release. `useFurnitureResize` follows the same local-preview boundary. Supported occupants and desktop equipment travel with their parent furniture. Shortcuts live in `IsoRoom` and stand down for text inputs, active gestures and resize-handle keys; visits, common places and widget mode receive no active home editing controls.

Interactive room actions pass through `useRoomEditHistory`. `roomEditHistory.js` records property patches rather than whole room snapshots so undo preserves unrelated automatic pet/character updates. Continuous changes to one colour channel group within 700ms; history holds 40 edits, clears redo after a new edit, and resets on account/bootstrap changes. History is session-local. The existing room persistence effect remains the only save path.

## Following a furniture resize

`IsoResizeHandles` draws four floor-corner grips for beds, sofas, desks and the five floor-standing shelf styles. `furnitureResize.js` maps their screen corners to canonical model dimensions at every facing and computes the new origin. Authored non-half-tile spans snap their opposite edge onto the saved half grid on first resize, avoiding a later reload shift. Wall shelves keep their existing mounted control.

`useFurnitureResize` previews origin and dimensions together. `resizeIsoPlacements` checks the entire footprint against floor, partitions, added overlap and equipment support. `replaceFurniturePlacement` carries occupants/equipment through resizing, moves and turns. `resizeIsoItem(id, dimensions, origin)` commits the pair as one history/save action. Escape, cancelled pointers and lost capture discard both. Corner keys own their arrows, so the scene's nudge shortcut cannot also move the piece. The original floating control and Size steppers keep a fixed origin. Visitors and common places receive no resize callback.

`rotateIsoPlacements` owns rotation geometry and the irregular-floor relocation fallback. Turns, moves and resizes check their resulting carried group for increased intersections, including pairs of tabletop props. Surface clamping is included in that check; its paint-only depth nudge is excluded. A refused turn or shrink creates no history/save action. Returning a drag to its press point restores the original geometry, including implicit authored sizes, and commits no edit.

Optional placement `dimensions: { w, d }` uses canonical tile axes before rotation. Pass the placement to `footOf`, clamping and free-spot helpers so drawing, placement, carrying, pet navigation and floor-plan occupancy agree. Missing dimensions retain the authored footprint; `RESIZABLE_FURNITURE` defines the supported bed, sofa, desk and six shelf limits. Home on the resize handle removes the override. Heights stay fixed.

`prototypes/furniture/src/models/resizable-models.mjs` dispatches shared bed, upholstery, desk and shelf construction. `shelf-layout.mjs` declares receiving boards and fits contents between supports. Requests include item and size in their cache identity; the renderer's eight-entry mesh LRU releases owned geometry/materials inside its serialized queue. Borrowed catalog decorations keep their source owner. The virtual manifest supplies seat/surface anchors as well as dimensions. See the integration guide for the complete type/limit table.
