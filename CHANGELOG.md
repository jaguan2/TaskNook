# Changelog

A human-readable history of TaskNook — the git log written out in full
sentences, with the reasoning put back in. `git log` tells you *what* changed;
this file tries to also say *why*, and calls out the actual decisions (and
reversed decisions) made along the way. Feature-level "why" that stays true
going forward lives in `CLAUDE.md`; this file is the day-by-day record of how
it got there.

Newest entries at the top. Entries are grouped by day (local time), tagged
NEW / ADJUSTED / FIXED / REMOVED / UPDATED to match the commit convention this
project already uses.

---

## 2026-08-19 (night)

Built with Claude Code.

**ADJUSTED**
- **README de-emojified.** Dropped the decorative emoji throughout —
  section headers, the Features table's leading icon column, the ordering-
  algorithm and roadmap bullets, and the footer — since a themed emoji on
  every heading and table row is a well-known tell of AI-generated docs.
  Kept the handful that are genuinely functional (⚙, ⟳, ↻) since those name
  real on-screen buttons rather than decorate the text. TOC anchors updated
  to match the de-emojified headings.

## 2026-08-19 (evening)

Built with Claude Code.

**NEW**
- **Random weather.** A third way to drive the scene's weather, alongside a
  manual pick and "Match my real weather" — `weatherMode` now drifts on its
  own every 30 minutes, no location or internet required. Conditions ease
  through neighbours rather than jumping between extremes (clear weather
  can't roll straight into a storm; a storm eases back to rain before it can
  clear), the same "like real life" framing the real-weather match already
  uses. The seasonal "falling leaves" mode stays a manual-only pick, same
  reasoning as auto-match. All three ways of setting `weatherMode` are
  mutually exclusive — turning one on switches the other two off.
  Time of day is untouched, so this pairs cleanly with "Follow my clock."
  The roll schedule persists its next-fire time across reloads, so closing
  the app doesn't pause the clock — reopening past a due roll catches up
  immediately instead of waiting out a stale timer.

## 2026-08-19 (afternoon)

Built with Claude Code, continuing the day's character-modeling work below.

**NEW**
- **Widget Mode.** A new icon beside the clock (bottom-right) collapses the
  whole app down to just the focus timer, floating and draggable over a plain
  backdrop — no scene, no dock, no drawers. Meant to sit alongside other work
  (studying with TaskNook open in the corner of the screen), not to replace
  the cottage. Exit via a dedicated corner button or Escape.
- **Always On Top (desktop app only).** Pairs with Widget Mode: pins the
  native window above other windows via a new `js_api` bridge in `desktop.py`
  (`DesktopApi.set_always_on_top`), wired straight through to pywebview's
  `Window.on_top`. Invisible in the browser/dev server — there's no OS window
  for a tab to pin, so the icon only renders once the desktop bridge is
  detected.
- **Settings → "Music on startup."** A new toggle (default on, matching the
  behavior that already existed) that gates whether TaskNook resumes the last
  playing station on launch. Off means every launch starts silent, even if
  music was playing when you last closed the app.
- **Journal: completed tasks.** The Calendar's day view now lists what you
  *checked off* that day, not just what you focused on — pulled from tasks
  already in the store, no new endpoint needed.
- **Friends: hover-to-reveal activity.** The "focusing — 6m left / on a break
  / pottering about" line on each friend row is now hover-revealed behind a
  small always-visible status dot, decluttering the list. No privacy toggle
  was added for this — every "friend" is a simulated row in your own local
  database, not another person's real session, so it's a declutter choice,
  not a privacy one.

**Decision (fixed mid-session):** Widget Mode's first draft rendered as a
separate `if (widgetMode) return (...)` branch that mounted a fresh
`HudFocusCard`. That unmounted the real one and replayed its `.intro-chrome`
boot delay (1.5s of blank card) on every single toggle — the exact trap this
project's own `.intro-chrome` rule warns about. Caught by screenshotting the
toggle immediately after clicking it. Fixed by keeping one persistent
`HudFocusCard` mounted at all times and only hiding everything *around* it,
the same `visibility`-based convention the rest of the HUD already uses.

## 2026-08-19

Seven commits (two of them near-duplicate pushes of the same content — see
below), rounding out the character-modeling work this week.

- **FIXED:** character proportions were off ("built like a shrimp") —
  reworked body proportions and how hair is modeled.
- **FIXED:** sleeping characters now look tucked under the covers instead of
  lying on top of them.
- **ADJUSTED:** the pet release dialog.

**Decision (reversal): "the seated life."** Until today, personas placed at
home idle-wandered on their own — a purely visual, unpersisted offset
recalculated every tick, checked against the floor mask and furniture
footprints, paused while decorating. Visiting a friend worked the same way,
with a walk order ending in a seat if you dragged onto one. Both were removed
today: *"humans never wander — people are SETTLED, on a chair, a rug, or
where you set them, and only a CARRY moves them; the pets are the room's
motion"* (owner decision, citing Virtual Cottage 2's reference behavior: "it
seems like they mostly just sit down"). The underlying rule function itself
was renamed `personaCanStand` → `personaCanSit`. Settings also gained the
"HUD elements" fade/hide section today (Session & timer / To-do list / Music
bar / Clock / Chat) — the feature this afternoon's session later built
Widget Mode on top of.

