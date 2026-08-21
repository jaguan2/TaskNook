import { project } from "../lib/iso";

export const PARTITION_WALL_H = 76;

const pointOn = (a, b, t, lift = 0) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t - lift,
});

const coords = (point) => `${point.x},${point.y}`;

/**
 * A finished interior divider shared by the live scene and preset previews.
 * Walls use a darker wainscot, chair rail, baseboard and crown so they read as
 * architecture instead of one flat SVG slab. Arch pieces cut a real curved
 * opening out of that same wall face and remain open at floor level.
 */
export default function PartitionWall({
  run,
  height = PARTITION_WALL_H,
  fill,
  compact = false,
}) {
  const a = run.plane === "gy" ? project(run.from, run.at) : project(run.at, run.from);
  const b = run.plane === "gy" ? project(run.to, run.at) : project(run.at, run.to);
  const faceFill = fill || (run.plane === "gy" ? "url(#isoWallR)" : "url(#isoWallL)");
  const topA = pointOn(a, b, 0, height);
  const topB = pointOn(a, b, 1, height);

  if (run.arch) {
    // A little masonry remains at each side, while the opening grows when
    // adjacent arch units merge into a wider run.
    const inset = Math.min(0.12, 4 / Math.max(36, Math.hypot(b.x - a.x, b.y - a.y)));
    const leftFloor = pointOn(a, b, inset);
    const rightFloor = pointOn(a, b, 1 - inset);
    const leftSpring = pointOn(a, b, inset, height * 0.55);
    const rightSpring = pointOn(a, b, 1 - inset, height * 0.55);
    const crown = pointOn(a, b, 0.5, height * 0.9);
    const opening = [
      `M ${coords(leftFloor)}`,
      `L ${coords(leftSpring)}`,
      `C ${leftSpring.x},${leftSpring.y - height * 0.24} ${crown.x - 8},${crown.y} ${coords(crown)}`,
      `C ${crown.x + 8},${crown.y} ${rightSpring.x},${rightSpring.y - height * 0.24} ${coords(rightSpring)}`,
      `L ${coords(rightFloor)}`,
    ].join(" ");
    const face = [
      `M ${coords(topA)} L ${coords(topB)} L ${coords(b)} L ${coords(a)} Z`,
      `${opening} L ${coords(leftFloor)} Z`,
    ].join(" ");
    const trimWidth = compact ? 4.5 : 8;

    return (
      <g data-partition-style="arch">
        <path d={face} fill={faceFill} fillRule="evenodd" clipRule="evenodd" />
        <path
          d={face}
          fill="rgb(var(--color-cream))"
          fillRule="evenodd"
          clipRule="evenodd"
          opacity="0.08"
        />
        <path
          d={opening}
          fill="none"
          stroke="rgb(var(--color-void))"
          strokeWidth={trimWidth}
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity="0.4"
        />
        <path
          d={opening}
          fill="none"
          stroke="rgb(var(--color-glow))"
          strokeWidth={compact ? 3 : 5}
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity="0.78"
        />
        <path
          d={opening}
          fill="none"
          stroke="#fff"
          strokeWidth={compact ? 1 : 1.5}
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity="0.28"
        />
        <polyline
          points={`${coords(topA)} ${coords(topB)}`}
          fill="none"
          stroke="rgb(var(--color-void))"
          strokeWidth={compact ? 4 : 6}
          opacity="0.62"
        />
        <polyline
          points={`${coords(pointOn(a, b, 0, height - 2))} ${coords(pointOn(a, b, 1, height - 2))}`}
          fill="none"
          stroke="rgb(var(--color-cream))"
          strokeWidth="1.5"
          opacity="0.4"
        />
      </g>
    );
  }

  const railLift = height * 0.34;
  const lowerA = pointOn(a, b, 0, railLift);
  const lowerB = pointOn(a, b, 1, railLift);
  const baseA = pointOn(a, b, 0, 7);
  const baseB = pointOn(a, b, 1, 7);

  return (
    <g data-partition-style="wall">
      <polygon
        points={`${coords(topA)} ${coords(topB)} ${coords(b)} ${coords(a)}`}
        fill={faceFill}
      />
      <polygon
        points={`${coords(lowerA)} ${coords(lowerB)} ${coords(b)} ${coords(a)}`}
        fill="rgb(var(--color-cream))"
        opacity="0.11"
      />
      <polyline
        points={`${coords(lowerA)} ${coords(lowerB)}`}
        fill="none"
        stroke="rgb(var(--color-void))"
        strokeWidth={compact ? 4 : 6}
        opacity="0.38"
      />
      <polyline
        points={`${coords(lowerA)} ${coords(lowerB)}`}
        fill="none"
        stroke="rgb(var(--color-cream))"
        strokeWidth={compact ? 1.5 : 2.5}
        opacity="0.55"
      />
      <polyline
        points={`${coords(baseA)} ${coords(baseB)}`}
        fill="none"
        stroke="rgb(var(--color-void))"
        strokeWidth={compact ? 4 : 6}
        opacity="0.52"
      />
      <polyline
        points={`${coords(topA)} ${coords(topB)}`}
        fill="none"
        stroke="rgb(var(--color-void))"
        strokeWidth={compact ? 5 : 7}
        opacity="0.62"
      />
      <polyline
        points={`${coords(pointOn(a, b, 0, height - 2))} ${coords(pointOn(a, b, 1, height - 2))}`}
        fill="none"
        stroke="rgb(var(--color-cream))"
        strokeWidth="1.5"
        opacity="0.42"
      />
      {[a, b].map((point, index) => (
        <line
          key={index}
          x1={point.x}
          y1={point.y - height}
          x2={point.x}
          y2={point.y}
          stroke="rgb(var(--color-void))"
          strokeWidth={compact ? 1.5 : 2.5}
          opacity="0.35"
        />
      ))}
    </g>
  );
}
