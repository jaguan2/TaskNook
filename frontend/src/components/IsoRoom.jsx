import { useEffect, useRef, useState } from "react";
import { WALL_H, project, floorPoints, floorPatch, wallRect } from "../lib/iso";
import { ISO_ITEMS, clampIsoPlacement, footOf, snapHalf, sortIso } from "../lib/isoRoom";
import { ISO_SPRITES } from "./IsoItems";
import RoomTintPicker from "./RoomTintPicker";
import { unproject } from "../lib/iso";

// The interactive isometric room (beta): a resizable W×D tile floor whose
// items are dragged ON the grid with half-tile snapping. Same engine shape as
// the flat scene — pointer → getScreenCTM().inverse() → unproject → snap →
// clamp — which works because project/unproject are exact inverses.
//
// Re-declares the lampPool/lampCone gradient ids on purpose: only one scene
// (this or Cottage) is ever mounted, and RoomPanel previews reference them.
export default function IsoRoom({
  size,
  placements = [],
  editMode = false,
  scale = 1,
  onMoveItem,
  onRemoveItem,
  onRotateItem,
  onTintItem,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!editMode) setSelectedId(null);
  }, [editMode]);

  const { w, d } = size;
  const farL = project(0, d);
  const farR = project(w, 0);
  const front = project(w, d);

  // Centre the room inside the 640×480 card, whatever its dimensions.
  const cx = 320 - (farL.x + farR.x) / 2;
  const cy = 240 - (-WALL_H - 8 + front.y + 14) / 2;

  const toScene = (e) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x - cx, y: p.y - cy };
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
    if (!drag) return;
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
    onMoveItem?.(drag.id, gx, gy);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const ordered = sortIso(placements);
  const selectedPlacement =
    editMode && selectedId ? placements.find((p) => p.id === selectedId) : null;

  return (
    <div
      className={`select-none relative w-full flex items-center justify-center ${
        editMode ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 640 480"
        style={{
          width: `calc(min(90vw, 84vh) * ${scale})`,
          touchAction: editMode ? "none" : undefined,
        }}
        className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onPointerDown={() => editMode && setSelectedId(null)}
      >
        <defs>
          <radialGradient id="isoAmbient" cx="0.5" cy="0.35" r="0.9">
            <stop offset="0" style={{ stopColor: "rgb(var(--color-wine))" }} />
            <stop offset="1" style={{ stopColor: "rgb(var(--color-void))" }} />
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
          <linearGradient id="isoSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#221b3f" />
            <stop offset="1" stopColor="#40355f" />
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

        <rect x="8" y="8" width="624" height="464" rx="28" fill="url(#isoAmbient)" />

        <g transform={`translate(${cx}, ${cy})`}>
          {/* ---------- walls ---------- */}
          <polygon
            points={`0,${-WALL_H} ${farL.x},${farL.y - WALL_H} ${farL.x},${farL.y} 0,0`}
            fill="url(#isoWallL)"
          />
          <polygon
            points={`0,${-WALL_H} ${farR.x},${farR.y - WALL_H} ${farR.x},${farR.y} 0,0`}
            fill="url(#isoWallR)"
          />
          <polygon
            points={`0,${-WALL_H - 6} ${farL.x},${farL.y - WALL_H - 6} ${farL.x},${farL.y - WALL_H} 0,${-WALL_H}`}
            style={{ fill: "rgb(var(--color-petal) / 0.35)" }}
          />
          <polygon
            points={`0,${-WALL_H - 6} ${farR.x},${farR.y - WALL_H - 6} ${farR.x},${farR.y - WALL_H} 0,${-WALL_H}`}
            style={{ fill: "rgb(var(--color-petal) / 0.22)" }}
          />
          <line x1="0" y1={-WALL_H} x2="0" y2="0" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />

          {/* window on the left wall — only when it fits */}
          {d >= 5 && (
            <>
              <polygon points={wallRect("left", 1.1, 2.4, 28, 70)} fill="#46396f" />
              <polygon points={wallRect("left", 1.25, 2.1, 34, 58)} fill="url(#isoSky)" />
              <circle cx={project(0, 2.3).x} cy={project(0, 2.3).y - 74} r="7" fill="#f7e9e2" />
              <polygon points={wallRect("left", 2.24, 0.12, 34, 58)} fill="#46396f" />
              <polygon points={wallRect("left", 1.25, 2.1, 60, 3.5)} fill="#46396f" />
              <polygon points={wallRect("left", 1.05, 2.5, 24, 5)} fill="#8a5346" />
              <polygon points={floorPatch(0.15, 1.0, 2.4, 2.4)} fill="#ffe9b0" opacity="0.06" />
            </>
          )}

          {/* string lights on the right wall — only when it fits */}
          {w >= 5 && (
            <>
              <path
                d={`M ${project(0.5, 0).x} ${project(0.5, 0).y - 100} Q ${project(w / 2, 0).x} ${project(w / 2, 0).y - 68} ${project(w - 0.5, 0).x} ${project(w - 0.5, 0).y - 100}`}
                stroke="#2b2350"
                strokeWidth="2"
                fill="none"
              />
              {Array.from({ length: Math.max(3, Math.floor(w - 2)) }, (_, i) => {
                const t = 0.5 + ((w - 1) * (i + 1)) / (Math.max(3, Math.floor(w - 2)) + 1);
                const along = (t - 0.5) / (w - 1);
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
          )}

          {/* ---------- floor + grid ---------- */}
          <polygon points={floorPoints(w, d)} fill="url(#isoFloor)" />
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
          {/* front lip */}
          <polygon
            points={`${farR.x},${farR.y} ${front.x},${front.y} ${front.x},${front.y + 7} ${farR.x},${farR.y + 7}`}
            fill="#1d0f1f"
          />
          <polygon
            points={`${farL.x},${farL.y} ${front.x},${front.y} ${front.x},${front.y + 7} ${farL.x},${farL.y + 7}`}
            fill="#170c19"
          />

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
                {selected && (
                  <>
                    {/* footprint highlight on the grid */}
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
                  </>
                )}
              </g>
            );
          })}
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