- **UPDATED:** profile/pets tab, character side view, ambient sound effects,
  and the 2D cottage's desk look.
- **NEW:** theme customization is back, reworked for testing. The commit
  message notes it "had issues before" and was pulled — but that interim
  removal was never written into `CLAUDE.md` (the underlying colour code,
  `lib/palette.js`, was actually present continuously since it first shipped
  on 2026-07-16), so whatever went wrong was most likely a UI-level issue,
  fixed without leaving a paper trail in the docs.
- **REMOVED:** the last of the Kenney-asset furniture. A first pass on
  2026-07-27 (see below) swapped out most of the placeholder kit, but a core
  set of 14 pieces — bed, sofa, armchair, nightstand, chair, shelf, bookcase,
  side table, radio, fridge, café table, counter, the combined coffee
  counter, and the TV unit — kept rendering as pre-rendered Kenney PNGs (with
  palette-remapped colourway variants) for another three and a half weeks.
  Today they were finally redrawn as hand-drawn SVG: the kit turned out to be
  TRUE isometric while this room is 2:1 dimetric, so every PNG sat about 15%
  tall of its tile; raster art blurred under the camera's zoom; and a PNG
  can't read the room's `--tint` variable, which is why 30 separate
  colourway image files had existed just to fake four fixed colours on three
  items.
- **FIXED:** music no longer starts muted on a fresh install; the calendar's
  "today" ring now actually follows local midnight instead of drifting.
- **ADJUSTED:** keyboard and screen-reader labels across the dock, timer,
  music bar and sliders.
- **UPDATED:** furniture texture pass; sweater, tee and turtleneck now draw
  correctly in profile view; afro, curly, two-block and undercut hairstyles
  got real back views (previously they just showed the default dome from
  behind).
- **NEW:** lighting options, and glasses as a new character accessory slot —
  deliberately colourless, frames are a fixed ink the same way shoe soles are
  a fixed rubber tone.
- **UPDATED:** rebuilt `TaskNook.exe` to match.
- **REWORKED:** the cat dialog.
- **NEW:** the Pets section (Profile panel) now lets you add and remove
  pets, not just name/re-colour the ones already placed.
- **ADJUSTED:** friend dialogue lines made more dynamic and varied.
- **NEW:** cat coat patterns (tortoiseshell added), dog breeds (husky
  added), bunny coats, and new wardrobe clothing items — a sweater vest and
  a varsity jacket, both using a contrast-sleeve technique no earlier
  garment needed. Wardrobe combinations grew from roughly 1,350 to 2,200.
- **UPDATED:** site preview images.
- Clothing catalog expanded further; the modeling roadmap doc updated to
  match. (Two of today's pushes — the cat/dog/clothing commit and an earlier
  profile/pets commit — were each pushed twice in a row under an identical
  message; the first of each pair turned out to be a near-empty commit, with
  the real content landing seconds later in the second.)

## 2026-08-18

- **NEW:** you can now pick up pets (drag them like a resident), name them,
  and give them a personality/temper. *(Owner request — pets went from
  decoration to something you interact with.)* This is also where a cat's
  sleep behaviour stopped being a hardcoded 80%-per-tick coin flip and
  became driven by the new temper system instead.
- **UPDATED:** garment lighting pass, hair texture pass, and the
  color-picking UI — the compact swatch-card style used throughout Settings
  and the wardrobe today. That swatch-card design was itself a reversal: the
  first cut was a full-width colour strip, changed after feedback (twice,
  per the code's own comment).
- **FIXED:** a stray random shadow tile that shouldn't have been rendering.
- **FIXED:** buns and ponytails lost their shape as the character moved
  around — they're stable now.
- **UPDATED:** padding cleanup across various UI frames.
- **NEW:** shoes became the wardrobe's fourth slot (sneakers/loafers/
  boots/heels/Mary Janes), on top of yesterday's three-slot top/coat/bottom
  split — pushing the silhouette count from 270 to roughly 1,350 before
  colour.

## 2026-08-17

- Attempted a fuller, more three-dimensional take on the character model
  instead of the flat front/back view.
- **UPDATED:** the hoodie model; tops split into inner and outer wear
  layers.
- **NEW:** pants options added to the wardrobe.

**Decision:** the wardrobe was reorganized into three real slots — top,
coat, bottoms — replacing the looser `garment`/`inner`/`trouser` model from
the day before. A garment only earns a slot if it changes the silhouette or
the two-tone split; a recoloured tee and a recoloured sweater are the same
sprite, so options differing only by name don't count. Garment lighting also
moved from per-piece painting to one shared lit-assembly pass (a single
light source, warm/cool overlay pair scaled by the garment colour's
luminance), and hair got its own dedicated texture pass — both backed by
outside research into how stylized/low-poly character art reads at this
scale (see `docs/MODELS.md` §10). This is also the day the character gained
its three facings — front, profile, back — with the profile view getting
its own drag-to-spin / pan / zoom staging controls.

