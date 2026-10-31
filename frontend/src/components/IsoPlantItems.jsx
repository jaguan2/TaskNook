import { floorPatch, project } from "../lib/iso";
import { TintedBox } from "./IsoItemPrimitives";

// Indoor greenery owns one shared pot contract and one silhouette per species.
// At room scale a fern must read by its arch, a palm by its bare stems, and a
// snake plant by its stiff vertical leaves; fine leaf texture cannot do that.

/**
 * Shared tapered plant pot with a proud rim and visible, inset soil.
 * `foot` is the rim width in tiles and remains aligned to the catalog footprint.
 */
export function PlantPot({ foot, h, fallback = "#c0563f", rim = 3 }) {
  const body = h - rim;
  const shrink = foot * 0.15;
  const point = (gx, gy, lift) => {
    const projected = project(gx, gy);
    return `${projected.x},${projected.y - lift}`;
  };
  const rA = [0, 0];
  const rB = [foot, 0];
  const rC = [foot, foot];
  const rD = [0, foot];
  const fB = [foot - shrink, shrink];
  const fC = [foot - shrink, foot - shrink];
  const fD = [shrink, foot - shrink];
  const paint = { fill: `var(--tint, ${fallback})` };

  return (
    <g>
      <polygon
        points={`${point(...rD, body)} ${point(...rC, body)} ${point(...fC, 0)} ${point(...fD, 0)}`}
        style={paint}
      />
      <polygon
        points={`${point(...rD, body)} ${point(...rC, body)} ${point(...fC, 0)} ${point(...fD, 0)}`}
        fill="#000"
        opacity="0.2"
      />
      <polygon
        points={`${point(...rB, body)} ${point(...rC, body)} ${point(...fC, 0)} ${point(...fB, 0)}`}
        style={paint}
      />
      <polygon
        points={`${point(...rB, body)} ${point(...rC, body)} ${point(...fC, 0)} ${point(...fB, 0)}`}
        fill="#000"
        opacity="0.32"
      />
      <polygon
        points={`${point(...fD, 0)} ${point(...fC, 0)} ${point(...fC, 2.5)} ${point(...fD, 2.5)}`}
        fill="#000"
        opacity="0.16"
      />
      <polygon
        points={`${point(...fB, 0)} ${point(...fC, 0)} ${point(...fC, 2.5)} ${point(...fB, 2.5)}`}
        fill="#000"
        opacity="0.16"
      />
      <polygon
        points={`${point(...rD, h)} ${point(...rC, h)} ${point(...rC, body)} ${point(...rD, body)}`}
        style={paint}
      />
      <polygon
        points={`${point(...rD, h)} ${point(...rC, h)} ${point(...rC, body)} ${point(...rD, body)}`}
        fill="#000"
        opacity="0.13"
      />
      <polygon
        points={`${point(...rB, h)} ${point(...rC, h)} ${point(...rC, body)} ${point(...rB, body)}`}
        style={paint}
      />
      <polygon
        points={`${point(...rB, h)} ${point(...rC, h)} ${point(...rC, body)} ${point(...rB, body)}`}
        fill="#000"
        opacity="0.26"
      />
      <polygon
        points={`${point(...rA, h)} ${point(...rB, h)} ${point(...rC, h)} ${point(...rD, h)}`}
        style={paint}
      />
      <polygon
        points={floorPatch(foot * 0.11, foot * 0.11, foot * 0.78, foot * 0.78)}
        fill="#000"
        opacity="0.3"
        transform={`translate(0,${-h + 1.6})`}
      />
      <polygon
        points={floorPatch(foot * 0.11, foot * 0.11, foot * 0.78, foot * 0.78)}
        fill="#3a2a24"
        transform={`translate(0,${-h + 1.6})`}
      />
      <polyline
        points={`${point(...rD, h)} ${point(...rC, h)} ${point(...rB, h)}`}
        fill="none"
        stroke="#fff"
        opacity="0.14"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </g>
  );
}

function PlantBase({ foot, potH, leaves }) {
  const center = project(foot / 2, foot / 2);
  return (
    <g>
      <PlantPot foot={foot} h={potH} />
      <g transform={`translate(${center.x}, ${center.y - potH})`}>
        <g className="room-sway">{leaves}</g>
      </g>
    </g>
  );
}

