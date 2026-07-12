import { useEffect, useState } from "react";

// Lightweight full-screen visuals to match the weather ambience mode.
const DROPS = Array.from({ length: 60 });
const FLAKES = Array.from({ length: 45 });

export default function WeatherOverlay({ mode }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (mode !== "storm") return undefined;
    let timer;
    const scheduleFlash = () => {
      timer = setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
        scheduleFlash();
      }, 4000 + Math.random() * 9000);
    };
    scheduleFlash();
    return () => clearTimeout(timer);
  }, [mode]);

  if (!mode || mode === "off") return null;

  const isRainy = mode === "rain" || mode === "storm";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {mode === "snow" &&
        FLAKES.map((_, i) => {
          const left = (i * 29) % 100;
          const delay = (i % 12) * 0.4;
          const dur = 6 + ((i * 17) % 10);
          const size = 2 + (i % 3);
          return (
            <span
              key={i}
              className="snow-flake"
              style={{
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
                opacity: 0.4 + ((i % 5) / 10),
              }}
            />
          );
        })}

      {isRainy &&
        DROPS.map((_, i) => {
          const left = (i * 37) % 100;
          const delay = (i % 10) * 0.3;
          const dur = (mode === "storm" ? 0.35 : 0.6) + ((i * 13) % 7) / 10;
          return (
            <span
              key={i}
              className={mode === "storm" ? "rain-drop rain-drop-storm" : "rain-drop"}
              style={{
                left: `${left}%`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
                opacity: 0.25 + ((i % 5) / 10),
              }}
            />
          );
        })}

      {mode === "storm" && (
        <div className={`lightning-flash ${flash ? "lightning-flash-active" : ""}`} />
      )}
    </div>
  );
}
