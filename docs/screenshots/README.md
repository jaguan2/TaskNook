# TaskNook — screenshots

Captured by driving the real app in a headless browser, not mocked up: every
shot is the built SPA talking to the Flask API, with tasks and focus sessions
created through the actual REST endpoints, and rooms applied by clicking the
same preset buttons you would. 1600×1000 WebP.

Regenerate them with `frontend/scripts/screenshots.mjs` — the capture pipeline
is committed rather than rebuilt from scratch each time, and its header carries
the traps (cache-busting, re-enabling the Page domain after a navigation, and
running the backend against a throwaway `TASKNOOK_DB` so focus minutes don't
accumulate between runs).

The README's hero image is `../preview.png` — the same capture, as PNG.

## Rooms

Each is a one-click preset: floor size, shape, environment and furniture all
replaced together. Personal rooms stay deliberately clean, while functional
public spaces use denser fixtures where the activity calls for them. Your own
resident is dropped in from the picker and sat down where a person would
actually sit; the communal rooms come with people already in them.

| | |
|---|---|
| ![Shared home](28-shared-home.webp) **Shared home** — an asymmetric apartment with recessed sleeping and projecting kitchen wings around a shared living/work room. | ![Loft](01-loft-night.webp) **Loft** — the default. A compact open attic with a screened sleeping corner. |
| ![Cozy study](02-cozy-study.webp) **Cozy study** — desk under the window, you working at it, an easel in the corner and the cat on the rug. | ![Cozy cabin](03-cozy-cabin.webp) **Cozy cabin** — lit hearth with the dog asleep in front of it, snow falling outside. |
| ![Reading room](04-reading-room.webp) **Reading room** — an arched way through, tall windows, shelves and ladders either side. | ![Corner café](05-corner-cafe.webp) **Corner café** — an open bar run under the menu board, with tables across the floor. |
| ![Plant shop](30-plant-shop.webp) **Plant shop** — a working nursery with stocked display racks, two plant tables, a checkout counter and a clear browsing aisle. | ![Secret garden](06-secret-garden.webp) **Secret garden** — open air: a pond to sit by, a hammock, and the cat on a blanket. |
| ![Terrace](07-terrace.webp) **Terrace** — waist-high balustrade instead of walls, flagstones, string lights at sunset. | ![Study hall](08-study-hall.webp) **Study hall** — 16×12, four tables with room to spare, pillars flanking the arch, a piano in the corner. |
| ![Autumn yard](09-autumn-yard.webp) **Autumn yard** — the seasonal one: maples, a half-raked leaf pile, pumpkins by the hay bale. | |

## Weather & time of day

The same room in five conditions — one tap in the Weather panel's matrix sets
both the weather and the hour.

| | |
|---|---|
| ![Rain](10-rain-night.webp) **Rain at night** | ![Storm](11-storm.webp) **Storm** — heavy cloud, lightning |
| ![Snow](12-snow-day.webp) **Snow by day** | ![Cloudy](13-cloudy-sunset.webp) **Cloudy at sunset** |
| ![Clear](14-clear-night.webp) **Clear night** — stars, and the odd shooting one | |

## Making it yours

| | |
|---|---|
| ![Your character](22-character.webp) **Your character** — two models, nine hairstyles, skin/hair/outfit colours, expression, body sliders, and who's allowed to visit. | ![Room presets](23-room-panel.webp) **Rooms** — start from a preset, then resize the floor, pick its material and choose whether it has walls at all. |
| ![Furniture](24-furniture.webp) **Furniture** — 130-odd pieces in themed sections, each button a live miniature of the thing it places. | ![Decorating](25-decorating.webp) **Decorating** — draw the floor plan tile by tile, then drag furniture across the grid. |
| ![Floor plan](29-floor-plan.webp) **Floor plan** — paint solid walls or passable archways along individual tile edges; occupied tiles remain marked while reshaping. | |

## Friends & visiting

| | |
|---|---|
| ![Friends](26-friends.webp) **Friends** — who's about, what they're up to right now, and whose door is open. | ![Visiting](27-visiting.webp) **Visiting** — walk into someone else's room, and drag yourself over to sit with them. |

## Features

| | |
|---|---|
| ![Tasks](15-tasks.webp) **Tasks** — groups, priorities, durations, routines, five ordering algorithms | ![Timer](16-focus-timer.webp) **Focus timer** — durations, Pomodoro, stopwatch, daily goal and streak (and the room notices you working) |
| ![Sounds](17-sounds.webp) **Sounds** — lofi stations plus a procedural ambient mixer | ![Calendar](19-calendar.webp) **Calendar** — days shaded by how much you focused, and a breakdown of what each one went on |
| ![Weather](20-weather.webp) **Weather** — real conditions via Open-Meteo, and the scene matrix | ![Settings](21-settings.webp) **Settings** — colour schemes, brightness, motion |
