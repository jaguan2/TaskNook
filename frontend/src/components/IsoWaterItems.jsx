import { useId } from "react";
import { floorPatch, isoBox, project } from "../lib/iso";

// Water needs to belong to the same floor plane as the room. Screen-space
// ellipses can look plausible in isolation but escape their catalog footprint
// when they sit near an isometric edge. These sprites build every shoreline
// and basin from grid-space points, then clip the animated surface to the
// declared footprint as a final guard.

const POOL_DEPTH = 4;
const POOL_WIDTH = 2.5;
const POND_WIDTH = 3.5;
const POND_DEPTH = 2.5;

function useWaterClipId(prefix) {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}

function smoothGridPath(points) {
  const projected = points.map(([gx, gy]) => project(gx, gy));
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = midpoint(projected.at(-1), projected[0]);
  const commands = projected.map((point, index) => {
    const next = projected[(index + 1) % projected.length];
    const end = midpoint(point, next);
    return `Q${point.x} ${point.y} ${end.x} ${end.y}`;
  });
  return `M${start.x} ${start.y} ${commands.join(" ")} Z`;
}

function WaterSurfaceClip({ id, width, depth }) {
  return (
    <clipPath id={id}>
      <polygon points={floorPatch(0, 0, width, depth)} />
    </clipPath>
  );
}

const POND_BANK = [
  [0.2, 0.68],
  [0.9, 0.22],
  [1.92, 0.13],
  [2.9, 0.42],
  [3.33, 1.04],
  [3.18, 1.72],
  [2.55, 2.22],
  [1.55, 2.38],
  [0.62, 2.12],
  [0.14, 1.5],
];

const POND_WATER = [
  [0.43, 0.79],
  [1.07, 0.43],
  [1.93, 0.34],
  [2.72, 0.57],
  [3.02, 1.08],
  [2.9, 1.61],
  [2.37, 1.94],
  [1.57, 2.08],
  [0.81, 1.89],
  [0.39, 1.42],
];

const POND_STONES = [
  [0.61, 0.61, 5.2, 2.7, "#8c8c78"],
  [1.72, 0.25, 4.2, 2.3, "#777d6d"],
  [2.72, 0.58, 4.4, 2.4, "#a09a82"],
  [3.08, 1.38, 4.8, 2.5, "#8c8c78"],
  [2.84, 1.7, 5.6, 2.8, "#777d6d"],
  [1.55, 2.2, 4.2, 2.3, "#a09a82"],
  [0.65, 1.84, 4.7, 2.5, "#96927b"],
];

function PondReeds({ point, mirror = false }) {
  return (
    <g transform={`translate(${point.x} ${point.y}) scale(${mirror ? -1 : 1} 1)`}>
      <g className="room-sway" style={{ transformBox: "fill-box", transformOrigin: "bottom" }}>
        <path d="M0 2 Q-1 -9 1 -20 M5 3 Q5 -7 7 -16 M-5 2 Q-7 -5 -6 -13" fill="none" stroke="#557b55" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M0 -8 Q-8 -13 -10 -8 Q-5 -6 0 -8 M5 -5 Q12 -10 14 -6 Q10 -3 5 -5 M-4 -3 Q-11 -6 -12 -2 Q-8 0 -4 -3" fill="#6f9464" />
        <ellipse cx="1" cy="-20" rx="2" ry="4" fill="#765943" />
        <ellipse cx="7" cy="-16" rx="1.8" ry="3.6" fill="#8a684a" />
      </g>
    </g>
  );
}

