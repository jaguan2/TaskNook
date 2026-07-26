import { memo, useMemo } from "react";

// Ambient sky BEHIND the scene (the room floats in front of it): twinkling
// stars + a moon at night, a glowing sun by day (low and warm at sunset),
// and drifting clouds whenever the weather calls for them — soft grey when
// merely cloudy/snowy, storm-dark for rain and thunder. All movement is CSS
// keyframes (the app re-renders every second; CSS animations don't care),
// and everything is pointer-transparent and behind the HUD corners.
const STAR_COUNT = 44;

const CLOUDS = [
  { top: "6%", scale: 1.15, duration: 150, delay: -40, opacity: 0.5 },
  { top: "16%", scale: 0.8, duration: 110, delay: -90, opacity: 0.4 },
  { top: "26%", scale: 1.35, duration: 190, delay: -140, opacity: 0.45 },
  { top: "12%", scale: 0.6, duration: 95, delay: -20, opacity: 0.35 },
  { top: "34%", scale: 0.9, duration: 165, delay: -110, opacity: 0.3 },
];

function Cloud({ top, scale, duration, delay, opacity, dark }) {
  const tone = dark ? "rgba(14, 9, 20, 0.95)" : "rgba(210, 200, 220, 0.5)";
  return (
    <div
      className="sky-cloud absolute"
      style={{
        top,
        // storm clouds must read HEAVY, not misty
        opacity: dark ? Math.min(0.85, opacity * 1.6) : opacity,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="relative" style={{ transform: `scale(${scale})` }}>
        <div className="h-10 w-40 rounded-full" style={{ background: tone }} />
        <div
          className="absolute -top-5 left-7 h-11 w-20 rounded-full"
          style={{ background: tone }}
        />
        <div
          className="absolute -top-3 left-20 h-9 w-16 rounded-full"
          style={{ background: tone }}
        />
      </div>
    </div>
  );
}

function SkyOverlay({ weatherMode, timeOfDay }) {
  // Deterministic star field (no Math.random — positions must not reshuffle
  // on re-render), scattered across the upper half of the screen.
  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => ({
        left: `${((i * 61 + 13) % 97) * (100 / 97)}%`,
        top: `${(((i * 37 + 5) % 53) * (56 / 53)).toFixed(1)}%`,
        size: 1.5 + ((i * 13) % 3),
        delay: `${(i % 9) * 0.7}s`,
      })),
    []
  );

  const hasClouds = ["cloudy", "rain", "storm", "snow"].includes(weatherMode);
  const darkClouds = weatherMode === "rain" || weatherMode === "storm";
  const night = timeOfDay === "night";
  const sunset = timeOfDay === "sunset";
  // An overcast sky mutes the sun/moon rather than hiding it outright.
  const orbOpacity = hasClouds ? 0.3 : 0.9;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {night &&
        stars.map((s, i) => (
          <span
            key={i}
            className="room-twinkle absolute rounded-full"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              background: "#f3e9ff",
              animationDelay: s.delay,
            }}
          />
        ))}

      {/* The sun / moon. Composition, not decoration: rule-of-thirds — the
          orb sits at the upper-RIGHT third intersection (dead-centre above
          the room crowds the focal subject and reads stuck-on), clear of the
          to-do list (starts ~78% x) and agreeing with the right-wall string
          lights about where light comes from. Sunset is the exception: the
          sun drops LOW on the left and half-sinks behind the room's
          silhouette — a horizon. */}
      {night ? (
        <div
          className="absolute rounded-full"
          style={{
            left: "63%",
            top: "13%",
            width: 46,
            height: 46,
            background: "#f7e9e2",
            opacity: orbOpacity,
            boxShadow: "0 0 40px 12px rgba(247, 233, 226, 0.25)",
          }}
        >
          {/* craters make it a moon, not a dot */}
          <div className="absolute left-2.5 top-3 h-2.5 w-2.5 rounded-full bg-black/10" />
          <div className="absolute left-6 top-6 h-1.5 w-1.5 rounded-full bg-black/10" />
        </div>
      ) : (
        <div
          className="absolute rounded-full"
          style={{
            left: sunset ? "13%" : "63%",
            top: sunset ? "34%" : "12%",
            width: sunset ? 64 : 52,
            height: sunset ? 64 : 52,
            background: sunset ? "#ffb45e" : "#ffd76a",
            opacity: orbOpacity,
            boxShadow: sunset
              ? "0 0 90px 34px rgba(255, 150, 80, 0.35)"
              : "0 0 60px 22px rgba(255, 215, 106, 0.28)",
          }}
        />
      )}

      {/* rare delights: a shooting star at night, a bird passing by day.
          Both are pure CSS — the "rarity" is a long animation cycle where
          the visible part is only a sliver of it. */}
      {night && !hasClouds && (
        <span
          className="shooting-star absolute"
          style={{ left: "18%", top: "12%" }}
        />
      )}
      {!night && (
        <svg
          className="bird-fly absolute"
          style={{ top: sunset ? "20%" : "14%" }}
          width="26"
          height="12"
          viewBox="0 0 26 12"
        >
          <path
            d="M1 8 Q7 1 13 7 Q19 1 25 8"
            fill="none"
            stroke={sunset ? "#5a3a50" : "#3a3142"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}

      {hasClouds &&
        CLOUDS.map((c, i) => <Cloud key={i} {...c} dark={darkClouds} />)}
    </div>
  );
}

export default memo(SkyOverlay);
