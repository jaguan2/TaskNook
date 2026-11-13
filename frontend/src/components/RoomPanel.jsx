import { useEventCallback } from '../hooks/useEventCallback';
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Boxes, Check, ChevronDown, Eraser, Search, Sofa } from "lucide-react";
import { useRoomStore, useSocialStore } from "../store";
import { useArmed } from "../hooks/useArmed";
import { useI18n } from "../i18n/I18nProvider";
import { COTTAGE_SETTINGS, ITEMS, ITEM_KEYS, PRESETS } from "../lib/room";
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
  envHasWalls,
  occupiedIsoFootprints,
  occupiedIsoTiles,
  partitionKey,
} from "../lib/isoRoom";
import Cottage from "./Cottage";
import { ITEM_SPRITES } from "./RoomItems";
import { IsoItemPreview, IsoPresetPreview } from "./IsoRoomPreviews";


// Adjacent furniture needs separate silhouettes in the plan. A stable tone
// derived from the placement id avoids a rainbow that changes when another
// item is added or the array is reordered.
const FOOTPRINT_TONES = [
  "border-cream/80 bg-plum/80",
  "border-cream/80 bg-wine/80",
  "border-cream/80 bg-rose/80",
  "border-cream/80 bg-sage/80",
];

function footprintTone(id) {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FOOTPRINT_TONES[hash % FOOTPRINT_TONES.length];
}

// Preview sprites are lit as if at night so lamps/lights glow in the panel.
const PREVIEW_TIME = { lampGlow: 0.55, screenGlow: 0.4, bulbGlow: 0.95 };
const PRESET_ROOMS = Object.fromEntries(Object.entries(PRESETS).map(([key, preset]) =>
  [key, preset.placements.map((p, i) => ({ ...p, id: `${key}-${i}` }))]));

const ZONE_SECTIONS = [
  { zone: "wall", labelKey: "wall" },
  { zone: "desk", labelKey: "desk" },
  { zone: "floor", labelKey: "floor" },
  { zone: "ceiling", labelKey: "ceiling" },
];

function ItemPreview({ itemKey }) {
  const uid = useId();
  const item = ITEMS[itemKey];
  const Sprite = ITEM_SPRITES[itemKey];
  const { x, y, w, h } = item.hit;
  // Slight breathing room around the hit box so strokes aren't clipped.
  return (
    <svg
      viewBox={`${x - 4} ${y - 4} ${w + 8} ${h + 8}`}
      className="cottage-preview h-9 w-9 shrink-0"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${uid}-pool`}><stop stopColor="#ffe9b0" /><stop offset="1" stopColor="#ffe9b0" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${uid}-cone`} x2="0" y2="1"><stop stopColor="#ffe9b0" stopOpacity=".8" /><stop offset="1" stopColor="#ffe9b0" stopOpacity="0" /></linearGradient>
      </defs>
      <Sprite time={{ ...PREVIEW_TIME, static: true, lampPool: `${uid}-pool`, lampCone: `${uid}-cone` }} />
    </svg>
  );
}

