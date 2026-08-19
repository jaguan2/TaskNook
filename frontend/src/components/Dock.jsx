import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  CloudSun,
  Headphones,
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
  { key: "music", Icon: Headphones, label: "Sounds" },
  { key: "weather", Icon: CloudSun, label: "Weather" },
  { key: "room", Icon: Sofa, label: "Room" },
  { key: "profile", Icon: UserRound, label: "Profile" },
  { key: "settings", Icon: Settings, label: "Settings" },
];

export default function Dock({ active, onSelect }) {
  // Collapsible so the scene can breathe (VC2 keeps its chrome ghosted and
  // minimal). Persisted per device — it's a display preference.
  const [collapsed, setCollapsed] = useState(
    () => readStored("tasknook.dockCollapsed") === "1"
  );
  const toggle = () => {
    // Persist OUTSIDE the updater — updaters must stay pure (StrictMode
    // double-invokes them), and `collapsed` is already in scope.
    const next = !collapsed;
    writeStored("tasknook.dockCollapsed", next ? "1" : "0");
    setCollapsed(next);
  };

  return (
    // Vertically centred when there's room, but never allowed to climb into
    // the top-left corner — that's the focus card's spot, and on short
    // windows a centred 9-button column used to collide with it.
    <div
      className="intro-chrome absolute left-6 z-20"
      style={{ top: "max(172px, calc(50% - 220px))" }}
    >
      <div className="glass flex flex-col gap-1.5 rounded-3xl p-1.5 shadow-soft">
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
              className="pill grid h-5 w-10 place-items-center text-petal/50 transition hover:bg-white/10 hover:text-cream"
            >
              <ChevronLeft size={13} />
            </button>
            {ITEMS.map((item) => (
              // No `title` — the custom hover tooltip below already shows
              // the label (a title would double it up with the OS tooltip)
              // and, being inside the button, it provides the accessible
              // name.
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                className={`pill group relative grid h-10 w-10 place-items-center transition ${
                  active.includes(item.key)
                    ? "bg-glow text-plum"
                    : "text-cream hover:bg-white/10"
                }`}
              >
                <item.Icon size={17} />
                {/* group-focus-within keeps the label visible for keyboard
                    users too — tabbing the dock otherwise shows eight
                    identical unlabeled icons. */}
                <span className="pointer-events-none absolute left-12 whitespace-nowrap rounded-lg bg-night/90 px-2 py-1 text-xs text-cream opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  {item.label}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
