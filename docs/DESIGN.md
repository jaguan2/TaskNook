# TaskNook design rules

The reference sheet for anyone (human or AI) touching TaskNook's UI. These
are not aspirations — they're rules distilled from decisions already made,
several of them learned from real mistakes. When a new feature bends one,
say so explicitly in review.

**Models have their own spec.** How isometric furniture is drawn — silhouette
rules, geometry, height reference, shared helpers, colour opacities, the
review loop — is `docs/MODELS.md`. This file covers everything else.

## North star

**Virtual Cottage 2.** Chromeless elements drawn straight on the scene beat
panels and dialogs. The app should read as *a cozy place that happens to
track tasks*, not a tracker with a mascot. Panels exist only for infrequent
configuration; anything touched daily lives on the scene.

## Screen composition

The screen has an ownership map — respect it:

| Zone | Owner |
|---|---|
| Top-left | Focus timer card + goal/streak chip |
| Top-right | To-Do list (chromeless) |
| Bottom-center | Music transport bar (and the tint picker while decorating) |
| Bottom-right | Clock / toggles / account cluster |
| Bottom-left | Signature; decorating chip while editing |
| Center | The room. Never crowd it. |

- **The bottom rail is one line, and everything on it shares two numbers:
  `bottom-6` (24px) and `h-11` (44px).** Three zones sit on it — signature /
  decorating chip on the left, transport bar (or tint picker) in the middle,
  clock cluster on the right — and because they're three separate absolutely
  positioned components it is very easy for them to drift apart. They did:
  four different insets (`bottom-3`/`5`/`6`/`0`) and three different heights,
  which is what "the bottom looks misaligned" actually means. Give a new
  bottom-rail element `h-11` and let `items-center` place its contents —
  never `py-*`, which makes the height depend on the font metrics inside.
  A rail element must also keep a **fixed** height across its own states; the
  transport bar pads its title column to exactly 32px so a loading track, a
  live badge and a seek bar all leave it 44px tall.
- **Controls that sit next to each other must share a baseline by
  construction, not by tuning.** Two sliders an inch apart on different rows
  read as broken however carefully you pad them — put them on the same line
  instead. (This is why the volume slider lives inside the transport bar's
  seek row rather than beside the column.) Give paired numeric labels a fixed
  `w-*` with `tabular-nums` so the control between them doesn't resize as the
  digits change.
- **Big surfaces need grain, not just colour.** The floor is the largest
  thing on screen; a flat gradient reads as a coloured plane and it was the
  clearest difference between TaskNook and the isometric-room art it's chasing.
  Every environment names a `floorStyle`, and walls carry a skirting, a picture
  rail and one panel seam per tile. Keep it SUBTLE — wall decor hangs on that
  surface, so it wants texture, not pattern.
- **Derive texture from position, never randomness.** The scene re-renders on
  a timer tick; a floor seeded from `Math.random` would crawl. Flagstone jitter
  and plank stagger both come from the tile index.
- **A big floor needs a centre.** Grain alone still reads as a uniform plane at
  20×16 and up, so the floor carries a vignette — clear in the middle, 0.18
  black at the rim — sized from the floor's own diamond so every room gets the
  same falloff shape rather than a fixed blob. It stacks with the wall-base
  occlusion: together they say "this is a room with air in it", which no amount
  of per-sprite detail can.
- **When the presets have no room, put it in the ENV.** The Reading room and
  Study hall had nothing above eye level, but both are shelved wall to wall —
  there is no free run to hang a pendant in without evicting furniture. The
  fix was one line: `library` was the only indoor env without `lights`. An env
  flag dresses every room built on it, present and future, and can't collide
  with a placement. Reach for the env before editing a preset.
- **Detail belongs in the shared helper before the individual sprite.** Ninety
  pieces are built from a handful of primitives, so one edit there raises the
  whole catalog and keeps it consistent — an over-detailed bookshelf beside
  ninety flat boxes looks worse than uniform. `TintedBox`'s contact shading
  (a short dark band where a box meets what it stands on) is the clearest
  case: without it every object looks pasted onto the floor rather than
  resting on it, and it cost one function to fix everywhere.
