import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Boxes, Check, ChevronDown, Eraser, Search, Sofa } from "lucide-react";
import { useStore } from "../store";
import { useArmed } from "../lib/useArmed";
import { ITEMS, ITEM_KEYS, PRESETS } from "../lib/room";
import { project, floorPatch, floorPoints } from "../lib/iso";
import {
  ISO_ENVS,
  ISO_ENV_KEYS,
  ISO_ITEMS,
  ISO_ITEM_GROUPS,
  ISO_LIGHTING,
  ISO_LIGHTING_KEYS,
  ISO_PRESETS,
  ISO_PRESET_KEYS,
  ISO_SIZE_MAX,
  cutsToMask,
  envHasWalls,
  partitionKey,
  seatFor,
  seatedPlacement,
  stackedPlacement,
  surfaceFor,
  sortIso,
  tileOn,
} from "../lib/isoRoom";
import { costOf, owns } from "../lib/unlocks";
import { ITEM_SPRITES } from "./RoomItems";
import { ISO_SPRITES } from "./IsoItems";

// One catalog entry, drawn at postage-stamp size — the SAME sprite the scene
// will place. The iso picker used to show the catalog's emoji (🛏️ for a bed),
// which is exactly the piece of the app where you most want to see what you're
// about to get, and the only browser that didn't show it (the flat room's
// picker has drawn real sprites all along).
/**
 * One catalog sprite in the picker.
 *
 * memo'd because RoomPanel calls useStore(), so every store change re-rendered
 * all ~132 of these — and the panel is on screen whenever you're decorating,
 * since "Decorate" is toggled from inside it. Its props are a single string, so
 * the comparison is free and always correct.
 */