function PondBody({ width, depth, kind }) {
  const id = useWaterClipId("pond-footprint");
  const sx = width / POND_WIDTH;
  const sy = depth / POND_DEPTH;
  const scalePoints = (points) => points.map(([gx, gy]) => [gx * sx, gy * sy]);
  const waterPoints = scalePoints(POND_WATER);
  const waterPath = smoothGridPath(waterPoints);
  const highlightPath = smoothGridPath(waterPoints.map(([gx, gy]) => [gx + 0.05 * sx, gy - 0.08 * sy]));
  const at = (gx, gy) => project(gx * sx, gy * sy);
  const rippleA = [at(0.92, 1.23), at(1.55, 1.12), at(2.1, 1.17)];
  const rippleB = [at(1.38, 1.55), at(1.82, 1.47), at(2.25, 1.51)];
  const rippleC = [at(1.9, 0.87), at(2.35, 0.78), at(2.75, 0.84)];
  const padA = at(2.42, 0.93);
  const padB = at(2.62, 1.29);
  const padC = at(0.86, 1.55);

  return (
    <g data-water-body={kind} data-water-material="natural-bank" data-footprint={`${width}x${depth}`}>
      <defs>
        <WaterSurfaceClip id={id} width={width} depth={depth} />
      </defs>
      <g clipPath={`url(#${id})`} data-water-clip="true">
        <path data-water-part="bank" d={smoothGridPath(scalePoints(POND_BANK))} fill="#59634d" />
        <path d={smoothGridPath(scalePoints(POND_BANK))} fill="none" stroke="#7d8067"
          strokeWidth="4.5" opacity="0.72" />
        {/* A broad earthen shelf and a narrower green-blue shelf make the
            water recede into the ground rather than meet a painted outline. */}
        <path data-water-part="shallows" d={waterPath} fill="none" stroke="#8c8b70"
          strokeWidth="9" opacity="0.88" />
        <path d={waterPath} fill="none" stroke="#5d8375" strokeWidth="5.5" opacity="0.9" />
        <path d={waterPath} fill="#285c67" />
        <path d={waterPath} fill="none" stroke="#376d71" strokeWidth="2" opacity="0.92" />
        <path d={highlightPath} fill="#5595a0" opacity="0.56" />

        {POND_STONES.map(([gx, gy, rx, ry, fill], index) => {
          const stone = at(gx, gy);
          return <ellipse key={index} cx={stone.x} cy={stone.y} rx={rx} ry={ry} fill={fill} />;
        })}

        {[rippleA, rippleB, ...(kind === "gardenpond" ? [rippleC] : [])].map(([start, control, end], index) => (
          <path
            key={index}
            className="pond-ripple"
            d={`M${start.x} ${start.y} Q${control.x} ${control.y - 4} ${end.x} ${end.y}`}
            fill="none"
            stroke="#b9dadd"
            strokeWidth="1.35"
            strokeLinecap="round"
            opacity={index ? 0.46 : 0.62}
          />
        ))}

        <g className="room-sway" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <ellipse cx={padA.x} cy={padA.y} rx="8" ry="4" fill="#4f8767" />
          <ellipse cx={padB.x} cy={padB.y} rx="6" ry="3.2" fill="#3f7359" />
          <ellipse cx={padC.x} cy={padC.y} rx="7" ry="3.6" fill="#5b926c" />
          <circle cx={padA.x - 1} cy={padA.y - 3} r="2" fill="#e5a0a8" />
        </g>
      </g>
      {kind === "gardenpond" && (
        <g data-water-part="reeds">
          <PondReeds point={at(0.42, 1.18)} />
          <PondReeds point={at(2.83, 0.69)} mirror />
          <PondReeds point={at(2.72, 1.72)} />
        </g>
      )}
    </g>
  );
}

export function Pond() {
  return <PondBody width={POND_WIDTH} depth={POND_DEPTH} kind="pond" />;
}

export function GardenPond() {
  return <PondBody width={8} depth={6} kind="gardenpond" />;
}