## 2026-08-16

Four commits — the wardrobe's real starting point.

- **NEW:** new tops — sweater, t-shirt, hoodie, jacket, overalls, a dress.
- **NEW:** trouser colour is now pickable; it used to be the same for
  everyone.
- **NEW:** three more hairstyles — undercut, afro, pigtails.
- **FIXED:** the buzz cut used to look identical to short hair.
- **UPDATED:** rebuilt the app.

**Decision:** the character's clothing had been a single hex colour
(`outfit`) for weeks — nine hairstyles sat over one garment, and the
trousers were a hard-coded colour nobody could change. Today that became
`garment` + `inner` (a second, layered colour) + `trouser`, and the
character-artwork code was split out of the general furniture-sprite file
into its own `components/character/` package, with hair and garments
becoming registries instead of switch statements — the foundation the next
two days' three-slot wardrobe and lit-assembly pass were built on.

- **NEW:** hats, as the wardrobe's first accessory slot (replacing the
  crown hair layers, not stacking on top of them).
- **NEW:** outfit patterns.
- **NEW:** torso height and leg height became separate sliders (previously
  one combined "build" slider).
- **NEW:** characters now turn around and show their back when they walk
  away from you, instead of staying front-on.
- **NEW:** the hair and hat pickers show actual little worn previews in
  your colours, instead of plain text buttons.
- **UPDATED:** character editor reorganized; every hairstyle redrawn from
  scratch as one shaped mass with real depth instead of assembled flat
  pieces; arms and legs got proper elbow/knee joints; the "About you" bio
  field now folds down to a single line once it's filled in.
- **ADJUSTED:** relocated "Put me in the room"; tweaked the wardrobe
  display and Styles tab padding.
- **NEW:** the friendship bar — a per-friend bond meter that grows from
  chatting, visiting, and time spent together.

**Decision:** the standalone Progress panel was dissolved. It had grown into
a real feature over the previous three weeks — an 18-week focus heatmap, a
best-day/this-week/vs-last-week summary line, its own daily-goal and streak
configuration, days after today deliberately drawn as empty slots rather
than zero-focus days ("you did nothing on Friday" is a lie when it's
Wednesday) — but all of it mostly mirrored what the scene's own goal/streak
chip and the calendar's own day-shading already showed. What was worth
keeping (goal configuration, list completion) moved into the Tasks panel;
the calendar's month grid stayed as the one place for focus history, and the
18-week heatmap wasn't rebuilt anywhere.

## 2026-08-14

- **NEW:** talk to friends by picking a line, RPG-menu style. The chat
  feature itself had shipped the day before (2026-08-13) as a plain
  typed-message box; today's menu was added *on top of* that, not instead of
  it — typing still works, and both paths funnel into the same reply logic
  underneath.

**Decision:** replies became a menu of canned options rather than staying a
free-text box. The bots' replies are canned regardless, so a text field
promises a conversation they can't actually have — you write something
thoughtful and get a non-sequitur back. The menu changes based on what the
friend is doing (working / on break / idle), and a "Thanks" option only
appears when they spoke last.

- **NEW:** a friend sends you one unprompted "hello" message a day.
- **NEW:** after two hours of unbroken presence, a friend who isn't
  currently busy checks in on you — in addition to, not instead of, the
  existing break toast.
- **FIXED:** a friend's daily hello could land up to five minutes late, or
  be missed entirely on a short visit.
- **FIXED:** high-priority tasks weren't showing red in three of the four
  colour themes — they came out blue, grey, or tan, sitting right next to
  medium priority's amber.
- **UPDATED:** rebuilt the app; the sleeping character model; padding fixes
  in the Friends and Sounds dialogs; the Loft preset squared off its
  layout; another pass at making the character model read as less blocky.
- **FIXED:** the git repository had ballooned to 1.5 GB of loose objects
  (almost entirely repeated `TaskNook.exe` rebuilds); one `git gc` packed it
  down to 168 MB.

**Decision (correction):** the "rebuild the exe on every change" policy from
a couple weeks earlier had been justified with a scary number — "~42 MB
added to git history permanently per rebuild, 470 MB across 24 builds
already." Today's measurement showed that number was counting *loose*
objects, not what the repo actually costs: packed, 33 builds came to 168 MB
total, because two consecutive builds only really differ in the frontend
bundle and a few bytes of PyInstaller header — git deltas them down to a few
MB each. The fix was `git gc`, not switching to Git LFS (which remains "the
escape hatch" if the numbers ever get worse, but nothing about them
currently demands it).

**Decision (process):** this is also the day a full rewrite of `main`'s git
history happened, after two earlier commits had picked up an accidental
`Co-Authored-By: Claude` trailer — GitHub turns that into a repo contributor
credit, and getting it back out meant every commit SHA changed, breaking
`git pull` on every existing clone until each one reset onto the new
history. That's why this repo's commit convention now explicitly forbids AI
attribution trailers.