export default function RoomPanel({ catalogRequest = 0, onItemPlaced, catalogState, onCatalogState }) {
  const { label, locale, t } = useI18n();
  const {
    cottageView,
    setCottageView,
    roomPlacements,
    roomEditMode,
    setRoomEditMode,
    addRoomItem,
    applyRoomPreset,
    clearRoom,
    isoPreview,
    setIsoPreview,
    isoRoom,
    addIsoItem,
    setIsoSize,
    setIsoTile,
    setIsoPartition,
    setIsoArch,
    resetIsoPartitions,
    resetIsoShape,
    setIsoEnv,
    setIsoLighting,
    applyIsoPreset,
  } = useRoomStore();
  const { visiting, commonRoom, leaveVisit } = useSocialStore();
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
  const [localGroup, setLocalGroup] = useState(null);
  const [localQuery, setLocalQuery] = useState('');
  const catalogGroupOpen = catalogState?.group ?? localGroup;
  const catalogQuery = catalogState?.query ?? localQuery;
  const setCatalogGroupOpen = useCallback(group => {
    if (onCatalogState) onCatalogState(previous => ({ ...previous, group })); else setLocalGroup(group);
  }, [onCatalogState]);
  const setCatalogQuery = useCallback(query => {
    if (onCatalogState) onCatalogState(previous => ({ ...previous, query })); else setLocalQuery(query);
  }, [onCatalogState]);
  const [panelTab, setPanelTab] = useState(roomEditMode ? 'furniture' : 'setup');
  const catalogVisible = catalogOpen || (roomEditMode && panelTab === 'furniture');
  const CatalogHeading = roomEditMode ? 'div' : 'button';
  // Clearing the room destroys an arrangement outright — armed like a delete.
  const [armedId, arm] = useArmed();
  const maskRows =
    isoRoom.mask || Array.from({ length: isoRoom.d }, () => "1".repeat(isoRoom.w));
  const partitionKeys = useMemo(() => new Set(isoRoom.partitions || []), [isoRoom.partitions]);
  const archKeys = useMemo(() => new Set(isoRoom.arches || []), [isoRoom.arches]);
  const occupiedTiles = useMemo(
    () => occupiedIsoTiles(isoRoom.placements),
    [isoRoom.placements]
  );
  const occupiedFootprints = useMemo(
    () => occupiedIsoFootprints(isoRoom.placements, { w: isoRoom.w, d: isoRoom.d }),
    [isoRoom.placements, isoRoom.w, isoRoom.d]
  );

  const counts = roomPlacements.reduce((acc, p) => {
    acc[p.item] = (acc[p.item] || 0) + 1;
    return acc;
  }, {});
  const isoCounts = isoRoom.placements.reduce((acc, p) => {
    acc[p.item] = (acc[p.item] || 0) + 1;
    return acc;
  }, {});
  const isoItemLabel = useCallback(
    (key) => label("isoItems", key, ISO_ITEMS[key]?.label || key),
    [label]
  );
  const cottageItemLabel = useCallback(
    (key) => label("cottageItems", key, ITEMS[key]?.label || key),
    [label]
  );
  const matchesCatalogQuery = useCallback((translated, english, query) => {
    const needle = query.trim().toLocaleLowerCase(locale);
    if (!needle) return true;
    return translated.toLocaleLowerCase(locale).includes(needle)
      || english.toLocaleLowerCase(locale).includes(needle);
  }, [locale]);
  const visibleItemGroups = useMemo(() => {
    return ISO_ITEM_GROUPS.map((group) => ({
      ...group,
      keys: group.keys.filter((key) => {
        if (ISO_ITEMS[key].wall && !envHasWalls(isoEnv, isoRoom.walls)) return false;
        return matchesCatalogQuery(isoItemLabel(key), ISO_ITEMS[key].label, catalogQuery);
      }),
    })).filter((group) => group.keys.length);
  }, [catalogQuery, isoEnv, isoRoom.walls, isoItemLabel, matchesCatalogQuery]);
  const visibleItemCount = visibleItemGroups.reduce((total, group) => total + group.keys.length, 0);

  const showCatalog = useEventCallback(() => {
    setPanelTab('furniture'); setCatalogOpen(true);
    if (!catalogGroupOpen) setCatalogGroupOpen(visibleItemGroups[0]?.label || null);
  });
  useEffect(() => { if (roomEditMode || catalogRequest) showCatalog(); }, [roomEditMode, catalogRequest, showCatalog]);
  useEffect(() => {
    if (catalogQuery.trim()) setCatalogGroupOpen(visibleItemGroups[0]?.label || null);
  }, [catalogQuery, visibleItemGroups, setCatalogGroupOpen]);

  // While VISITING, the whole panel stands down — not just the Decorate
  // toggle. The review caught the trap a per-button gate leaves open: every
  // other control here (presets, floors, walls, size sliders, the floor-plan
  // grid, the furniture picker) mutates your HOME room, which is not the
  // room on screen — a click meant to restyle the friend's floor would
  // silently re-floor your own home, and adding furniture even flips edit
  // mode on mid-visit. One hint and the way back instead. (All hooks above
  // run unconditionally, so the early return is rules-of-hooks safe.)
  if (visiting || commonRoom) {
    return (
      <div className="space-y-3 rounded-2xl bg-white/5 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-cream">
          {commonRoom
            ? t("room.visiting.common.title")
            : t("room.visiting.friend.title", { name: visiting.friend.displayName })}
        </p>
        <p className="text-xs text-petal/60">
          {commonRoom ? t("room.visiting.common.description") : t("room.visiting.friend.description")}
        </p>
        <button
          onClick={leaveVisit}
          className="pill bg-glow px-4 py-2 text-sm font-semibold text-plum hover:bg-amber"
        >
          {t("room.visiting.home")}
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
              <Check size={16} /> {t("room.decorate.done")}
            </>
          ) : (
            <>
              <Sofa size={16} /> {t("room.decorate.start")}
            </>
          )}
        </button>
        <p className="text-xs text-petal/60">
          {roomEditMode
            ? isoPreview
              ? t("room.decorate.help.iso")
              : t("room.decorate.help.classic")
            : t("room.decorate.help.off")}
        </p>
      </section>

      {roomEditMode && isoPreview && <div className="flex gap-1 rounded-xl bg-white/5 p-1" role="group" aria-label="Decorate panels">
        <button type="button" aria-pressed={panelTab === 'furniture'} onClick={showCatalog} className={`flex-1 rounded-lg px-3 py-2 text-xs ${panelTab === 'furniture' ? 'bg-glow text-plum' : 'text-petal'}`}>Furniture</button>
        <button type="button" aria-pressed={panelTab === 'setup'} onClick={() => setPanelTab('setup')} className={`flex-1 rounded-lg px-3 py-2 text-xs ${panelTab === 'setup' ? 'bg-glow text-plum' : 'text-petal'}`}>Room setup</button>
      </div>}
      {(!roomEditMode || !isoPreview || panelTab === 'setup') && <>
      {/* Isometric room (beta) */}
      <section className="space-y-2 rounded-2xl border border-glow/20 bg-glow/5 p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <Boxes size={15} className="text-petal/70" /> {t("room.iso.title")}
          </p>
          <button
            onClick={() => setIsoPreview(!isoPreview)}
            className={`pill px-3 py-1 text-xs font-semibold ${
              isoPreview ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {isoPreview ? t("common.on") : t("common.off")}
          </button>
        </div>
        {isoPreview ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-10 text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                {t("room.iso.width")}
              </span>
              <input
                type="range"
                min="3"
                max={ISO_SIZE_MAX}
                step="1"
                value={isoRoom.w}
                onChange={(e) => setIsoSize(Number(e.target.value), isoRoom.d)}
                aria-label={t("room.iso.widthAria")}
                className="flex-1 accent-glow"
              />
              <span className="w-6 text-right text-xs tabular-nums text-petal/70">{isoRoom.w}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-10 text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                {t("room.iso.depth")}
              </span>
              <input
                type="range"
                min="3"
                max={ISO_SIZE_MAX}
                step="1"
                value={isoRoom.d}
                onChange={(e) => setIsoSize(isoRoom.w, Number(e.target.value))}
                aria-label={t("room.iso.depthAria")}
                className="flex-1 accent-glow"
              />
              <span className="w-6 text-right text-xs tabular-nums text-petal/70">{isoRoom.d}</span>
            </div>
            {/* The floor picker also sets the exterior shell. Interior rooms
                are drawn explicitly in the floor-plan editor below. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                {t("room.iso.floor")}
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
                  {ISO_ENVS[env].icon} {label("isoEnvs", env, ISO_ENVS[env].label)}
                </button>
              ))}
              <span className="w-full text-[10px] text-petal/40">
                {t("room.iso.floorHelp")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                {t("room.iso.light")}
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
                  {label("isoLighting", key, ISO_LIGHTING[key].label)}
                </button>
              ))}
              <span className="w-full text-[10px] text-petal/40">
                {t("room.iso.lightHelp")}
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
                    {t("room.plan.title")}
                  </span>
                  <span className="block text-[10px] text-petal/40">
                    {t("room.plan.summary", { width: isoRoom.w, depth: isoRoom.d })}
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
                      {t("room.plan.draw")}
                    </span>
                    <span className="flex items-center gap-2">
                      {(isoRoom.partitions?.length > 0 || isoRoom.arches?.length > 0) && (
                        <button
                          onClick={resetIsoPartitions}
                          className="text-[10px] font-semibold text-petal/55 hover:text-danger"
                        >
                          {t("room.plan.clearWalls")}
                        </button>
                      )}
                      {isoRoom.mask && (
                        <button
                          onClick={resetIsoShape}
                          className="text-[10px] font-semibold text-glow/80 hover:text-glow"
                        >
                          {t("room.plan.fullFloor")}
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="mb-2 grid grid-cols-5 gap-1" role="group" aria-label={t("room.plan.toolAria")}>
                    {[
                      { key: "floor", labelKey: "room.plan.floor" },
                      { key: "wall-h", labelKey: "room.plan.wallH" },
                      { key: "wall-v", labelKey: "room.plan.wallV" },
                      { key: "arch-h", labelKey: "room.plan.archH" },
                      { key: "arch-v", labelKey: "room.plan.archV" },
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
                        {t(tool.labelKey)}
                      </button>
                    ))}
                  </div>
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] text-petal/55">
                    <span className="h-2.5 w-4 rounded-[3px] border border-cream/70 bg-plum/80" />
                    {t("room.plan.footprints")}
                  </div>
                  <div className="relative rounded-lg bg-white/5 p-1">
                    <div
                      data-floor-plan-layer="cells"
                      className="grid touch-none select-none"
                      style={{
                        gridTemplateColumns: `repeat(${isoRoom.w}, 1fr)`,
                        // Hairline gaps up to ~24 wide; beyond that the gaps
                        // would eat the tiny cells.
                        gap: isoRoom.w > 24 ? 0 : 1,
                      }}
                      onPointerUp={() => setPaintMode(null)}
                      onPointerLeave={() => setPaintMode(null)}
                    >
                      {maskRows.map((row, y) =>
                      row.split("").map((c, x) => {
                        const occupants = occupiedTiles.get(`${x}:${y}`) || [];
                        const hKey = partitionKey("gy", y + 1, x);
                        const vKey = partitionKey("gx", x + 1, y);
                        const applyBoundary = (kind, plane, on) => {
                          const at = plane === "gy" ? y + 1 : x + 1;
                          const from = plane === "gy" ? x : y;
                          if (at >= (plane === "gy" ? isoRoom.d : isoRoom.w)) return;
                          if (kind === "arch") setIsoArch(plane, at, from, on);
                          else setIsoPartition(plane, at, from, on);
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
                              const kind = planTool.startsWith("arch") ? "arch" : "partition";
                              const plane = planTool.endsWith("h") ? "gy" : "gx";
                              const key = plane === "gy" ? hKey : vKey;
                              const keys = kind === "arch" ? archKeys : partitionKeys;
                              const on = !keys.has(key);
                              setPaintMode({ kind, plane, on });
                              applyBoundary(kind, plane, on);
                            }}
                            onPointerEnter={() => {
                              if (!paintMode) return;
                              if (paintMode.kind === "floor") setIsoTile(x, y, paintMode.on);
                              else applyBoundary(paintMode.kind, paintMode.plane, paintMode.on);
                            }}
                            title={`${t("room.plan.tile", { x: x + 1, y: y + 1 })}${
                              occupants.length
                                ? ` — ${t("room.plan.occupied", { items: occupants.map(isoItemLabel).join(", ") })}`
                                : ""
                            }`}
                            data-occupied={occupants.length ? "true" : undefined}
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
                            {y < isoRoom.d - 1 && archKeys.has(hKey) && (
                              <span className="pointer-events-none absolute -bottom-[2px] left-[12%] z-20 h-[5px] w-[76%] rounded-t-full border-x-2 border-t-2 border-cream" />
                            )}
                            {x < isoRoom.w - 1 && archKeys.has(vKey) && (
                              <span className="pointer-events-none absolute -right-[2px] top-[12%] z-20 h-[76%] w-[5px] rounded-l-full border-y-2 border-l-2 border-cream" />
                            )}
                          </div>
                        );
                      })
                      )}
                    </div>
                    {/* A separate explicit grid is essential here. Mixing
                        these positioned spans into the auto-placed cell grid
                        makes CSS Grid reserve their areas first and pushes
                        editable cells into extra rows in a real browser. */}
                    <div
                      aria-hidden="true"
                      data-floor-plan-layer="footprints"
                      className="pointer-events-none absolute inset-1 z-[5] grid"
                      style={{
                        gridTemplateColumns: `repeat(${isoRoom.w}, 1fr)`,
                        gridTemplateRows: `repeat(${isoRoom.d}, 1fr)`,
                        gap: isoRoom.w > 24 ? 0 : 1,
                      }}
                    >
                      {occupiedFootprints.map((footprint) => (
                        <span
                          key={footprint.id}
                          data-footprint={footprint.item}
                          className={`m-px grid min-h-0 min-w-0 place-items-center overflow-hidden rounded-[4px] border shadow-sm ${footprintTone(footprint.id)}`}
                          style={{
                            gridColumn: `${footprint.x + 1} / span ${footprint.w}`,
                            gridRow: `${footprint.y + 1} / span ${footprint.d}`,
                          }}
                        >
                          {/* Names live on the underlying tiles' hover titles.
                              Even apparently large footprints become only a
                              few pixels wide in big rooms, so permanent text
                              inevitably collides with neighbouring pieces. */}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-petal/45">
                    {t("room.plan.help")}
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-petal/50">
              {t("room.iso.summary", { width: isoRoom.w, depth: isoRoom.d })}
            </p>
          </>
        ) : (
          <p className="text-xs text-petal/60">
            {t("room.iso.offHelp")}
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
            {t("room.presets.title")}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ISO_PRESET_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyIsoPreset(key)}
                title={t("room.presets.use", { name: label("isoPresets", key, ISO_PRESETS[key].label) })}
                className="rounded-xl bg-white/5 p-2 text-left transition hover:bg-white/15"
              >
                <IsoPresetPreview preset={ISO_PRESETS[key]} />
                <span className="mt-1 block truncate text-center text-xs font-medium text-cream">
                  {ISO_PRESETS[key].icon} {label("isoPresets", key, ISO_PRESETS[key].label)}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-petal/50">
            {t("room.presets.isoHelp")}
          </p>
        </section>
      )}

      </>}

      {/* Iso furniture (its own catalog while the iso room is active) */}
      {isoPreview && (!roomEditMode || panelTab === 'furniture') && (
        <section>
          <CatalogHeading
            type={roomEditMode ? undefined : "button"}
            onClick={roomEditMode ? undefined : () => setCatalogOpen((open) => !open)}
            aria-expanded={roomEditMode ? undefined : catalogVisible}
            className="mb-2 flex w-full items-center justify-between gap-2 text-left"
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-petal/60">
                {t("room.catalog.title")}
              </span>
              <span className="block text-[10px] text-petal/40">
                {t("room.catalog.description")}
              </span>
            </span>
            <ChevronDown
              size={15}
              className={`shrink-0 text-petal/50 transition-transform ${catalogOpen ? "rotate-180" : ""}`}
            />
          </CatalogHeading>
          {catalogVisible && (
            <>
              <label className="relative mb-2 block min-w-0">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-petal/45"
                />
                <input
                  type="search"
                  autoFocus={roomEditMode}
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  placeholder={t("room.catalog.search")}
                  aria-label={t("room.catalog.searchAria")}
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
                          {label("isoGroups", group.label, group.label)}
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
                          {keys.map((key) => (
                            <button
                              key={key}
                              onClick={() => { if (addIsoItem(key)) onItemPlaced?.(); }}
                              title={t("room.catalog.addTitle", { name: isoItemLabel(key) })}
                              className="group flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 text-left transition hover:bg-white/15"
                            >
                              <span>
                                <IsoItemPreview itemKey={key} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium text-cream">
                                  {isoItemLabel(key)}
                                </span>
                                <span className="text-[10px] text-petal/50">
                                  {isoCounts[key] ? `${t("common.placed", { count: isoCounts[key] })} · ` : ""}
                                  <span className="hover-reveal text-glow/80 transition">
                                    {t("common.add")}
                                  </span>
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleItemGroups.length === 0 && (
                  <p className="rounded-xl bg-white/5 px-3 py-5 text-center text-xs text-petal/55">
                    {t("room.catalog.empty", { query: catalogQuery.trim() })}
                  </p>
                )}
              </div>
              <p className="mt-2 text-xs text-petal/50">
                {t("room.catalog.summary", { count: visibleItemCount })}
              </p>
            </>
          )}
        </section>
      )}

      {!isoPreview && <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">{t("room.classic.window")}</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(COTTAGE_SETTINGS).map(([key, settingLabel]) => <button key={key} aria-pressed={cottageView === key} onClick={() => setCottageView(key)} className={`pill px-3 py-1.5 text-xs ${cottageView === key ? "bg-rose/25 text-cream" : "bg-white/10 text-petal"}`}>{label("cottageSettings", key, settingLabel)}</button>)}
        </div>
      </section>}

      {/* Presets (classic scene) */}
      {!isoPreview && (
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
          {t("room.presets.title")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyRoomPreset(key)}
              className="overflow-hidden rounded-xl bg-white/5 text-left text-xs font-semibold text-petal hover:bg-white/15"
            >
              <Cottage preview reduceMotion setting={preset.setting || "city"} timeOfDay={key === "seaside" || key === "greenhouse" ? "day" : "night"} room={PRESET_ROOMS[key]} />
              <span className="block px-3 py-2">{label("cottagePresets", key, preset.label)}</span>
            </button>
          ))}
        </div>
        <div className="mt-2">
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
              t("common.sure")
            ) : (
              <>
                <Eraser size={12} /> {t("room.classic.clear")}
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-petal/50">
          {t("room.presets.classicHelp")}
        </p>
      </section>
      )}

      {!isoPreview && <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-petal/60">
        <Search size={14} />
        <input aria-label={t("room.classic.searchAria")} placeholder={t("room.classic.search")} value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-cream outline-none" />
      </label>}
      {!isoPreview && !ITEM_KEYS.some((key) => matchesCatalogQuery(cottageItemLabel(key), ITEMS[key].label, catalogQuery)) && <p className="text-xs text-petal/60">{t("room.classic.empty")}</p>}
      {/* Inventory (classic scene) */}
      {!isoPreview &&
        ZONE_SECTIONS.filter(({ zone }) => ITEM_KEYS.some((key) => ITEMS[key].zone === zone && matchesCatalogQuery(cottageItemLabel(key), ITEMS[key].label, catalogQuery))).map(({ zone, labelKey }) => (
        <section key={zone}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-petal/60">
            {label("cottageZones", labelKey, labelKey)}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ITEM_KEYS.filter((k) => ITEMS[k].zone === zone && matchesCatalogQuery(cottageItemLabel(k), ITEMS[k].label, catalogQuery)).map((key) => {
              // Fixed items (string lights) are singletons — once placed,
              // adding another is a no-op, so say so instead of a dead button.
              const maxed = ITEMS[key].fixed && counts[key] > 0;
              return (
                <button
                  key={key}
                  onClick={() => addRoomItem(key)}
                  disabled={maxed}
                  title={maxed ? t("room.classic.alreadyUp") : t("room.catalog.addTitle", { name: cottageItemLabel(key) })}
                  className={`group flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 text-left transition ${
                    maxed ? "opacity-50" : "hover:bg-white/15"
                  }`}
                >
                  <ItemPreview itemKey={key} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-cream">
                      {cottageItemLabel(key)}
                    </span>
                    <span className="text-[10px] text-petal/50">
                      {counts[key] ? `${t("common.placed", { count: counts[key] })} · ` : ""}
                      {maxed ? (
                        t("room.classic.up")
                      ) : (
                        <span className="hover-reveal text-glow/80 transition">
                          {t("common.add")}
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