- **A border has to be an area, not a line.** The five base rugs were a solid
  diamond with a hairline stroke inside and read as flat shapes with no
  pattern at all; the fix is an inset lighter field, so the border is the rim
  left showing. The same applies to plank seams on a tabletop — a bare slab
  reads as flat-pack, and a rail between the legs is what makes four legs and
  a top into a piece of furniture.
- **Judge artwork on a contact sheet, not one room at a time.** Rendering
  every sprite into one labelled grid is how the untextured rugs were spotted
  sitting next to two properly woven ones. In a room you see what you went
  looking for.
- **Rule of thirds for focal accents.** The sun/moon sits at the upper-right
  third intersection, not centered above the room (centered reads stuck-on
  and crowds the subject). Sunset is the deliberate exception: low-left,
  half-sinking behind the room = horizon.
- **Light source consistency**: ambient light reads from the right (string
  lights on the right wall, orb upper-right). Don't introduce elements lit
  from elsewhere. **Cast shadows lean away from it** — down-left, and further
  the taller the object (`IsoRoom` derives the offset from `hitH`). Centred
  shadows read as a lamp directly overhead and tell you nothing; the lean is
  what makes a room feel lit from somewhere.
- **Use the volume, not just the walls.** Wall decor was already well spread
  across the presets, but not one of them hung a `pendant` — so the top third
  of every room was empty air above a busy floor. An overhead light is the
  cheapest way to occupy it. Placing one is not eyeballing: a pendant fills
  the wall band −116…−62, so it collides with anything tall (a 96px bookshelf,
  a 92px wardrobe) and with other wall decor. Check the wall run is clear
  first — the same discipline the arch-behind-a-bookshelf bug bought.
- **Negative space is content.** The de-carded scenes exist so the backdrop
  breathes; don't fill it.
- **600px wide is the supported floor, and the top corners are why.** The
  zone map assumes both top corners are usable at once, but the timer card
  (216px) and the to-do list (288px) plus their insets need ~588px before
  they collide — so below 600px the to-do list steps aside (`invisible`, not
  `hidden`: it carries `.intro-chrome`) and the Tasks panel covers for it.
  HEIGHT is not a constraint: measured clean down to 420px tall, because the
  dock's top is clamped (`max(172px, 50% - 220px)`) so a centred column can
  never climb into the timer's corner. Any new top-corner chrome has to fit
  the same budget or step aside the same way; a full narrow-screen layout is
  a separate feature, not something to half-build here.

## Motion

- **CSS keyframes only** for ambient motion. The app re-renders every second
  (timer tick); CSS animations live on the element and survive for free.
  JS-driven frames do not. (Wander glides are the one exception: a CSS
  `transform` + `transition` set from state, on personas/roamers only.)
- **SVG trap** (hit twice): a CSS animation's `transform` property overrides
  an SVG `transform` **attribute** entirely — and also overrides a static CSS
  transform on the same element. Put the attribute transform on a wrapper
  `<g>` and animate a child; bake fixed rotations into the keyframes.
- **Idle motion is slow and peripheral.** Sway, twinkle, breathe, drift —
  periods of seconds to minutes. Nothing fast, nothing constant.
- **Rarity is charm**: rare events (shooting star, passing bird) use one long
  animation cycle where the visible part is a sliver. Catching one should
  feel lucky.
- **Motion means something when it can**: the resident types only while a
  focus block runs; on a break they put the keyboard down and hold a mug; the cat
  naps on soft things. Prefer motion that reflects app state over pure decoration.
  - **A state the room ignores is a state the room denies.** A break used to look
    exactly like sitting idle — the phase reached the app and stopped at a thought
    bubble. If the app knows something about what you're doing, the scene is where
    it should show.
  - **A cue is not ambience.** Anything that ANSWERS something the user did plays
    once, immediately, and takes no `--phase` — the random idle stretch would have
    arrived somewhere in the next 89 seconds, which is no use as a "your break
    started". Put it on its own wrapper so it composes with the ambient loops
    inside rather than fighting them for the same transform.
  - **Props that carry a state should be one value, not one boolean each.**
    `activity` is `"focus" | "break" | null`; two booleans can both be true, and
    the memo'd scene wants something that changes on an edge, not per tick.
  - **Check the poses a new state makes possible.** Holding a mug meant the
    eye-rub had to stand down: at 186° the arm swings the cup over the face
    upside down. A prop is only half of a pose.