## 2026-08-13

Six commits — the day walking, carrying, and messaging all landed.

- **NEW:** you can walk around a friend's island — drag yourself somewhere
  and your character strolls over, or sits down beside them.
- **NEW:** the friends list shows what everyone is doing right now, and
  keeps updating as their simulated day goes on.
- **FIXED:** a `moving` flag that was supposed to mean "currently mid-glide"
  actually meant "has ever wandered from home" — true forever after the
  first move — so characters kept playing their walk-cycle animation while
  standing perfectly still.
- **FIXED:** every glide used a fixed 2.6-second duration no matter the
  distance, so characters covering a short hop and a long diagonal animated
  their legs at the same rate while covering very different ground —
  visibly closer to ice-skating than walking. Replaced with a duration
  computed from actual screen distance.
- **FIXED:** every walk used to visibly grind to a near-standstill right at
  the end while the legs kept scissoring at full speed.
- **NEW:** arms now swing against the legs while walking (the correct
  contralateral gait, not both sides moving together).
- **ADJUSTED:** a less mechanical walk overall — uneven stance/swing
  timing, a softer leg swing, and the body's bob and lean now run on
  separate beats instead of one.
- **ADJUSTED:** pets only trot while actually moving, not constantly.
- **NEW:** walking around your *own* island too, not just a friend's — drag
  any placed person and they'll walk over, or sit at the desk. This
  generalized into one shared `walkableBy` rule read by both the drag
  handler and the grab cursor (so the cursor can never advertise a walk the
  handler would refuse), plus a `walkId`/`walkPersonas` distinction between
  "just this one placement is grabbable" (a visit — your host's people
  aren't yours to move) and "every persona is" (home, where they're all
  yours).
- **UPDATED:** drag-and-drop of a character changed from sliding a floor
  marker to a genuine pick-up gesture — a dangling, pinched-chibi pose, with
  the figure following the cursor imperatively instead of through React
  state. The explicit trade-off, noted at the time: a walk order no longer
  ends with the figure walking there on its own — since you carried them,
  they're already there, so a stride now only shows up in ambient
  wandering, never as the result of a command. *(Both this and the wander
  system it depended on were themselves later replaced — see 2026-08-19's
  "seated life" decision above.)*
- **NEW:** messaging friends — one-to-one and group chat threads. The first
  version was a plain typed-message box; the RPG-style option menu came the
  next day.
- **UPDATED:** refreshed preview screenshots.

## 2026-08-12

- **NEW:** visiting friends' islands — the first version of the feature
  fleshed out through 08-13's work above. At this point, name tags floating
  over visited characters animated on a fixed 2.6-second clock, independent
  of how far the character actually walked — the same "ice-skating" bug
  fixed a day later for the walk itself.
- Assorted bug fixes.

**Decision:** the music player's headphones icon (which opened the Sounds
panel) and its ✕ (which stopped playback entirely) were both removed — "the
headphones weren't useful, and an ✕ that killed playback was the wrong verb
for a hide." Replaced with a collapsible pill that hides the transport bar
without stopping the music, and a track title that links straight out to
the source instead of needing a dedicated jump control.

## 2026-08-11

**Decision:** the room scene stopped being a card. Until today it was a
fixed-aspect box sized by a `roomScale` slider (0.6–1.2×) multiplying a
`min(90vw, 84vh)` box — verified in testing to grow from 588px to 1176px
across that range. Both the slider and the sizing formula were removed in
favour of a full-bleed SVG that fills the viewport edge to edge (an owner
decision made 2026-08-10, landing in the docs the next day); the
`roomScale` localStorage key was left to rot unread rather than migrated,
since nothing needed its value anymore.

## 2026-08-10

Three commits reworking how rooms are chosen and shaped.

- **UPDATED:** preset room layouts; NPC residents relocated to only the
  communal presets — the cafés, reading room, study hall — where a stranger
  sitting in your personal room wouldn't read as wrong (owner decision,
  2026-08-09). At the moment this landed, the doc still described Morning
  café as its own preset that had "gained" NPCs.
- **REMOVED:** the room-size slider and its underlying "setting" concept,
  folded into a simpler floor-material choice (boards / dark boards /
  terracotta / stone / grass) plus an independent walls toggle (full / low
  / none).

**Decision:** "setting" as a distinct room-identity idea was scrapped the
same day it's mentioned above — it was "a second room-identity concept
fighting the presets for the same job, and the floor material is what you
actually see." In the same spirit, the two café presets (Morning café and
Corner café) were merged into one — each only had half a café's worth of
furniture, so keeping them separate meant spending two preset slots on one
idea. The seasonal Autumn yard preset's piece count was also corrected from
an earlier "fifteen exactly" claim down to fourteen.

- **NEW:** iso rooms can toggle walls on or off, independent of the floor
  choice.

## 2026-08-09

- **UPDATED:** the character model for both genders.
- Minor codebase cleanup — this is also when `lib/body.js` and its test
  suite were split out as the geometry/slider-range source of truth, ahead
  of the wardrobe work that used it two weeks later.

