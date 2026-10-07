import { useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  CloudSun,
  Headphones,
  Leaf,
  Menu,
  Settings,
  Sofa,
  UserRound,
  Users,
} from "lucide-react";
import { readStored, writeStored } from "../lib/storage";

// Lucide stroke icons, not emoji: they inherit the theme's text colour and
// render identically on every OS (Windows emoji looked out of place — user
// feedback).
const ITEMS = [
  { key: "tasks", Icon: ClipboardList, label: "Tasks" },
  { key: "calendar", Icon: CalendarDays, label: "Calendar" },
  { key: "friends", Icon: Users, label: "Friends" },
  { key: "challenges", Icon: Leaf, label: "Challenges" },
  { key: "music", Icon: Headphones, label: "Sounds" },
  { key: "weather", Icon: CloudSun, label: "Weather" },
  { key: "room", Icon: Sofa, label: "Room" },
  { key: "profile", Icon: UserRound, label: "Profile" },
  { key: "settings", Icon: Settings, label: "Settings" },
];

export default function Dock({ active, onSelect, onWarm }) {
  // Collapsible so the scene can breathe (VC2 keeps its chrome ghosted and
  // minimal). Persisted per device — it's a display preference.
  const [collapsed, setCollapsed] = useState(
    () => readStored("tasknook.dockCollapsed") === "1"
  );
  const [tooltip, setTooltip] = useState(null);
  const showLabel = (event, item) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ label: item.label, left: rect.right + 8, top: rect.top + rect.height / 2 });
    onWarm?.(item.key);
  };
  const toggle = () => {
    // Persist OUTSIDE the updater — updaters must stay pure (StrictMode
    // double-invokes them), and `collapsed` is already in scope.
    const next = !collapsed;
    writeStored("tasknook.dockCollapsed", next ? "1" : "0");
    setCollapsed(next);
    setTooltip(null);
  };

  return (
    // Vertically centred when there's room, but never allowed to climb into
    // the top-left corner — that's the focus card's spot, and on short
    // windows the item list scrolls, so adding a tab cannot strand Settings
    // below the viewport. Tooltips sit outside the scrolling glass surface.
    <div
      className="intro-chrome absolute left-6 z-20"
      style={{
        top: "max(172px, calc(50vh - 228px))",
        maxHeight: "calc(100vh - max(172px, calc(50vh - 228px)) - 24px)",
      }}
    >
      <div className="glass flex flex-col gap-1.5 rounded-3xl p-1.5 shadow-soft" style={{ maxHeight: "inherit" }}>
        {collapsed ? (
          <button
            title="Open menu"
            aria-label="Open menu"
            onClick={toggle}
            className="pill grid h-10 w-10 place-items-center text-cream transition hover:bg-white/10"
          >
            <Menu size={18} />
          </button>
        ) : (
          <>
            <button
              title="Collapse menu"
              aria-label="Collapse menu"
              onClick={toggle}
              className="pill grid h-5 w-10 shrink-0 place-items-center text-petal/50 transition hover:bg-white/10 hover:text-cream"
            >
              <ChevronLeft size={13} />
            </button>
            <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={() => setTooltip(null)}>
            {ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                onPointerEnter={(event) => showLabel(event, item)}
                onPointerLeave={() => setTooltip(null)}
                onFocus={(event) => showLabel(event, item)}
                onBlur={() => setTooltip(null)}
                className={`pill relative grid h-10 w-10 shrink-0 place-items-center transition ${
                  active.includes(item.key)
                    ? "bg-glow text-plum"
                    : "text-cream hover:bg-white/10"
                }`}
              >
                <item.Icon size={17} />
                <span className="sr-only">{item.label}</span>
              </button>
            ))}
            </div>
          </>
        )}
      </div>
      {tooltip && createPortal(
        <span aria-hidden="true" className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-night/90 px-2 py-1 text-xs text-cream"
          style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.label}</span>, document.body
      )}
    </div>
  );
}
