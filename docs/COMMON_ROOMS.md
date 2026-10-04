# Common rooms: fixed places to settle together

Status: first usable Common Cottage implemented. Enter through Friends →
Common Cottage; choose a seat through the scene's Change seat control; use
Home or Escape to leave. The personal home remains independently editable.
This document records the feature direction and the remaining art work.

The first pass includes a raised reading floor with solid steps, a shared
study and lounge, six explicit seats and three simulated neighbours. Its
second art pass follows the supplied warm communal-study reference with
panelled walls, curtained windows, wall art and shelves, a vine-and-bulb
partition, clustered plants, layered rugs, active desktops and catalog-driven
lamp pools. Detail stays around edges and thresholds so all six seats remain
readable. Fixed props reuse the refined seating, storage, lamps and species-specific plants.
The renderer is `components/CommonRoom.jsx`; the scene manifest and seat
rules are `lib/commonRooms.js`. Occupancy lives only in the store's common-room
session. Entry cancels pending knocks and supersedes stale friend-room
requests. Choosing a seat does not write to the home API or its saved camera.

Current captures: [arrival](screenshots/39-common-cottage.webp),
[raised reading seat](screenshots/40-common-cottage-reading.webp), and
[seat selection](screenshots/41-common-cottage-seats.webp).

## Experience

Add furnished common places alongside the personal, decoratable home. A common
place is designed as a complete scene: connected rooms, fixed architecture,
raised floors, lighting, props and seating composed together. Entering means
joining a place that already feels occupied, rather than furnishing another
empty room.

The first version uses local simulated neighbours, like the existing Friends
system. It works offline. Actual people joining from other installations would
require a separate networked presence and seat-ownership feature.

The user flow is short:

1. Choose a common place from the Friends drawer. The first card gives its
   name, description and population; a scene thumbnail is future polish.
2. Arrive directly in a free seat wearing the user's current character. Three
   neighbours are already seated, with their own looks and focus/break states.
3. Select another open seat in the scene to settle there. Occupied seats show
   who is sitting there. Provide the same choices as keyboard/touch-reachable
   seat buttons; tiny chair artwork cannot be the only target.
4. Keep using the same tasks, focus timer and music controls. A change of seat
   or place never restarts a focus block or plays the HUD's boot entrance.
5. Use the bottom-left Home control or Escape to return to the saved home.

The common room has no furniture editing, catalog, floor-plan editor, tint
selection, furniture grab targets or Decorate action. Open seats get a quiet
highlight while choosing, rather than continuously flashing during a session.
Characters remain settled until the user chooses another seat. Arrival and
seat changes place the character directly; stair pathfinding is unnecessary
for this interaction. The existing carry gesture at home and on friend visits
continues to serve those places.

## First place: the Common Cottage

Design one convincing scene before making a collection. This is a connected
interior with distinct spaces, rather than a larger rectangular study hall.

| Space | Height and construction | Seats and purpose |
|---|---|---|
| Main lounge | Ground floor; sofa, low table, rug and a clear front edge | Two independently usable lounge seats |
| Shared study | Ground floor; two workstations, connected to the lounge through a cutaway partition/opening | Two study seats with clear views of their occupants |
| Window reading nook | A shallow raised floor at the back, reached by a short flight of steps; visible risers, floor thickness and a partial rail | Two window seats overlooking the lower room |
| Tea corner | Small fixed service area adjoining the lounge | Dressing and ambient steam; no additional seat in the first scene |

Six explicit seat slots allow three neighbours, the user, and two further
choices. The population rule reserves room for the user; the scene must not
randomly fill every seat and refuse arrival. Each lounge position is its own
slot even if both use one sofa sprite.

The raised nook occupies its own footprint. Start with a split-level interior,
where people are never directly under an upper floor. A full mezzanine with
inhabitable space below introduces another occlusion problem and comes later.
Architecture separates spaces without tall foreground shelves or full walls
covering the characters. The shelves belong on the rear walls. Each seat
must be visible and selectable at the default camera framing.

The references in `docs/inpso` support this direction: the loft references
use a supported raised bed, ladder and distinct kitchen/study/living areas;
the café reference uses openings, several settled occupants and deliberately
arranged furniture. These are observations of the supplied images, not claims
about another app's implementation or multiplayer behaviour.

## Fixed design, living occupants

Author the floor plan and furniture. Generate only the occupants from a small,
deterministic roster when entering. Do not randomly arrange catalog items:
it would surrender the composition that fixed places are meant to improve.

Neighbour identity, outfit and seat stay stable throughout a visit. Their
focus/break activity can continue using `npcActivity`, so each person has
their own routine rather than copying the user's timer. A task refresh or
opening a drawer must not reshuffle who is there. Slow arrivals/departures can
be a later feature after the static scene and seat selection work well.

The original seated rig remains the baseline following the rejected pose
prototype. Fixed seat anchors make it possible to review a future authored
pose against one known chair and table, but common rooms do not fix the rig
by themselves. A window profile or keyboard reach still needs coherent
character and garment artwork before animation.

Keep the existing material and item-modeling improvements. Use the same
SVG models and character renderer, with custom architecture where the scene
needs it. A single flattened room image would make character placement,
occlusion, theme colours and live lighting harder to maintain.

## What the current code supports

