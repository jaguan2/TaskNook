import { useState } from "react";

const ITEMS = [
  { key: "tasks", icon: "📋", label: "Tasks" },
  { key: "calendar", icon: "🗓️", label: "Calendar" },
  { key: "progress", icon: "📈", label: "Progress" },
  { key: "friends", icon: "🫶", label: "Friends" },
  { key: "music", icon: "🎧", label: "Sounds" },
  { key: "weather", icon: "☁️", label: "Weather" },
  { key: "room", icon: "🛋️", label: "Room" },
  { key: "settings", icon: "⚙️", label: "Settings" },
];

export default function Dock({ active, onSelect }) {
  // Collapsible so the scene can breathe (VC2 keeps its chrome ghosted and
  // minimal). Persisted per device — it's a display preference.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("tasknook.dockCollapsed") === "1"
  );
  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("tasknook.dockCollapsed", c ? "0" : "1");
      return !c;
    });
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
            onClick={toggle}
            className="pill grid h-10 w-10 place-items-center text-lg text-cream transition hover:bg-white/10"
          >
            ☰
          </button>
        ) : (
          <>
            <button
              title="Collapse menu"
              onClick={toggle}
              className="pill grid h-5 w-10 place-items-center text-xs text-petal/50 transition hover:bg-white/10 hover:text-cream"
            >
              ◂
            </button>
            {ITEMS.map((item) => (
              <button
                key={item.key}
                title={item.label}
                onClick={() => onSelect(item.key)}
                className={`pill group relative grid h-10 w-10 place-items-center text-lg transition ${
                  active.includes(item.key)
                    ? "bg-glow text-plum"
                    : "text-cream hover:bg-white/10"
                }`}
              >
                {item.icon}
                <span className="pointer-events-none absolute left-12 whitespace-nowrap rounded-lg bg-night/90 px-2 py-1 text-xs text-cream opacity-0 transition group-hover:opacity-100">
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
