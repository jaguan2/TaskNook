// Lightweight visual rain to match the rain ambience toggle.
const DROPS = Array.from({ length: 60 });

export default function RainOverlay({ active }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {DROPS.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 10) * 0.3;
        const dur = 0.6 + ((i * 13) % 7) / 10;
        return (
          <span
            key={i}
            className="rain-drop"
            style={{
              left: `${left}%`,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
              opacity: 0.25 + ((i % 5) / 10),
            }}
          />
        );
      })}
    </div>
  );
}
