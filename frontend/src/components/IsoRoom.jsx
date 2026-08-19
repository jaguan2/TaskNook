import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TILE_H, TILE_W, WALL_H, project, floorPoints, floorPatch, wallRect } from "../lib/iso";
import {
  ISO_ITEMS,
  clampIsoPlacement,
  envOf,
  WALL_MODES,
  footOf,
  footprintFree,
  lipRuns,
  personaCanStand,
  petCanStand,
  petTemper,
  seatFor,
  seatedPlacement,
  snapHalf,
  sortIso,
  stackedPlacement,
  surfaceFor,
  tileOn,
  wallRuns,
  wallSegment,
} from "../lib/isoRoom";
import { unproject } from "../lib/iso";
import { GLIDE_EASE, ambienceVars, glideMs } from "../lib/motion";
import { readStored, writeStored } from "../lib/storage";
import { isTypingTarget } from "../lib/typing";
import { ISO_SPRITES } from "./IsoItems";
import RoomTintPicker from "./RoomTintPicker";

// The interactive isometric room (beta): a resizable W×D tile floor whose
// items are dragged ON the grid with half-tile snapping. Same engine shape as
// the flat scene — pointer → getScreenCTM().inverse() → unproject → snap →
// clamp — which works because project/unproject are exact inverses.
//
// The room is NOT in a card: the SVG fills the viewport and the user flies a
// little camera over it — scroll wheel zooms (anchored at the cursor), drag
// on empty space pans, double-click recenters. All of it is plain viewBox
// math, which the drag engine is oblivious to because getScreenCTM already
// accounts for the viewBox.
//
// Re-declares the lampPool/lampCone gradient ids on purpose: only one scene
// (this or Cottage) is ever mounted, and RoomPanel previews reference them.
// A balustrade rather than a wall: high enough to enclose a terrace, low
// enough that you still read it as outdoors.
const LOW_WALL_H = 30;


/**
 * Is a footprint sitting on anything flat — a rug, a blanket, a pet bed?
 *
 * Both the wander interval ("has the cat found somewhere to nap?") and the
 * render pass ("draw it asleep, then") need this, and it was written out twice,
 * byte for byte. Two copies of one rule is one edit away from a cat that stops
 * moving but never curls up.
 */
function overSoftSpot(placements, gx, gy, f) {
  return placements.some((o) => {
    if (ISO_ITEMS[o.item]?.layer !== -1) return false;
    const of = footOf(o.item, o.rot);
    return gx < o.gx + of[0] && o.gx < gx + f[0] && gy < o.gy + of[1] && o.gy < gy + f[1];
  });
}

/**
 * The painted floor as horizontal RUNS: `[gx, gy, length]` per unbroken stretch.
 *
 * Only the clip path wants this. It needs the same AREA, not the individual
 * tiles, and emitting one polygon per tile made it 2,304 nodes on a 48×48 lot —
 * for a shape that is usually a plain rectangle — with FOUR groups referencing
 * it, so the browser resolved that region four times over. Merging by row is the
 * same trick `lipRuns` uses, and it takes a rectangle to one polygon per row.
 */
function floorClipRuns(size) {
  const runs = [];
  for (let ty = 0; ty < size.d; ty++) {
    let start = -1;
    // One past the end so a run reaching the far edge is still closed.
    for (let tx = 0; tx <= size.w; tx++) {
      const on = tx < size.w && tileOn(size, tx, ty);
      if (on && start < 0) start = tx;
      if (!on && start >= 0) {
        runs.push([start, ty, tx - start]);
        start = -1;
      }
    }
  }
  return runs;
}

/**
 * The floor's MATERIAL, drawn over its colour gradient and clipped to the
 * painted tiles.
 *
 * A flat gradient reads as a coloured plane, not a floor — it's the largest
 * surface on screen and it was the thing most obviously missing next to the
 * references. Grain is cheap: every line here is one `<line>` in grid space,
 * and `project()` puts it on the right plane for free.
 *
 * Everything is derived from the tile index, never Math.random — the scene
 * re-renders and a reshuffling floor would crawl.
 *
 * memo'd because `stone` is a w·d nested loop (2,304 polygons on a big terrace)
 * and `boards`/`tiles` are hundreds of lines. All three props are scalars, so the
 * comparison is exact and free.
 */
function FloorSurfaceInner({ w, d, style }) {
  const line = (key, x1, y1, x2, y2, stroke, width, opacity) => {
    const a = project(x1, y1);
    const b = project(x2, y2);
    return (
      <line
        key={key}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={stroke}
        strokeWidth={width}
        opacity={opacity}
      />
    );
  };

  if (style === "grass") {
    // Mown stripes: the only thing a lawn needs to stop reading as felt.
    const out = [];
    for (let t = 0; t < d; t += 2) {
      out.push(
        <polygon
          key={`mow-${t}`}
          points={floorPatch(0, t, w, 1)}
          fill="#ffffff"
          opacity="0.045"
        />
      );
    }
    return <g>{out}</g>;
  }

  if (style === "stone") {
    // Flagstones: one inset slab per tile, its size nudged by the tile index
    // so the joints wander instead of forming a grid.
    const out = [];
    for (let ty = 0; ty < d; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const j = ((tx * 7 + ty * 13) % 5) / 100; // 0 … 0.04
        out.push(
          <polygon
            key={`slab-${tx}-${ty}`}
            points={floorPatch(tx + 0.06 + j, ty + 0.06 - j, 0.88 - j, 0.88 + j)}
            fill="#ffffff"
            opacity={0.05 + (((tx * 3 + ty * 5) % 4) / 100)}
          />
        );
      }
    }
    return <g>{out}</g>;
  }

  if (style === "tiles") {
    const out = [];
    for (let t = 0.5; t < d; t += 0.5) {
      out.push(line(`h${t}`, 0, t, w, t, "#000", 0.8, t % 1 === 0 ? 0.22 : 0.12));
    }
    for (let t = 0.5; t < w; t += 0.5) {
      out.push(line(`v${t}`, t, 0, t, d, "#000", 0.8, t % 1 === 0 ? 0.22 : 0.12));
    }
    return <g>{out}</g>;
  }

  // boards: planks running along +gx, half a tile wide, with staggered end
  // joints in a brick bond — a plain set of parallel lines reads as corduroy.
  const out = [];
  let row = 0;
  for (let t = 0.5; t < d; t += 0.5, row++) {
    out.push(line(`seam${t}`, 0, t, w, t, "#000", 0.9, 0.2));
  }
  row = 0;
  for (let t = 0; t < d; t += 0.5, row++) {
    const stagger = (row % 2) * 1.25;
    for (let gx = stagger; gx < w; gx += 2.5) {
      if (gx <= 0) continue;
      out.push(line(`j${t}-${gx}`, gx, t, gx, Math.min(d, t + 0.5), "#000", 0.7, 0.16));
    }
  }
  return <g>{out}</g>;
}

const FloorSurface = memo(FloorSurfaceInner);

const DEFAULT_VIEW = { x: 0, y: 0, w: 640, h: 480 };
const VIEW_MIN_W = 220;
const VIEW_MAX_W = 1600;

function loadView() {
  try {
    const v = JSON.parse(readStored("tasknook.isoView") || "null");
    if (
      v &&
      [v.x, v.y, v.w, v.h].every(Number.isFinite) &&
      v.w >= VIEW_MIN_W &&
      v.w <= VIEW_MAX_W
    ) {
      return v;
    }
  } catch {
    /* corrupted — fall back */
  }
  return DEFAULT_VIEW;
}

// Keep the room's centre (world 320,240) from ever leaving the view — you
// can't scroll the whole room off-screen and "lose" it.
function clampView(v) {
  const margin = 60;
  return {
    ...v,
    x: Math.min(320 - margin, Math.max(320 + margin - v.w, v.x)),
    y: Math.min(240 - margin, Math.max(240 + margin - v.h, v.y)),
  };
}

