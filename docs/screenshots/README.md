# TaskNook — screenshots

Captured by driving the real app in a headless browser, not mocked up: every
shot is the built SPA talking to the Flask API, with tasks and focus sessions
created through the actual REST endpoints, and rooms applied by clicking the
same preset buttons you would. Room/UI captures are 1600×1000 WebP.
Character examples extract the real editor SVG and render it as a sharp model
closeup: individual portraits are 600×800, and eight-look sheets are 1600×1000.
They contain model artwork and preset labels, without application chrome.

Regenerate them with `frontend/scripts/screenshots.mjs` — the capture pipeline
is committed rather than rebuilt from scratch each time, and its header carries
the traps (cache-busting, re-enabling the Page domain after a navigation, and
running the backend against a throwaway `TASKNOOK_DB` so focus minutes don't
accumulate between runs).

The README's hero image is `../preview.png` — the same capture, as PNG.

Refreshed for the item-modeling pass and restored seated rig. The room gallery rotates through six saved
character looks, covering both body models, different builds and skin tones,
hairstyles, layered outfits, skirts, denim, winter clothing and swimwear.
These are ordinary profile selections, saved through the app's profile API.
The “In the room” toggle seats your character using the app's placement rules.
The weather comparison keeps one character and one room throughout.

The seating follow-up replaces the armchair/sofa's slab sides with curved
upholstery over visible timber frames, layers the desk-chair cushion and
back shell, and gives the garden bench separate slats and an open frame.
The gallery uses these updated sprites; [before/after comparisons](../model-review/seating-comparison.webp)
and [seated contact views](../model-review/seating-contact-front.webp) isolate the changes.

The October pass includes shaped chair frames, padded upholstery, layered bed linen,
recessed bookshelves, split-leaf plants and the refined character jaw, neck and bun.
See [the reference review](../ART_REVIEW.md) for the design findings and remaining gaps.

## Rooms

Each is a one-click preset: floor size, shape, environment and furniture all
replaced together. Personal rooms stay deliberately clean, while functional
public spaces use denser fixtures where the activity calls for them. Your own
character is seated through the Profile panel; communal rooms also retain
their existing residents.

| | |
|---|---|
| ![Shared home](28-shared-home.webp) **Shared home** — a shared room with one bed, opposing laptop desks, wall-side bookshelves and a lilac reading chair. | ![Loft](01-loft-night.webp) **Loft** — the default. A compact open attic with a left-window workstation and a quiet sleeping corner. |
| ![Cozy study](02-cozy-study.webp) **Cozy study** — desk under the window, you working at it, an easel in the corner and the cat on the rug. | ![Cozy cabin](03-cozy-cabin.webp) **Cozy cabin** — lit hearth with the dog asleep in front of it, snow falling outside. |
| ![Reading room](04-reading-room.webp) **Reading room** — an arched way through, tall windows, shelves and ladders either side. | ![Corner café](05-corner-cafe.webp) **Corner café** — an open bar run under the menu board, with tables across the floor. |
| ![Plant shop](30-plant-shop.webp) **Plant shop** — a working nursery with stocked display racks, two plant tables, a checkout counter and a clear browsing aisle. | ![Secret garden](06-secret-garden.webp) **Secret garden** — open air: a bench facing the pond, a hammock, and a dog on a blanket. |
| ![Terrace](07-terrace.webp) **Terrace** — waist-high balustrade instead of walls, flagstones, string lights at sunset. | ![Study hall](08-study-hall.webp) **Study hall** — 16×12, four tables with room to spare, pillars flanking the arch, a piano in the corner. |
| ![Autumn yard](09-autumn-yard.webp) **Autumn yard** — maples, a half-raked leaf pile, pumpkins, a scarecrow and a wandering turkey. | ![Winter yard](31-winter-yard.webp) **Winter yard** — snow play, a decorated tree and a smoking chimney under falling snow. |
| ![Poolside](32-poolside.webp) **Poolside** — a tiled terrace with a swimming pool, coconut palms, shade and sun loungers. | |

