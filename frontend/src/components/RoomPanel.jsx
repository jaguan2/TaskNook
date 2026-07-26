import { useState } from "react";
import { useStore } from "../store";
import { ITEMS, ITEM_KEYS, PRESETS } from "../lib/room";
import {
  ISO_ENVS,
  ISO_ENV_KEYS,
  ISO_ITEMS,
  ISO_ITEM_KEYS,
  ISO_PRESETS,
  ISO_PRESET_KEYS,
  ISO_SIZE_MAX,
} from "../lib/isoRoom";
import { ITEM_SPRITES } from "./RoomItems";

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
          className={`pill w-full py-2.5 font-semibold ${
            roomEditMode
              ? "bg-glow text-plum"
              : "bg-white/10 text-cream hover:bg-white/20"
          }`}
        >
          {roomEditMode ? "✓ Done decorating" : "🛋️ Decorate the room"}
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
          <p className="text-sm font-semibold text-cream">🧊 Isometric room</p>
          <button
            onClick={() => setIsoPreview(!isoPreview)}
            className={`pill px-3 py-1 text-xs font-semibold ${
              isoPreview ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {isoPreview ? "On" : "Try it"}
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
                    ⟲ full rectangle
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
          <p className="text-sm font-semibold text-cream">🔍 Room size</p>
          <span className="text-xs tabular-nums text-petal/60">
            {Math.round(roomScale * 100)}%
            {roomScale !== 1 && (
              <button
                onClick={() => setRoomScale(1)}
                className="ml-2 text-glow/80 hover:text-glow"
              >
                reset
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

      {/* Iso presets — a happy default plus a couple of moods */}
      {isoPreview && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
            Start from a preset
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ISO_PRESET_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => applyIsoPreset(key)}
                className={`pill bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 ${
                  key === "empty" ? "text-petal/60 hover:text-danger" : "text-petal"
                }`}
              >
                {ISO_PRESETS[key].icon} {ISO_PRESETS[key].label}
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
          <div className="grid grid-cols-2 gap-1.5">
            {ISO_ITEM_KEYS.filter(
              (key) => !(ISO_ITEMS[key].wall && !ISO_ENVS[isoEnv].walls)
            ).map((key) => (
              <button
                key={key}
                onClick={() => addIsoItem(key)}
                title={`Add ${ISO_ITEMS[key].label.toLowerCase()}`}
                className="group flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 text-left transition hover:bg-white/15"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center text-xl">
                  {ISO_ITEMS[key].icon}
                </span>
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
          <button
            onClick={clearRoom}
            className="pill bg-white/10 px-3 py-1.5 text-xs font-semibold text-petal/60 hover:bg-white/20 hover:text-danger"
          >
            🧹 Empty room
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