function PoolBody({ length }) {
  const id = useWaterClipId("pool-footprint");
  const shell = isoBox(0, 0, length, POOL_WIDTH, POOL_DEPTH);
  const waterInset = 0.32;
  const waterWidth = length - waterInset * 2;
  const waterDepth = POOL_WIDTH - waterInset * 2;
  const ladderNear = project(0.42, 0.62);
  const ladderFar = project(0.64, 0.84);
  const longEdgeJoints = Array.from({ length: Math.floor(length) }, (_, index) => index + 1);

  const entrySteps = [
    [length - 0.98, 0.38, 0.58, 0.32, 0.34],
    [length - 0.86, 0.65, 0.46, 0.28, 0.46],
    [length - 0.74, 0.88, 0.34, 0.24, 0.6],
  ];

  return (
    <g data-water-body="pool" data-water-material="built-coping" data-footprint={`${length}x${POOL_WIDTH}`}>
      <defs>
        <WaterSurfaceClip id={id} width={length} depth={POOL_WIDTH} />
      </defs>

      <polygon points={shell.left} fill="#b8aa94" />
      <polygon points={shell.right} fill="#cbbca5" />
      <polygon data-water-part="coping" points={shell.top} fill="#eee4d3" />

      <g clipPath={`url(#${id})`} data-water-clip="true">
        <polygon
          points={floorPatch(0.2, 0.2, length - 0.4, POOL_WIDTH - 0.4)}
          fill="#315f6e"
          opacity="0.92"
        />
        <polygon
          points={floorPatch(waterInset, waterInset, waterWidth, waterDepth)}
          fill="#4ea3b6"
        />
        <polygon
          points={floorPatch(0.45, 0.45, length - 0.9, POOL_WIDTH - 0.9)}
          fill="#71beca"
          opacity="0.52"
        />

        {/* Three submerged ledges establish a walk-in end independently of
            the metal ladder. Their increasing blue veil communicates depth. */}
        {entrySteps.map(([gx, gy, dx, dy, veil], index) => (
          <g key={gx} data-water-part="entry-step">
            <polygon points={floorPatch(gx, gy, dx, dy)} fill="#d9ddd3" opacity={0.82 - index * 0.1} />
            <polygon points={floorPatch(gx, gy, dx, dy)} fill="#4ea3b6" opacity={veil} />
          </g>
        ))}

        {[0.77, 1.44].map((gy, index) => {
          const start = project(0.8, gy);
          const control = project(length / 2, gy - 0.18);
          const end = project(length - 0.82, gy);
          return (
            <path
              key={gy}
              className="pond-ripple"
              d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`}
              fill="none"
              stroke="#d8eef0"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity={index ? 0.38 : 0.58}
            />
          );
        })}
      </g>

      {/* A few coping joints keep the rim from reading as one white outline. */}
      <g stroke="#c9bca8" strokeWidth="1" opacity="0.72">
        {longEdgeJoints.map((gx) => {
          const backOuter = project(gx, 0);
          const backInner = project(gx, 0.22);
          const frontInner = project(gx, POOL_WIDTH - 0.22);
          const frontOuter = project(gx, POOL_WIDTH);
          return (
            <g key={gx}>
              <line x1={backOuter.x} y1={backOuter.y - POOL_DEPTH} x2={backInner.x} y2={backInner.y - POOL_DEPTH} />
              <line x1={frontInner.x} y1={frontInner.y - POOL_DEPTH} x2={frontOuter.x} y2={frontOuter.y - POOL_DEPTH} />
            </g>
          );
        })}
      </g>

      <g fill="none" stroke="#e4e7e7" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${ladderNear.x} ${ladderNear.y - 17} V${ladderNear.y + 1}`} />
        <path d={`M${ladderFar.x} ${ladderFar.y - 17} V${ladderFar.y + 1}`} />
        <path d={`M${ladderNear.x} ${ladderNear.y - 17} Q${(ladderNear.x + ladderFar.x) / 2} ${ladderNear.y - 23} ${ladderFar.x} ${ladderFar.y - 17}`} />
        <path d={`M${ladderNear.x} ${ladderNear.y - 8} L${ladderFar.x} ${ladderFar.y - 8}`} opacity="0.75" />
      </g>
    </g>
  );
}

export function SwimmingPool() {
  return <PoolBody length={3.5} />;
}

export function LongSwimmingPool() {
  return <PoolBody length={7} />;
}