| Existing piece | Reuse | Gap |
|---|---|---|
| `lib/visiting.js` / `resolveVisitRoom` | Render-only occupants, derived NPC looks and a seated guest | A friend's home has one owner; a common place needs several occupants and explicit seat slots |
| `lib/isoRoom.js` / `seatFor`, `freeSeatSpot` | Current chair heights, poses and seating conventions | Seating is inferred from overlapping footprints on one floor; a fixed scene needs stable seat IDs and floor levels |
| `IsoRoom.jsx` | Item sprites, character activity, lighting/motion conventions and camera behaviour | Floor geometry, clipping, contact shadows and input currently assume one floor plane |
| `App.jsx` | Scene boundary, persistent HUD and a visible way home | Place selection must cover home, friend visit and common room without assuming every destination has `visiting.friend` |
| `store.jsx` | Character, tasks and a render-only scene session | Common-room occupancy must not run friend-home visit rewards or save a layout into the user's home |

The present stair sprite is architecture on the ground floor, not an actual
upper floor. `_lift` for a seated person or tabletop prop is also not a floor
level: those offsets do not lift the supporting floor, its lights or its
selection targets.

## Implementation boundaries

Use a dedicated fixed-scene manifest and renderer for the first common room,
sharing models and geometric helpers with the home renderer. Do not feed
extra floor metadata through `validateIsoLayout`: its contract is the existing
editable home format. No database migration is needed for local scene data.

The proposed manifest carries:

- A stable scene ID and title; framing bounds belong to the first renderer.
  Add a scene version before persisting any remembered seat preference.
- Floor surfaces with a stable level ID, footprint, material and base height.
- Authored architecture and props attached to those surfaces.
- Explicit seat slots with a stable ID, surface ID, character anchor, seat
  height, facing, pose and readable label, such as "Window seat".
- A population recipe and reviewed paint order/occlusion relationships.

Store the user's current seat by ID in an in-memory common-room session.
Seat changes validate the destination and its occupancy in one state update;
an unknown or occupied seat keeps the previous seat and gives brief feedback.
Two slots on a sofa must not resolve to the same character anchor. Changing
the user's outfit updates their figure without rebuilding the room population.

The store exposes the active place explicitly as home, friend visit or common room. Only
friend visits use the friend access/knock flow and existing visit bond logic.
Common-room participation must not award a visit to an arbitrary host. Keep
home-layout writes tied to home; returning restores its saved camera and
layout. Any future remembered common-room seat uses `lib/storage.js` and is
revalidated against the scene version and current occupancy.

### Height and occlusion

Project each supporting surface at its own base height. A seated character's
vertical placement includes the floor height plus the chair height; a lamp
on an upper-level table includes that floor height plus the table height.
Contact shadows and lamp pools are clipped to the supporting surface, rather
than leaking onto the ground floor below. Camera bounds include the upper
architecture and the tops of its occupants.

Tabletop props name their supporting furniture through `on`. The renderer
reuses `stackedPlacement` for its catalog surface height, bounded placement
and paint depth after the host, avoiding duplicated heights and hidden pots.

Platform faces, railings, partitions and furniture need reviewed occlusion
relationships. Adding a height value to the existing `gx + gy` sort, or
painting the whole upper floor last, does not guarantee correct overlap:
the front platform edge may hide a lower person but must not hide the upper
person's feet. For a fixed scene, author the necessary paint groups and split
long occluders where needed. Generalise only after that scene reads correctly.

Seat interaction uses the projected seat anchors/hit regions. It does not
need to infer a floor from a pointer and run the home grid-drag engine.
That is a substantial benefit of limiting interaction to seat selection.

## Delivery and visual acceptance

The first interaction and scene pass is implemented. The following sequence
remains the acceptance path for further architecture, art and motion polish.
The camera is deliberately fixed; pan/zoom and additional places remain open.

1. Author the Common Cottage static scene with all six seats, three neighbours
   and a sample user. Review the lounge/study separation and raised nook at
   room scale, including visible supports, step direction and platform edges.
2. Add the scene session, entry/exit and seat selection. Keep home and friend
   visits working independently. Reuse the settled character baseline.
3. Add restrained light, steam, foliage and activity gestures. Preserve the
   existing reduced-motion preference and dense-scene performance treatment;
   detailed architecture alone is not permission to animate every object.
4. Capture every selectable seat in idle/focus/break states, with light/dark
   outfits and body extremes. Only then add another common place.

The first feature is ready when all of the following hold:

- All six seats have distinct anchors, correct floor contact and readable
  occupants; no wall, shelf or platform unexpectedly hides them.
- Arrival guarantees a free seat, and changing seats cannot move a neighbour
  or put two people in one slot.
- The raised nook reads as a supported floor with steps, not furniture
  hovering above the lower room. Lighting and shadows agree with its height.
- Mouse, keyboard and touch users can select an open seat and return home.
- Home layout/camera, tasks, timer progress and audio survive entry and exit.
- No common-room action exposes editing controls or writes to the home API.
- Population remains stable across task refreshes, timer ticks and drawers;
  the user's character updates without reassigning seats.
- Reduced motion stays quiet, dense scenes remain responsive in WebView2,
  and normal HUD composition still fits at the supported window sizes.

Logic checks should cover seat occupancy, place transitions and preservation
of home state. Visual captures must cover every level and foreground
occluder; passing tests cannot approve the architecture or seated artwork.
