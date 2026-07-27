import { useEffect, useState } from "react";

// Lightweight full-screen visuals to match the weather ambience mode.
const DROPS = Array.from({ length: 60 });
const FLAKES = Array.from({ length: 45 });
// Fewer than snow: a leaf is a big shape, and autumn reads as occasional
// rather than as a blizzard.
const LEAVES = Array.from({ length: 22 });
// Autumn, not a paint chart — four turning colours, seeded per leaf.
const LEAF_COLOURS = ["#c9622f", "#d98a3c", "#a8452c", "#b8863a"];

// `reduceMotion` is passed down rather than read here: it now resolves the
// in-app Motion setting against the OS preference, and App already holds it.
// The lightning is a full-screen white pulse — under reduced motion that's a
// photosensitivity concern, not just a motion one, and being a CSS
// *transition* it escapes the animation-silencing rules entirely, so it has
// to be gated in JS.
export default function WeatherOverlay({ mode, reduceMotion = false }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (mode !== "storm" || reduceMotion) return undefined;
    let timer;
    let flashTimer;
    const scheduleFlash = () => {
      timer = setTimeout(() => {
        setFlash(true);
        flashTimer = setTimeout(() => setFlash(false), 150);
        scheduleFlash();
      }, 4000 + Math.random() * 9000);
    };
    scheduleFlash();
    return () => {
      clearTimeout(timer);
      clearTimeout(flashTimer);
    };
  }, [mode, reduceMotion]);

  if (!mode || mode === "off") return null;

  const isRainy = mode === "rain" || mode === "storm";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {mode === "snow" &&
        FLAKES.map((_, i) => {
          const left = (i * 29) % 100;
          const dur = 6 + ((i * 17) % 10);
          // NEGATIVE, the same trick the leaves use. A positive delay parks a
          // flake at its start position — which is above the viewport — so
          // picking snow showed an empty sky for seconds and didn't look like
          // real snowfall for a good fifteen. Starting each one part-way
          // through its own fall means it's already snowing on the first
          // frame. (Rain got away with it only because a drop crosses in
          // under a second.)
          const delay = -(((i * 13) % 17) / 17) * dur;
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
          const dur = (mode === "storm" ? 0.35 : 0.6) + ((i * 13) % 7) / 10;
          // negative for the same reason, so the first frame is already wet
          const delay = -(((i * 7) % 11) / 11) * dur;
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

      {/* Autumn. Each leaf gets its own fall speed, drift phase and tumble
          direction from its index — deterministic, so nothing reshuffles on a
          re-render (the same reason the star field is index-derived). */}
      {mode === "leaves" &&
        LEAVES.map((_, i) => {
          const left = (i * 41) % 100;
          const dur = 9 + ((i * 23) % 9);
          const delay = -((i * 31) % 18);
          const size = 9 + (i % 4) * 2;
          return (
            <span
              key={i}
              className="leaf-fall"
              style={{
                left: `${left}%`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
                opacity: 0.55 + ((i % 4) / 10),
              }}
            >
              <span
                className="leaf-spin"
                style={{
                  width: `${size}px`,
                  height: `${size * 0.72}px`,
                  background: LEAF_COLOURS[i % LEAF_COLOURS.length],
                  animationDuration: `${2.4 + (i % 5) * 0.6}s`,
                  animationDirection: i % 2 ? "reverse" : "normal",
                }}
              />
            </span>
          );
        })}

      {mode === "storm" && !reduceMotion && (
        <div className={`lightning-flash ${flash ? "lightning-flash-active" : ""}`} />
      )}
    </div>
  );
}
