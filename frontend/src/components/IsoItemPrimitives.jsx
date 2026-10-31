import { floorPatch, isoBox, project } from "../lib/iso";

/** One leaf cluster, with an irregular outline and broad light/shadow masses.
 * Build a canopy from differently scaled clusters rather than stacked ovals.
 */
const LEAF_CLUSTER_SHAPES = [
  {
    outline: "M-15 3 Q-19 -3 -12 -7 Q-13 -13 -6 -12 Q-2 -17 4 -12 Q11 -14 12 -8 Q19 -7 16 0 Q19 7 11 9 Q7 15 1 11 Q-6 15 -10 9 Q-17 10 -15 3 Z",
    shadow: "M-16 1 Q-11 6 -6 5 Q-2 10 3 7 Q9 10 16 1 Q19 7 11 9 Q7 15 1 11 Q-6 15 -10 9 Q-17 10 -16 1 Z",
    highlight: "M-12 -5 Q-9 -10 -4 -8 Q1 -13 5 -9 Q10 -10 11 -5 Q6 -7 2 -3 Q-4 -7 -8 -3 Z",
  },
  {
    outline: "M-16 4 Q-20 -1 -13 -7 Q-16 -13 -7 -13 Q-2 -18 4 -12 Q12 -15 14 -7 Q20 -4 15 2 Q18 8 9 10 Q4 15 -2 10 Q-9 14 -12 8 Q-19 10 -16 4 Z",
    shadow: "M-17 2 Q-10 7 -5 4 Q0 11 5 7 Q11 11 16 2 Q18 8 9 10 Q4 15 -2 10 Q-9 14 -12 8 Q-19 10 -17 2 Z",
    highlight: "M-13 -6 Q-8 -12 -3 -9 Q2 -14 6 -10 Q12 -11 12 -5 Q7 -8 3 -4 Q-3 -7 -8 -3 Z",
  },
  {
    outline: "M-14 5 Q-20 0 -12 -7 Q-13 -15 -4 -13 Q1 -19 7 -12 Q14 -12 14 -5 Q20 -2 15 4 Q16 11 7 11 Q1 16 -4 10 Q-11 14 -14 7 Q-19 9 -14 5 Z",
    shadow: "M-15 3 Q-10 8 -4 6 Q1 12 7 8 Q12 11 15 4 Q16 11 7 11 Q1 16 -4 10 Q-11 14 -14 7 Q-19 9 -15 3 Z",
    highlight: "M-11 -7 Q-7 -13 -2 -10 Q2 -15 7 -10 Q12 -10 12 -5 Q7 -7 3 -3 Q-2 -7 -7 -4 Z",
  },
];

export function LeafCluster({ x = 0, y = 0, width = 32, height = 24, fallback = "#3f7f63", dark = false, tilt = 0, variant = 0 }) {
  const shape = LEAF_CLUSTER_SHAPES[Math.abs(variant) % LEAF_CLUSTER_SHAPES.length];
  const paint = { fill: `var(--tint, ${fallback})` };
  return <g transform={`translate(${x},${y}) rotate(${tilt}) scale(${width / 32},${height / 24})`}>
    <path d={shape.outline} style={paint} />
    <path d={shape.shadow}
      fill="#142d23" opacity={dark ? 0.34 : 0.2} />
    <path d={shape.highlight}
      fill="#f4efd0" opacity="0.14" />
  </g>;
}

/** A padded volume: round the footprint in grid space before projecting it.
 * Cloth keeps its thickness and two shaded sides, but loses the crate corners.
 * No filters or gradients; the footprint and top height match TintedBox.
 */
export function SoftBox({ gx, gy, dx, dy, h, fallback, dark = 0.28, mid = 0.14,
  tint = true, radius = 0.12 }) {
  const r = Math.min(radius, dx / 3, dy / 3);
  const P = (x, y, lift = 0) => {
    const p = project(gx + x, gy + y);
    return `${p.x},${p.y - lift}`;
  };
  const top = `M${P(r, 0, h)} L${P(dx - r, 0, h)} Q${P(dx, 0, h)} ${P(dx, r, h)}
    L${P(dx, dy - r, h)} Q${P(dx, dy, h)} ${P(dx - r, dy, h)}
    L${P(r, dy, h)} Q${P(0, dy, h)} ${P(0, dy - r, h)}
    L${P(0, r, h)} Q${P(0, 0, h)} ${P(r, 0, h)} Z`;
  const leftEdge = (lift) => `M${P(0, dy - r, lift)} Q${P(0, dy, lift)} ${P(r, dy, lift)}
    L${P(dx - r, dy, lift)} Q${P(dx - r / 2, dy, lift)} ${P(dx - r / 4, dy - r / 4, lift)}`;
  const left = `${leftEdge(h)} L${P(dx - r / 4, dy - r / 4)}
    Q${P(dx - r / 2, dy)} ${P(dx - r, dy)} L${P(r, dy)}
    Q${P(0, dy)} ${P(0, dy - r)} Z`;
  const rightEdge = (lift) => `M${P(dx - r / 4, dy - r / 4, lift)}
    Q${P(dx, dy - r / 2, lift)} ${P(dx, dy - r, lift)} L${P(dx, r, lift)}`;
  const right = `${rightEdge(h)} L${P(dx, r)} L${P(dx, dy - r)}
    Q${P(dx, dy - r / 2)} ${P(dx - r / 4, dy - r / 4)} Z`;
  const paint = { fill: tint ? `var(--tint, ${fallback})` : fallback };
  return (
    <g>
      <path d={left} style={paint} />
      <path d={left} fill="#000" opacity={mid} />
      <path d={right} style={paint} />
      <path d={right} fill="#000" opacity={dark} />
      <path d={top} style={paint} />
      <path d={`${leftEdge(h)} Q${P(dx, dy - r / 2, h)} ${P(dx, dy - r, h)} L${P(dx, r, h)}`}
        fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.16" />
    </g>
  );
}

