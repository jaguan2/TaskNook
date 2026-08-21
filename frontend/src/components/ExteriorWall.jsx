import { project } from "../lib/iso";
import { exteriorWallHeight } from "../lib/isoRoom";

const coords = (point) => `${point.x},${point.y}`;

/**
 * One run of the room shell, shared by the live room and preset thumbnails.
 * Original gx/gy 0 runs are full walls. Recessed runs are automatically low
 * cutaway edges with finished end posts, so an asymmetric wing reads as an
 * open architectural step rather than a tall slab dropping into the void.
 */
export default function ExteriorWall({
  run,
  height,
  fill,
  compact = false,
  lift,
  liftOpacity = 0,
}) {
  const a = run.plane === "gy" ? project(run.from, run.at) : project(run.at, run.from);
  const b = run.plane === "gy" ? project(run.to, run.at) : project(run.at, run.to);
  const wallH = exteriorWallHeight(run, height);
  const cutaway = run.at > 0 || height <= 48;
  const faceFill = fill || (run.plane === "gy" ? "url(#isoWallR)" : "url(#isoWallL)");
  const cap = compact ? 4 : 6;
  const base = Math.min(9, wallH * 0.24);
  const topA = { x: a.x, y: a.y - wallH };
  const topB = { x: b.x, y: b.y - wallH };

  return (
    <g data-exterior-wall={cutaway ? "cutaway" : "full"}>
      <polygon
        points={`${coords(topA)} ${coords(topB)} ${coords(b)} ${coords(a)}`}
        fill={faceFill}
      />
      <polygon
        points={`${topA.x},${topA.y - cap} ${topB.x},${topB.y - cap} ${coords(topB)} ${coords(topA)}`}
        style={{
          fill: `rgb(var(--color-void) / ${run.plane === "gy" ? 0.48 : 0.62})`,
        }}
      />

      {!cutaway && Array.from(
        { length: Math.max(0, Math.ceil(run.to - run.from) - 1) },
        (_, index) => {
          const at = run.from + index + 1;
          const point = run.plane === "gy" ? project(at, run.at) : project(run.at, at);
          return (
            <line
              key={`panel-${index}`}
              x1={point.x}
              y1={point.y - wallH}
              x2={point.x}
              y2={point.y}
              stroke="#000"
              strokeWidth="1"
              opacity="0.09"
            />
          );
        }
      )}

      <polygon
        points={`${a.x},${a.y - base} ${b.x},${b.y - base} ${coords(b)} ${coords(a)}`}
        fill="#fff"
        opacity={run.plane === "gy" ? 0.06 : 0.09}
      />

      {cutaway ? (
        <>
          {/* One broad inset and strong end posts make the lowered run read as
              a deliberate cutaway/balustrade rather than cropped wallpaper. */}
          <polyline
            points={`${a.x},${a.y - wallH * 0.55} ${b.x},${b.y - wallH * 0.55}`}
            fill="none"
            stroke="rgb(var(--color-void))"
            strokeWidth={compact ? 2.5 : 4}
            opacity="0.34"
          />
          {[a, b].map((point, index) => (
            <line
              key={`end-${index}`}
              x1={point.x}
              y1={point.y - wallH - cap}
              x2={point.x}
              y2={point.y}
              stroke="rgb(var(--color-void))"
              strokeWidth={compact ? 3 : 5}
              opacity="0.68"
            />
          ))}
          <polyline
            points={`${coords(topA)} ${coords(topB)}`}
            fill="none"
            stroke="rgb(var(--color-cream))"
            strokeWidth={compact ? 1 : 1.5}
            opacity="0.34"
          />
        </>
      ) : (
        <polygon
          points={`${a.x},${a.y - wallH * 0.62} ${b.x},${b.y - wallH * 0.62} ${b.x},${
            b.y - wallH * 0.62 + 3
          } ${a.x},${a.y - wallH * 0.62 + 3}`}
          fill="#000"
          opacity="0.14"
        />
      )}

      {lift && (
        <polygon
          points={`${coords(topA)} ${coords(topB)} ${coords(b)} ${coords(a)}`}
          fill={lift}
          opacity={liftOpacity * (run.plane === "gy" ? 0.75 : 1)}
        />
      )}
    </g>
  );
}