export function Monstera() {
  return (
    <PlantBase foot={0.8} potH={16} leaves={<>
      <path
        d="M-1 -1 Q-7 -16 -16 -27 M1 -1 Q7 -18 15 -32 M1 -1 Q0 -26 6 -44"
        fill="none"
        stroke="#426f51"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Split lobes and central veins keep the leaves from reading as generic paddles. */}
      <path
        d="M-6 -12 C-19 -9 -29 -22 -28 -39 Q-19 -43 -9 -32 L-15 -30 L-7 -27 L-14 -25 L-5 -23 Q0 -17 -6 -12 Z"
        fill="#3f7f63"
      />
      <path
        d="M7 -13 C21 -15 28 -28 24 -45 Q15 -47 6 -36 L13 -34 L4 -31 L11 -28 L2 -25 Q1 -17 7 -13 Z"
        fill="#659971"
      />
      <path d="M3 -18 C-5 -29 -4 -43 5 -54 Q16 -49 15 -34 L10 -37 L13 -28 L8 -30 Q8 -21 3 -18 Z" fill="#4c8b65" />
      <path
        d="M-7 -15 Q-18 -24 -25 -37 M7 -16 Q17 -28 22 -42 M4 -21 Q5 -36 6 -51"
        fill="none"
        stroke="#c3cc88"
        strokeWidth="0.8"
        opacity="0.32"
        strokeLinecap="round"
      />
      <path d="M-6 -12 Q-10 -17 -11 -23 Q-19 -28 -28 -39 Q-26 -20 -6 -12" fill="#1f4738" opacity="0.18" />
    </>} />
  );
}

export function Plant() {
  const leaves = [[-2, -44, -26, -40], [1, -33, 23, -30], [-1, -23, -22, -20], [2, -13, 19, -10]];
  return <PlantBase foot={0.6} potH={12} leaves={<>
    <path d="M0 0 Q-3 -24 -1 -46" stroke="#6b7850" strokeWidth="1.8" fill="none" />
    {leaves.map(([x, y, targetX, targetY], index) => <g key={y}>
      <path
        d={`M${x} ${y} Q${targetX} ${targetY - 13} ${targetX} ${targetY}
          Q${targetX} ${targetY + 11} ${x} ${y} Z`}
        fill={index % 2 ? "#689b73" : "#3f7f63"}
      />
      <path
        d={`M${x} ${y} Q${targetX * 0.5} ${targetY - 1} ${targetX * 0.86} ${targetY}`}
        fill="none"
        stroke="#b3c28a"
        strokeWidth="0.65"
        opacity="0.4"
      />
    </g>)}
  </>} />;
}

/** Curved ribs carrying paired tapered leaflets form readable feathered foliage. */
function FeatherFrond({ x = 0, y = 0, angle, length, width, color, pairs = 5 }) {
  return <g transform={`translate(${x},${y}) rotate(${angle})`}>
    <path d={`M0 0 Q-3 ${-length * 0.5} 0 ${-length}`} stroke="#789963" strokeWidth="1" fill="none" />
    {Array.from({ length: pairs }, (_, index) => {
      const t = (index + 1) / (pairs + 1);
      const yy = -length * t;
      const xx = -1.5 * Math.sin(Math.PI * t);
      const span = width * Math.sin(Math.PI * t);
      return [-1, 1].map((side) => (
        <path
          key={`${index}-${side}`}
          d={`M${xx} ${yy + 2} Q${xx + side * span * 0.65} ${yy - 5}
            ${xx + side * span} ${yy - 2}
            Q${xx + side * span * 0.55} ${yy + 3} ${xx} ${yy + 2} Z`}
          fill={color}
        />
      ));
    })}
    <path d={`M0 ${-length + 8} Q-3 ${-length + 3} 0 ${-length} Q3 ${-length + 3} 0 ${-length + 8} Z`} fill={color} />
  </g>;
}

export function Fern() {
  return <PlantBase foot={0.7} potH={13} leaves={<>
    {[-66, -36, -8, 25, 58].map((angle, index) => (
      <FeatherFrond
        key={angle}
        angle={angle}
        length={index === 2 ? 36 : 30}
        width={5.8}
        color={index % 2 ? "#659971" : "#3f7f63"}
        pairs={5}
      />
    ))}
  </>} />;
}

export function Palm() {
  return <PlantBase foot={0.9} potH={18} leaves={<>
    <path
      d="M-3 0 Q-11 -29 -7 -47 M2 0 Q8 -38 4 -59 M0 0 Q-3 -36 -1 -66"
      fill="none"
      stroke="#6e8052"
      strokeWidth="1.9"
    />
    {[
      [-7, -47, -80, 29], [-7, -47, 60, 32], [4, -59, -48, 30],
      [4, -59, 75, 31], [-1, -66, -70, 29], [-1, -66, 37, 30],
    ].map(([x, y, angle, length], index) => (
      <FeatherFrond
        key={index}
        x={x}
        y={y}
        angle={angle}
        length={length}
        width={7}
        color={index % 2 ? "#659971" : "#3f7f63"}
        pairs={5}
      />
    ))}
  </>} />;
}