## 2026-08-08

Six commits, including one ("rebuilding") whose real content was a Node.js
upgrade.

- **NEW:** the room now visibly reacts to a pomodoro break — the seated
  resident puts down the keyboard, a mug appears in hand, a stretch
  animation plays once. Before this, a break was indistinguishable from
  idle anywhere in the room; the only break-specific visual in the whole app
  was the `you` persona's thought bubble.
- **NEW:** idle gestures for animals, alongside the residents' own
  yawn/stretch/rub-eye/glance cycle from the day before. This also fixed a
  specific visual bug: a prowling cat's tail had been frozen stiff over its
  back while the legs stepped underneath it.
- **NEW:** winter and spring seasonal decoration sets; task notes and due
  dates.
- **FIXED:** the focus timer measured elapsed ticks instead of real
  wall-clock time, which could drift; tapping a different session length
  mid-block logged the wrong duration; after one dropped connection, music
  could never reconnect without a full restart; Backspace deleted the
  selected furniture piece even while a dropdown had keyboard focus; a
  failed background weather check flipped the whole panel into an error
  state uninvited; a token retired by another window used to fail
  everything with toasts until you reloaded — it now recovers silently.
- **ADJUSTED:** a performance pass — friends' stats now fetch in two
  queries instead of seventeen, editing a task no longer re-fetches data it
  couldn't have changed, and the room panel stopped redrawing all ~130
  furniture previews on every single drag frame.
- Repo-wide line-ending normalization (a recurring maintenance task on this
  project — see also 2026-07-11 and 2026-07-19).
- **NEW:** separate male and female character models; a hairstyle picker.
  At this point the character still had just one flat `outfit` colour field
  — the multi-slot wardrobe was still over a week away.
- **FIXED:** hairstyles rendering in front of a placed friend instead of
  behind them.
- **ADJUSTED:** arm geometry.
- **ADJUSTED:** "reduce motion" now actually reduces motion everywhere it's
  supposed to.
- Under the vague message "rebuilding": the actual change was upgrading the
  pinned Node.js version (20.15.0 → 20.20.2), fixing six component test
  suites that had been *silently* not running at all — an ESM-only
  dependency two levels down in jsdom's stack failed to `require()` under
  the older Node, and the failure was swallowed rather than surfaced.
  Confirmed by running the full suite afterward (742/742 passing) and
  re-verifying the packaged exe.

## 2026-08-07

- **NEW:** more ambient animation — flickering lights and fire, blinking
  stars. The stars had previously been sharing just 9 delay values across
  44 instances, blinking in visible groups of five; this is the fix.
- **ADJUSTED:** rewrote the animation test suite after finding several
  tests that couldn't actually fail, and corrected the speed measurements
  documented in the design notes.
- **NEW:** character idle gestures — a random pick between yawn, stretch,
  rub an eye, and a glance, on staggered multi-minute cycles so a room full
  of residents doesn't yawn in sync. The first cut of this measured its
  "time spent gesturing" budget in percentages rather than seconds and
  landed at 37% of the time — closer to a fidget than an idle animation —
  corrected down to roughly 19%.

## 2026-08-06

- **FIXED:** placing a second character used to drop them standing inside
  the first one.
- **ADJUSTED:** the sleeping pose.
- **ADJUSTED:** hair now catches light instead of rendering as one flat
  mass — an early step toward 2026-08-17's full lit-assembly pass.

## 2026-08-03

- Early experiments in user customization.
- **NEW:** "Put me in the room" — your character can stand in the
  isometric room and reacts to what you're doing: reading a book during a
  focus block, holding a mug on a break.

**Decision (reversal):** the desktop `.exe` rebuild policy flipped. Since
2026-07-16 the rule had been to rebuild only when shipping "something worth
downloading," reasoning that every rebuild permanently added ~42 MB to git
history. Today's doc (citing an owner decision dated 2026-08-01) reversed
that outright: rebuild on every change that reaches the exe, full stop —
accepting the cost as real rather than deferring it. The 470 MB/24-build
figure cited to justify the old caution would itself later turn out to be
measuring the wrong thing (see 2026-08-14 above).

## 2026-08-01

- **UPDATED:** app font changed to Zyzol.

## 2026-07-31

**Decision (reversal):** a test asserting "every catalog item must appear
in at least one preset room" — added just three days earlier — was deleted
outright, after the user rejected what it produced not once but twice:
"more minimal is better than crowded," and then, when tempted to fix it by
touching the shipped presets again, "we do not need to touch our preset
rooms." The test doesn't exist anymore and the project's own docs now warn
future contributors not to reintroduce it.

- Four presets were decluttered after being screenshotted and judged "a
  little too cluttered": Cozy cabin dropped from 27 pieces to 15, Corner
  café from 47 to 17 (later found to be *too* sparse for its floor size and
  partly corrected by shrinking the room instead of re-filling it), Secret
  garden from 27 to 15 — which had included, among other things, an office
  desk and laptop standing in the middle of the grass.