// What the window (and the frame's little painting, which shares the
// gradient) sees at each time of day, plus how bright the string lights read.
const ISO_TIME = {
  // `wash` tints the pool of light the room sits in. Without it the scene was
  // identically dark at every hour — only the window and the string lights
  // changed, so "day" and "night" were near-indistinguishable. It sits BEHIND
  // the room and under no text, so it can be warmer and stronger than the
  // backdrop wash the to-do list has to stay readable against.
  // `lift` is daylight falling on the room's own surfaces — walls and floor,
  // never the furniture (that's drawn after, and tinting it would flatten
  // every colour the user picked). Without it the backdrop brightened but the
  // room stayed pitch dark inside it, which read as a night room cut out and
  // pasted onto a day sky.
  night: { skyTop: "#221b3f", skyBot: "#40355f", orb: "#f7e9e2", bulbs: 1, wash: "rgb(var(--color-wine))", washOpacity: 0.85, lift: null, liftOpacity: 0, glow: 1 },
  sunset: { skyTop: "#e2825e", skyBot: "#6d4470", orb: "#ffcf6a", bulbs: 0.75, wash: "#c9714a", washOpacity: 0.5, lift: "#ffb37a", liftOpacity: 0.14, glow: 0.7 },
  day: { skyTop: "#8ec9ea", skyBot: "#d3ecf7", orb: "#ffd76a", bulbs: 0.3, wash: "#9fc4e0", washOpacity: 0.42, lift: "#cfe4f2", liftOpacity: 0.19, glow: 0.25 },
};

/**
 * One glide's clock, shared by anything that must ride it.
 *
 * The old glide was a FIXED 2.6s whatever the distance, so a half-tile
 * shuffle crept and a long hop sprinted — while the legs cycled at one fixed
 * rate. Now the duration comes from `glideMs` (constant screen speed, whole
 * steps), and this hook is also the truth about whether a glide is actually
 * IN FLIGHT: `moving` used to be "displaced from home", which after the
 * first-ever wander is true forever, so figures marched in place
 * indefinitely between glides — the single biggest thing that made the walk
 * read wrong.
 *
 * `facing` is the screen direction of the last real move (-1 left, +1
 * right; the sprites are drawn facing left, so +1 mirrors them). Decided per
 * glide, instant — the two-facings economy the rest of the catalog uses.
 *
 * Render-time: `ms` is computed against the LAST COMMITTED position, so the
 * new duration lands in the same commit as the new transform (an effect
 * would be one commit late and the glide would run at the previous
 * duration). The ref advances in the effect, after the commit. A re-render
 * without a position change renders `transform 0ms`, which is safe: a
 * running transition keeps the parameters it started with.
 */
function useGlide(x, y, active) {
  const prevRef = useRef({ x, y });
  const timerRef = useRef(null);
  const [flight, setFlight] = useState({ moving: false, facing: -1 });
  const prev = prevRef.current;
  const ms = active ? glideMs(Math.hypot(x - prev.x, y - prev.y)) : 0;
  useEffect(() => () => clearTimeout(timerRef.current), []);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = { x, y };
    if (!active) return;
    const dx = x - from.x;
    const dist = Math.hypot(dx, y - from.y);
    if (dist < 0.5) return;
    clearTimeout(timerRef.current);
    setFlight((f) => ({
      moving: true,
      // A near-vertical screen move keeps the old facing — flickering the
      // mirror on a 1px horizontal component reads as a twitch.
      facing: Math.abs(dx) > 2 ? (dx > 0 ? 1 : -1) : f.facing,
    }));
    timerRef.current = setTimeout(
      () => setFlight((f) => (f.moving ? { ...f, moving: false } : f)),
      glideMs(dist) + 140
    );
  }, [x, y, active]);
  return { ms, moving: active && flight.moving, facing: flight.facing };
}

/**
 * May this placement be walked RIGHT NOW? ONE rule with two call sites that
 * must agree: the drag handler (may I start a walk order?) and the sprite (do I
 * offer a grab cursor?). A cursor on something that won't walk is a lie, and a
 * placement that walks without one is undiscoverable — so neither side gets to
 * hold its own copy of the condition.
 *
 * `editMode` belongs in here rather than at the call sites, which is what the
 * first cut got wrong: in Decorate a drag MOVES things, so the handler took the
 * edit path while the sprite went on advertising a walk. Unreachable while
 * visiting (never editable) and immediately visible at home.
 */
const walkableBy = (p, { editMode, walkId, walkPersonas }) =>
  !editMode &&
  // At home (`walkPersonas`) the PETS are yours too — a cat you can't pick
  // up in your own room reads as someone else's cat (owner request,
  // 2026-08-18). While visiting, only your guest placement (`walkId`) walks.
  (walkPersonas
    ? !!(ISO_ITEMS[p.item]?.persona || ISO_ITEMS[p.item]?.roamer)
    : walkId != null && p.id === walkId);

// One placed item, memo'd on its own: a roam tick (every ~3.5s with a pet in
// the room) or a selection change re-renders only the rows whose RESOLVED
// placement actually changed, not all ~150 on a full lot. The bail-out is
// real because `effective` returns untouched plain furniture by identity —
// only personas, stacked items and wanderers get fresh objects per render.
const PlacedItem = memo(function PlacedItem({
  p,
  editMode,
  activity,
  character,
  mood,
  reduceMotion,
  onStartDrag,
  // A visited room's people: {character, label} for THIS placement. Lets a
  // generic `resident` wear someone else's look without `self` semantics.
  personaInfo = null,
  // While visiting, YOUR placement takes walk orders — grabbable outside
  // edit mode (cursor + the footprint hit polygon say so).
  walkable = false,
}) {
  const item = ISO_ITEMS[p.item];
  const Sprite = ISO_SPRITES[p.item];
  const at = project(p.gx, p.gy);
  const persona = !!item?.persona;
  const glides = persona || !!item?.roamer;
  // Before the early return — a hook must run on every render.
  const glide = useGlide(at.x, at.y, glides && !editMode && !reduceMotion);
  if (!item || !Sprite) return null;
  const foot = footOf(p.item, p.rot);
  // Wanderers use a CSS transform (transition = the glide);
  // everything else keeps the attribute transform (instant drags).
  //
  // The transition is a TRANSITION, so `animation: none` in the
  // reduced-motion block cannot touch it — the same hole the
  // lightning flash falls through, and it has to be closed the same
  // way, in JS. Under reduced motion nothing wanders anyway, but the
  // property is dropped rather than left armed.
  // CSS variables inherit, so these two properties on the placement
  // group desynchronise every animation inside the sprite — leaves,
  // flames, a chest rising — including sprites nobody has drawn yet.
  //
  // From the item's STORED square (`_hx`/`_hy`), never the resolved one.
  // `effective` overwrites gx/gy with the wander offset, so reading
  // p.gx here fed a value that changes every few seconds: each step
  // handed the sprite a new phase, restarting its walk cycle, its
  // breathing and its gesture clocks mid-motion. The comment said this
  // and the code did the opposite — a wanderer was the one kind of item
  // that couldn't hold a phase. From the position rather than a counter,
  // so they survive reordering (`sortIso` reshuffles these constantly).
  const ambience = ambienceVars(p._hx ?? p.gx, p._hy ?? p.gy);
  const placeProps =
    glides && !editMode && !reduceMotion
      ? {
          style: {
            transform: `translate(${at.x}px, ${at.y}px)`,
            // A soft start and settle — creatures amble, not slide. The
            // duration is per-glide (constant speed, whole steps) so the
            // stride always agrees with the ground covered.
            transition: `transform ${glide.ms}ms ${GLIDE_EASE}`,
            ...(walkable && { cursor: "grab" }),
            ...ambience,
            ...(p.tint && { "--tint": p.tint }),
          },
        }
      : {
          transform: `translate(${at.x},${at.y})`,
          style: {
            ...(walkable && { cursor: "grab" }),
            ...ambience,
            ...(p.tint && { "--tint": p.tint }),
          },
        };
  return (
    <g
      {...placeProps}
      className={editMode ? "room-item" : undefined}
      onPointerDown={(e) => onStartDrag?.(p, e)}
    >
      {/* Grab target = the item's FOOTPRINT diamond (plus its painted
          pixels via normal SVG hit-testing). A full bounding box
          would let tall items (the floor lamp's pole) blanket
          everything behind them. A walk-order target gets the same
          diamond — a body is small and a fingertip isn't. */}
      {(editMode || walkable) && (
        <polygon points={floorPatch(0, 0, foot[0], foot[1])} fill="transparent" />
      )}
      {/* Contact shadow: one soft ellipse sized to the footprint,
          under every grounded item. This is most of what makes the
          sprites read as sitting IN the room instead of pasted on
          (flat rugs/ponds and wall decor obviously except). */}
      {!item.wall && (item.layer || 0) >= 0 && !p._seat && !p._rest && (() => {
        // A shadow centred under the object is a shadow from a lamp
        // directly overhead — it reads as a symmetric smudge and
        // gives nothing away about the light. The scene's light
        // comes from the upper RIGHT (string lights, the orb at the
        // third intersection), so the shadow leans down-left, away
        // from it, and stretches with the object's height.
        const mid = project(foot[0] / 2, foot[1] / 2);
        const lean = Math.min(9, 2 + (item.hitH || 20) * 0.06);
        return (
          <ellipse
            cx={mid.x - lean}
            cy={mid.y + lean * 0.5}
            rx={((foot[0] + foot[1]) * TILE_W) / 4 + 3 + lean * 0.4}
            ry={((foot[0] + foot[1]) * TILE_H) / 4 + 1.5}
            fill="url(#isoShadow)"
          />
        );
      })()}
      {/* Mirroring about the origin is a grid TRANSPOSE — the item
          faces the other wall and its footprint swaps to match.
          noMirror items (rendered PNGs) ship a real second render
          per orientation instead: pass rot through, skip the flip. */}
      {(() => {
        // The mirror serves two masters now: the odd ROTATIONS (a grid
        // transpose) and the walk FACING (the sprites are drawn facing
        // screen-left, so a rightward glide flips them toward where they're
        // going — before this, a figure slid backward while looking at you).
        // XOR, because two mirrors cancel.
        const flip = ((p.rot || 0) % 2 === 1) !== (glide.facing > 0);
        const sprite = persona ? (
          <g transform={p._seat ? `translate(0, ${-p._seat})` : undefined}>
            <Sprite
              seated={!!p._seat && !p._lie}
              lying={!!p._lie}
              seatH={p._seat || 0}
              activity={activity}
              moving={glide.moving}
              facing={p._facing || "front"}
              // Only YOU wear the profile's character and think
              // thoughts. Passing them to every persona turned a
              // table of four into four copies of the same person.
              // (A VISITED room's people are the exception — their looks
              // arrive per-placement via `personaInfo`.)
              character={item.self ? character : personaInfo?.character}
              mood={item.self ? mood : undefined}
              // The mirror wraps this whole sprite in scale(-1,1), which
              // would draw the thought bubble's book and mug back-to-front.
              // Tell it, so it can undo the flip for that one artwork.
              mirrored={flip}
            />
          </g>
        ) : item.roamer ? (
          // Animals are DRAWN in profile — that's their walking pose — so
          // "side" is their default; a vertical-dominant glide turns them
          // toward or away from the camera the same way it turns a person.
          <Sprite awake={!!p._awake} moving={glide.moving} facing={p._facing || "side"} look={p.look} />
        ) : (
          <g transform={p._rest ? `translate(0, ${-p._rest})` : undefined}>
            {/* rot 2/3 are the AWAY-facing pair, and they're a
                different drawing — a half turn on the grid is
                scale(-1,-1) on screen, i.e. upside down, so it can
                never be faked. `back` picks the real back view;
                only items with one are ever given a rot ≥ 2. */}
            <Sprite
              rot={(p.rot || 0) % 2}
              back={(p.rot || 0) >= 2}
              variant={item.variants?.[p.tint]}
            />
          </g>
        );
        // Facing default is -1 (drawn direction) and furniture never glides,
        // so for everything but a walker this is exactly the old rot mirror.
        return flip ? <g transform="scale(-1,1)">{sprite}</g> : sprite;
      })()}
    </g>
  );
});

