import { floorPatch, project } from "../lib/iso";

// A short, loose run rather than a paved rectangle. Keeping the trail as a
// catalog sprite lets authored rooms bend it with rotation and gives players
// the same garden-building piece used by Secret Garden.
const STONES = [
  [0.08, 0.58, 0.66, 0.5],
  [0.72, 0.34, 0.62, 0.52],
  [1.35, 0.62, 0.72, 0.48],
  [2.08, 0.4, 0.58, 0.5],
  [2.68, 0.64, 0.72, 0.5],
];

export function GardenTrail() {
  return (
    <g data-garden-trail="stepping-stones">
      {STONES.map(([gx, gy, dx, dy], index) => {
        const highlightStart = project(gx + 0.12, gy + 0.11);
        const highlightEnd = project(gx + dx - 0.12, gy + 0.11);
        return (
          <g key={`${gx}-${gy}`}>
            <polygon
              points={floorPatch(gx + 0.04, gy + 0.08, dx, dy)}
              fill="#40533d"
              opacity="0.3"
            />
            <polygon
              points={floorPatch(gx, gy, dx, dy)}
              fill={index % 2 ? "#b5aa91" : "#c2b69a"}
              stroke="#777261"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            <path
              d={`M${highlightStart.x} ${highlightStart.y} L${highlightEnd.x} ${highlightEnd.y}`}
              fill="none"
              stroke="#e0d6bd"
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>
        );
      })}
    </g>
  );
}