- Preset updates; new autumn/fall accessories.
- The break-nudge threshold, introduced the day before at 90 minutes, was
  retuned to 120.

## 2026-07-30

**NEW:** a toast notification appears after long unbroken stretches of
using the app without a break — the first version of what's now the
presence-aware break-nudge system (`lib/breaks.js`). Landing this required
two earlier designs to be tried and rejected first: gating on focus-timer
seconds alone was "too narrow" (plenty of studying happens with the timer
off), and gating on total app-open time was "too broad" (people leave
TaskNook open all day for the ambience). The toast component itself was
reworked at the same time from a fixed-duration notice into a dismissible
button with a configurable timeout.

## 2026-07-28

**Decision (reversal):** the furniture store's pricing was undone before it
ever really shipped. The original plan gated most of the catalog behind
focus-minutes earned; the call was made that "you don't take away
decorations people already have," and the rule inverted — everything free
unless explicitly listed as premium, with that premium list left empty. The
balance/ownership machinery stayed in place (it's what a future premium
item would plug into), but nothing costs anything today.

- Fixed a real, shipped bug: items placed on a table snapped to the
  surface's exact centre, so a second item on the same table rendered
  invisibly underneath the first — this had been silently hiding furniture
  in eight places across the built-in presets (a mug inside a computer,
  four mugs inside bookstacks).
- `ISO_MAX_ITEMS` raised from 60 to 150 — the old cap had been silently
  truncating the Study hall preset, which needs roughly 75 pieces just for
  its tables, chairs and shelving.
- Five sprites that used to draw their own light pool were unified into one
  scene-level `glow` field per catalog entry — the old per-sprite pools
  stayed at full brightness even at noon, which was what made them read as
  stickers rather than lamps.
- A test requiring every catalog item to appear in at least one preset was
  added today — and reversed three days later (see 2026-07-31).
- More light options; a general design remodel pass.

## 2026-07-27

The Kenney-asset swap-out begins, alongside a major timer/perf rewrite —
eight commits.

- **REMOVED:** support for cross-origin requests (`flask-cors`) dropped
  outright — every legitimate client is same-origin, and a wildcard CORS
  header would let any web page drive the local API using the well-known
  local-account credentials. The project's docs now explicitly warn against
  adding it back.
- **REMOVED:** the `birds` ambient sound channel, replaced by `cafe`
  (murmur + steam + cup clinks) and `paper` (page-turn one-shots) — a
  better fit for a study-nook app than birdsong.
- **NEW:** furniture colourways for bed, sofa and armchair (pick from a
  fixed set of swatches).
- **ADJUSTED:** reduced-motion now also covers rain/snow particles and the
  lightning flash, not just character animation.
- **FIXED:** a picker crash when switching between colourway furniture and
  freely-paintable furniture; a completed task could tint the wrong day on
  the calendar because the local-vs-UTC day marker was missing.
- **FIXED:** furniture could land on a hole in the floor and then refuse to
  be dragged, looking frozen until reload — new placements now fall back to
  the nearest free tile instead of the room's centre, which is exactly
  where a hole tends to be in a donut-shaped floor plan. Also: the "Random"
  task order did nothing after a restart until clicked again; the first
  stats refresh of a new day could hand you yesterday's numbers before
  routines finished resetting; weather conditions only half-remembered
  themselves across a reload ("cloudy night" would come back as plain
  "clear night").

**Decision:** the focus timer moved out of the main app state and into its
own nested provider (`timer.jsx`), specifically because its once-a-second
tick was rebuilding the whole app's context and re-rendering every
component that read from the store — the dock, the to-do list, every open
panel — regardless of whether they showed a clock. This is also the day
`ErrorBoundary` components and the `lib/storage.js` localStorage gateway
were introduced, after a real prior bug where an unguarded `localStorage`
write inside React's commit phase could blank the entire app.

- **REMOVED:** most of the Kenney placeholder furniture kit, swapped for
  the project's own hand-drawn assets — though a core set of about 14
  pieces (bed, sofa, armchair, and similar large items) kept using the
  pre-rendered Kenney PNGs for another three and a half weeks; see
  2026-08-19 above for why they finally came out too.
- **NEW:** café, library and terrace room environments; falling-leaves
  autumn weather.
- **ADJUSTED:** the cat and resident sprites redrawn; colour schemes
  rebuilt; the wall clock now tells the real time.
- Fixed a real shipped 400 error: the café/library/terrace environments had
  been added to the frontend catalog but never to the backend's matching
  whitelist, so saving any preset that used them failed silently with a
  "couldn't save" toast — the origin of the project's current rule that
  this list must be kept in sync in both languages, with a test enforcing
  it.
- Fixed another real bug: resizing or reshaping a room used to silently
  drop any furniture that no longer fit, with no indication anything had
  been lost — now announced with a toast comparing before/after counts.
- **NEW:** a dog pet, a rabbit pet, new rug patterns, a piano, and other
  cosmetics.