export function SnakePlant() {
  return <PlantBase foot={0.6} potH={14} leaves={<>
    {[[-8, 42, -7], [-3, 54, -2], [1, 58, 3], [6, 44, 8]].map(([x, h, lean], index) => <g key={x}>
      <path
        d={`M${x - 2} 0 Q${x + lean - 4} ${-h * 0.65} ${x + lean} ${-h}
          Q${x + lean + 4} ${-h * 0.65} ${x + 3} 0 Z`}
        fill={index % 2 ? "#659971" : "#3f7f63"}
      />
      <path
        d={`M${x} -3 Q${x + lean - 1} ${-h * 0.55} ${x + lean} ${-h + 5}`}
        stroke="#c1bb70"
        strokeWidth="1"
        opacity="0.7"
        fill="none"
      />
      {[0.25, 0.45, 0.65].map((t) => (
        <path
          key={t}
          d={`M${x + lean * t - 1} ${-h * t} l3 -1.3`}
          stroke="#285b49"
          strokeWidth="1.2"
          opacity="0.35"
        />
      ))}
    </g>)}
  </>} />;
}

export function Bonsai() {
  return <g>
    <TintedBox gx={0.03} gy={0.03} dx={0.44} dy={0.39} h={6} fallback="#6b4436" dark={0.34} mid={0.2} />
    <g transform={`translate(${project(0.25, 0.21).x}, ${project(0.25, 0.21).y - 6})`}>
      <ellipse cy="-1" rx="8" ry="3" fill="#3a2a24" />
      <g className="room-sway">
        <path d="M-2 0 Q-6 -7 1 -11 Q8 -16 4 -23 L7 -23 Q12 -14 3 -10 Q0 -7 2 0 Z" fill="#88634a" />
        <path d="M0 -9 Q-7 -9 -10 -15 M5 -17 Q10 -17 15 -19" fill="none" stroke="#88634a" strokeWidth="2.4" />
        {[[-10, -16, 0.7], [13, -21, 0.75], [2, -28, 1]].map(([x, y, scale]) => (
          <g key={y} transform={`translate(${x},${y}) scale(${scale})`}>
            <path
              d="M-12 2 Q-14 -3 -8 -4 Q-7 -9 -1 -7 Q4 -11 8 -6 Q14 -6 13 0 Q7 5 -1 4 Q-8 6 -12 2 Z"
              fill="#3f7f63"
            />
            <path
              d="M-10 -1 Q-10 -4 -5 -3 Q0 -8 5 -4 Q10 -5 11 -1 Q5 2 -1 0 Z"
              fill="#659971"
            />
          </g>
        ))}
      </g>
    </g>
  </g>;
}

export function Succulent() {
  const center = project(0.175, 0.175);
  return <g>
    <PlantPot foot={0.35} h={7} fallback="#c98a6b" rim={2} />
    <g transform={`translate(${center.x}, ${center.y - 7}) scale(1,0.68)`}>
      {[0, 51, 103, 155, 207, 258, 309].map((angle, index) => <g key={angle} transform={`rotate(${angle})`}>
        <path d="M0 1 Q-6 -3 -2 -12 Q4 -9 4 -4 Q3 0 0 1 Z" fill={index % 2 ? "#659971" : "#3f7f63"} />
        <path d="M0 0 Q-2 -4 -1.4 -9" fill="none" stroke="#bad1a2" strokeWidth="0.8" opacity="0.5" />
      </g>)}
      <path d="M-3 -1 Q-6 -5 -1 -9 Q4 -6 4 -2 Q1 2 -3 -1 Z" fill="#84ad86" />
      <path d="M0 -1 L0 -5" stroke="#3f7f63" strokeWidth="1" />
    </g>
  </g>;
}

export function Orchid() {
  const center = project(0.2, 0.2);
  return <g>
    <PlantPot foot={0.4} h={9} fallback="#cbd5e8" rim={2.5} />
    <g transform={`translate(${center.x}, ${center.y - 9})`}>
      <g className="room-sway">
        <path d="M0 0 Q-4 -21 6 -27 Q10 -30 12 -26" fill="none" stroke="#6e8052" strokeWidth="1.3" />
        <path d="M0 -2 Q-13 -13 -13 -5 Q-10 1 0 -2 M0 -2 Q10 -12 11 -4 Q7 1 0 -2" fill="#3f7f63" />
        {[[7, -26, 1], [2, -20, 0.9], [-1, -13, 0.8]].map(([x, y, scale]) => (
          <g key={y} transform={`translate(${x},${y}) scale(${scale})`}>
            <path
              d="M0 0 Q-7 -6 -7 -1 Q-7 3 -1 2 Q-4 7 0 7 Q4 7 2 2 Q8 3 7 -1 Q7 -6 0 0 Z"
              fill="#d998b8"
            />
            <path d="M0 0 Q-4 -7 0 -7 Q4 -7 0 0" fill="#efc1d4" />
            <path d="M-1 1 Q0 -1 2 1 L1 3 L-1 3 Z" fill="#f5ddb3" />
          </g>
        ))}
        <ellipse cx="12" cy="-26" rx="1.5" ry="2" fill="#b881a0" />
      </g>
    </g>
  </g>;
}
