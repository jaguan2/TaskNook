# Readable scene task list

November 15, 2026. The scene's To-Do list now sits on one frosted surface.
The earlier text-only treatment let window trim, wall art and furniture
compete with the task text, particularly in the classic 2D room.

## Layout and rendering

`HudTasks.jsx` remains the shared on-scene list for classic and isometric
rooms. Its existing foreground layer, task actions, groups and visibility
rules stay in place. A named region makes the list easy to locate with
assistive technology.

The panel has an automatic content height. A short list stays compact; adding
tasks or expanding details increases its height. At 72% of the window height,
or the available space above the bottom controls, only the middle list scrolls.
The heading and quick-add field remain visible. Scroll chaining is contained
inside the list, and rows have no fading mask that could wash out their text.

`index.css` owns the `.hud-tasks` surface: theme-based plum, a quiet border,
rounded corners, a restrained shadow and one 16px backdrop blur over the whole
panel. Browsers without backdrop filtering receive a more opaque background.
There is no per-task filter, JavaScript height measurement, new timer or
additional saved preference.

The established narrow-window rule still applies: below 600px the HUD stays
mounted but invisible, and Tasks in the dock opens the full manager. Decorating,
widget mode, Settings visibility and foreground drawers retain their existing
hide/restore behavior without replaying the intro animation.

## Verification and delivery

Seven existing HUD behavior tests pass, together with lint and the production
build. `e2e/task-hud-surface.spec.mjs` uses native Edge and a disposable backend
to verify actual quick-add, completion, content growth, a long scrolling list,
fixed quick-add placement, foreground hit targets, 600×420 framing, the 390px
Tasks alternative, real isometric models and hide/restore around a drawer.
The browser also checks that the backdrop filter is active.

Current [short](screenshots/75-task-hud-short.webp),
[long](screenshots/75-task-hud-long.webp),
[small-window](screenshots/75-task-hud-small.webp) and
[isometric](screenshots/75-task-hud-isometric.webp) captures show the real UI.
The executable/update-manifest pair is rebuilt on the explicit `main` channel,
verified against its bundled sources and startup-tested with isolated app data.

Local structural review keeps the task store, refresh order, timer and HUD
visibility owners unchanged. The private shared toolkit is unavailable in this
environment, so this records local project review. Temporary captures,
configuration and databases are removed after inspection; logs and result
summaries stay under ignored `build/skill-verification/task-hud-surface/`.
