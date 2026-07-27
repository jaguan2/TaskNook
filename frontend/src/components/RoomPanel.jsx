import { useLayoutEffect, useRef, useState } from "react";
import { Boxes, Check, Eraser, Scaling, Sofa } from "lucide-react";
import { useStore } from "../store";
import { useArmed } from "../lib/useArmed";
import { ITEMS, ITEM_KEYS, PRESETS } from "../lib/room";
import { project, floorPatch } from "../lib/iso";
import {
  ISO_ENVS,
  ISO_ENV_KEYS,
  ISO_ITEMS,
  ISO_ITEM_GROUPS,
  ISO_PRESETS,
  ISO_PRESET_KEYS,
  ISO_SIZE_MAX,
  cutsToMask,
  envHasWalls,
  footOf,
  isoDepth,
  seatFor,
  sortIso,
  tileOn,
} from "../lib/isoRoom";
import { ITEM_SPRITES } from "./RoomItems";
import { ISO_SPRITES } from "./IsoItems";

// One catalog entry, drawn at postage-stamp size — the SAME sprite the scene
// will place. The iso picker used to show the catalog's emoji (🛏️ for a bed),
// which is exactly the piece of the app where you most want to see what you're
// about to get, and the only browser that didn't show it (the flat room's
// picker has drawn real sprites all along).
function IsoItemPreview({ itemKey }) {
  const item = ISO_ITEMS[itemKey];
  const Sprite = ISO_SPRITES[itemKey];
  const gRef = useRef(null);
  const [box, setBox] = useState(null);

  // Measure, don't guess. Every sprite is drawn around its own origin with
  // wildly different extents — a wall clock hangs ~100px above the floor line,
  // a rug is flat around it, a tree is 128 tall — so no single hand-written
  // viewBox frames them all. getBBox is exact and runs once per item.
  useLayoutEffect(() => {
    const measured = gRef.current?.getBBox?.();
    if (measured && measured.width > 0 && measured.height > 0) setBox(measured);
  }, [itemKey]);

  if (!item || !Sprite) return null;
  const pad = 4;
  const viewBox = box
    ? `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`
    : "-40 -100 80 110"; // one frame's worth, before the measurement lands

  return (
    // No local <defs>: url(#lampPool) / url(#isoSky) / url(#isoShadow) resolve
    // document-wide to IsoRoom's, which is mounted behind this panel whenever
    // this section is visible (same trick as the flat room's ItemPreview).
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="h-9 w-9 shrink-0"
      aria-hidden="true"
    >
      <g ref={gRef}>
        <Sprite />
      </g>
    </svg>
  );
}

// A preset button IS the room in miniature: the same sprites the scene
// renders, drawn over the preset's floor at postage-stamp size — emoji pills
// told you nothing about what you'd get (user feedback).
function IsoPresetPreview({ preset }) {
  const { w, d } = preset.size;
  const mask = preset.size.cuts ? cutsToMask(preset.size.cuts, w, d) : preset.size.mask;
  const size = { w, d, ...(mask && { mask }) };
  const grass = preset.size.env === "garden";
  // Seat personas before sorting, exactly as the scene does — otherwise the
  // "Cozy study" thumbnail shows its resident standing *inside* the chair, and
  // the depth sort orders them from the wrong spot.
  const placed = preset.items.map((p, i) => ({ ...p, id: `pv${i}` }));
  const items = sortIso(
    placed.map((p) => {
      if (!ISO_ITEMS[p.item]?.persona) return p;
      const seat = seatFor(p, placed);
      if (!seat) return p;
      const sf = footOf(seat.placement.item, seat.placement.rot);
      const pf = footOf(p.item, p.rot);
      return {
        ...p,
        gx: seat.placement.gx + sf[0] / 2 - pf[0] / 2,
        gy: seat.placement.gy + sf[1] / 2 - pf[1] / 2 + 0.15,
        _seat: seat.height,
        _depth: isoDepth(seat.placement) + 0.01, // in front of the backrest
      };
    })
  );
  const L = project(0, d);
  const R = project(w, 0);
  const F = project(w, d);
  return (
    <svg
      viewBox={`${L.x - 6} -104 ${R.x - L.x + 12} ${F.y + 118}`}
      className="h-24 w-full"
      aria-hidden="true"
    >
      {Array.from({ length: d }, (_, ty) =>
        Array.from({ length: w }, (_, tx) =>
          tileOn(size, tx, ty) ? (
            <polygon
              key={`${tx}-${ty}`}
              points={floorPatch(tx, ty, 1, 1)}
              fill={grass ? "#3d6a50" : "rgb(var(--color-wine))"}
              opacity="0.8"
            />
          ) : null
        )
      )}
      {items.map((p) => {
        const item = ISO_ITEMS[p.item];
        const Sprite = ISO_SPRITES[p.item];
        if (!item || !Sprite) return null;
        const at = project(p.gx, p.gy);
        const sprite = item.persona ? (
          <g transform={p._seat ? `translate(0, ${-p._seat})` : undefined}>
            <Sprite seated={!!p._seat} seatH={p._seat || 0} />
          </g>
        ) : (
          <Sprite
            rot={(p.rot || 0) % 2}
            back={(p.rot || 0) >= 2}
            variant={item.variants?.[p.tint]}
          />
        );
        return (
          <g
            key={p.id}
            transform={`translate(${at.x},${at.y})`}
            style={p.tint ? { "--tint": p.tint } : undefined}
          >
            {(p.rot || 0) % 2 ? <g transform="scale(-1,1)">{sprite}</g> : sprite}
          </g>
        );
      })}
    </svg>
  );
}

