import { project } from "../lib/iso";

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
        const outline = [
          [gx + dx * 0.12, gy],
          [gx + dx * 0.72, gy + dy * 0.03],
          [gx + dx, gy + dy * 0.38],
          [gx + dx * 0.9, gy + dy * 0.86],
          [gx + dx * 0.42, gy + dy],
          [gx + dx * 0.04, gy + dy * 0.68],
          [gx, gy + dy * 0.24],
        ];
        const polygon = (offsetX = 0, offsetY = 0) => outline
          .map(([x, y]) => project(x + offsetX, y + offsetY))
          .map(({ x, y }) => `${x},${y}`)
          .join(" ");
        const highlightStart = project(gx + 0.12, gy + 0.11);
        const highlightEnd = project(gx + dx - 0.12, gy + 0.11);
        const crack = project(gx + dx * 0.58, gy + dy * 0.5);
        return (
          <g key={`${gx}-${gy}`}>
            <polygon
              points={polygon(0.04, 0.08)}
              fill="#40533d"
              opacity="0.3"
            />
            <polygon
              data-ground-part="chipped-stone"
              points={polygon()}
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
            {index % 2 === 0 && <path d={`M${crack.x - 2} ${crack.y - 1} l2 1 l-1 2`}
              fill="none" stroke="#6f6a5b" strokeWidth="0.8" opacity="0.48"
              strokeLinecap="round" />}
          </g>
        );
      })}
    </g>
  );
}