- **NEW:** furniture can now face all four directions — sofas, armchairs,
  chairs, desk chairs and benches got real back-view art, so rotating them
  walks all the way around instead of flipping between the same two
  facings. For about a day before this landed, chairs could only face
  toward higher grid coordinates, which is why the café's chairs sat in
  back-left/back-right corners of their table rather than flanking it
  directly — flanking would have given both chairs the same facing, both
  looking away from the table.
- **NEW:** the café's chairs now sit directly across the table from each
  other, facing in.
- **ADJUSTED:** day and sunset lighting overhauled so they visibly look
  like day and sunset — the sky and the room's own walls/floor catch the
  light now, where before only the window changed and every hour read as
  night.
- **FIXED:** a character seated facing away from camera was drawn sitting
  on top of the chair's backrest instead of behind it; the terrace's mug
  and lantern were stacked on the exact same spot on a side table, making
  the lantern invisible; the café started with the cat spawned standing
  inside a chair.
- Fresh screenshots throughout; README gained iso-room preview images.

## 2026-07-26

The single busiest day in the project's history — eleven commits, and the
day the room went from a flat 2D scene toward the isometric system it uses
today.

**Decision:** the room's decoration model was redesigned around a real
isometric projection instead of a flat 2D scene — the start of
`IsoRoom`/`IsoItems`. Early in the day, weather visuals and ambient sound
were still coupled (picking a weather preset also set the matching sound
channel), and personas placed on open floor idle-wandered on their own via
a temporary, unpersisted offset. Both of these were undone before the day
was out or soon after (see below and 2026-08-19).

- **NEW:** the ambient sound mixer — multiple channels blended together at
  once instead of one sound at a time (rain, storm, snow, wind, fireplace,
  and originally birds); a persistent music playback bar that survives
  closing its panel; the first isometric-room item catalog and presets;
  daily focus goals and streaks.
- **NEW (and same-day reversal):** Kenney's CC0 furniture kit was pulled in
  for pre-rendered isometric sprites, with the explicit reasoning that
  hand-drawn flat art "never stopped reading as stacked boxes." The kit
  grew same-day from 4 items to 14, with layered manifests (a café counter
  built from a bar + an espresso-machine layer) and palette-remapped colour
  variants. Most of it was gone again by the next day (2026-07-27) once the
  geometry mismatch showed up — see that entry.
- **ADJUSTED:** weather visuals were decoupled from the sound mixer the
  same day they were briefly coupled — picking "rain" no longer
  force-enables rain sound, on the explicit reasoning that "a rainy scene
  without rain audio is a legitimate mood."
- **REMOVED:** the flat room's card frame, so the scene could be dragged
  and zoomed like open space instead of sitting boxed inside a fixed
  rectangle — the earliest step toward today's full-bleed scene.
- **REMOVED:** broken playlist links.
- **FIXED:** the isometric room had no day/night support at all yet.
- **ADJUSTED:** decorating became far more intuitive — new furniture
  highlights itself, Backspace deletes the selected item, furniture
  configuration buttons are guaranteed to never sit hidden behind other
  furniture.
- **FIXED:** the YouTube seek bar could vanish while a video buffered; the
  sofa sprite redrawn for compatibility with older saved layouts.
- **NEW:** day / night / cloudy / sunset scenes each got their own
  distinct look; the isometric room's grid grew from a 3–14 tile range to
  3–48.
- **NEW:** more idle animation — the cat moves on its own, along with
  trees and the pond. At this point a resting cat had an unconditional 80%
  chance per tick of falling asleep on soft ground — later replaced by the
  per-pet temper system (2026-08-18).
- **ADJUSTED:** sky view tuning.
- **FIXED:** the notification toast never actually fired; added error
  boundaries around risky UI so one crash couldn't take the rest of the app
  down with it.
- A broad "consistency overhaul" — this is the commit that generalized a
  narrower delete-confirmation rule (originally just the task list and the
  timer reset) into the shared two-tap "armed" pattern (`lib/useArmed.js`)
  now used everywhere destructive: tasks, custom stations, presets,
  friends, room clears.
- **ADJUSTED:** "Time of Day" reframed as "Weather Conditions" (clear
  day/night, cloudy day/night, etc.); the rain sound reworked (again — see
  2026-07-27 too) so it no longer sounds like blurry radio static; the
  colour-scheme presets were renamed from `forest`/`ocean`/`coffee` to
  today's `abyss`/`shore`/`linen`/`walnut`, with no trace of the old names
  surviving; more decoration and character-model work pulling from open
  asset resources.

## 2026-07-25

**NEW:** a large HUD overhaul — the to-do list and the focus timer moved
out of a shared configuration box and into their own fixed corners (to-do
top-right, timer top-left), the layout the HUD still has today. Quick-add
for tasks got easier, and both cards now hide themselves while decorating a
room.

## 2026-07-20

