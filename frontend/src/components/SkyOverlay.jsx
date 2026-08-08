import { memo, useMemo } from "react";

// Ambient sky BEHIND the scene (the room floats in front of it): twinkling
// stars + a moon at night, a glowing sun by day (low and warm at sunset),
// and drifting clouds whenever the weather calls for them. Weather and time
// of day COMPOSE — cloudy nights, rainy sunsets — so every element takes a
// time-aware tone: clouds are pale by day, ember-lit at sunset, dark
// silhouettes at night, storm-heavy in rain/storm. All movement is CSS
// keyframes (the app re-renders every second; CSS animations don't care),
// and everything is pointer-transparent and behind the HUD corners.
const STAR_COUNT = 44;

/**
 * How far daylight lifts the backdrop.
 *
 * This is a HARD ceiling, not a taste knob. The to-do list is drawn straight
 * onto the backdrop with no card behind it, in `cream` (#f7e9e2), so lifting
 * the sky lifts the surface that text has to stay legible against. 0.34 is the
 * measured limit: composited over the lightest theme's darkest stop it still
 * leaves ~5.3:1, comfortably past WCAG AA. It used to be 0.14, which was
 * perfectly safe and completely invisible — day looked exactly like night.
 * `SkyOverlay.test.jsx` re-measures both of these against every theme.
 */
export const DAY_LIFT = 0.34;
export const SUNSET_BAND = 0.3;

const CLOUDS = [
  { top: "6%", scale: 1.15, duration: 150, delay: -40, opacity: 0.5 },
  { top: "16%", scale: 0.8, duration: 110, delay: -90, opacity: 0.4 },
  { top: "26%", scale: 1.35, duration: 190, delay: -140, opacity: 0.45 },
  { top: "12%", scale: 0.6, duration: 95, delay: -20, opacity: 0.35 },
  { top: "34%", scale: 0.9, duration: 165, delay: -110, opacity: 0.3 },
];

// One tone per (weather-darkness × time): storm clouds read HEAVY whatever
// the hour; fair-weather clouds read pale by day, warm at sunset, and as
// darker-than-the-sky silhouettes at night.
function cloudTone({ dark, night, sunset }) {
  if (dark) return "rgba(14, 9, 20, 0.95)";
  if (night) return "rgba(38, 32, 58, 0.85)";
  if (sunset) return "rgba(235, 165, 130, 0.42)";
  return "rgba(210, 200, 220, 0.5)";
}