/**
 * The figure in your hand — a persona, or one of your PETS (both walkable at
 * home now). Deliberately NOT PlacedItem: no glide (you're carrying them, not
 * sending them), no contact shadow (there's no ground under their feet), no
 * grab target, and no wander offset. What it does keep is the placement's own
 * tint and the per-placement character a visited room supplies, or the person
 * in your hand would change clothes on the way across the room. `label` rides
 * above the body — a visited guest's name, or the pet's, if they have one.
 */
function HeldFigure({ walk, character, personaInfo, label }) {
  if (!walk) return null;
  const item = ISO_ITEMS[walk.item];
  const Sprite = ISO_SPRITES[walk.item];
  if (!item || !Sprite) return null;
  const sprite = (
    <Sprite held character={item.self ? character : personaInfo?.character} look={walk.look} />
  );
  return (
    <g style={walk.tint ? { "--tint": walk.tint } : undefined}>
      {/* The rot mirror only — a carried figure has no direction of travel to
          face, and flipping them because your pointer drifted left would be a
          twitch, not a turn. */}
      {(walk.rot || 0) % 2 === 1 ? <g transform="scale(-1,1)">{sprite}</g> : sprite}
      {label && (
        <text
          textAnchor="middle"
          y={item.roamer ? -30 : -64}
          fontSize="11"
          fontWeight="600"
          fill="#f2e9dd"
          stroke="#1d0f1f"
          strokeWidth="2.6"
          paintOrder="stroke"
          opacity="0.92"
        >
          {label}
        </text>
      )}
    </g>
  );
}

// A visited room's name tag. Its own component because it shares `useGlide`
// with the sprite it labels: the label must ride the SAME per-glide clock
// (duration ∝ distance now, not a shared constant) or it teleports ahead and
// hovers over empty floor until its person catches up.
function PersonaTag({ p, label, glides }) {
  const at = project(p.gx, p.gy);
  const glide = useGlide(at.x, at.y, glides);
  // Tuned by screenshot, not by the catalog: `hitH` is the grab REGION's
  // height (generous over any body), and using it hung every tag a full head
  // above its person. These sit the tag just over the hair for the default
  // body in both poses.
  const lift = p._seat ? p._seat + 47 : 44;
  const common = {
    textAnchor: "middle",
    fontSize: "11",
    fontWeight: "600",
    fill: "#f2e9dd",
    stroke: "#1d0f1f",
    strokeWidth: "2.6",
    paintOrder: "stroke",
    opacity: "0.92",
  };
  return glides ? (
    <text
      {...common}
      style={{
        transform: `translate(${at.x}px, ${at.y - lift}px)`,
        transition: `transform ${glide.ms}ms ${GLIDE_EASE}`,
      }}
    >
      {label}
    </text>
  ) : (
    <text {...common} x={at.x} y={at.y - lift}>
      {label}
    </text>
  );
}