- **No motion in reading zones** (HUD corners). Ever.
- **Every animation class goes in the reduced-motion block.** No exceptions.
- **A CSS *transition* is invisible to that block.** `animation: none` cannot
  touch one, so a transition that moves something needs its own gate. Three
  exist: the lightning flash and the persona/pet wander glide are driven by
  state, so they're switched off in JS (both have been caught running under
  reduced motion); the `.pill` hover lift answers a selector, so it's silenced
  by its own `[data-motion="reduced"]` rule in the CSS (colour/shadow feedback
  stays — the request is less motion, not less response). The way to find a
  stray one is to count live animations in a real browser
  (`document.getAnimations().filter(a => a.playState === "running")`) with the
  setting on; the answer must be zero. `motion.test.js` guards both gates.
- **Prefer switching the SOURCE of motion off, not just its easing.** Reduced
  motion stops the wander timer entirely rather than removing the glide: a
  figure teleporting a tile every few seconds is worse than one that walks,
  and stopping the timer retires a re-render as well. It is also the room's
  only timer-driven motion — the CSS animations cost nothing to leave in
  place, which is why they're silenced by stylesheet and not unmounted.
- **A wanderer's phase comes from its stored square, not the one it walked to.**
  `effective` overwrites gx/gy with the wander offset, so reading the resolved
  position handed the sprite a value that changed every few seconds: each step
  gave it a new phase and restarted its walk cycle, its breathing and its gesture
  clocks mid-motion. Wanderers were the one kind of item that couldn't hold a
  phase, and the comment above the call already said they must — which is why it
  is pinned by a test now rather than left to the comment.
- **Instances must disagree — synchrony is the screensaver tell.** Every ambient
  loop reads two inherited custom properties that `IsoRoom` sets per placement
  from its tile: `--phase` (a NEGATIVE `animation-delay`) and, for the long
  loops, `--dur-scale` (period ×0.90–1.12). CSS variables inherit, so those two
  properties on the placement group desynchronise everything inside the sprite,
  including sprites nobody has drawn yet. This was measurably broken: 45 plants
  swayed as one body, every candle guttered on the same beat, and 44 stars
  shared 9 delays, so they blinked in groups of five.
  - **A new ambient loop opts in**, or it reverts to lockstep: add
    `animation-delay: var(--phase, 0s);` **after** the `animation` shorthand
    (the shorthand resets delay). `motion.test.js` checks each class by name.
  - **A sprite that staggers its own parts** (two flames on one candle) must
    write `calc(var(--phase, 0s) + 0.5s)` — a bare inline delay beats the class
    and puts every instance in the room back on the same beat.
  - **Offset is not enough on the slowest, most numerous loops.** Identical
    periods hold every pair of plants at a fixed relative phase forever;
    `--dur-scale` lets them drift, which is the difference between staggered and
    independent. The flame is the exception that spends it for a different
    reason: `flame-dance` and `pool-flicker` share one base period ON PURPOSE,
    so a flame and the light it casts move together — both must spend (or not
    spend) `--dur-scale` identically or they drift apart again.
  - **A phase is only worth what it is MODULO the loop it delays.** At tenth-
    second steps the 0.5s loops (`leg-step`, `resident-type`) had just five
    reachable positions, so a study hall's eight residents typed on four beats;
    hundredths gives all eight their own. Fast loops are where unison is most
    obvious, not least — check the shortest phased loop, not the longest.
  - **Never `Math.random`** — the scene re-renders on a timer and every
    animation would restart. Derive from the tile with coprime multipliers, and
    use two different hashes so an item's speed isn't readable from its offset.
  - The mechanism is worth testing by **mutation**, not inspection: this pass
    found that the original test mirrored the implementation, so flipping the
    phase's sign — the one regression its own comment named — kept it green.
