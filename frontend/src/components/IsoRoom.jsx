import { memo, useEffect, useRef, useState } from "react";
import { TILE_H, TILE_W, WALL_H, project, floorPoints, floorPatch, wallRect } from "../lib/iso";
import {
  ISO_ITEMS,
  clampIsoPlacement,
  envOf,
  footOf,
  footprintFree,
  lipRuns,
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
import { readStored, writeStored } from "../lib/storage";
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
 */
function FloorSurface({ w, d, style }) {
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

// memo: App re-renders every second (the focus timer ticks) and a big floor
// is thousands of SVG nodes — the scene must only re-render when the room
// actually changes (all callbacks are useCallback'd in the store).
function IsoRoom({
  size,
  placements = [],
  editMode = false,
  timeOfDay = "night",
  highlightId = null,
  working = false,
  character,
  onMoveItem,
  onRemoveItem,
  onRotateItem,
  onTintItem,
}) {
  const tod = ISO_TIME[timeOfDay] || ISO_TIME.night;
  const [selectedId, setSelectedId] = useState(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null); // the world point the pointer grabbed
  const pointerOnItemRef = useRef(false); // last pointerdown hit furniture
  const [view, setView] = useState(loadView);
  const viewRef = useRef(view);
  viewRef.current = view;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const persistViewTimer = useRef(null);
  useEffect(() => () => clearTimeout(persistViewTimer.current), []);
  const applyView = (next) => {
    const clamped = clampView(next);
    setView(clamped);
    // Persisting on every pointermove meant a synchronous JSON+disk write at
    // pan/zoom rate (60Hz+) — debounce it; only the state update needs to be
    // immediate.
    clearTimeout(persistViewTimer.current);
    persistViewTimer.current = setTimeout(() => {
      writeStored("tasknook.isoView", JSON.stringify(clamped));
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
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
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

  const { w, d } = size;
  const farL = project(0, d);
  const farR = project(w, 0);
  const front = project(w, d);

  // Centre the room around world (320,240), whatever its dimensions (the
  // bounding rect, ignoring cuts — a stable centre while cuts toggle).
  const cx = 320 - (farL.x + farR.x) / 2;
  const cy = 240 - (-WALL_H - 8 + front.y + 14) / 2;

  // Mask-aware geometry: which tiles exist, and the walls/lip per tile edge.
  const floorTiles = [];
  for (let ty = 0; ty < d; ty++) {
    for (let tx = 0; tx < w; tx++) {
      if (tileOn(size, tx, ty)) floorTiles.push([tx, ty]);
    }
  }
  const leftSeg = wallSegment("left", size);
  const rightSeg = wallSegment("right", size);
  // Environment: everything the scene draws AROUND the tiles. `wallH` is 0
  // when there are none, so every wall-dependent bit of geometry falls away
  // from one number instead of from a scatter of `outdoors` checks.
  const env = envOf(size.env);
  const wallH = env.walls === "full" ? WALL_H : env.walls === "low" ? LOW_WALL_H : 0;

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

  const startDrag = (placement) => (e) => {
    if (!editMode) return;
    e.stopPropagation();
    // dblclick isn't stopped by the pointerdown's stopPropagation — it still
    // reaches the svg root, where it would recenter the camera mid-decorating.
    pointerOnItemRef.current = true;
    setSelectedId(placement.id);
    const p = toScene(e);
    if (!p) return;
    const g = unproject(p.x, p.y);
    dragRef.current = {
      id: placement.id,
      item: placement.item,
      rot: placement.rot || 0,
      dgx: g.gx - placement.gx,
      dgy: g.gy - placement.gy,
    };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  const moveDrag = (e) => {
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

  const endDrag = () => {
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

  // Personas: seated ones snap onto their seat (slightly forward so they
  // draw in front of the backrest, lifted by the seat height); standing ones
  // idle-wander via a VISUAL-ONLY offset (never persisted — their stored
  // spot is "home"), collision-checked against the floor shape AND furniture.
  const roamRef = useRef({});
  const [, setRoamTick] = useState(0);
  useEffect(() => {
    if (editMode) {
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
      const cur = roamRef.current[p.id] || { dx: 0, dy: 0 };
      const f = footOf(p.item, p.rot);
      // Cat rule: once curled up on a rug, mostly stay there.
      if (
        ISO_ITEMS[p.item].roamer &&
        overSoftSpot(placements, p.gx + cur.dx, p.gy + cur.dy, f) &&
        Math.random() < 0.8
      ) {
        return;
      }
      const next = {
        dx: Math.max(-1.5, Math.min(1.5, cur.dx + (Math.random() * 2 - 1))),
        dy: Math.max(-1.5, Math.min(1.5, cur.dy + (Math.random() * 2 - 1))),
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
      roamRef.current = { ...roamRef.current, [p.id]: next };
      setRoamTick((t) => t + 1);
    }, 3500);
    return () => clearInterval(id);
  }, [editMode, placements, size]);

  const effective = placements.map((p) => {
    const item = ISO_ITEMS[p.item];
    if (item?.roamer) {
      const off = !editMode && roamRef.current[p.id];
      const gx = off ? p.gx + off.dx : p.gx;
      const gy = off ? p.gy + off.dy : p.gy;
      // Awake while out wandering; asleep at home or curled on a rug.
      const moved = !!off && (Math.abs(off.dx) > 0.05 || Math.abs(off.dy) > 0.05);
      const awake = moved && !overSoftSpot(placements, gx, gy, footOf(p.item, p.rot));
      return { ...p, gx, gy, _awake: awake };
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
    const off = !editMode && roamRef.current[p.id];
    // Mid-wander = walking: the sprite swaps to a stepping gait.
    const moving = !!off && (Math.abs(off.dx) > 0.05 || Math.abs(off.dy) > 0.05);
    return off ? { ...p, gx: p.gx + off.dx, gy: p.gy + off.dy, _moving: moving } : p;
  });
  const ordered = sortIso(effective);
  const selectedPlacement =
    editMode && selectedId ? effective.find((p) => p.id === selectedId) : null;

  return (
    <div className="pointer-events-auto absolute inset-0 select-none">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        style={{ touchAction: "none" }}
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
            wallRuns(size).map((run, i) => {
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

          {/* window on the left wall — only when that wall run covers it */}
          {env.window && d >= 5 && leftSeg.from <= 1 && leftSeg.to >= 2.7 && (
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
              daylight */}
          {env.lights && rightSeg.to - rightSeg.from >= 4 && (
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
                        <g key={`bulb-${i}`} className="room-twinkle" style={{ animationDelay: `${(i % 5) * 0.8}s` }}>
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
          {lipRuns(size).map((run, i) => {
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
            {floorTiles.map(([tx, ty]) => (
              <polygon key={`t-${tx}-${ty}`} points={floorPatch(tx, ty, 1, 1)} />
            ))}
          </clipPath>
          <g clipPath="url(#isoFloorClip)">
            {/* one big gradient sheet so tiles shade as ONE surface */}
            <polygon points={floorPoints(w, d)} fill={`url(#${env.floor})`} />
            <FloorSurface w={w} d={d} style={env.floorStyle} />
            {tod.lift && (
              <polygon points={floorPoints(w, d)} fill={tod.lift} opacity={tod.liftOpacity} />
            )}
          </g>
          {/* The tile grid is a placement aid: it belongs while you're
              decorating and nowhere else, now that the floor has a grain of
              its own to read. */}
          {editMode && (
          <g clipPath="url(#isoFloorClip)">
            {Array.from({ length: d - 1 }, (_, i) => i + 1).map((gy) => (
              <line
                key={`gy-${gy}`}
                x1={project(0, gy).x}
                y1={project(0, gy).y}
                x2={project(w, gy).x}
                y2={project(w, gy).y}
                stroke={editMode ? "#f3c6c0" : "#26122a"}
                strokeWidth={editMode ? 0.7 : 1.2}
                opacity={editMode ? 0.18 : 0.35}
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
                opacity={editMode ? 0.18 : 0.07}
              />
            ))}
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
              return (
                <ellipse
                  key={`glow-${p.id}`}
                  cx={at.x}
                  cy={at.y}
                  rx={r}
                  ry={r * 0.5}
                  fill="url(#lampPool)"
                  opacity={strength * tod.glow}
                />
              );
            })}
          </g>

          {/* ---------- placed items ---------- */}
          {ordered.map((p) => {
            const item = ISO_ITEMS[p.item];
            const Sprite = ISO_SPRITES[p.item];
            if (!item || !Sprite) return null;
            const at = project(p.gx, p.gy);
            const foot = footOf(p.item, p.rot);
            const persona = !!item.persona;
            const glides = persona || !!item.roamer;
            // Wanderers use a CSS transform (transition = the glide);
            // everything else keeps the attribute transform (instant drags).
            const placeProps =
              glides && !editMode
                ? {
                    style: {
                      transform: `translate(${at.x}px, ${at.y}px)`,
                      // A soft start and settle — creatures amble, not slide.
                      transition: "transform 2.6s cubic-bezier(0.45, 0.05, 0.35, 1)",
                      ...(p.tint && { "--tint": p.tint }),
                    },
                  }
                : {
                    transform: `translate(${at.x},${at.y})`,
                    style: p.tint ? { "--tint": p.tint } : undefined,
                  };
            return (
              <g
                key={p.id}
                {...placeProps}
                className={editMode ? "room-item" : undefined}
                onPointerDown={startDrag(p)}
              >
                {/* Grab target = the item's FOOTPRINT diamond (plus its painted
                    pixels via normal SVG hit-testing). A full bounding box
                    would let tall items (the floor lamp's pole) blanket
                    everything behind them. */}
                {editMode && (
                  <polygon points={floorPatch(0, 0, foot[0], foot[1])} fill="transparent" />
                )}
                {/* Contact shadow: one soft ellipse sized to the footprint,
                    under every grounded item. This is most of what makes the
                    sprites read as sitting IN the room instead of pasted on
                    (flat rugs/ponds and wall decor obviously except). */}
                {!item.wall && (item.layer || 0) >= 0 && !p._seat && !p._rest && (
                  <ellipse
                    cx={project(foot[0] / 2, foot[1] / 2).x}
                    cy={project(foot[0] / 2, foot[1] / 2).y}
                    rx={((foot[0] + foot[1]) * TILE_W) / 4 + 3}
                    ry={((foot[0] + foot[1]) * TILE_H) / 4 + 1.5}
                    fill="url(#isoShadow)"
                  />
                )}
                {/* Mirroring about the origin is a grid TRANSPOSE — the item
                    faces the other wall and its footprint swaps to match.
                    noMirror items (rendered PNGs) ship a real second render
                    per orientation instead: pass rot through, skip the flip. */}
                {(() => {
                  const sprite = persona ? (
                    <g transform={p._seat ? `translate(0, ${-p._seat})` : undefined}>
                      <Sprite
                        seated={!!p._seat && !p._lie}
                        lying={!!p._lie}
                        seatH={p._seat || 0}
                        working={working}
                        moving={!!p._moving}
                        character={character}
                      />
                    </g>
                  ) : item.roamer ? (
                    <Sprite awake={!!p._awake} />
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
                  // The odd turns are the mirror; the even ones are drawn as-is.
                  return (p.rot || 0) % 2 ? <g transform="scale(-1,1)">{sprite}</g> : sprite;
                })()}
              </g>
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
                      setSelectedId(null);
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
      </svg>

      {selectedPlacement &&
        (ISO_ITEMS[selectedPlacement.item]?.tintable !== false ||
          ISO_ITEMS[selectedPlacement.item]?.variants) && (
          <RoomTintPicker
            placement={selectedPlacement}
            item={ISO_ITEMS[selectedPlacement.item]}
            onTint={onTintItem}
          />
        )}
    </div>
  );
}

export default memo(IsoRoom);