// Preview sprites are lit as if at night so lamps/lights glow in the panel.
const PREVIEW_TIME = { lampGlow: 0.55, screenGlow: 0.4, bulbGlow: 0.95 };

const ZONE_SECTIONS = [
  { zone: "wall", label: "On the wall" },
  { zone: "desk", label: "On the desk" },
  { zone: "floor", label: "On the floor" },
  { zone: "ceiling", label: "Ceiling" },
];

function ItemPreview({ itemKey }) {
  const item = ITEMS[itemKey];
  const Sprite = ITEM_SPRITES[itemKey];
  const { x, y, w, h } = item.hit;
  // Slight breathing room around the hit box so strokes aren't clipped.
  return (
    <svg
      viewBox={`${x - 4} ${y - 4} ${w + 8} ${h + 8}`}
      className="h-9 w-9 shrink-0"
      aria-hidden="true"
    >
      {/* No local <defs>: url(#lampPool)/url(#lampCone) resolve document-wide
          to the Cottage SVG's defs, which is always mounted behind the panel.
          Duplicating the ids here would be invalid HTML. */}
      <Sprite time={PREVIEW_TIME} />
    </svg>
  );
}

export default function RoomPanel() {
  const {
    roomPlacements,
    roomEditMode,
    setRoomEditMode,
    addRoomItem,
    applyRoomPreset,
    clearRoom,
    roomScale,
    setRoomScale,
    isoPreview,
    setIsoPreview,
    isoRoom,
    addIsoItem,
    setIsoSize,
    setIsoTile,
    resetIsoShape,
    setIsoEnv,
    applyIsoPreset,
  } = useStore();
  const isoEnv = isoRoom.env || "room";
  // Floor-plan painting: pointerdown picks add/remove from the first tile,
  // dragging applies it to every tile crossed (the Sims floor-tool feel).
  const [paintMode, setPaintMode] = useState(null);
  // Clearing the room destroys an arrangement outright — armed like a delete.
  const [armedId, arm] = useArmed();
  const maskRows =
    isoRoom.mask || Array.from({ length: isoRoom.d }, () => "1".repeat(isoRoom.w));

  const counts = roomPlacements.reduce((acc, p) => {
    acc[p.item] = (acc[p.item] || 0) + 1;
    return acc;
  }, {});
  const isoCounts = isoRoom.placements.reduce((acc, p) => {
    acc[p.item] = (acc[p.item] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Edit mode */}
      <section className="space-y-2">
        <button
          onClick={() => setRoomEditMode(!roomEditMode)}
          className={`pill flex w-full items-center justify-center gap-1.5 py-2.5 font-semibold ${
            roomEditMode
              ? "bg-glow text-plum"
              : "bg-white/10 text-cream hover:bg-white/20"
          }`}
        >
          {roomEditMode ? (
            <>
              <Check size={16} /> Done decorating
            </>
          ) : (
            <>
              <Sofa size={16} /> Decorate the room
            </>
          )}
        </button>
        <p className="text-xs text-petal/60">
          {roomEditMode
            ? isoPreview
              ? "Drag furniture across the grid — half-tile snapping. Tap an item for colours and ✕ to put it away."
              : "Drag anything anywhere — wall, desk or floor. Tap an item for colours and ✕ to put it away."
            : "Turn on decorating to drag things around the room."}
        </p>
      </section>

      {/* Isometric room (beta) */}
      <section className="space-y-2 rounded-2xl border border-glow/20 bg-glow/5 p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <Boxes size={15} className="text-petal/70" /> Isometric room
          </p>
          <button
            onClick={() => setIsoPreview(!isoPreview)}
            className={`pill px-3 py-1 text-xs font-semibold ${
              isoPreview ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {isoPreview ? "On" : "Off"}
          </button>
        </div>
        {isoPreview ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-10 text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                width
              </span>
              <input
                type="range"
                min="3"
                max={ISO_SIZE_MAX}
                step="1"
                value={isoRoom.w}
                onChange={(e) => setIsoSize(Number(e.target.value), isoRoom.d)}
                className="flex-1 accent-glow"
              />
              <span className="w-6 text-right text-xs tabular-nums text-petal/70">{isoRoom.w}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10 text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                depth
              </span>
              <input
                type="range"
                min="3"
                max={ISO_SIZE_MAX}
                step="1"
                value={isoRoom.d}
                onChange={(e) => setIsoSize(isoRoom.w, Number(e.target.value))}
                className="flex-1 accent-glow"
              />
              <span className="w-6 text-right text-xs tabular-nums text-petal/70">{isoRoom.d}</span>
            </div>
            {/* environment: walled room or open-air garden */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                setting
              </span>
              {ISO_ENV_KEYS.map((env) => (
                <button
                  key={env}
                  onClick={() => setIsoEnv(env)}
                  className={`pill px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    isoEnv === env
                      ? "bg-glow text-plum"
                      : "bg-white/10 text-petal hover:bg-white/20"
                  }`}
                >
                  {ISO_ENVS[env].icon} {ISO_ENVS[env].label}
                </button>
              ))}
            </div>
            {/* floor plan: drag across the grid to draw any shape */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                  floor plan — drag to draw
                </span>
                {isoRoom.mask && (
                  <button
                    onClick={resetIsoShape}
                    className="text-[11px] font-semibold text-glow/80 hover:text-glow"
                  >
                    ⟲ Full rectangle
                  </button>
                )}
              </div>
              <div
                className="grid touch-none select-none rounded-lg bg-white/5 p-1"
                style={{
                  gridTemplateColumns: `repeat(${isoRoom.w}, 1fr)`,
                  // hairline gaps up to ~24 wide; beyond that the gaps would
                  // eat the (tiny) cells
                  gap: isoRoom.w > 24 ? 0 : 1,
                }}
                onPointerUp={() => setPaintMode(null)}
                onPointerLeave={() => setPaintMode(null)}
              >
                {maskRows.map((row, y) =>
                  row.split("").map((c, x) => (
                    <div
                      key={`${x}-${y}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        // Touch gives the first cell implicit pointer capture,
                        // which swallows the enter events drag-painting needs.
                        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        }
                        const on = c !== "1";
                        setPaintMode(on);
                        setIsoTile(x, y, on);
                      }}
                      onPointerEnter={() => {
                        if (paintMode !== null) setIsoTile(x, y, paintMode);
                      }}
                      className={`aspect-square cursor-crosshair rounded-[2px] transition-colors ${
                        c === "1" ? "bg-glow/70" : "bg-white/10 hover:bg-white/20"
                      }`}
                    />
                  ))
                )}
              </div>
            </div>
            <p className="text-xs text-petal/50">
              A {isoRoom.w}×{isoRoom.d} floor — resize with the sliders, then
              paint tiles away above for L-shapes, courtyards, anything.
              Furniture stays on the drawn floor. Scroll to zoom, drag empty
              space to look around, double-click to recenter.
            </p>
          </>
        ) : (
          <p className="text-xs text-petal/60">
            The Sims-style room (beta): place furniture on a resizable tile
            grid. Both rooms keep their own layouts.
          </p>
        )}
      </section>

      {/* Room size — the flat scene's display scale. The iso room doesn't
          need it: its camera zooms freely with the scroll wheel. */}
      {!isoPreview && (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <Scaling size={15} className="text-petal/70" /> Room size
          </p>
          <span className="text-xs tabular-nums text-petal/60">
            {Math.round(roomScale * 100)}%
            {roomScale !== 1 && (
              <button
                onClick={() => setRoomScale(1)}
                className="ml-2 text-glow/80 hover:text-glow"
              >
                Reset
              </button>
            )}
          </span>
        </div>
        <input
          type="range"
          min="0.6"
          max="1.2"
          step="0.05"
          value={roomScale}
          onChange={(e) => setRoomScale(Number(e.target.value))}
          className="w-full accent-glow"
        />
        <p className="text-xs text-petal/50">
          On top of this, the room already grows and shrinks with the window.
        </p>
      </section>
      )}

      {/* Iso presets — each button is a live miniature of the room it applies */}
      {isoPreview && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
            Start from a preset
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ISO_PRESET_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => applyIsoPreset(key)}
                className="rounded-xl bg-white/5 p-2 text-left transition hover:bg-white/15"
              >
                <IsoPresetPreview preset={ISO_PRESETS[key]} />
                <span className="mt-1 block truncate text-center text-xs font-medium text-cream">
                  {ISO_PRESETS[key].icon} {ISO_PRESETS[key].label}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-petal/50">
            Presets replace the current layout (floor size included) — then
            tweak from there.
          </p>
        </section>
      )}

      {/* Iso furniture (its own catalog while the iso room is active) */}
      {isoPreview && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
            Furniture
          </p>
          {/* Sectioned, not one 93-item scroll: past about thirty entries a
              flat grid stops being browsable and you can no longer tell what
              the catalog even contains. A section whose every item is wall
              decor disappears entirely outdoors rather than leaving a heading
              over nothing. */}
          <div className="space-y-3">
            {ISO_ITEM_GROUPS.map((group) => {
              const keys = group.keys.filter(
                (key) => !(ISO_ITEMS[key].wall && !envHasWalls(isoEnv))
              );
              if (!keys.length) return null;
              return (
                <div key={group.label}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-petal/40">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {keys.map((key) => (
                      <button
                        key={key}
                        onClick={() => addIsoItem(key)}
                        title={`Add ${ISO_ITEMS[key].label.toLowerCase()}`}
                        className="group flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 text-left transition hover:bg-white/15"
                      >
                        <IsoItemPreview itemKey={key} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-cream">
                            {ISO_ITEMS[key].label}
                          </span>
                          <span className="text-[10px] text-petal/50">
                            {isoCounts[key] ? `${isoCounts[key]} placed · ` : ""}
                            <span className="hover-reveal text-glow/80 transition">
                              + add
                            </span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-petal/50">
            Tap a placed item for its controls: ⟳ mirrors it to face the other
            way (wall decor hops to the other wall), 🎨 recolours, ✕ puts it
            away.
          </p>
        </section>
      )}

      {/* Presets (classic scene) */}
      {!isoPreview && (
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
          Start from a preset
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyRoomPreset(key)}
              className="pill bg-white/10 px-3 py-1.5 text-xs font-semibold text-petal hover:bg-white/20"
            >
              {preset.icon} {preset.label}
            </button>
          ))}
          {/* "Clear", not "Empty room" — the iso presets have an "Empty room"
              PRESET, and the same words meaning a state there and an action
              here read as one feature. */}
          <button
            onClick={() => arm("clear", clearRoom)}
            className={`pill flex items-center gap-1 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 ${
              armedId === "clear"
                ? "font-bold text-danger"
                : "text-petal/60 hover:text-danger"
            }`}
          >
            {armedId === "clear" ? (
              "sure?"
            ) : (
              <>
                <Eraser size={12} /> Clear the room
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-petal/50">
          Presets replace the current layout — then tweak from there.
        </p>
      </section>
      )}

      {/* Inventory (classic scene) */}
      {!isoPreview &&
        ZONE_SECTIONS.map(({ zone, label }) => (
        <section key={zone}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
            {label}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ITEM_KEYS.filter((k) => ITEMS[k].zone === zone).map((key) => {
              // Fixed items (string lights) are singletons — once placed,
              // adding another is a no-op, so say so instead of a dead button.
              const maxed = ITEMS[key].fixed && counts[key] > 0;
              return (
                <button
                  key={key}
                  onClick={() => addRoomItem(key)}
                  disabled={maxed}
                  title={maxed ? "Already up" : `Add ${ITEMS[key].label.toLowerCase()}`}
                  className={`group flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 text-left transition ${
                    maxed ? "opacity-50" : "hover:bg-white/15"
                  }`}
                >
                  <ItemPreview itemKey={key} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-cream">
                      {ITEMS[key].label}
                    </span>
                    <span className="text-[10px] text-petal/50">
                      {counts[key] ? `${counts[key]} placed · ` : ""}
                      {maxed ? (
                        "up ✓"
                      ) : (
                        <span className="hover-reveal text-glow/80 transition">
                          + add
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        ))}
    </div>
  );
}