/** A vertical upholstered panel with a bowed crown, eased lower corners and
 * a visible shell behind it. The caller projects its face onto a wall plane;
 * unlike a tall extruded SoftBox, both its vertical and horizontal edges curve.
 */
export function PaddedPanel({ width, height, bottom, fallback, radius = 4, thickness = 3,
  dark = 0.3, mid = 0.12, waist = 0 }) {
  const r = Math.min(radius, width / 3, (height - bottom) / 3);
  const middle = -(height + bottom) / 2;
  const rightSide = waist ? `Q${width} ${middle - 4} ${width - waist} ${middle}
    Q${width} ${middle + 4} ${width} ${-bottom - r}` : `L${width} ${-bottom - r}`;
  const leftSide = waist ? `Q0 ${middle + 4} ${waist} ${middle}
    Q0 ${middle - 4} 0 ${-height + r}` : "";
  const outline = `M0 ${-height + r} Q0 ${-height} ${r} ${-height}
    Q${width / 2} ${-height - 1.2} ${width - r} ${-height}
    Q${width} ${-height} ${width} ${-height + r} ${rightSide}
    Q${width} ${-bottom} ${width - r} ${-bottom}
    Q${width / 2} ${-bottom + 0.8} ${r} ${-bottom}
    Q0 ${-bottom} 0 ${-bottom - r} ${leftSide} Z`;
  const paint = { fill: `var(--tint, ${fallback})` };
  return <g>
    <g transform={`translate(${thickness},${-thickness})`}>
      <path d={outline} style={paint} /><path d={outline} fill="#000" opacity={dark} />
    </g>
    <path d={outline} style={paint} /><path d={outline} fill="#000" opacity={mid} />
    <path d={`M1 ${-height + r} Q1 ${-height + 1} ${r} ${-height + 1}
      Q${width / 2} ${-height - 0.2} ${width - r} ${-height + 1}`}
      fill="none" stroke="#fff" opacity="0.18" strokeWidth="0.85" strokeLinecap="round" />
    <path d={`M${r} ${-bottom - 1} Q${width / 2} ${-bottom + 0.2} ${width - r} ${-bottom - 1}`}
      fill="none" stroke="#000" opacity="0.14" strokeWidth="0.8" strokeLinecap="round" />
  </g>;
}

/**
 * The workhorse: an axis-aligned volume with its three visible faces at three
 * values (top lit, left mid, right dark), shaded by translucent black so the
 * depth survives ANY tint.
 *
 * `tint={false}` opts a part out of the colour picker. That matters more than
 * it sounds: a bed's tint is its DUVET, so the frame and headboard have to
 * stay wood — without this, picking purple gave you a purple headboard too.
 */
export function TintedBox({ gx, gy, dx, dy, h, fallback, dark = 0.32, mid = 0.18, tint = true }) {
  const box = isoBox(gx, gy, dx, dy, h);
  const { B, C, D } = box.corners;
  const up = (p) => `${p.x},${p.y - h}`;
  const paint = { fill: tint ? `var(--tint, ${fallback})` : fallback };
  // How deep the contact shading runs, scaled to the box — a 3px chair seat
  // must not get the same 7px band as a wardrobe.
  const foot = Math.min(7, Math.max(1.5, h * 0.34));
  const bevel = Math.min(dx * 0.07, dy * 0.07, 0.045);
  return (
    <g>
      <polygon points={box.left} style={paint} />
      <polygon points={box.left} fill="#000" opacity={mid} />
      <polygon points={box.right} style={paint} />
      <polygon points={box.right} fill="#000" opacity={dark} />
      <polygon points={box.top} style={paint} />
      {/* A small top bevel catches light as an area, not a bright outline.
          The shared solid geometry gives cabinets, tables and seasonal
          timber the same construction without imposing grain on metal. */}
      <g transform={`translate(0,${-h})`}>
        <polygon points={floorPatch(gx, gy + dy - bevel, dx, bevel)} fill="#fff3e0" opacity="0.16" />
        <polygon points={floorPatch(gx + dx - bevel, gy, bevel, dy)} fill="#fff3e0" opacity="0.1" />
      </g>
      {/* Contact shading where the box meets whatever it stands on. Nearly
          every piece in the catalog is built from these, so one band here
          gives the whole room weight at once — without it a box looks pasted
          onto the floor rather than resting on it. */}
      <polygon
        points={`${D.x},${D.y} ${C.x},${C.y} ${C.x},${C.y - foot} ${D.x},${D.y - foot}`}
        fill="#000"
        opacity="0.15"
      />
      <polygon
        points={`${B.x},${B.y} ${C.x},${C.y} ${C.x},${C.y - foot} ${B.x},${B.y - foot}`}
        fill="#000"
        opacity="0.15"
      />
      <polyline
        points={`${up(D)} ${up(C)} ${up(B)}`}
        fill="none"
        stroke="#fff"
        opacity="0.13"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </g>
  );
}
