# TaskNook design rules

The reference sheet for anyone (human or AI) touching TaskNook's UI. These
are not aspirations — they're rules distilled from decisions already made,
several of them learned from real mistakes. When a new feature bends one,
say so explicitly in review.

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
- **Rule of thirds for focal accents.** The sun/moon sits at the upper-right
  third intersection, not centered above the room (centered reads stuck-on
  and crowds the subject). Sunset is the deliberate exception: low-left,
  half-sinking behind the room = horizon.
- **Light source consistency**: ambient light reads from the right (string
  lights on the right wall, orb upper-right). Don't introduce elements lit
  from elsewhere.
- **Negative space is content.** The de-carded scenes exist so the backdrop
  breathes; don't fill it.

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
  focus block runs; the cat naps on soft things. Prefer motion that reflects
  app state over pure decoration.
- **No motion in reading zones** (HUD corners). Ever.
- **Every animation class goes in the `prefers-reduced-motion` block.** No
  exceptions.
- Big scenes are memo'd (`IsoRoom`); nothing may reintroduce a per-second
  re-render of thousands of SVG nodes. Props crossing into memo'd scenes must
  be stable (useCallback) or change rarely (booleans like `working`).

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