// The SCENE, split from the camera. `view` state lives in the IsoRoom
// wrapper below and reaches only the svg's viewBox attribute — nothing in
// here reads it, so a 60Hz pan or zoom updates one attribute instead of
// re-rendering the thousands of SVG nodes a 48×48 lot puts in this subtree.
// Every prop holds its identity through a camera move; that is what lets
// the memo hold, and why the wrapper useCallback's what it passes down.
function IsoSceneInner({
  size,
  placements = [],
  editMode = false,
  timeOfDay = "night",
  selectedId = null,
  // "focus" | "break" | null — what the timer is doing. A string, not two
  // booleans: the states are exclusive, and it still changes rarely enough that
  // the memo'd scene only re-renders on a phase edge rather than per tick.
  activity = null,
  character,
  mood = null,
  reduceMotion = false,
  cx,
  cy,
  onStartDrag,
  onRotateItem,
  onRemoveItem,
  onClearSelect,
  // Visiting: {placementId: {character, label}} — per-placement looks and
  // the name tags drawn over them. Null at home.
  personas = null,
  // Who takes walk orders: one placement (your guest, while visiting) or every
  // persona (at home). See `walkableBy`.
  walkId = null,
  walkPersonas = false,
  // The one being carried right now, drawn by the overlay instead of here.
  carriedId = null,
}) {
  const tod = ISO_TIME[timeOfDay] || ISO_TIME.night;

  const { w, d } = size;
  const farL = project(0, d);
  const farR = project(w, 0);
  const front = project(w, d);

  // Mask-aware geometry: the floor's shape, and the walls and lip per tile edge.
  //
  // All of it depends ONLY on `size`, and all of it used to be recomputed on
  // every render — several O(w·d) sweeps plus the run-merging, at pointer rate
  // through a drag or a pan and again on every roam tick. On a 48×48 lot that is
  // thousands of tiles walked repeatedly for a value that hasn't changed since
  // the room was last resized. `wallRuns` alone was being called four times.
  const { floorClip, wallRunList, lipRunList, leftSeg, rightSeg } = useMemo(
    () => ({
      floorClip: floorClipRuns(size),
      wallRunList: wallRuns(size),
      lipRunList: lipRuns(size),
      leftSeg: wallSegment("left", size),
      rightSeg: wallSegment("right", size),
    }),
    [size]
  );
  // Environment: everything the scene draws AROUND the tiles. `wallH` is 0
  // when there are none, so every wall-dependent bit of geometry falls away
  // from one number instead of from a scatter of `outdoors` checks.
  const env = envOf(size.env);
  // The layout's own walls override (user-picked) beats the floor's default.
  const walls = WALL_MODES.includes(size.walls) ? size.walls : env.walls;
  const wallH = walls === "full" ? WALL_H : walls === "low" ? LOW_WALL_H : 0;

  // Personas: seated ones snap onto their seat (slightly forward so they
  // draw in front of the backrest, lifted by the seat height); standing ones
  // idle-wander via a VISUAL-ONLY offset (never persisted — their stored
  // spot is "home"), collision-checked against the floor shape AND furniture.
  const roamRef = useRef({});
  const [, setRoamTick] = useState(0);
  useEffect(() => {
    // Reduced motion stops the wander outright rather than just removing the
    // glide: a figure that teleported a tile every few seconds would be worse
    // than one that walks. This is also the only motion in the room driven by
    // a TIMER, so switching it off actually retires an interval and the
    // re-render it causes — the CSS animations cost nothing to leave in place.
    if (editMode || reduceMotion) {
      roamRef.current = {};
      return undefined;
    }
    const id = setInterval(() => {
      const wanderers = placements.filter((p) => {
        const it = ISO_ITEMS[p.item];
        if (it?.persona) return !seatFor(p, placements);
        return !!it?.roamer;
      });
      if (!wanderers.length) return;
      const p = wanderers[Math.floor(Math.random() * wanderers.length)];
      const rec = roamRef.current[p.id];
      // An offset is only valid for the HOME it was measured from — a walk
      // order (or an edit-mode drag) moves the home out from under it, and a
      // stale offset re-applied to the new home can put a body inside
      // furniture no tick ever approved.
      const cur = rec && rec.hx === p.gx && rec.hy === p.gy ? rec : { dx: 0, dy: 0 };
      const f = footOf(p.item, p.rot);
      const isPet = !!ISO_ITEMS[p.item].roamer;
      // A pet's TEMPER tunes the engine, never replaces it: how often a tick
      // actually moves them, how sticky a soft spot is once they've curled
      // up, and how far from home they drift. Personas keep the classic
      // numbers (petTemper() of undefined is mellow = the classic numbers).
      const temper = petTemper(p.temper);
      if (isPet && Math.random() > temper.chance) return;
      // Cat rule: once curled up on a rug, mostly stay there — how mostly is
      // the personality (a sleepy cat barely leaves; a curious one won't
      // settle).
      if (
        isPet &&
        overSoftSpot(placements, p.gx + cur.dx, p.gy + cur.dy, f) &&
        Math.random() < temper.stay
      ) {
        return;
      }
      const range = isPet ? temper.range : 1.5;
      const next = {
        dx: Math.max(-range, Math.min(range, cur.dx + (Math.random() * 2 - 1))),
        dy: Math.max(-range, Math.min(range, cur.dy + (Math.random() * 2 - 1))),
      };
      const gx = p.gx + next.dx;
      const gy = p.gy + next.dy;
      if (!footprintFree(gx, gy, f, size)) return; // off the floor — stay put
      const blocked = placements.some((o) => {
        if (o.id === p.id) return false;
        const it = ISO_ITEMS[o.item];
        if (!it || it.wall || it.persona || it.roamer || it.layer === -1) return false;
        const of = footOf(o.item, o.rot);
        return gx < o.gx + of[0] && o.gx < gx + f[0] && gy < o.gy + of[1] && o.gy < gy + f[1];
      });
      if (blocked) return; // bumped into furniture — stay put
      // Which way is this glide going on SCREEN? Up-screen means walking away
      // (the back view); down-screen toward the camera (the front); and a
      // HORIZONTAL-dominant move shows the PROFILE — which in a 2:1 dimetric
      // room is every single-axis grid walk, so profiles carry most of the
      // wandering. A tiny shuffle keeps the previous facing, so nobody spins
      // on a 1px step.
      const ddx = next.dx - cur.dx;
      const ddy = next.dy - cur.dy;
      const sdx = (ddx - ddy) * (TILE_W / 2);
      const sdy = (ddx + ddy) * (TILE_H / 2);
      const facing =
        Math.hypot(sdx, sdy) < 2.5
          ? cur.facing || "front"
          : Math.abs(sdy) > Math.abs(sdx) * 0.6
          ? sdy < 0
            ? "back"
            : "front"
          : "side";
      roamRef.current = {
        ...roamRef.current,
        [p.id]: { ...next, facing, hx: p.gx, hy: p.gy },
      };
      setRoamTick((t) => t + 1);
    }, 3500);
    return () => clearInterval(id);
  }, [editMode, reduceMotion, placements, size]);

  // Same home-check the roam tick applies: a record whose home moved is dead.
  const roamOffset = (p) => {
    const rec = !editMode && roamRef.current[p.id];
    return rec && rec.hx === p.gx && rec.hy === p.gy ? rec : null;
  };
  // Someone in your hand isn't in the room. Filtered rather than hidden, and
  // that's load-bearing twice over: their name tag (drawn from this same list)
  // goes with them instead of hovering over empty floor, and UNMOUNTING is what
  // makes setting them down instant — `useGlide` starts fresh on a remount, so
  // there's no transition from where they used to be. A hidden-but-mounted
  // sprite would reappear at the old tile and walk over, which is the opposite
  // of what carrying somebody means.
  const effective = placements.filter((p) => p.id !== carriedId).map((p) => {
    const item = ISO_ITEMS[p.item];
    if (item?.roamer) {
      const off = roamOffset(p);
      const gx = off ? p.gx + off.dx : p.gx;
      const gy = off ? p.gy + off.dy : p.gy;
      // Awake while out wandering; asleep at home or curled on a rug.
      const moved = !!off && (Math.abs(off.dx) > 0.05 || Math.abs(off.dy) > 0.05);
      const awake = moved && !overSoftSpot(placements, gx, gy, footOf(p.item, p.rot));
      // `_hx`/`_hy` carry the STORED square through, because gx/gy no longer
      // hold it. The ambience phase has to come from something that doesn't
      // move, or every step restarts the sprite's animations.
      return { ...p, gx, gy, _hx: p.gx, _hy: p.gy, _awake: awake, _facing: off?.facing };
    }
    // Small objects rest on whatever surface they're over — same trick as
    // seating, and equally render-only. The +0.1 gy nudge puts them a hair
    // nearer than the surface so the depth sort draws them ON it.
    if (item?.stacks) {
      const on = surfaceFor(p, placements);
      return on ? { ...p, ...stackedPlacement(p, on) } : p;
    }
    if (!item?.persona) return p;
    const seat = seatFor(p, placements);
    if (seat) return { ...p, ...seatedPlacement(p, seat) };
    // Whether they're WALKING isn't derived here any more: displacement from
    // home is true forever once someone has wandered, which is how figures
    // came to march in place indefinitely. PlacedItem's useGlide watches the
    // resolved position and knows when a glide is actually in flight.
    const off = roamOffset(p);
    return off
      ? { ...p, gx: p.gx + off.dx, gy: p.gy + off.dy, _hx: p.gx, _hy: p.gy, _facing: off.facing }
      : p;
  });
  const ordered = sortIso(effective);
  const selectedPlacement =
    editMode && selectedId ? effective.find((p) => p.id === selectedId) : null;

  return (
    <>
        <defs>
          {/* soft pool of light the room sits in — replaces the old card */}
          <radialGradient id="isoAmbient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" style={{ stopColor: tod.wash }} stopOpacity={tod.washOpacity} />
            <stop offset="1" style={{ stopColor: tod.wash }} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="isoWallL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-plum))" }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-night))" }} />
          </linearGradient>
          <linearGradient id="isoWallR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-night))" }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-void))" }} />
          </linearGradient>
          <linearGradient id="isoFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-wine))" }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-night))" }} />
          </linearGradient>
          <linearGradient id="isoGrass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#48755a" />
            <stop offset="1" stopColor="#2e5540" />
          </linearGradient>
          {/* One gradient per environment floor. They stay OUTSIDE the theme
              variables on purpose — a café's terracotta and a library's dark
              boards are the environment's identity, not the app's accent. */}
          <linearGradient id="isoTile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5b45" />
            <stop offset="1" stopColor="#5c3a2c" />
          </linearGradient>
          <linearGradient id="isoWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6b4630" />
            <stop offset="1" stopColor="#3f2a1e" />
          </linearGradient>
          <linearGradient id="isoStone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8f8a80" />
            <stop offset="1" stopColor="#5c5850" />
          </linearGradient>
          <linearGradient id="isoSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tod.skyTop} />
            <stop offset="1" stopColor={tod.skyBot} />
          </linearGradient>
          <linearGradient id="isoScreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a3a6b" />
            <stop offset="1" stopColor="#2c2148" />
          </linearGradient>
          <radialGradient id="lampPool">
            <stop offset="0" stopColor="#ffe9b0" />
            <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
          </radialGradient>
          {/* soft contact shadow under every grounded item — one gradient,
              no filters (a 48×48 lot can hold dozens of these) */}
          {/* Floor vignette: clear in the middle, darker toward the rim. A big
              floor lit dead flat reads as a coloured plane — this is the cheap
              way to give it a centre, and it scales with the room because the
              ellipse is sized from the floor's own extents. */}
          <radialGradient id="isoVignette">
            <stop offset="0.45" stopColor="#000" stopOpacity="0" />
            <stop offset="0.8" stopColor="#000" stopOpacity="0.07" />
            <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          </radialGradient>
          <radialGradient id="isoShadow">
            <stop offset="0" stopColor="#000" stopOpacity="0.32" />
            <stop offset="0.7" stopColor="#000" stopOpacity="0.12" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9b0" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
          </linearGradient>
        </defs>

        <ellipse cx="320" cy="250" rx="430" ry="330" fill="url(#isoAmbient)" />

        <g transform={`translate(${cx}, ${cy})`}>
          {/* ---------- walls (cut-aware: main walls plus the inner planes
              that step around a cut corner) ---------- */}
          {wallH > 0 &&
            wallRunList.map((run, i) => {
            const a =
              run.plane === "gy" ? project(run.from, run.at) : project(run.at, run.from);
            const b =
              run.plane === "gy" ? project(run.to, run.at) : project(run.at, run.to);
            return (
              <g key={`wall-${i}`}>
                <polygon
                  points={`${a.x},${a.y - wallH} ${b.x},${b.y - wallH} ${b.x},${b.y} ${a.x},${a.y}`}
                  fill={run.plane === "gy" ? "url(#isoWallR)" : "url(#isoWallL)"}
                />
                <polygon
                  points={`${a.x},${a.y - wallH - 6} ${b.x},${b.y - wallH - 6} ${b.x},${b.y - wallH} ${a.x},${a.y - wallH}`}
                  style={{
                    fill: `rgb(var(--color-petal) / ${run.plane === "gy" ? 0.22 : 0.35})`,
                  }}
                />
                {/* Panelling: one seam per tile along the run. Subtle on
                    purpose — wall decor hangs on this surface, so it wants
                    texture, not pattern. */}
                {Array.from({ length: Math.max(0, Math.ceil(run.to - run.from) - 1) }, (_, k) => {
                  const at = run.from + k + 1;
                  const q = run.plane === "gy" ? project(at, run.at) : project(run.at, at);
                  return (
                    <line
                      key={`panel-${k}`}
                      x1={q.x}
                      y1={q.y - wallH}
                      x2={q.x}
                      y2={q.y}
                      stroke="#000"
                      strokeWidth="1"
                      opacity="0.09"
                    />
                  );
                })}
                {/* Skirting and a picture rail. Two bands is all it takes for
                    a wall to stop being a coloured plane — the references have
                    them and it was the cheapest gap to close. */}
                <polygon
                  points={`${a.x},${a.y - 9} ${b.x},${b.y - 9} ${b.x},${b.y} ${a.x},${a.y}`}
                  fill="#fff"
                  opacity={run.plane === "gy" ? 0.06 : 0.09}
                />
                <polygon
                  points={`${a.x},${a.y - wallH * 0.62} ${b.x},${b.y - wallH * 0.62} ${b.x},${
                    b.y - wallH * 0.62 + 3
                  } ${a.x},${a.y - wallH * 0.62 + 3}`}
                  fill="#000"
                  opacity="0.14"
                />
                {tod.lift && (
                  <polygon
                    points={`${a.x},${a.y - wallH} ${b.x},${b.y - wallH} ${b.x},${b.y} ${a.x},${a.y}`}
                    fill={tod.lift}
                    opacity={tod.liftOpacity * (run.plane === "gy" ? 0.75 : 1)}
                  />
                )}
              </g>
            );
          })}
          {/* The seam where the two walls meet. It only exists if the back
              corner is actually floor — this used to test `size.cuts`, which
              validation converts to a `mask` long before the scene sees it, so
              the branch was dead and the seam drew over painted-away corners. */}
          {wallH > 0 && tileOn(size, 0, 0) && (
            <line x1="0" y1={-wallH} x2="0" y2="0" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
          )}

          {/* window on the left wall — only when that wall run covers it,
              and only at full height (a window poking above a low rail, or
              floating in open air, is nonsense the walls override made
              possible) */}
          {env.window && walls === "full" && d >= 5 && leftSeg.from <= 1 && leftSeg.to >= 2.7 && (
            <>
              <polygon points={wallRect("left", 1.1, 2.4, 28, 70)} fill="#46396f" />
              <polygon points={wallRect("left", 1.25, 2.1, 34, 58)} fill="url(#isoSky)" />
              <circle cx={project(0, 2.3).x} cy={project(0, 2.3).y - 74} r="7" fill={tod.orb} />
              <polygon points={wallRect("left", 2.24, 0.12, 34, 58)} fill="#46396f" />
              <polygon points={wallRect("left", 1.25, 2.1, 60, 3.5)} fill="#46396f" />
              <polygon points={wallRect("left", 1.05, 2.5, 24, 5)} fill="#8a5346" />
              <polygon points={floorPatch(0.15, 1.0, 2.4, 2.4)} fill="#ffe9b0" opacity="0.06" />
            </>
          )}

          {/* string lights along the right wall's main run; they fade with
              daylight. A low rail still carries them (the terrace always
              has), but open air leaves nothing to string them from. */}
          {env.lights && walls !== "none" && rightSeg.to - rightSeg.from >= 4 && (
            <g opacity={tod.bulbs}>
              {(() => {
                const from = rightSeg.from + 0.5;
                const to = rightSeg.to - 0.5;
                const len = to - from;
                const bulbs = Math.max(3, Math.floor(len - 1));
                return (
                  <>
                    <path
                      d={`M ${project(from, 0).x} ${project(from, 0).y - 100} Q ${project(from + len / 2, 0).x} ${project(from + len / 2, 0).y - 68} ${project(to, 0).x} ${project(to, 0).y - 100}`}
                      stroke="#2b2350"
                      strokeWidth="2"
                      fill="none"
                    />
                    {Array.from({ length: bulbs }, (_, i) => {
                      const t = from + (len * (i + 1)) / (bulbs + 1);
                      const along = (t - from) / len;
                      const sag = 32 * Math.sin(Math.PI * along);
                      const base = project(t, 0);
                      return (
                        <g key={`bulb-${i}`} className="room-twinkle" style={{ animationDelay: `calc(var(--phase, 0s) - ${((i * 13) % 37) / 10}s)` }}>
                          <circle cx={base.x} cy={base.y - 100 + sag * 0.55 + 6} r="6" fill="#ffe9b0" opacity="0.2" />
                          <circle cx={base.x} cy={base.y - 100 + sag * 0.55 + 6} r="3" fill="#ffe9b0" opacity="0.9" />
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </g>
          )}

          {/* Front lip: the slab's thickness under every viewer-facing tile
              edge. Drawn BEFORE the floor on purpose. The skirt hangs straight
              down in screen space, so at a concave corner its lower end lands
              inside the top corner of the tile in FRONT of it — painted after
              the floor, that bit an ~7px dark wedge out of a perfectly good
              tile every time a floor plan stepped. Any floor pixel the skirt
              reaches belongs to a nearer tile, which is exactly what should
              occlude it, so letting the floor paint over it IS the fix. */}
          {lipRunList.map((run, i) => {
            const A =
              run.plane === "gy" ? project(run.from, run.at) : project(run.at, run.from);
            const B =
              run.plane === "gy" ? project(run.to, run.at) : project(run.at, run.to);
            return (
              <polygon
                key={`lip-${i}`}
                points={`${A.x},${A.y} ${B.x},${B.y} ${B.x},${B.y + 7} ${A.x},${A.y + 7}`}
                fill={env.lip[run.plane === "gx" ? 0 : 1]}
              />
            );
          })}

          {/* ---------- floor + grid (clipped to the painted tiles) ---------- */}
          <clipPath id="isoFloorClip">
            {floorClip.map(([tx, ty, len]) => (
              <polygon key={`t-${tx}-${ty}`} points={floorPatch(tx, ty, len, 1)} />
            ))}
          </clipPath>
          <g clipPath="url(#isoFloorClip)">
            {/* one big gradient sheet so tiles shade as ONE surface */}
            <polygon points={floorPoints(w, d)} fill={`url(#${env.floor})`} />
            <FloorSurface w={w} d={d} style={env.floorStyle} />
            {tod.lift && (
              <polygon points={floorPoints(w, d)} fill={tod.lift} opacity={tod.liftOpacity} />
            )}
            {/* sized from the floor's own diamond, so a 48×48 lot gets the
                same falloff shape a 5×4 one does */}
            <ellipse
              cx={(farL.x + farR.x) / 2}
              cy={front.y / 2}
              rx={(farR.x - farL.x) / 2}
              ry={front.y / 2}
              fill="url(#isoVignette)"
            />
          </g>
          {/* The tile grid is a placement aid: it belongs while you're
              decorating and nowhere else, now that the floor has a grain of
              its own to read.
              The lines used to carry `editMode ? … : …` for stroke, width and
              opacity — left over from when the grid was always drawn. Inside
              this `editMode &&` the false arms are unreachable, so they were
              three ways to describe a state that can't happen. */}
          {editMode && (
          <g clipPath="url(#isoFloorClip)">
            {Array.from({ length: d - 1 }, (_, i) => i + 1).map((gy) => (
              <line
                key={`gy-${gy}`}
                x1={project(0, gy).x}
                y1={project(0, gy).y}
                x2={project(w, gy).x}
                y2={project(w, gy).y}
                stroke="#f3c6c0"
                strokeWidth="0.7"
                opacity="0.18"
              />
            ))}
            {Array.from({ length: w - 1 }, (_, i) => i + 1).map((gx) => (
              <line
                key={`gx-${gx}`}
                x1={project(gx, 0).x}
                y1={project(gx, 0).y}
                x2={project(gx, d).x}
                y2={project(gx, d).y}
                stroke="#f3c6c0"
                strokeWidth="0.7"
                opacity="0.18"
              />
            ))}
          </g>
          )}
          {/* ---------- ambient occlusion where the walls meet the floor ----
              The junction was a hard line, so the floor read as a flat plane
              that the walls happened to stand on. Two stepped bands (flat
              tones, per MODELS.md — not a ramp) put air back in the corner,
              and because they're derived from the same per-edge wall runs they
              follow any drawn floor shape for free. */}
          {wallH > 0 && (
            <g clipPath="url(#isoFloorClip)">
              {wallRunList.map((run, i) => {
                const strip = (depth, opacity, key) => {
                  const pts =
                    run.plane === "gy"
                      ? floorPatch(run.from, run.at, run.to - run.from, depth)
                      : floorPatch(run.at, run.from, depth, run.to - run.from);
                  return <polygon key={key} points={pts} fill="#000" opacity={opacity} />;
                };
                return (
                  <g key={`ao-${i}`}>
                    {strip(0.75, 0.09, "far")}
                    {strip(0.3, 0.1, "near")}
                  </g>
                );
              })}
            </g>
          )}

          {/* ---------- what the room's own lights throw on the floor ------
              A light source that doesn't light anything is just a drawing.
              These pools are cast by the SCENE rather than by each sprite, so
              one `glow: [radius, strength]` in the catalog is all a new lamp
              needs, and they all dim together as the day comes up — lamplight
              at noon is what made the old hand-drawn pools read as stickers.
              Clipped to the floor and drawn under the furniture. */}
          <g clipPath="url(#isoFloorClip)">
            {effective.map((p) => {
              const glow = ISO_ITEMS[p.item]?.glow;
              if (!glow || tod.glow <= 0) return null;
              const f = footOf(p.item, p.rot);
              const at = project(p.gx + f[0] / 2, p.gy + f[1] / 2);
              const [r, strength] = glow;
              // The pool LIVES, and a hearth doesn't live like a desk lamp:
              // flames get an irregular flicker, everything else a slow breathe.
              // A candle's flame used to dance over a pool of perfectly steady
              // light, which is what gave the lighting away as a drawing.
              //
              // Nested inside a <g> that carries the computed opacity on
              // purpose: the keyframes animate opacity in ABSOLUTE terms, so
              // putting them on this element would override
              // `strength * tod.glow` and burn a lamp at full brightness at
              // noon. Nested opacity multiplies, so the animation stays
              // relative to whatever the hour and the catalog asked for.
              return (
                <g key={`glow-${p.id}`} opacity={strength * tod.glow} style={ambienceVars(p.gx, p.gy)}>
                  <ellipse
                    className={ISO_ITEMS[p.item].flicker ? "pool-flicker" : "pool-breathe"}
                    cx={at.x}
                    cy={at.y}
                    rx={r}
                    ry={r * 0.5}
                    fill="url(#lampPool)"
                  />
                </g>
              );
            })}
          </g>

          {/* ---------- placed items ---------- */}
          {ordered.map((p) => (
            <PlacedItem
              key={p.id}
              p={p}
              editMode={editMode}
              activity={activity}
              character={character}
              mood={mood}
              reduceMotion={reduceMotion}
              onStartDrag={onStartDrag}
              personaInfo={personas ? personas[p.id] : null}
              walkable={walkableBy(p, { editMode, walkId, walkPersonas })}
            />
          ))}

          {/* Name tags for a visited room's people — after the furniture so
              nothing buries a name (the selection-chrome rule), and OUTSIDE
              the sprite groups so a mirrored body never flips its label. */}
          {personas &&
            effective.map((p) => {
              const info = personas[p.id];
              if (!info?.label) return null;
              const item = ISO_ITEMS[p.item];
              return (
                <PersonaTag
                  key={`tag-${p.id}`}
                  p={p}
                  label={info.label}
                  glides={
                    (item?.persona || item?.roamer) && !editMode && !reduceMotion
                  }
                />
              );
            })}

          {/* selection chrome LAST — the highlight and ⟳/✕ buttons must sit
              above every item, or nearer furniture buries them (user-hit) */}
          {selectedPlacement &&
            (() => {
              const p = selectedPlacement;
              const item = ISO_ITEMS[p.item];
              const at = project(p.gx, p.gy);
              const foot = footOf(p.item, p.rot);
              const hitR = project(foot[0], 0);
              return (
                <g transform={`translate(${at.x},${at.y})`}>
                  <polygon
                    points={floorPatch(0, 0, foot[0], foot[1])}
                    fill="none"
                    stroke="#ffe9b0"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    opacity="0.9"
                  />
                  <g
                    className="room-remove"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onRotateItem?.(p.id);
                    }}
                  >
                    <circle cx={hitR.x - 18} cy={-item.hitH - 2} r="9" fill="#8a7ac2" />
                    <path
                      d={`M${hitR.x - 22} ${-item.hitH - 2} a4.5 4.5 0 1 1 1.4 3.2`}
                      stroke="#fff"
                      strokeWidth="1.8"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M${hitR.x - 23.5} ${-item.hitH + 3.5} l2.6 -1.2 l0.4 2.9 z`}
                      fill="#fff"
                    />
                  </g>
                  <g
                    className="room-remove"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onRemoveItem?.(p.id);
                      onClearSelect?.();
                    }}
                  >
                    <circle cx={hitR.x + 4} cy={-item.hitH - 2} r="9" fill="#d96a6a" />
                    <path
                      d={`M${hitR.x} ${-item.hitH - 6} l8 8 M${hitR.x + 8} ${-item.hitH - 6} l-8 8`}
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              );
            })()}
        </g>
    </>
  );
}

const IsoScene = memo(IsoSceneInner);

// The camera, and every pointer/keyboard interaction. This wrapper is the
// perf boundary: `view` changes at pointer rate during a pan or zoom, and
// from here it reaches ONLY the svg's viewBox attribute — IsoScene's props
// all hold their identity through a camera move, so its memo skips the
// whole subtree. (memo on the wrapper itself: App re-renders every second
// on the focus timer's tick, and all store callbacks are useCallback'd.)
function IsoRoom({
  size,
  placements = [],
  editMode = false,
  timeOfDay = "night",
  highlightId = null,
  activity = null,
  character,
  mood = null,
  reduceMotion = false,
  personas = null,
  // False while VISITING: a pan around a friend's room must not overwrite
  // the saved HOME camera, and a visit opens framed on the room rather than
  // wherever home was last zoomed. (App remounts the scene per room via
  // `key`, so this initializer runs fresh for every visit.)
  saveView = true,
  // Walk orders. A walkable placement is grabbable OUTSIDE edit mode: dragging
  // moves a target marker, not the person, and releasing on a legal tile calls
  // `onWalkTo(id, gx, gy)` once so the glide walks them over. Deliberately not
  // the edit-mode drag — walking is fiction, so it obeys the wander engine's
  // rules (no void, no furniture, but a free SEAT is legal, which is how a walk
  // order ends in sitting down).
  //
  // Two ways to arm it, because the two rooms mean different things by "you":
  //   * `walkId` — exactly one placement walks. VISITING: your guest is yours
  //     to move and your host's people are not.
  //   * `walkPersonas` — every persona walks. AT HOME: they're all your little
  //     people, all drawn with your character, so singling one out as the "real"
  //     you would be a distinction the room can't show.
  walkId = null,
  walkPersonas = false,
  onWalkTo,
  onMoveItem,
  onRemoveItem,
  onRotateItem,
  onTintItem,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const walkRef = useRef(null);
  const heldRef = useRef(null);
  // The marker alone — kept out of IsoScene so pointer-rate target updates
  // never re-render the scene subtree.
  const [walkTarget, setWalkTarget] = useState(null);
  const panRef = useRef(null); // the world point the pointer grabbed
  const pointerOnItemRef = useRef(false); // last pointerdown hit furniture
  const [view, setView] = useState(() => (saveView ? loadView() : { ...DEFAULT_VIEW }));
  const viewRef = useRef(view);
  viewRef.current = view;
  // Read through a ref so applyView stays non-reactive to the lint rule —
  // the prop can't actually change within a mount (App keys the scene per
  // room), but referencing it directly re-classifies every effect that
  // calls applyView.
  const saveViewRef = useRef(saveView);
  saveViewRef.current = saveView;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const persistViewTimer = useRef(null);
  // What the debounce is holding, so unmount can FLUSH it rather than drop it.
  const pendingViewRef = useRef(null);
  const flushView = () => {
    clearTimeout(persistViewTimer.current);
    if (pendingViewRef.current) {
      writeStored("tasknook.isoView", JSON.stringify(pendingViewRef.current));
      pendingViewRef.current = null;
    }
  };
  // Cleanup used to only CLEAR the timer, so a pan or zoom followed within 300ms
  // by toggling to the flat scene (or closing the app) silently lost the camera
  // position — the one thing you'd notice next launch.
  useEffect(() => flushView, []);
  const applyView = (next) => {
    const clamped = clampView(next);
    setView(clamped);
    // A visited room's camera is throwaway — never let it near the stored
    // home view (pendingViewRef stays null, so the unmount flush is a no-op).
    if (!saveViewRef.current) return;
    // Persisting on every pointermove meant a synchronous JSON+disk write at
    // pan/zoom rate (60Hz+) — debounce it; only the state update needs to be
    // immediate.
    pendingViewRef.current = clamped;
    clearTimeout(persistViewTimer.current);
    persistViewTimer.current = setTimeout(() => {
      writeStored("tasknook.isoView", JSON.stringify(clamped));
      pendingViewRef.current = null;
    }, 300);
  };

  useEffect(() => {
    if (!editMode) setSelectedId(null);
  }, [editMode]);

  // A freshly-added item arrives SELECTED (highlight + buttons + picker), so
  // the user immediately sees what appeared and where to drag it.
  useEffect(() => {
    if (highlightId) setSelectedId(highlightId);
  }, [highlightId]);

  // Backspace/Delete removes the selected item (not while typing a hex code).
  useEffect(() => {
    if (!editMode) return undefined;
    const onKey = (e) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      // Shared with App's Escape handler. This one used to check only
      // INPUT/TEXTAREA, so Backspace deleted the selected furniture while you
      // were typing in a `<select>` or a contenteditable.
      if (isTypingTarget(e.target)) return;
      if (!selectedId) return;
      e.preventDefault();
      onRemoveItem?.(selectedId);
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, selectedId, onRemoveItem]);

  // Escape deselects first (closing the tint picker); only the NEXT press
  // reaches App's handler and exits decorating. Capture + stopPropagation
  // keeps App's window listener out of this one (same trick as TopBar's
  // weather popover).
  useEffect(() => {
    if (!editMode || !selectedId) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editMode, selectedId]);

  // Wheel zoom must preventDefault (page scroll), so it can't be a React
  // onWheel prop — React registers those passively.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const v = viewRef.current;
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      // Big floors need a farther zoom-out: the limit grows with the room so
      // a 48-wide lot still fits on screen.
      const roomSpan = ((sizeRef.current.w + sizeRef.current.d) * TILE_W) / 2;
      const maxW = Math.max(VIEW_MAX_W, roomSpan * 1.25);
      const w = Math.min(maxW, Math.max(VIEW_MIN_W, v.w * factor));
      const s = w / v.w;
      if (s === 1) return;
      // Anchor the zoom at the cursor: that world point stays put on screen.
      applyView({ x: p.x - (p.x - v.x) * s, y: p.y - (p.y - v.y) * s, w, h: v.h * s });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // Centre the room around world (320,240), whatever its dimensions (the
  // bounding rect, ignoring cuts — a stable centre while cuts toggle).
  // IsoScene derives the same centre; the wrapper needs it for hit-testing.
  const farL = project(0, size.d);
  const farR = project(size.w, 0);
  const front = project(size.w, size.d);
  const cx = 320 - (farL.x + farR.x) / 2;
  const cy = 240 - (-WALL_H - 8 + front.y + 14) / 2;

  const toWorld = (e) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  };
  const toScene = (e) => {
    const p = toWorld(e);
    return p ? { x: p.x - cx, y: p.y - cy } : null;
  };

  // Stable across camera moves (its deps are the room's centring, never the
  // view) — a changing identity here alone would defeat IsoScene's memo.
  const onStartDrag = useCallback(
    (placement, e) => {
      if (!editMode) {
        // Grabbing a walkable placement starts a walk order. Everything else
        // falls through (no stopPropagation) so panning from furniture keeps
        // working.
        if (!onWalkTo || !walkableBy(placement, { editMode, walkId, walkPersonas })) return;
        e.stopPropagation();
        pointerOnItemRef.current = true;
        const foot = footOf(placement.item, placement.rot || 0);
        // Where on the body you took hold. KEPT for the whole drag, unlike the
        // marker this replaced (which centred the footprint under the pointer,
        // correct for "stand there" and wrong for "I am carrying you"): without
        // it, grabbing someone by the ankles snaps them 50px up your cursor the
        // instant you move.
        // The CTM math inline rather than via `toScene`, exactly as the edit
        // branch below does it: `toScene` is rebuilt every render, so depending
        // on it here would change this callback's identity every render and
        // defeat IsoScene's memo — the one thing the comment above forbids.
        const ctm0 = svgRef.current?.getScreenCTM();
        const w0 = ctm0
          ? new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm0.inverse())
          : null;
        const p0 = w0 ? { x: w0.x - cx, y: w0.y - cy } : null;
        const home = project(placement.gx, placement.gy);
        walkRef.current = {
          // Carried through the drag because `walkPersonas` arms MANY: the
          // order has to land on the one that was grabbed.
          id: placement.id,
          item: placement.item,
          rot: placement.rot || 0,
          tint: placement.tint,
          foot,
          gx: placement.gx,
          gy: placement.gy,
          ok: true,
          hold: p0 ? { dx: p0.x - home.x, dy: p0.y - home.y } : { dx: 0, dy: 0 },
          sx: home.x,
          sy: home.y,
        };
        setWalkTarget({ gx: placement.gx, gy: placement.gy, foot, ok: true, id: placement.id });
        svgRef.current?.setPointerCapture?.(e.pointerId);
        return;
      }
      e.stopPropagation();
      // dblclick isn't stopped by the pointerdown's stopPropagation — it still
      // reaches the svg root, where it would recenter the camera mid-decorating.
      pointerOnItemRef.current = true;
      setSelectedId(placement.id);
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!ctm) return;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const g = unproject(pt.x - cx, pt.y - cy);
      dragRef.current = {
        id: placement.id,
        item: placement.item,
        rot: placement.rot || 0,
        dgx: g.gx - placement.gx,
        dgy: g.gy - placement.gy,
      };
      svg?.setPointerCapture?.(e.pointerId);
    },
    [editMode, cx, cy, walkId, walkPersonas, onWalkTo]
  );
  const onClearSelect = useCallback(() => setSelectedId(null), []);

  // How far off the floor a carried figure hangs. Tuned by screenshot (same as
  // the name tags): enough that the feet clear the landing diamond and the gap
  // reads as air, little enough that the body stays next to the cursor holding
  // it.
  const HOLD_LIFT = 19;
  // The held figure's transform, written straight to the DOM. React never sets
  // this attribute (the JSX has no `transform` prop), so an imperative value
  // survives the re-renders the diamond causes — and the ref callback below
  // re-applies it after each one anyway.
  const applyHeld = () => {
    const walk = walkRef.current;
    const el = heldRef.current;
    if (!walk || !el) return;
    el.setAttribute("transform", `translate(${walk.sx}, ${walk.sy - HOLD_LIFT})`);
  };

  const moveDrag = (e) => {
    const walk = walkRef.current;
    if (walk) {
      const pt = toScene(e);
      if (!pt) return;
      // The body hangs where you're holding it — pointer minus the grab
      // offset — and the landing diamond goes under its FEET, so what you see
      // dangling is what will stand there.
      walk.sx = pt.x - walk.hold.dx;
      walk.sy = pt.y - walk.hold.dy;
      applyHeld();
      const g = unproject(walk.sx, walk.sy);
      const at = clampIsoPlacement(walk.item, snapHalf(g.gx), snapHalf(g.gy), size, walk.rot);
      // A pet's landing rule has no seat exception (there's no seated-cat
      // drawing); a persona's walk can still end in sitting down.
      const ok = ISO_ITEMS[walk.item]?.roamer
        ? petCanStand(at.gx, at.gy, size, placements, walk.id, walk.item)
        : personaCanStand(at.gx, at.gy, size, placements, walk.id);
      // The FIGURE follows every pointermove (imperatively, above — 60Hz of
      // React state for a 100-node sprite is exactly what this layer exists to
      // avoid); only the diamond and its legality are state, and those change a
      // few times a drag.
      if (walk.gx === at.gx && walk.gy === at.gy && walk.ok === ok) return;
      walkRef.current = { ...walk, gx: at.gx, gy: at.gy, ok };
      setWalkTarget({ gx: at.gx, gy: at.gy, foot: walk.foot, ok, id: walk.id });
      return;
    }
    const drag = dragRef.current;
    if (drag) {
      const p = toScene(e);
      if (!p) return;
      const g = unproject(p.x, p.y);
      const { gx, gy } = clampIsoPlacement(
        drag.item,
        snapHalf(g.gx - drag.dgx),
        snapHalf(g.gy - drag.dgy),
        size,
        drag.rot
      );
      // Drags simply refuse void tiles — the item stops at the shape's edge.
      if (
        !ISO_ITEMS[drag.item].wall &&
        !footprintFree(gx, gy, footOf(drag.item, drag.rot), size)
      ) {
        return;
      }
      // Belt as well as braces: remember the last position SENT so a no-op
      // never even reaches the store. The store bails out too (see
      // moveIsoItem), but stopping here also skips the clamp/collision work's
      // downstream call entirely and keeps the drag ref honest about what the
      // store believes.
      if (drag.sentGx === gx && drag.sentGy === gy) return;
      drag.sentGx = gx;
      drag.sentGy = gy;
      onMoveItem?.(drag.id, gx, gy);
      return;
    }
    // Camera pan: keep the grabbed world point glued under the pointer.
    const pan = panRef.current;
    if (pan) {
      const p = toWorld(e);
      if (!p) return;
      const v = viewRef.current;
      applyView({ ...v, x: v.x + (pan.x - p.x), y: v.y + (pan.y - p.y) });
    }
  };

  const endDrag = (e) => {
    const walk = walkRef.current;
    if (walk) {
      walkRef.current = null;
      setWalkTarget(null);
      // Commit on a real release only — a cancelled pointer (touch
      // interrupted, capture lost, cursor gone) is an abort, not an order.
      if (e?.type === "pointerup" && walk.ok) onWalkTo?.(walk.id, walk.gx, walk.gy);
    }
    dragRef.current = null;
    panRef.current = null;
  };

  const startPan = (e) => {
    pointerOnItemRef.current = false;
    if (editMode) setSelectedId(null);
    const p = toWorld(e);
    if (!p) return;
    panRef.current = { x: p.x, y: p.y };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  // The RAW placement, not the render-resolved one: the picker lives outside
  // the svg and only needs the stored tint and the item.
  const selectedRaw =
    editMode && selectedId ? placements.find((p) => p.id === selectedId) : null;

  return (
    <div className="pointer-events-auto absolute inset-0 select-none">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        /* A closed hand for as long as you're carrying someone — the cursor is
           the only "hand" in the picture, so it has to be the one that grips. */
        style={{ touchAction: "none", ...(walkTarget && { cursor: "grabbing" }) }}
        className="h-full w-full"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onPointerDown={startPan}
        onDoubleClick={() => {
          // Recenter only from empty space — double-clicking furniture (two
          // quick drag-grabs) shouldn't fling the camera.
          if (pointerOnItemRef.current) return;
          applyView(DEFAULT_VIEW);
        }}
      >
        <IsoScene
          size={size}
          placements={placements}
          editMode={editMode}
          timeOfDay={timeOfDay}
          selectedId={selectedId}
          activity={activity}
          character={character}
          mood={mood}
          reduceMotion={reduceMotion}
          cx={cx}
          cy={cy}
          onStartDrag={onStartDrag}
          onRotateItem={onRotateItem}
          onRemoveItem={onRemoveItem}
          onClearSelect={onClearSelect}
          personas={personas}
          walkId={walkId}
          walkPersonas={walkPersonas}
          carriedId={walkTarget?.id ?? null}
        />
        {/* Picking someone up: the landing diamond (where they'll stand if you
            let go) and the figure itself, dangling from your cursor. Outside
            IsoScene — pointer-rate updates must not re-render the room — and
            after it, so no furniture buries either: the selection-chrome rule. */}
        {walkTarget && (
          <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
            <polygon
              points={floorPatch(
                walkTarget.gx,
                walkTarget.gy,
                walkTarget.foot[0],
                walkTarget.foot[1]
              )}
              fill={walkTarget.ok ? "#ffe9b0" : "#d96a6a"}
              fillOpacity="0.12"
              stroke={walkTarget.ok ? "#ffe9b0" : "#d96a6a"}
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.9"
            />
            {/* An inline ref callback on purpose: it re-runs on every render,
                which is what re-applies the imperative transform after the
                diamond's state changes — and it lands the figure at the right
                place on the very first frame, instead of flashing at the room's
                origin for one. */}
            <g
              ref={(el) => {
                heldRef.current = el;
                if (el) applyHeld();
              }}
            >
              <HeldFigure
                walk={walkRef.current}
                character={character}
                personaInfo={personas ? personas[walkTarget.id] : null}
                label={
                  personas?.[walkTarget.id]?.label ??
                  placements.find((p) => p.id === walkTarget.id)?.name
                }
              />
            </g>
          </g>
        )}
      </svg>

      {selectedRaw &&
        (ISO_ITEMS[selectedRaw.item]?.tintable !== false ||
          ISO_ITEMS[selectedRaw.item]?.variants) && (
          <RoomTintPicker
            placement={selectedRaw}
            item={ISO_ITEMS[selectedRaw.item]}
            onTint={onTintItem}
          />
        )}
    </div>
  );
}

export default memo(IsoRoom);
