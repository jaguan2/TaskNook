const ITEMS = [
  { key: "tasks", icon: "📋", label: "Tasks" },
  { key: "calendar", icon: "🗓️", label: "Calendar" },
  { key: "progress", icon: "📈", label: "Progress" },
  { key: "friends", icon: "🫶", label: "Friends" },
  { key: "music", icon: "🎧", label: "Sounds" },
];

export default function Dock({ active, onSelect }) {
  return (
    <div className="absolute left-6 top-1/2 z-20 -translate-y-1/2">
      <div className="glass flex flex-col gap-2 rounded-3xl p-2 shadow-soft">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            title={item.label}
            onClick={() => onSelect(active === item.key ? null : item.key)}
            className={`pill group relative grid h-12 w-12 place-items-center text-xl transition ${
              active === item.key
                ? "bg-glow text-plum"
                : "text-cream hover:bg-white/10"
            }`}
          >
            {item.icon}
            <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg bg-night/90 px-2 py-1 text-xs text-cream opacity-0 transition group-hover:opacity-100">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
