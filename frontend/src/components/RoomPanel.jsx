import { useStore } from "../store";
import { ITEMS, ITEM_KEYS, PRESETS } from "../lib/room";
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
  } = useStore();

  const counts = roomPlacements.reduce((acc, p) => {
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
            ? "Drag items to arrange them. Tap an item, then ✕ to put it away. Everything is free — make it yours."
            : "Turn on decorating to drag things around the room."}
        </p>
      </section>

      {/* Presets */}
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
            className="pill bg-white/10 px-3 py-1.5 text-xs font-semibold text-petal/60 hover:bg-white/20 hover:text-rose"
          >
            🧹 Empty room
          </button>
        </div>
        <p className="mt-2 text-xs text-petal/50">
          Presets replace the current layout — then tweak from there.
        </p>
      </section>

      {/* Inventory */}
      {ZONE_SECTIONS.map(({ zone, label }) => (
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
                        <span className="text-glow/80 opacity-0 transition group-hover:opacity-100">
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
