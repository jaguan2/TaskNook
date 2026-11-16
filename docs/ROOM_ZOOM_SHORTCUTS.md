# Room zoom shortcuts

Completed November 16, 2026. Keyboard zoom changes the room camera; the task
list, timer, text, drawers and other controls keep their size.

| Shortcut | Action |
| --- | --- |
| Ctrl + `+` or Ctrl + `=` | Zoom into the room |
| Ctrl + `−` | Zoom out |
| Ctrl + `0` | Restore the initial room view |

The corresponding Command shortcuts work on macOS. Keypad plus/minus are
accepted. Ordinary typing, Alt/AltGr combinations and composing input retain
their existing behavior. These explicitly modified camera commands also work
with a task input focused, preserving its draft and focus. An open modal
blocks room zoom; the browser's page zoom is suppressed for these commands.

## Ownership and behavior

`lib/roomZoom.js` owns command recognition and bounded, anchor-preserving view
geometry. `hooks/useRoomZoom.js` provides one keyboard listener per active room
and a local camera for the classic cottage and common places. Preset thumbnails
and paused/widget scenes do not register active zoom shortcuts.

`useIsoCamera.js` reuses that command listener and geometry. Keyboard zoom is
centred on the current view, including after panning. Mouse-wheel zoom retains
its cursor anchor and limits. Reset also clears an unfinished camera pan.
The existing storage gateway/debounce saves the home isometric camera;
zooming a friend's room does not overwrite it.

Classic and common-place zoom stays local to the mounted scene, resetting on a
new visit or renderer mount. Common-room seat changes keep the active zoom.
No furniture coordinates, floor dimensions, task data or native page zoom
settings change. Pointer-to-world conversion continues through the SVG's
current transform, so decoration interaction follows the zoomed camera.

## Verification and delivery

The full frontend suite passes **1,696 tests**, with one optional test skipped.
Added cases cover command variants, AltGr/IME, centred zoom, cursor anchors,
limits, modal blocking, draft preservation, listener cleanup, preview disabling,
home-camera persistence and visit isolation. Lint and production build pass.

`e2e/room-zoom-keys.spec.mjs` passes three native Edge scenarios: isometric
zoom/limits/reset/wheel/persistence, classic previews and decoration after zoom,
and Grand Library's visit-local camera and modal protection. It compares HUD
dimensions and browser pixel ratio to ensure the UI is not zoomed. Reference
captures show [isometric](screenshots/76-room-zoom-isometric.webp) and
[classic](screenshots/76-room-zoom-classic.webp) rooms after keyboard zoom.

The matching main-channel executable and manifest pass exact bundled-source
verification and an isolated frozen startup test. A disposable desktop window
also visually confirmed Ctrl + using real Windows keyboard input. Additional
desktop measurements were interrupted by the test connection; the browser
scenarios provide the complete measured plus/minus/reset coverage. Desktop
test data was isolated from the user's database.

Local structural review preserves the existing camera, persistence and timer
boundaries. The private shared toolkit is unavailable, so this records local
project review. Selected captures and repeatable tests remain in the repository;
temporary browser/native probes, app data and packaging scratch files are
removed. Logs and result summaries stay under ignored
`build/skill-verification/room-zoom-keys/`.