function IsoItemPreviewInner({ itemKey }) {
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

const IsoItemPreview = memo(IsoItemPreviewInner);

// A preset button IS the room in miniature: the same sprites the scene
// renders, drawn over the preset's floor at postage-stamp size — emoji pills
// told you nothing about what you'd get (user feedback).
/**
 * A whole-room thumbnail for one preset.
 *
 * Also memo'd, and it earns it more than the item previews: each of the eleven
 * draws w×d floor polygons and resolves seating and stacking for ~15 placements.
 * `preset` is a module-level constant object, so the identity is stable.
 */
function IsoPresetPreviewInner({ preset }) {
  const { w, d } = preset.size;
  const mask = preset.size.cuts ? cutsToMask(preset.size.cuts, w, d) : preset.size.mask;
  const size = { w, d, ...(mask && { mask }) };
  const shapedFloor = mask?.some((row) => row.includes("0"));
  const grass = preset.size.env === "garden";
  // Seat personas before sorting, exactly as the scene does — otherwise the
  // "Cozy study" thumbnail shows its resident standing *inside* the chair, and
  // the depth sort orders them from the wrong spot.
  const placed = preset.items.map((p, i) => ({ ...p, id: `pv${i}` }));
  const items = sortIso(
    placed.map((p) => {
      if (ISO_ITEMS[p.item]?.stacks) {
        // Same for things on tables, or the thumbnail shows the mug on the
        // floor beside the desk it's meant to be standing on.
        const on = surfaceFor(p, placed);
        return on ? { ...p, ...stackedPlacement(p, on) } : p;
      }
      if (!ISO_ITEMS[p.item]?.persona) return p;
      const seat = seatFor(p, placed);
      if (!seat) return p;
      return { ...p, ...seatedPlacement(p, seat) };
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
      {shapedFloor ? (
        Array.from({ length: d }, (_, ty) =>
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
        )
      ) : (
        <polygon
          points={floorPoints(w, d)}
          fill={grass ? "#3d6a50" : "rgb(var(--color-wine))"}
          opacity="0.8"
        />
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

const IsoPresetPreview = memo(IsoPresetPreviewInner);

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
    visiting,
    leaveVisit,
    isoPreview,
    setIsoPreview,
    isoRoom,
    addIsoItem,
    setIsoSize,
    setIsoTile,
    setIsoPartition,
    resetIsoPartitions,
    resetIsoShape,
    setIsoEnv,
    setIsoLighting,
    applyIsoPreset,
    unlocked,
    unlockItem,
    unlockBalance,
  } = useStore();
  const isoEnv = isoRoom.env || "room";
  // Floor-plan painting: pointerdown picks add/remove from the first tile,
  // dragging applies it to every tile crossed (the Sims floor-tool feel).
  const [paintMode, setPaintMode] = useState(null);
  const [planTool, setPlanTool] = useState("floor");
  // Expensive editors mount only after the user asks for them. The earlier
  // IntersectionObserver pass still created an effect + observer for every
  // one of ~150 previews on drawer-open, which was enough to stall WebView2.
  const [floorPlanOpen, setFloorPlanOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogGroupOpen, setCatalogGroupOpen] = useState(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  // Clearing the room destroys an arrangement outright — armed like a delete.
  const [armedId, arm] = useArmed();
  const maskRows =
    isoRoom.mask || Array.from({ length: isoRoom.d }, () => "1".repeat(isoRoom.w));
  const partitionKeys = useMemo(() => new Set(isoRoom.partitions || []), [isoRoom.partitions]);

  const counts = roomPlacements.reduce((acc, p) => {
    acc[p.item] = (acc[p.item] || 0) + 1;
    return acc;
  }, {});
  const isoCounts = isoRoom.placements.reduce((acc, p) => {
    acc[p.item] = (acc[p.item] || 0) + 1;
    return acc;
  }, {});
  const visibleItemGroups = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase();
    return ISO_ITEM_GROUPS.map((group) => ({
      ...group,
      keys: group.keys.filter((key) => {
        if (ISO_ITEMS[key].wall && !envHasWalls(isoEnv, isoRoom.walls)) return false;
        return !query || ISO_ITEMS[key].label.toLocaleLowerCase().includes(query);
      }),
    })).filter((group) => group.keys.length);
  }, [catalogQuery, isoEnv, isoRoom.walls]);
  const visibleItemCount = visibleItemGroups.reduce((total, group) => total + group.keys.length, 0);

  // While VISITING, the whole panel stands down — not just the Decorate
  // toggle. The review caught the trap a per-button gate leaves open: every
  // other control here (presets, floors, walls, size sliders, the floor-plan
  // grid, the furniture picker) mutates your HOME room, which is not the
  // room on screen — a click meant to restyle the friend's floor would
  // silently re-floor your own home, and adding furniture even flips edit
  // mode on mid-visit. One hint and the way back instead. (All hooks above
  // run unconditionally, so the early return is rules-of-hooks safe.)
  if (visiting) {
    return (
      <div className="space-y-3 rounded-2xl bg-white/5 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-cream">
          You&apos;re at {visiting.friend.displayName}&apos;s place ☕
        </p>
        <p className="text-xs text-petal/60">
          Decorating works on your own room — head home first.
        </p>
        <button
          onClick={leaveVisit}
          className="pill bg-glow px-4 py-2 text-sm font-semibold text-plum hover:bg-amber"
        >
          Head home
        </button>
      </div>
    );
  }

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
                aria-label="Room width"
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
                aria-label="Room depth"
                className="flex-1 accent-glow"
              />
              <span className="w-6 text-right text-xs tabular-nums text-petal/70">{isoRoom.d}</span>
            </div>
            {/* The floor picker also sets the exterior shell. Interior rooms
                are drawn explicitly in the floor-plan editor below. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                floor
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
              <span className="w-full text-[10px] text-petal/40">
                Each floor sets its exterior edge; draw interior walls in the floor plan.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                light
              </span>
              {ISO_LIGHTING_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setIsoLighting(key)}
                  className={`pill px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    (isoRoom.lighting || "natural") === key
                      ? "bg-glow text-plum"
                      : "bg-white/10 text-petal hover:bg-white/20"
                  }`}
                >
                  {ISO_LIGHTING[key].label}
                </button>
              ))}
              <span className="w-full text-[10px] text-petal/40">
                Candlelight breathes gently; reduced-motion mode keeps it still.
              </span>
            </div>
            {/* A 48×48 plan is 2,304 interactive cells. Keep that DOM out of
                the drawer until somebody is actually reshaping the floor. */}
            <div className="rounded-xl bg-white/5">
              <button
                type="button"
                onClick={() => setFloorPlanOpen((open) => !open)}
                aria-expanded={floorPlanOpen}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-petal/60">
                    Floor plan
                  </span>
                  <span className="block text-[10px] text-petal/40">
                    {isoRoom.w}×{isoRoom.d} · open to reshape
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-petal/50 transition-transform ${floorPlanOpen ? "rotate-180" : ""}`}
                />
              </button>
              {floorPlanOpen && (
                <div className="border-t border-white/10 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                      Drag to draw
                    </span>
                    <span className="flex items-center gap-2">
                      {isoRoom.partitions?.length > 0 && (
                        <button
                          onClick={resetIsoPartitions}
                          className="text-[10px] font-semibold text-petal/55 hover:text-danger"
                        >
                          Clear walls
                        </button>
                      )}
                      {isoRoom.mask && (
                        <button
                          onClick={resetIsoShape}
                          className="text-[10px] font-semibold text-glow/80 hover:text-glow"
                        >
                          ⟲ Full floor
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="mb-2 grid grid-cols-3 gap-1" role="group" aria-label="Floor-plan tool">
                    {[
                      { key: "floor", label: "Floor" },
                      { key: "wall-h", label: "Wall ↔" },
                      { key: "wall-v", label: "Wall ↕" },
                    ].map((tool) => (
                      <button
                        key={tool.key}
                        type="button"
                        onClick={() => {
                          setPlanTool(tool.key);
                          setPaintMode(null);
                        }}
                        aria-pressed={planTool === tool.key}
                        className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
                          planTool === tool.key
                            ? "bg-glow text-plum"
                            : "bg-white/5 text-petal/60 hover:bg-white/10"
                        }`}
                      >
                        {tool.label}
                      </button>
                    ))}
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
                      row.split("").map((c, x) => {
                        const hKey = partitionKey("gy", y + 1, x);
                        const vKey = partitionKey("gx", x + 1, y);
                        const applyPartition = (plane, on) => {
                          const at = plane === "gy" ? y + 1 : x + 1;
                          const from = plane === "gy" ? x : y;
                          if (at >= (plane === "gy" ? isoRoom.d : isoRoom.w)) return;
                          setIsoPartition(plane, at, from, on);
                        };
                        return (
                          <div
                            key={`${x}-${y}`}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              // Touch gives the first cell implicit pointer capture,
                              // which swallows the enter events drag-painting needs.
                              if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                              }
                              if (planTool === "floor") {
                                const on = c !== "1";
                                setPaintMode({ kind: "floor", on });
                                setIsoTile(x, y, on);
                                return;
                              }
                              const plane = planTool === "wall-h" ? "gy" : "gx";
                              const key = plane === "gy" ? hKey : vKey;
                              const on = !partitionKeys.has(key);
                              setPaintMode({ kind: "partition", plane, on });
                              applyPartition(plane, on);
                            }}
                            onPointerEnter={() => {
                              if (!paintMode) return;
                              if (paintMode.kind === "floor") setIsoTile(x, y, paintMode.on);
                              else applyPartition(paintMode.plane, paintMode.on);
                            }}
                            className={`relative aspect-square cursor-crosshair rounded-[2px] transition-colors ${
                              c === "1" ? "bg-glow/70" : "bg-white/10 hover:bg-white/20"
                            }`}
                          >
                            {y < isoRoom.d - 1 && partitionKeys.has(hKey) && (
                              <span className="pointer-events-none absolute -bottom-px left-0 z-10 h-[3px] w-full rounded-full bg-amber" />
                            )}
                            {x < isoRoom.w - 1 && partitionKeys.has(vKey) && (
                              <span className="pointer-events-none absolute -right-px top-0 z-10 h-full w-[3px] rounded-full bg-amber" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-petal/45">
                    Pick a wall direction, then drag across tile edges. Start on an existing wall to erase it.
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-petal/50">
              A {isoRoom.w}×{isoRoom.d} floor — resize it, shape the floor, and
              divide it into rooms with drawn walls.
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

      {/* No Room-size slider any more: the flat scene went full-bleed (the
          wall fills the viewport, the desk anchors the bottom), so a display
          scale has nothing left to scale — same reason the iso camera
          replaced it there. */}

      {/* Iso presets: always-visible, one-click previews. The floor in each
          miniature is a single polygon for rectangular rooms, so restoring
          the visual grid does not restore the old thousand-tile DOM cost. */}
      {isoPreview && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
            Start from a preset
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ISO_PRESET_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyIsoPreset(key)}
                title={`Use ${ISO_PRESETS[key].label}`}
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
            One click replaces the current layout (floor size included) — then tweak from there.
          </p>
        </section>
      )}

      {/* Iso furniture (its own catalog while the iso room is active) */}
      {isoPreview && (
        <section>
          <button
            type="button"
            onClick={() => setCatalogOpen((open) => !open)}
            aria-expanded={catalogOpen}
            className="mb-2 flex w-full items-center justify-between gap-2 text-left"
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-petal/60">
                Furniture
              </span>
              <span className="block text-[10px] text-petal/40">
                Browse by category · sprites load one category at a time
              </span>
            </span>
            <ChevronDown
              size={15}
              className={`shrink-0 text-petal/50 transition-transform ${catalogOpen ? "rotate-180" : ""}`}
            />
          </button>
          {catalogOpen && (
            <>
              <label className="relative mb-2 block min-w-0">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-petal/45"
                />
                <input
                  type="search"
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  placeholder="Find furniture"
                  aria-label="Search furniture"
                  className="w-full rounded-full border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-cream outline-none placeholder:text-petal/35 focus:border-glow/50"
                />
              </label>
              {/* A closed category is text only. This makes opening Room O(1)
                  in catalog size and caps mounted SVGs at one category instead
                  of letting every future decoration slow down today's app. */}
              <div className="space-y-1.5">
                {visibleItemGroups.map((group) => {
                  const { keys } = group;
                  const expanded = catalogGroupOpen === group.label;
                  return (
                    <div key={group.label} className="rounded-xl bg-white/5">
                      <button
                        type="button"
                        onClick={() => setCatalogGroupOpen(expanded ? null : group.label)}
                        aria-expanded={expanded}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      >
                        <span className="text-[11px] font-semibold text-petal/70">
                          {group.label}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-petal/40">
                          {keys.length}
                          <ChevronDown
                            size={13}
                            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </span>
                      </button>
                      {expanded && (
                        <div className="grid grid-cols-2 gap-1.5 border-t border-white/10 p-1.5">
                          {keys.map((key) => {
                            // Locked pieces stay VISIBLE, greyed with their price on
                            // them — hiding them would mean nobody knows there's
                            // anything to earn, which is the whole point of the
                            // currency. Affordable ones light up.
                            const locked = !owns(unlocked, key);
                            const affordable = locked && unlockBalance >= costOf(key);
                            return (
                              <button
                                key={key}
                                onClick={() => (locked ? unlockItem(key) : addIsoItem(key))}
                                title={
                                  locked
                                    ? `${costOf(key)} focused minutes unlocks the ${ISO_ITEMS[key].label.toLowerCase()}`
                                    : `Add ${ISO_ITEMS[key].label.toLowerCase()}`
                                }
                                className={`group flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition ${
                                  affordable
                                    ? "bg-glow/15 hover:bg-glow/25"
                                    : "bg-white/5 hover:bg-white/15"
                                }`}
                              >
                                <span className={locked && !affordable ? "opacity-40 grayscale" : ""}>
                                  <IsoItemPreview itemKey={key} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={`block truncate text-xs font-medium ${
                                      locked ? "text-petal/70" : "text-cream"
                                    }`}
                                  >
                                    {ISO_ITEMS[key].label}
                                  </span>
                                  {locked ? (
                                    <span
                                      className={`text-[10px] ${
                                        affordable ? "font-semibold text-glow" : "text-petal/50"
                                      }`}
                                    >
                                      {affordable ? `🔓 unlock · ${costOf(key)}m` : `🔒 ${costOf(key)}m`}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-petal/50">
                                      {isoCounts[key] ? `${isoCounts[key]} placed · ` : ""}
                                      <span className="hover-reveal text-glow/80 transition">
                                        + add
                                      </span>
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleItemGroups.length === 0 && (
                  <p className="rounded-xl bg-white/5 px-3 py-5 text-center text-xs text-petal/55">
                    No furniture matches “{catalogQuery.trim()}”.
                  </p>
                )}
              </div>
              <p className="mt-2 text-xs text-petal/50">
                {visibleItemCount} pieces available. Tap a placed item for its controls:
                ⟳ mirrors it, 🎨 recolours, ✕ puts it away.
              </p>
            </>
          )}
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