## Weather & time of day

The same room in five conditions — one tap in the Weather panel's matrix sets
both the weather and the hour.

| | |
|---|---|
| ![Rain](10-rain-night.webp) **Rain at night** | ![Storm](11-storm.webp) **Storm** — heavy cloud, lightning |
| ![Snow](12-snow-day.webp) **Snow by day** | ![Cloudy](13-cloudy-sunset.webp) **Cloudy at sunset** |
| ![Clear](14-clear-night.webp) **Clear night** — stars, and the odd shooting one | |

## Making it yours

### Character examples

These closeups show the actual model artwork at a useful scale. The preset
sheets include all eight looks, in standing and restored seated poses.

| | |
|---|---|
| ![Locs, gold sweater and teal maxi skirt](33-character-study.webp) **Study** — locs, a warm knit and a maxi skirt. | ![Curly hair, glasses, cardigan and jeans](34-character-casual.webp) **Casual** — a taller, broader model with curly hair, round glasses and layered denim styling. |
| ![Braids, puffer jacket, scarf and winter hat](35-character-winter.webp) **Winter** — braids, a puffer, scarf, trapper hat and boots. | ![Buzz cut, overalls and denim shorts](36-character-garden.webp) **Garden** — a buzz cut, olive overalls, denim shorts and work boots. |
| ![Character starting looks](37-character-presets.webp) **Starting looks** — closeups of all eight presets, including fall, school, office, lofi and gamer styles. | ![Seated character preset previews](38-character-presets-seated.webp) **Seated looks** — all eight presets on the restored seated rig, with no app UI obscuring the models. |

### Personalization tools

| | |
|---|---|
| ![Your character](22-character.webp) **Your character** — body models, hairstyles, skin/hair/outfit colours, expression, body sliders, and who's allowed to visit. | ![Room presets](23-room-panel.webp) **Rooms** — start from a preset, then resize the floor, pick its material and choose whether it has walls at all. |
| ![Furniture](24-furniture.webp) **Furniture** — themed sections, each button a live miniature of the thing it places. | ![Decorating](25-decorating.webp) **Decorating** — draw the floor plan tile by tile, then drag furniture across the grid. |
| ![Floor plan](29-floor-plan.webp) **Floor plan** — paint solid walls or passable archways along individual tile edges; occupied tiles remain marked while reshaping. | |

## Friends & visiting

| | |
|---|---|
| ![Friends](26-friends.webp) **Friends** — who's about, what they're up to right now, and whose room is open. | ![Visiting](27-visiting.webp) **Visiting** — walk into someone else's room, and drag yourself over to sit with them. |

## Common places

Fixed furnished spaces have their own architecture and seat selection. The
Common Cottage includes a raised reading nook, lounge, shared study and three
local simulated neighbours. Enter through Friends; the home remains editable.

| | |
|---|---|
| ![Common Cottage](39-common-cottage.webp) **Arriving** — an open study seat with neighbours already settled. | ![Raised reading nook](40-common-cottage-reading.webp) **Reading nook** — choose the raised armchair without moving the furniture. |
| ![Choosing a seat](41-common-cottage-seats.webp) **Seat selection** — open seats highlighted in the scene and listed as accessible buttons; occupied seats name their neighbour. | |

## Features

| | |
|---|---|
| ![Tasks](15-tasks.webp) **Tasks** — groups, priorities, durations, routines, six ordering algorithms | ![Timer](16-focus-timer.webp) **Focus timer** — durations, Pomodoro, stopwatch, daily goal and streak (and the room notices you working) |
| ![Sounds](17-sounds.webp) **Sounds** — lofi stations plus a procedural ambient mixer | ![Calendar](19-calendar.webp) **Calendar** — days shaded by how much you focused, and a breakdown of what each one went on |
| ![Weather](20-weather.webp) **Weather** — real conditions via Open-Meteo, and the scene matrix | ![Settings](21-settings.webp) **Settings** — colour schemes, brightness, motion |