- **Opacity is not breathing.** `room-breathe` pulses opacity, which is right
  for a lamp pool or a shimmer on water and wrong on a body — a person went
  half-transparent every three seconds. Living things scale
  (`body-breathe`/`cat-breathe`, origin `center bottom`).
- **Occasional gestures: a sliver of a long cycle.** A person who only breathes
  is a mannequin that breathes, so residents yawn, stretch, glance around and rub
  an eye. Four cycles of PRIME length (53/79/89/101s) run at once and drift
  against each other, so a character's sequence takes hours to repeat and now and
  then two coincide — a stretch *with* a yawn, for free. No JS, no timer, no
  `Math.random`: it is the shooting star's trick applied to a body.
  - **Size the action in SECONDS, not percent.** Each gesture is 3.2–4.0s: long
    enough to read, short enough to stay peripheral. Holding the keyframe
    percentages fixed while shortening the cycles left a resident in motion 37%
    of the time, which is a fidget, not an idle. ~19% is right — something every
    ~19 seconds. `motion.test.js` pins the duty cycle, not just the percentages.
  - **Multiply `--phase` to the cycle.** Used raw (it spans ~7s) on a 101s cycle,
    every resident in the room yawns inside the same 7-second window and then
    stands still together for the other 94 — synchronised *waves*, worse than no
    offset at all. Each class scales it to cover ~90% of its own period.
  - **Start AND end at the neutral pose.** `animation: none` drops the element to
    its base style, so a rest state that lives only in a keyframe freezes
    mid-gesture. Where rest can't be a transform — the yawning mouth — put it in
    a presentation ATTRIBUTE, which keyframes outrank while running and which
    takes over when they're switched off. Otherwise reduced motion leaves every
    character permanently gaping.
  - **One element per moving cycle.** Two animations on one element cancel, so the
    head is three nested wrappers (yawn, rub-lean, glance). Nested transforms
    compose; sibling ones fight.
  - **Derive the pose from the geometry, and then LOOK at it.** The eye-rub was
    wrong twice from arithmetic alone: under ~150° the hand stops at chest height,
    and because the arm is the sweater's colour all you saw was a hand appearing
    on the wrong side of the body; but the angles that *do* reach the face put the
    hand inside the head's silhouette, and arms paint before the head, so it
    vanished behind it. Only 186°+ both reaches eye level and clears the head.
  - **A two-part gesture needs one clock.** The yawn's mouth and the rub's
    head-lean share their partner's period, delay and stops exactly — nothing else
    holds the halves together, and a mouth opening a beat late reads as a fault.
