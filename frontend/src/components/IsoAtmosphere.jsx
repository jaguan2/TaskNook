import { project } from "../lib/iso";
import { tileOn } from "../lib/isoRoom";
import { ambienceVars } from "../lib/motion";

// A small, fixed budget of light-catching particles, in ROOM coordinates.
// No timers or random values: camera movement and React renders leave each
// CSS animation on its own uninterrupted clock.
export default function IsoAtmosphere({ size, hasWindow, outdoors, timeOfDay, weather, quiet }) {
  if (quiet || (weather && weather !== "off")) return null;
  const daylight = hasWindow && (timeOfDay === "day" || timeOfDay === "sunset");
  const evening = outdoors && (timeOfDay === "night" || timeOfDay === "sunset");
  if (!daylight && !evening) return null;
  const count = daylight ? 9 : 6;
  return (
    <g data-room-atmosphere={daylight ? "sunlight" : "fireflies"}
      clipPath="url(#isoFloorClip)" pointerEvents="none" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        // Sunlit dust stays beside the window; fireflies spread through the
        // open room. Reject void tiles on cut-out floors before projecting.
        const gx = daylight ? 0.65 + (i % 3) * 0.8 : size.w * (0.18 + ((i * 3) % 7) * 0.1);
        const gy = daylight ? 1.3 + Math.floor(i / 3) * 0.75 : size.d * (0.22 + ((i * 5) % 7) * 0.1);
        if (!tileOn(size, Math.floor(gx), Math.floor(gy))) return null;
        const at = project(gx, gy);
        return (
          <g key={i} transform={`translate(${at.x},${at.y - 9 - (i % 3) * 4})`}
            style={ambienceVars(gx + i, gy)}>
            <g className={daylight ? "sun-mote" : "garden-firefly"}>
              {!daylight && <circle r="3.5" fill="#cbe984" opacity="0.13" />}
              <circle r={daylight ? 0.7 : 1.05} fill={daylight ? "#fff2c5" : "#e8ffc1"} />
            </g>
          </g>
        );
      })}
    </g>
  );
}
