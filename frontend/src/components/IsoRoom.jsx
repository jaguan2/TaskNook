import { useEffect, useRef, useState } from "react";
import { WALL_H, project, floorPoints, floorPatch, wallRect } from "../lib/iso";
import {
  ISO_ITEMS,
  clampIsoPlacement,
  footOf,
  footprintFree,
  lipRuns,
  snapHalf,
  sortIso,
  tileOn,
  wallRuns,
  wallSegment,
} from "../lib/isoRoom";
import { ISO_SPRITES } from "./IsoItems";
import RoomTintPicker from "./RoomTintPicker";
import { unproject } from "../lib/iso";

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
const DEFAULT_VIEW = { x: 0, y: 0, w: 640, h: 480 };
const VIEW_MIN_W = 220;
const VIEW_MAX_W = 1600;

function loadView() {
  try {
    const v = JSON.parse(localStorage.getItem("tasknook.isoView") || "null");
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
  night: { skyTop: "#221b3f", skyBot: "#40355f", orb: "#f7e9e2", bulbs: 1 },
  sunset: { skyTop: "#e2825e", skyBot: "#6d4470", orb: "#ffcf6a", bulbs: 0.75 },
  day: { skyTop: "#8ec9ea", skyBot: "#d3ecf7", orb: "#ffd76a", bulbs: 0.3 },
};

export default function IsoRoom({
  size,
  placements = [],
  editMode = false,
  timeOfDay = "night",
  highlightId = null,
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
  const [view, setView] = useState(loadView);
  const viewRef = useRef(view);
  viewRef.current = view;

  const applyView = (next) => {
    const clamped = clampView(next);
    setView(clamped);
    localStorage.setItem("tasknook.isoView", JSON.stringify(clamped));
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
      const w = Math.min(VIEW_MAX_W, Math.max(VIEW_MIN_W, v.w * factor));
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
  // Environment: "room" is the walled interior; "garden" is open-air (grass
  // floor, soil lip, no walls/window/lights).
  const outdoors = size.env === "garden";

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
    if (editMode) setSelectedId(null);
    const p = toWorld(e);
    if (!p) return;
    panRef.current = { x: p.x, y: p.y };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  const ordered = sortIso(placements);
  const selectedPlacement =
    editMode && selectedId ? placements.find((p) => p.id === selectedId) : null;

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
        onDoubleClick={() => applyView(DEFAULT_VIEW)}
      >
        <defs>
          {/* soft pool of light the room sits in — replaces the old card */}
          <radialGradient id="isoAmbient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-wine))" }} stopOpacity="0.85" />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-wine))" }} stopOpacity="0" />
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
          <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9b0" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
          </linearGradient>
        </defs>

        <ellipse cx="320" cy="250" rx="430" ry="330" fill="url(#isoAmbient)" />

        <g transform={`translate(${cx}, ${cy})`}>
          {/* ---------- walls (cut-aware: main walls plus the inner planes
              that step around a cut corner) ---------- */}
          {!outdoors &&
            wallRuns(size).map((run, i) => {
            const a =
              run.plane === "gy" ? project(run.from, run.at) : project(run.at, run.from);
            const b =
              run.plane === "gy" ? project(run.to, run.at) : project(run.at, run.to);
            return (
              <g key={`wall-${i}`}>
                <polygon
                  points={`${a.x},${a.y - WALL_H} ${b.x},${b.y - WALL_H} ${b.x},${b.y} ${a.x},${a.y}`}
                  fill={run.plane === "gy" ? "url(#isoWallR)" : "url(#isoWallL)"}
                />
                <polygon
                  points={`${a.x},${a.y - WALL_H - 6} ${b.x},${b.y - WALL_H - 6} ${b.x},${b.y - WALL_H} ${a.x},${a.y - WALL_H}`}
                  style={{
                    fill: `rgb(var(--color-petal) / ${run.plane === "gy" ? 0.22 : 0.35})`,
                  }}
                />
              </g>
            );
          })}
          {!outdoors && !size.cuts?.some((c) => c.corner === "back") && (
            <line x1="0" y1={-WALL_H} x2="0" y2="0" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
          )}

          {/* window on the left wall — only when that wall run covers it */}
          {!outdoors && d >= 5 && leftSeg.from <= 1 && leftSeg.to >= 2.7 && (
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
          {!outdoors && rightSeg.to - rightSeg.from >= 4 && (
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

          {/* ---------- floor + grid (clipped to the painted tiles) ---------- */}
          <clipPath id="isoFloorClip">
            {floorTiles.map(([tx, ty]) => (
              <polygon key={`t-${tx}-${ty}`} points={floorPatch(tx, ty, 1, 1)} />
            ))}
          </clipPath>
          <g clipPath="url(#isoFloorClip)">
            {/* one big gradient sheet so tiles shade as ONE surface */}
            <polygon points={floorPoints(w, d)} fill={outdoors ? "url(#isoGrass)" : "url(#isoFloor)"} />
          </g>
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
          {/* front lip: under every viewer-facing tile edge */}
          {lipRuns(size).map((run, i) => {
            const A =
              run.plane === "gy" ? project(run.from, run.at) : project(run.at, run.from);
            const B =
              run.plane === "gy" ? project(run.to, run.at) : project(run.at, run.to);
            return (
              <polygon
                key={`lip-${i}`}
                points={`${A.x},${A.y} ${B.x},${B.y} ${B.x},${B.y + 7} ${A.x},${A.y + 7}`}
                fill={
                  outdoors
                    ? run.plane === "gx"
                      ? "#2c2018"
                      : "#241a12"
                    : run.plane === "gx"
                    ? "#1d0f1f"
                    : "#170c19"
                }
              />
            );
          })}

          {/* ---------- placed items ---------- */}
          {ordered.map((p) => {
            const item = ISO_ITEMS[p.item];
            const Sprite = ISO_SPRITES[p.item];
            if (!item || !Sprite) return null;
            const at = project(p.gx, p.gy);
            const selected = editMode && selectedId === p.id;
            const foot = footOf(p.item, p.rot);
            const hitR = project(foot[0], 0); // anchors the ✕/⟳ buttons
            return (
              <g
                key={p.id}
                transform={`translate(${at.x},${at.y})`}
                style={p.tint ? { "--tint": p.tint } : undefined}
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
                {/* Mirroring about the origin is a grid TRANSPOSE — the item
                    faces the other wall and its footprint swaps to match. */}
                {p.rot ? (
                  <g transform="scale(-1,1)">
                    <Sprite />
                  </g>
                ) : (
                  <Sprite />
                )}
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

      {selectedPlacement && ISO_ITEMS[selectedPlacement.item]?.tintable !== false && (
        <RoomTintPicker
          placement={selectedPlacement}
          item={ISO_ITEMS[selectedPlacement.item]}
          onTint={onTintItem}
        />
      )}
    </div>
  );
}