- **Light moves, and not all light moves alike.** The pools IsoRoom casts from
  each `glow:` source used to be perfectly static, so a candle's flame danced
  over a dead circle of light — the thing that gave the lighting away as a
  drawing. Catalog `flicker: true` picks `pool-flicker` (uneven stops, a slight
  scale wobble, ~2.6s: a flame guts and recovers, it doesn't pulse) over
  `pool-breathe` (~7.5s, barely there). Which one is **catalog knowledge, not
  artwork** — same reason `glow` itself is a field.
  - **The animation must not eat the brightness.** A pool's real opacity is
    `strength × ISO_TIME.glow`, and keyframes animate opacity in ABSOLUTE
    terms — put them on the same element and every lamp burns at full strength
    at noon, the exact bug the scene-cast pools were introduced to fix. The
    computed opacity goes on a wrapper `<g>` and the animation on the child;
    nested opacity multiplies, so the motion stays relative to the hour.
- **Measure before optimising motion**, and **measure unlocked**. A clean A/B
  (same protocol per arm, two rounds, 298 frames) says:
  - A realistic room — ~40 items, ~75 live animations — is **4.2ms median with
    motion on, and 4.2ms with it off**. Zero dropped frames. Indistinguishable.
  - A deliberately extreme room — 144 items, 223 live animations — costs
    **8.4ms vs 4.2ms**. Real, measurable, and still half the 16.7ms budget, with
    0–1 dropped frames out of 298.

  The first version of this note claimed the cost was "below the noise floor"
  on the strength of both arms reading 16.7ms. That reading was **vsync-locked**:
  at 60Hz a frame that finishes in 4ms and one that finishes in 8ms are both
  reported as 16.7ms, so the measurement could not have seen the cost whatever
  it was. Check what regime you're in before concluding anything is free.
  Every keyframe already animates only `transform`/`opacity`, and
  the weather particles are HTML spans rather than SVG nodes. If a frame budget
  ever does bite, the untouched lever is culling animation outside the camera's
  viewBox — the whole room animates today regardless of what's on screen.
  **Keep the measurement window clean**: a preset swap or a screenshot landing
  inside it read as 10 dropped frames that weren't there.
- Big scenes are memo'd (`IsoRoom`); nothing may reintroduce a per-second
  re-render of thousands of SVG nodes. Props crossing into memo'd scenes must
  be stable (useCallback) or change rarely (booleans like `working`).

## Drawing new furniture

- **Wall decor runs UP the wall.** Wall sprites are drawn inside
  `skewY(SKEW)` in NEGATIVE y from the floor origin and positive x rightward
  (a picture frame spans y −98…−56 against a 118px wall). Drawn from y=0
  downward — the natural thing to write for icicles or bunting, which visually
  hang — they end up in a puddle at the skirting board. Both did, first time.
- **A sprite is not verified by a thumbnail.** Place a new piece in a real room
  at real scale and look at it. Wall items additionally have to be placed ON a
  wall (`rot` 0 pins to `gy: 0`, 1 to `gx: 0`); writing a layout through the API
  skips the clamp that does that, so they float mid-floor and look broken for a
  reason that has nothing to do with the artwork.
- **Seasonal sets are the reason to redecorate.** One season only works for three
  months, so autumn/winter/spring each get a picker section of ~6 pieces with the
  same shape: a hero tree, something to sit on, something low and wide, one light,
  one wall piece. New pieces belong in the PICKER — the built-in preset rooms are
  deliberately left alone (see "Decorating & room presets").

## Color & theming

- Theme variables are **space-separated RGB channels** (`--color-rose: 217
  138 147`), never hex — Tailwind's `/opacity` modifiers depend on it.
- **The dark floor guarantees legibility**: surface stops (void→wine) keep
  fixed low lightness in every theme, preset or custom. Accents may roam;
  backgrounds may not.
- Custom themes map the picked color faithfully onto the ROSE accent (its
  hue, saturation, and lightness within 52–72%); everything grades off that.
- Sprite tinting: paint the main material `var(--tint, <classic>)`; shading
  is **translucent black overlays**, never fixed darker hues, so any tint
  shades correctly. Items with no sensible material opt out
  (`tintable: false`).
- Preset palettes come from curated reference ramps (see the four shipped
  themes) — don't invent ramps ad hoc.
- **Semantic colors never re-tint.** `danger` (errors, destructive hovers,
  "sure?" states, the LIVE dot) is fixed like `sage`/`glow`/`amber`. `rose`
  is theme-swapped — grey-blue in shore, tan in linen — so it may decorate
  but must never carry meaning on its own.

## Decorating & room presets

Rooms must read as *real rooms*, not scattered objects (user feedback,
learned the hard way):

1. Big furniture sits **flush against a wall** or room edge.
2. Seating groups share a **centerline** with their table.
3. **Rugs go under furniture groups**, not beside them.
4. Small accents (plants, lamps) take corners; **the center stays walkable**.
5. Wall decor never overlaps the window band (left wall gy ≈ 1–2.5).
6. Preset coordinates must be half-snapped and in-bounds **as written** — the
   preset test enforces clamp-stability.
7. Use tints for mood coherence (a cabin is woods; a loft is cool slate).
8. **A wall that's already full has no room for architecture.** An arch or a
   window placed behind an unbroken run of shelving is simply invisible —
   open a bay for it rather than squeezing it in.
9. **Nothing is placed by eye.** Dump the floor occupancy first and place into
   tiles you have confirmed are free. Every placement bug this room has had —
   a jar stacked invisibly on a mug, a cat spawned inside a chair, a door
   behind a bookcase — came from guessing coordinates.

**Preset rooms are clean and functional — aim for about fifteen pieces.**
They are not a shop window. A new piece belongs in the picker; it
does not need a home in a built-in room, and the built-in rooms are left
alone by default (user decision, after two rounds of feedback: "more minimal
is better than crowded", then "we do not need to touch our preset rooms").
There was briefly a test demanding every catalog key appear in some preset —
following it is what produced the crowding, so it's gone.

**One deliberate exception: the overhead light.** A `pendant` was added to
Cozy study and Loft, knowingly against the count, because the complaint it
answers isn't density — it's that the room had nothing above eye level, and
that reads as an unfinished space rather than a restrained one. Height is not
clutter. It is one piece per room, in a wall run checked clear first, and it
is not a licence to top the presets up generally.

When a preset IS being edited, the restraint rules still hold:

- **A room gets one rug.** Two side by side is not a thing anyone does. A
  patterned rug replaces the plain one rather than joining it. (Separate rugs
  in genuinely separate zones — a runner by the bed, a fleece at the hearth —
  are fine; adjacent ones are not.)
- **Empty seats and open floor are the content.** The study hall sat eleven
  people at sixteen chairs and read as a crowd; at five, with one table left
  completely free, it reads as somewhere you could go and work.
- **Prefer fewer, better-placed accents.** Six plants and three lamps in one
  room is set dressing you stop seeing. Cut until removing the next one would
  be a loss.

**Catalogs show the thing, not a stand-in.** Every browser that offers
something placeable renders the REAL sprite at postage-stamp size — preset
buttons are miniatures of the room they apply, and furniture rows draw the
sprite you'll get. Emoji told you nothing about what you'd be placing (user
feedback), and the iso picker showing 🛏️ for a modelled bed was the single
place in the app where the new artwork was invisible. Previews measure
themselves (`getBBox`) rather than sharing a hand-written viewBox: sprite
extents run from a flat rug to a 128px tree. They also apply the same
placement rules the scene does — a preset thumbnail seats its resident on the
chair, because a preview that lies is worse than no preview.

## Interaction

- **Gesture-first**: wheel = zoom (cursor-anchored), drag empty space = pan,
  double-click = recenter, drag item = move, Backspace = delete selection,
  Escape = exit mode (before closing panels).
- **Forgiving targets**: iso hit-testing is painted pixels + the footprint
  diamond — never bounding boxes (tall sprites blanket everything behind
  them).
- **Selection chrome renders last** (topmost) so nearer furniture can't bury
  the ⟳/✕ buttons.
- **New things announce themselves**: a freshly added item arrives selected.
- Drags refuse invalid states (void tiles) rather than snapping somewhere
  surprising — the item stops at the edge.
- Hard-to-reverse actions get no confirmation dialogs; they get forgiving
  models instead (validation relocates, tolerates, heals). Where real work
  would be lost outright, the button itself arms first — a two-tap "sure?"
  state (`lib/useArmed.js`), never a modal. **Every delete of user data
  arms**: tasks, custom stations, scene presets, friends, clearing the room,
  resetting a block in progress. Putting decor items away doesn't (they come
  straight back from the catalog), and ungrouping doesn't (the tasks stay).
- **Hover-revealed row controls use `.hover-reveal`** (index.css), never raw
  `opacity-0 group-hover:opacity-100`: the class keeps them visible on touch
  devices and revealed by keyboard focus. (Decorative tooltips are exempt.)
- **Global key handlers ignore INPUT/TEXTAREA/SELECT targets.** Escape while
  typing must not close a panel; Backspace while typing must not delete
  furniture.
- **Failures are never silent.** Any write that fails surfaces the shared
  toast (`showToast` in the store, rendered top-centre); `console.error` is
  for detail, not the only signal. A skipped save that looks like a success
  is the worst outcome this app can produce. **This includes refusals**, not
  just errors: hitting the item cap or asking for a piece the floor has no
  room for both toast. A button that silently does nothing reads as broken.
- **Nothing renders "stuck".** If an action can't apply, refuse it at the
  source rather than letting the UI show an impossible state. Spawning a new
  item picks a spot that's actually on the floor (`findFreeSpot`), because an
  item dropped onto a void tile then refuses every drag and looks frozen.

### Reachable by keyboard, named for screen readers

- **Every icon-only control needs an `aria-label`.** Lucide icons are bare
  `<svg>` — they carry no text node the way the emoji they replaced did, and
  `title` is only a last-resort accessible name (fragile, and invisible on
  touch). Keep the `title` for the hover tooltip and add the label. A control
  with visible words needs no label — one would override the words.
- **Focus must be visible.** `index.css` gives every focusable control a
  `:focus-visible` glow outline at zero specificity (`:where(...)`), so
  pointer users never see it and keyboard users always do. Don't add
  `outline-none` without putting a replacement ring back.
- **Motion has an in-app setting, not just an OS one.** Settings → Motion is
  Auto / Full / Reduced; Auto follows the system. Everything is silenced by
  ONE condition — `data-motion="reduced"` on `<html>`, set before first paint
  by an inline script in `index.html` so nobody sees a flash of the movement
  they asked not to see. **A new animation is not finished until its class is
  in that list** (`index.css`), and anything driven by JS or a CSS
  *transition* — which the list can't reach — takes the `reduceMotion` boolean
  as a prop instead. The lightning flash is the standing example: a
  full-screen white pulse is a photosensitivity concern, not just a motion
  one.

## Chrome vocabulary

- Surfaces: `.glass` panels, `.pill` buttons, soft shadows (`shadow-soft`).
- Ghost buttons (`text-petal/50 hover:text-cream`) for secondary actions;
  filled glow buttons only for THE primary action of a surface.
- **One delete grammar**: the glyph is ✕ (U+2715 — never ×/🗑/a bare word),
  idle `text-petal`-ish, `hover:text-danger`, armed state is the lowercase
  word "sure?" in bold danger. Surface CLOSES (drawer, popover) also use ✕
  but live in header pills — position is what separates "close" from
  "delete", so never put a delete ✕ in a header.
- **Selected-option pills are `bg-glow text-plum`** — one selection color
  everywhere (dock, stations, schemes, presets, arrange-by, goals, modes).
  Exception: pills whose color IS meaning (sage break presets, rose pomodoro
  cluster) keep their theme.
- Button labels are Sentence case ("Save current", "Unschedule", "Skip ▸");
  "sure?" is the one deliberate lowercase (it's a whisper, not a command).
- Labels: tiny uppercase tracking-wide `text-petal/50`.
- **Icons: Lucide for chrome, emoji for content.** Chrome (dock, toggles,
  transport, section headers, pickers, row controls) uses lucide-react
  stroke icons — they inherit `currentColor` so they re-tint with every
  theme, and render identically on every OS (native emoji don't; they
  looked out of place on Windows — user feedback). Sizes 10–18px,
  `text-petal/70` beside header text. Emoji stay where they're CONTENT:
  furniture/preset catalogs, station names, warm copy ("All clear 🌿"),
  the avatar, toasts — colour earns its place there.
- Empty states are one warm sentence, not filler UI ("All clear 🌿"). Idle
  chrome shows nothing rather than placeholder text. Zero-data readouts get
  the sentence too — never a raw "0 of 0".
- Error toast: one at a time, top-centre (the unowned HUD zone), glass pill,
  auto-dismisses. Timer moments get the quiet procedural chime
  (`playChime`) + a system notification; permission is requested on the
  first timer start, not at boot.

## Checklist for any new visual feature

- [ ] Does it live on the scene rather than in a panel (if used daily)?
- [ ] Does it respect the zone ownership map and reading zones?
- [ ] Are its animations CSS, slow, reduced-motion-safe, off the HUD?
- [ ] Does it work in every theme (test darkest + lightest) and both scenes?
- [ ] Tint/shade via the overlay system? Legible on any tint?
- [ ] Icon-only controls labelled, and reachable/visible by keyboard?
- [ ] Any new animation added to the `data-motion="reduced"` list?
- [ ] Does every way it can refuse say so (toast), rather than doing nothing?
- [ ] Screenshot-reviewed at 1440×900 AND a short window (~1150×720)?