**Decision (reversal, same day):** room customization first shipped with
per-zone placement bounds — a `wall`/`desk`/`floor` tag on each item
constrained where it could be dragged. That rule was removed the same day,
replaced by a single simpler rule that still holds today: an item just has
to stay inside the room's outer bounds so it never becomes ungrabbable; its
"zone" is now only a spawn hint and a picker grouping, never a constraint.
At this point the scene was still a fixed 4:3 card rather than today's
full-bleed view.

- **NEW:** room customization gained new default items; the cottage scene
  got its first animations; assorted bug fixes.
- **NEW:** the ability to recolour any placed item; the room became
  resizable via an early `roomScale` slider (itself removed three weeks
  later — see 2026-08-11).

## 2026-07-19

- A line-ending normalization pass across the whole repo, cleaning up
  config files, migrations, tests and a few source files after a branch
  merge left them inconsistent — content was untouched, only CRLF/LF (this
  commit's own message was just "?").
- A merge resolving that same duplicated-history/line-ending conflict
  between branches, with further playlist-related tweaks alongside the
  fix-up.
- A single new built-in YouTube station added to the music picker (the
  commit message was "playlist!").

## 2026-07-16

**Decision:** the desktop app's shipping artefact changed from a
`build-exe.bat`-produced, gitignored `dist\TaskNook.exe` to a committed
root-level `TaskNook.exe` — the first version of the "keep updating one
committed build" policy this project still follows, justified at the time
as "rebuild + commit only when shipping something worth downloading, not on
every code change" (a caution later reversed — see 2026-08-03 — and then
re-justified on more accurate numbers — see 2026-08-14). This is also the
day Alembic migrations were introduced, replacing the old "just delete
`tasknook.db` to reset the schema" approach, and the day the single-instance
file lock was added.

- **NEW:** a colour picker for dynamic app-wide customization — the first
  version of what's now the Settings panel's colour-scheme system, at the
  time using theme names (`forest`/`ocean`/`coffee`) that didn't survive the
  following month's rename.
- Repo housekeeping: `.gitignore` set up properly, database requirements
  tightened, documentation synced.

## 2026-07-14

- **NEW:** a default coffee-toned colour theme.
- **NEW:** the pomodoro method as a study/break-interval extension of the
  plain timer — the actual content behind a commit whose message was simply
  "Commit," landing with zero documentation at the time.

## 2026-07-12

Four commits in one day — the app's early feature core.

- **NEW:** picking music from a curated list, or dropping in your own
  Spotify/YouTube playlist link; the first `.exe` packaging attempt for the
  desktop app.
- **ADJUSTED:** the scene changed from a whole cottage to a single desk
  setup; **NEW:** snow and storm ambience alongside the existing rain;
  **NEW:** a day/night toggle; **FIXED:** adding a task wasn't actually
  persisting.
- **NEW:** a Settings tab for volume, brightness, and light/dark mode;
  **NEW:** the first weather-API integration, reflecting real outside
  weather into the app; **FIXED:** the task popup getting cut off at the
  bottom of the window; **NEW:** the timer popup became draggable, resizable
  and pinnable; **NEW:** colour customization; a general room cleanup pass.
- **ADJUSTED:** the task drawer grew taller so its allocated space is
  visible up front; **NEW:** a "random" task-ordering option; **ADJUSTED:**
  the weather button now opens a menu of options instead of defaulting
  straight to rain; **NEW:** focus sessions — logging which days you
  actually studied; **NEW:** a two-tap confirmation before deleting a task,
  with a more visible delete button; assorted small UI tweaks.

## 2026-07-11

- **WIP:** the project's pivot from a web page toward a real desktop
  application began here — the original Windows launcher was a plain
  `TaskNook.bat` batch file (paired with the still-current
  `TaskNook.command` for macOS/Linux); it was later dropped once the
  committed one-file `.exe` took over as the shipped artefact.
- Line endings normalized to CRLF repo-wide (the first of several such
  cleanups — see also 2026-07-19 and 2026-08-08).

## 2026-06-23

TaskNook's first real development day, in four commits.

- The repo's first commit that day deleted a small, unrelated prototype
  (`app.css`/`app.html`/`main.py`) left over from the 2025-01-17 upload. The
  real from-scratch scaffold of the actual app — the React frontend and
  Flask backend, roughly 5,400 lines across 31 files — followed right
  after, under a typo'd commit message ("task noot" instead of "task
  nook").
- An early error-tightening pass — this is also where the local-date
  `toISO()` fix (avoiding the UTC day-shift bug that recurs throughout this
  changelog), the `FLASK_DEBUG`/`PORT` environment variables, and a
  ref-based pattern for the ticking timer interval all first appear.
  `flask-cors` was a listed dependency at this point too — removed for good
  just over a month later (2026-07-27).
- The first `CLAUDE.md` was written — the project's living reference from
  day one. At this point the app still had a real login screen with seeded
  demo accounts and a "peek inside with the demo account" button; that was
  replaced by today's single fixed local account within the next few weeks,
  and there was no database migration system yet — resetting the schema
  just meant deleting the SQLite file.

## 2025-01-17

The repository's creation date — an initial file upload and a `README.md`,
predating any of the TaskNook-specific work above by about a year and a
half.