function Cloud({ top, scale, duration, delay, opacity, dark, night, sunset }) {
  const tone = cloudTone({ dark, night, sunset });
  // Sunset clouds catch the light on their undersides — a soft inner warm
  // rim, which is what makes a sunset sky read golden instead of grey.
  const lit = sunset && !dark ? "inset 0 -5px 10px rgba(255, 190, 130, 0.45)" : undefined;
  const puff = { background: tone, boxShadow: lit };
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
        <div className="h-10 w-40 rounded-full" style={puff} />
        <div className="absolute -top-5 left-7 h-11 w-20 rounded-full" style={puff} />
        <div className="absolute -top-3 left-20 h-9 w-16 rounded-full" style={puff} />
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
        // Negative and coprime-hashed: every star gets its own phase (9 shared
        // values used to blink them in groups of five) and starts mid-twinkle
        // rather than waiting at full brightness for its turn.
        delay: `-${((i * 29) % 71) / 10}s`,
        // Stars don't all twinkle at the same RATE either, so the field never
        // settles into a pattern the eye can follow.
        duration: `${(3.2 + ((i * 17) % 23) / 10).toFixed(1)}s`,
      })),
    []
  );

  // Leaves get cloud too — autumn is breezy and overcast, and snow already
  // works this way — but they're never the STORM-dark kind below.
  const hasClouds = ["cloudy", "rain", "storm", "snow", "leaves"].includes(weatherMode);
  const darkClouds = weatherMode === "rain" || weatherMode === "storm";
  const night = timeOfDay === "night";
  const sunset = timeOfDay === "sunset";
  // An overcast sky mutes the sun/moon rather than hiding it outright.
  const orbOpacity = hasClouds ? 0.3 : 0.9;
  // Under clouds most stars vanish; a handful still peek through gaps.
  const visibleStars = hasClouds ? stars.slice(0, 14) : stars;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Time-of-day washes: the page background stays the cozy dark theme
          gradient, so time is painted as light ON it — a cool morning haze
          from above by day, an ember band rising from the horizon at
          sunset, nothing at night (the stars carry it). */}
      {!night && !sunset && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                `linear-gradient(to bottom, rgba(142, 201, 234, ${DAY_LIFT}), rgba(142, 201, 234, ${
                  DAY_LIFT * 0.35
                }) 52%, rgba(142, 201, 234, 0) 88%)`,
            }}
          />
          {/* warm haze off the ground, so the sky has a top and a bottom
              rather than being one flat tint */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "40%",
              background:
                "linear-gradient(to top, rgba(255, 226, 176, 0.10), rgba(255, 226, 176, 0))",
            }}
          />
        </>
      )}
      {sunset && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                `linear-gradient(to bottom, rgba(126, 83, 130, ${DAY_LIFT * 0.7}), rgba(226, 130, 94, 0) 50%)`,
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "52%",
              background:
                `linear-gradient(to top, rgba(255, 138, 80, ${SUNSET_BAND}), rgba(255, 170, 110, ${
                  SUNSET_BAND * 0.4
                }) 55%, rgba(255, 170, 110, 0))`,
            }}
          />
        </>
      )}

      {night &&
        visibleStars.map((s, i) => (
          <span
            key={i}
            className="room-twinkle absolute rounded-full"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              background: "#f3e9ff",
              opacity: hasClouds ? 0.5 : 1,
              animationDelay: s.delay,
              animationDuration: s.duration,
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
        // The sun is layered, not flat: a wide soft halo, then a core with
        // an off-centre hotspot so it reads as a glowing ball, not a coin.
        <div
          className="absolute"
          style={{
            left: sunset ? "12%" : "63%",
            top: sunset ? "40%" : "12%",
            width: sunset ? 74 : 54,
            height: sunset ? 74 : 54,
            opacity: orbOpacity,
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              inset: sunset ? -56 : -40,
              background: sunset
                ? "radial-gradient(circle, rgba(255, 150, 80, 0.38), rgba(255, 150, 80, 0) 68%)"
                : "radial-gradient(circle, rgba(255, 224, 130, 0.32), rgba(255, 224, 130, 0) 68%)",
            }}
          />
          <div
            className="room-breathe absolute inset-0 rounded-full"
            style={{
              background: sunset
                ? "radial-gradient(circle at 38% 32%, #ffe2b0, #ffab5e 58%, #e87c4a)"
                : "radial-gradient(circle at 38% 32%, #fff6d8, #ffd76a 62%, #f2b955)",
            }}
          />
        </div>
      )}

      {/* rare delights: shooting stars at night, a bird passing by day.
          All pure CSS — the "rarity" is a long animation cycle where the
          visible part is only a sliver of it. Two stars on different lines
          and coprime-ish cycles (150s/170s), so where and when the next one
          falls stays unguessable without a single Math.random. No bird
          braves a storm. */}
      {night && !hasClouds && (
        <>
          <span
            className="shooting-star absolute"
            style={{ left: "18%", top: "12%" }}
          />
          <span
            className="shooting-star shooting-star-b absolute"
            style={{ left: "64%", top: "8%" }}
          />
        </>
      )}
      {!night && !darkClouds && (
        <svg
          className="bird-fly absolute"
          style={{ top: sunset ? "20%" : "14%" }}
          width="26"
          height="12"
          viewBox="0 0 26 12"
        >
          {/* the flap is on the path INSIDE the sliding svg: separate
              elements, so the two transforms compose instead of fighting */}
          <path
            className="wing-flap"
            d="M1 8 Q7 1 13 7 Q19 1 25 8"
            fill="none"
            stroke={sunset ? "#5a3a50" : "#3a3142"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}

      {hasClouds &&
        CLOUDS.map((c, i) => (
          <Cloud key={i} {...c} dark={darkClouds} night={night} sunset={sunset} />
        ))}
    </div>
  );
}

export default memo(SkyOverlay);
