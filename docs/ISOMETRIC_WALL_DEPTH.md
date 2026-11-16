# Isometric wall thickness

November 15, 2026. This change applies to the GLB-backed isometric rooms.
The supplied [loft references](ART_REVIEW.md) show substantial exposed wall
tops and ends. The previous shell used one flat face and a narrow vertical
strip along its top, which gave it a paper-like silhouette.

## Construction

The existing decorated inner wall stays in place. The wall section extrudes
**0.42 floor tiles outward**, producing a projected top surface and a visible
near end face. Different shading on the cap, end and interior makes that
thickness readable without adding detail to the room's empty floor.

Perpendicular runs meeting at an endpoint share a mitered outer corner. The
two caps therefore meet at one point instead of leaving a gap or doubling the
corner post. Where a full wall meets a low cutaway, the taller section's
exposed end stops at the lower neighbour's roof height. Separate wall runs
remain separate, including across holes in a shaped floor.

The shared section renderer covers:

- All editable isometric home/visited room shells and their preset previews.
- Full-height walls and low terrace/cutaway edges. Outdoor environments that
  have no walls still have none.
- Common Cottage and Grand Library's authored exterior walls, with their
  existing wall heights and interior details.

Interior partition/arch artwork retains its existing construction. The classic
2D cottage retains its [earlier illustrated remodel](CLASSIC_ROOM_REMODEL.md).

## Ownership and saved data

| Source | Responsibility |
| --- | --- |
| `frontend/src/lib/wallSection.js` | Projected extrusion, shared corner geometry and exposed height steps |
| `frontend/src/components/WallSection.jsx` | Cap/end surfaces and material shading |
| `frontend/src/components/ExteriorWall.jsx` | Existing decorated face, cutaway height and shell integration |
| `frontend/src/components/IsoRoom.jsx` | Supplies the full wall-run list for corner joins |
| `frontend/src/components/IsoRoomPreviews.jsx` | Uses the same sections and reserves horizontal space for their thickness |
| `frontend/src/components/CommonRoom.jsx`, `CommonLibraryScene.jsx` | Reuse the section renderer around their authored walls |

The 48×24 grid, usable floor, room mask, wall-mount planes, furniture positions,
rotations, colours and camera storage are unchanged. No database conversion or
new setting is needed. Thickness follows the projection rather than adding a
screen-space stroke. The artwork introduces no model downloads, SVG filters,
timers or pointer targets; catalog furniture continues to use its actual GLBs.

## Verification

The full frontend suite passes **1,684 tests**, with one optional test skipped.
New geometry cases cover both wall directions, unchanged interior planes,
shared outer corners, height steps and disconnected runs. Lint and production
build pass. Local structural review keeps the pure geometry, artwork, room
integration and persistence in their existing owners. The separately installed
private shared toolkit is unavailable here; this records local project review.

`e2e/isometric-wall-depth.spec.mjs` uses native Edge and an isolated real
backend. It checks the fourteen current presets through the Room controls,
including full/low/no-wall environments, real GLB readiness, preset previews,
saved-layout reload and a 600×420 window. Additional cases cover a masked
floor with full and low sections, a mounted clock, and both indoor common
places. Screenshots show the finished room compositions and exposed sections.
The restored classic room separately passes its three browser scenarios.

The root executable and matching update manifest are rebuilt on the explicit
`main` channel, followed by exact bundled-source verification and an isolated
frozen startup self-test. Selected gallery captures and repeatable tests stay
in the repository. Raw browser captures, temporary configuration, disposable
databases and generated packaging scratch files are removed after review;
logs and result summaries remain under ignored
`build/skill-verification/iso-wall-depth/`.
