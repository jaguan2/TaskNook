import { SKEW, TILE_W, floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { BroadleafTree } from "./IsoTreePrimitives";
import { TintedBox } from "./IsoItemPrimitives";

// A seasonal set. The rules these follow are the ones cozy isometric games
// (Animal Crossing, Stardew, Unpacking, Cozy Grove) all converge on, and they
// are what "clean" means here:
//
//   1. SILHOUETTE FIRST — the outline alone has to name the object at 30px.
//      A pumpkin is ribs-and-a-stem; a rake is a pole and a fan.
//   2. TWO OR THREE TONES per material, never a gradient ramp. Shared solid
//      primitives enforce this for boxes; the round items do it by hand.
//   3. ONE HERO COLOUR per object, everything else neutral, so a shelf of
//      them doesn't turn into confetti.
//   4. DETAIL AS FEW LARGE SHAPES — a toaster is a box, a slot and a lever.
//      Fine texture disappears at room scale and only costs nodes.
//   5. CHUNKY PROPORTIONS — cozy games oversize the readable part (a kettle's
//      spout, a mug's handle) rather than staying to scale.

export function MapleTree() {
  const c = project(0.75, 0.75);
  const crown = [
    { dx: -28, dy: -71, width: 51, height: 36, color: "#a8442f", dark: true, tilt: -8, variant: 1 },
    { dx: 9, dy: -71, width: 57, height: 39, color: "#b94d32", tilt: 4, variant: 2 },
    { dx: 36, dy: -84, width: 43, height: 34, color: "#b94d32", dark: true, tilt: 12, variant: 0 },
    { dx: -16, dy: -101, width: 55, height: 39, color: "#c0563f", tilt: 8, variant: 2 },
    { dx: 18, dy: -106, width: 54, height: 38, color: "#d47c35", tilt: -6, variant: 1 },
  ];
  return (
    <BroadleafTree center={c} kind="maple" trunkColor="#6b4a39"
      rearColor="#963c2d" clusters={crown} shadowOpacity={0.22}
      canopyDetails={<>
        <path d={`M${c.x - 38} ${c.y - 79} q8 -5 14 0 q-8 7 -14 0 z`} fill="#d98b3a" opacity="0.8" />
        <path d={`M${c.x + 34} ${c.y - 86} q7 -4 12 1 q-7 5 -12 -1 z`} fill="#a8442f" opacity="0.75" />
      </>} />
  );
}

export function LeafPile() {
  // Low and WIDE, with the leaves lying down. The first version stood them on
  // end over a tall red mound and the whole thing read as a campfire — the
  // give-away for a leaf pile is that it spreads sideways and its edge is
  // ragged, not that it's tall.
  const c = project(0.5, 0.4);
  const leaf = (x, y, r, s, fill) => (
    <g key={`${x}-${y}-${fill}`} transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 Q4.5 -3 9 0 Q5.4 3 0 0 Z" fill={fill} />
      <path d="M1.5 0 L7.2 0" stroke="#6f3828" strokeWidth="0.65" opacity="0.45" />
    </g>
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <path d="M-24 0 Q-15 5 -5 1 Q7 5 23 0 L19 4 Q2 8 -20 4 Z" fill="#4b2f28" opacity="0.22" />
      {/* Several low, overlapping drifts make a loose pile rather than one
          smooth red surfboard. The edge stays ragged and close to the floor. */}
      <path d="M-22 0 Q-20 -6 -12 -7 Q-7 -11 1 -7 Q8 -9 13 -4 Q19 -4 22 0 Q13 3 4 1 Q-4 4 -12 1 Q-17 3 -22 0 Z"
        style={tinted("#a8442f")} />
      <path d="M-17 -2 Q-13 -9 -5 -8 Q1 -13 8 -8 Q15 -8 18 -3 Q9 -1 3 -3 Q-6 1 -17 -2 Z"
        fill="#c85b32" />
      <path d="M-9 -5 Q-5 -12 2 -11 Q8 -14 13 -8 Q8 -5 2 -6 Q-3 -3 -9 -5 Z"
        fill="#d98b3a" />
      <path d="M6 -8 Q13 -7 18 -3 L10 -2 Q8 -6 6 -8 Z" fill="#000" opacity="0.14" />
      {/* Leaves lie across the mound; none stands upright like a flame. */}
      {leaf(-17, -2.5, -12, 0.9, "#c0563f")}
      {leaf(-11, -6.5, 9, 1, "#e0a34a")}
      {leaf(-3, -9.5, -7, 0.92, "#d98b3a")}
      {leaf(5, -8, 15, 0.98, "#a8442f")}
      {leaf(11, -4.5, -10, 0.88, "#e0a34a")}
      {leaf(-8, -1.5, 20, 0.82, "#a8442f")}
      {leaf(3, -2, -18, 0.84, "#c0563f")}
      {/* two strays on the floor beside it */}
      {leaf(-24, 0.5, -26, 0.8, "#c0563f")}
      {leaf(17, 0, 16, 0.8, "#d98b3a")}
    </g>
  );
}

export function HayBale() {
  // A tied rectangular bale, but not a wooden crate: each face swells a little
  // between the cords and the corners fray into loose straw.
  const W = 0.9;
  const D = 0.7;
  const H = 26;
  const A = project(0, 0);
  const B = project(W, 0);
  const C = project(W, D);
  const D0 = project(0, D);
  return (
    <g data-seasonal-structure="hay-bale">
      <path d={`M${D0.x} ${D0.y} Q${(D0.x + C.x) / 2} ${D0.y + 2} ${C.x} ${C.y}
        L${C.x + 0.8} ${C.y - H + 4} Q${(D0.x + C.x) / 2} ${D0.y - H - 2} ${D0.x - 0.8} ${D0.y - H + 2} Z`}
        style={tinted("#c9a24b")} />
      <path d={`M${D0.x} ${D0.y} Q${(D0.x + C.x) / 2} ${D0.y + 2} ${C.x} ${C.y}
        L${C.x + 0.8} ${C.y - H + 4} Q${(D0.x + C.x) / 2} ${D0.y - H - 2} ${D0.x - 0.8} ${D0.y - H + 2} Z`}
        fill="#000" opacity="0.16" />
      <path d={`M${B.x} ${B.y} Q${(B.x + C.x) / 2 + 1.5} ${(B.y + C.y) / 2} ${C.x} ${C.y}
        L${C.x + 0.8} ${C.y - H + 4} Q${(B.x + C.x) / 2 + 1.5} ${(B.y + C.y) / 2 - H - 1} ${B.x - 0.5} ${B.y - H + 2} Z`}
        style={tinted("#c9a24b")} />
      <path d={`M${B.x} ${B.y} Q${(B.x + C.x) / 2 + 1.5} ${(B.y + C.y) / 2} ${C.x} ${C.y}
        L${C.x + 0.8} ${C.y - H + 4} Q${(B.x + C.x) / 2 + 1.5} ${(B.y + C.y) / 2 - H - 1} ${B.x - 0.5} ${B.y - H + 2} Z`}
        fill="#000" opacity="0.3" />
      <path d={`M${A.x + 1} ${A.y - H + 1} Q${(A.x + B.x) / 2} ${A.y - H - 2} ${B.x - 0.5} ${B.y - H + 2}
        Q${(B.x + C.x) / 2 + 1.5} ${(B.y + C.y) / 2 - H - 1} ${C.x + 0.8} ${C.y - H + 4}
        Q${(D0.x + C.x) / 2} ${D0.y - H - 2} ${D0.x - 0.8} ${D0.y - H + 2}
        Q${(A.x + D0.x) / 2 - 1.5} ${(A.y + D0.y) / 2 - H} ${A.x + 1} ${A.y - H + 1} Z`}
        style={tinted("#c9a24b")} />
      <path d={`M${A.x + 2} ${A.y - H + 0.5} Q${(A.x + B.x) / 2} ${A.y - H - 1} ${B.x - 1.5} ${B.y - H + 2}`}
        fill="none" stroke="#fff3e0" strokeWidth="1.2" opacity="0.22" />
      {/* Loose straw softens the bundled silhouette without turning into
          high-frequency texture that disappears at room scale. */}
      <g fill="none" stroke="#e0bd62" strokeWidth="1.5" strokeLinecap="round" opacity="0.82">
        <path d={`M${project(0.05, 0.67).x} ${project(0.05, 0.67).y - H + 2} l-4 -3`} />
        <path d={`M${project(0.84, 0.65).x} ${project(0.84, 0.65).y - H + 1} l5 -2`} />
        <path d={`M${project(0.12, 0.08).x} ${project(0.12, 0.08).y - H} l-2 -4`} />
        <path d={`M${D0.x + 2} ${D0.y - 7} l-4 1`} />
        <path d={`M${C.x - 1} ${C.y - 12} l4 -1`} />
      </g>
      <g transform={`translate(${project(0, D).x}, ${project(0, D).y}) skewY(${SKEW})`}>
        {[-21, -16, -11, -6].map((y) => (
          <rect key={y} x="2" y={y} width={W * (TILE_W / 2) - 4} height="1" fill="#000" opacity="0.13" />
        ))}
        {[5, W * (TILE_W / 2) - 9].map((x) => (
          <rect data-seasonal-part="wrap-band" key={x} x={x} y={-H + 2}
            width="2.4" height={H - 2} fill="#7a5a2b" opacity="0.78" />
        ))}
      </g>
      <g transform={`translate(0,${-H})`}>
        <polygon points={floorPatch(0.06, 0.06, W - 0.12, D - 0.12)} fill="#fff" opacity="0.09" />
        {[0.21, 0.68].map((gx) => (
          <polygon data-seasonal-part="wrap-band" key={gx}
            points={floorPatch(gx, 0.02, 0.08, D - 0.04)} fill="#7a5a2b" opacity="0.62" />
        ))}
      </g>
    </g>
  );
}

/** Shared pumpkin body: ribs and a stem. The carved face is the only thing
 *  that separates the two, so it's the only thing that differs. */
function PumpkinBody({ carved }) {
  const c = project(0.25, 0.25);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="11" ry="5" fill="#000" opacity="0.18" />
      {/* The stalk disappears behind the crown, so it grows from the body
          instead of looking pasted to its front. */}
      <path d="M-1.8 -14.5 Q-3.2 -19 -0.2 -22.5 Q2.4 -20.5 2 -14.5 Z" fill="#53663a" />
      <path d="M-11 -7 Q-11.5 -14.5 -6.5 -16 Q-3.5 -18.8 0 -16.5 Q3.8 -19 6.8 -15.8
        Q11.8 -14.2 11 -6.5 Q8 -0.5 0 -0.2 Q-8 -0.5 -11 -7 Z" style={tinted("#d9782f")} />
      {/* Filled lobes carry the volume at room scale; hairline rib strokes did not. */}
      <path d="M-10.5 -7 Q-10.5 -14 -6.2 -15.5 Q-3.2 -10 -5.2 -1.2 Q-9 -2.4 -10.5 -7 Z"
        fill="#000" opacity="0.16" />
      <path d="M-5.8 -15.5 Q-1.8 -18 0 -16.5 Q-3.2 -9 -1.8 -0.4 Q-5 -1 -6 -7 Q-7 -12 -5.8 -15.5 Z"
        fill="#000" opacity="0.08" />
      <path d="M6.3 -15.3 Q10.8 -14 11 -6.5 Q9.4 -2 5 -1 Q7.1 -9.5 6.3 -15.3 Z"
        fill="#000" opacity="0.22" />
      <path d="M-5 -14 Q-3 -17 0 -16 Q-1 -12 -4.7 -9.6 Z" fill="#fff" opacity="0.15" />
      <ellipse cx="0" cy="-15.5" rx="4.8" ry="1.5" fill="#6f3f29" opacity="0.28" />
      {carved && (
        <g>
          <g fill="#4b241f">
            <path d="M-6.4 -11.8 L-1.6 -11.2 L-4.2 -7.5 Z" />
            <path d="M1.6 -11.1 L6.1 -10.3 L3.8 -7 Z" />
            <path d="M-6 -6.1 Q0 -3.2 6 -5 L4.3 -1.9 L1.8 -3.2 L0 -1.7 L-2 -3.3 L-4.5 -2 Z" />
          </g>
          {/* Smaller warm facets sit behind the dark cut edge, giving the
              openings wall thickness instead of flat yellow stickers. */}
          <g fill="#ffe09a">
            <path d="M-5.2 -10.8 L-2.5 -10.4 L-4.1 -8.5 Z" />
            <path d="M2.4 -10.1 L5.1 -9.7 L3.8 -7.9 Z" />
            <path d="M-4.5 -5 Q0 -3.4 4.6 -4.3 L3.6 -2.8 L1.7 -3.8 L0 -2.7 L-1.9 -4 L-3.6 -2.9 Z" />
          </g>
        </g>
      )}
    </g>
  );
}

export function Pumpkin() {
  return <PumpkinBody />;
}

export function JackOLantern() {
  return <PumpkinBody carved />;
}

export function Rake() {
  // Leans, because a rake standing bolt upright reads as a broom. The fan of
  // tines is the whole silhouette.
  const c = project(0.2, 0.2);
  const teeth = [
    [-10, 5.5, -1.2], [-7, 7, -0.8], [-4, 8, -0.4], [0, 8.5, 0],
    [4, 8, 0.5], [7, 7, 0.9], [10, 5.5, 1.3],
  ];
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-seasonal-structure="rake">
      <ellipse cx="2" cy="-1" rx="7" ry="3" fill="#000" opacity="0.16" />
      <path data-seasonal-part="rake-handle" d="M6 -2 L-3 -56"
        style={{ stroke: "var(--tint, #a87f5f)" }} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M5 -3 L-4 -55" stroke="#fff" strokeWidth="0.8" opacity="0.16" strokeLinecap="round" />
      <g transform="translate(6,-2)">
        <path data-seasonal-part="rake-socket" d="M-3 -7 L2 -8 L4 -1 L-2 0 Z" fill="#4d4854" />
        <path data-seasonal-part="rake-head" d="M-11 0 Q0 -6 11 0" fill="none"
          stroke="#5b5166" strokeWidth="2.4" strokeLinecap="round" />
        {teeth.map(([x, len, spread]) => (
          <path
            key={x}
            data-seasonal-part="rake-tine"
            d={`M${x} ${-1.5 + Math.abs(x) * 0.08} q${spread} ${len * 0.55} ${spread * 1.4} ${len}`}
            fill="none"
            stroke="#5b5166"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </g>
      <rect x="-4.4" y="-58" width="3" height="5" rx="1.4" fill="#6b4436" transform="rotate(-9 -3 -56)" />
    </g>
  );
}

export function Scarecrow() {
  const c = project(0.55, 0.45);
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-seasonal-structure="scarecrow">
      <ellipse cx="0" cy="-1" rx="13" ry="5" fill="#000" opacity="0.15" />
      <path d="M0 -2 L0 -58" stroke="#765039" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M-20 -42 L20 -42" stroke="#765039" strokeWidth="3" strokeLinecap="round" />
      <g data-seasonal-part="straw-cuffs" stroke="#d2ad62" strokeWidth="1.5" strokeLinecap="round">
        <path d="M-19 -42 l-6 -5 M-19 -42 l-7 0 M-19 -42 l-5 4" />
        <path d="M19 -42 l6 -5 M19 -42 l7 0 M19 -42 l5 4" />
      </g>
      {/* Sleeves hang below the crossbar instead of borrowing its straight
          stick silhouette. Unequal hems make the stuffed shirt feel loose. */}
      <g data-seasonal-part="cloth-sleeves" style={tinted("#a85a43")}>
        <path d="M-3 -46 Q-10 -49 -19 -45 L-18 -36 Q-11 -38 -5 -34 Z" />
        <path d="M3 -46 Q11 -48 20 -44 L18 -35 Q11 -39 5 -33 Z" />
      </g>
      <path d="M-13 -44 Q0 -49 13 -44 L10 -24 Q0 -20 -10 -24 Z" style={tinted("#a85a43")} />
      <path d="M-10 -24 Q0 -20 10 -24" fill="none" stroke="#e0b95f"
        strokeWidth="1.2" strokeDasharray="2 2" opacity="0.72" />
      <path d="M0 -24 L0 -42" stroke="#000" strokeWidth="1.2" opacity="0.16" />
      <circle cx="0" cy="-56" r="9" fill="#d8b96f" />
      <circle cx="-3" cy="-57" r="1" fill="#4b3b39" />
      <circle cx="3" cy="-57" r="1" fill="#4b3b39" />
      <path d="M-3 -52 q3 2 6 0" fill="none" stroke="#7b5038" strokeWidth="1" />
      <path data-seasonal-part="hat-crown" d="M-11 -66 Q0 -73 11 -66 L8 -60 H-8 Z" fill="#8a5b39" />
      <path d="M-11 -66 Q0 -70 11 -66" fill="none" stroke="#d2ad62" strokeWidth="1" opacity="0.45" />
      <path data-seasonal-part="hat-brim" d="M-17 -63 Q0 -67 17 -62 Q2 -58 -16 -61 Z" fill="#6b442f" />
      <path d="M-16 -61 Q2 -58 17 -62" fill="none" stroke="#000" strokeWidth="1.2" opacity="0.22" />
    </g>
  );
}

export function Turkey() {
  const c = project(0.45, 0.4);
  const feathers = [
    [-64, 0.82, "#9b4935"], [-43, 0.94, "#c06336"], [-22, 1.04, "#d18a3d"],
    [0, 1.08, "#b95635"], [22, 1.02, "#d49a43"], [43, 0.92, "#b55335"], [64, 0.8, "#8f4637"],
  ];
  return (
    <g transform={`translate(${c.x}, ${c.y})`} data-seasonal-structure="turkey">
      <ellipse cx="0" cy="-1" rx="13" ry="5" fill="#000" opacity="0.15" />
      <g transform="translate(3,-14)">
        {feathers.map(([angle, scale, fill]) => (
          <g key={angle} transform={`rotate(${angle}) scale(${scale})`}
            data-seasonal-part="turkey-tail-feather">
            <path d="M-4 1 Q-7 -8 -2 -18 Q0 -23 2 -18 Q7 -8 4 1 Q0 5 -4 1 Z" fill={fill} />
            <path d="M-2 -3 Q-3 -10 0 -18 Q3 -10 2 -3 Q0 0 -2 -3 Z"
              fill="#f0b858" opacity="0.48" />
            <path d="M0 -17 L0 1" stroke="#6f3b2f" strokeWidth="1" opacity="0.54" />
          </g>
        ))}
      </g>
      <path data-seasonal-part="turkey-body"
        d="M-11 -12 Q-10 -22 -1 -23 Q9 -22 12 -12 Q11 -3 1 -2 Q-9 -3 -11 -12 Z"
        style={tinted("#7f4e37")} />
      <path d="M4 -21 Q11 -19 12 -12 Q11 -4 2 -2 Q7 -10 4 -21 Z" fill="#000" opacity="0.18" />
      <path data-seasonal-part="turkey-wing" d="M-5 -13 Q1 -19 7 -13 Q3 -6 -5 -8 Z" fill="#b76a43" opacity="0.82" />
      <path data-seasonal-part="turkey-neck" d="M-5 -17 Q-10 -20 -9 -25 Q-8 -31 -3 -31 Q2 -29 1 -24 Q0 -20 -2 -17 Z"
        fill="#9d5438" />
      <circle cx="-5.3" cy="-26.5" r="1" fill="#2b2350" />
      <path d="M-8 -24 l-7 2 l6 2.2 z" fill="#d8a13f" />
      <path d="M-2 -22 q4 4 0 9" fill="none" stroke="#b8433c" strokeWidth="2.4" strokeLinecap="round" />
      <path data-seasonal-part="turkey-foot" d="M-5 -4 l-2 5 l-3 1 M-7 1 l2 2"
        fill="none" stroke="#9b6b3c" strokeWidth="1.5" strokeLinecap="round" />
      <path data-seasonal-part="turkey-foot" d="M3 -4 l2 5 l3 1 M5 1 l-2 2"
        fill="none" stroke="#9b6b3c" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

export function Cornstalks() {
  const c = project(0.4, 0.4);
  const stalks = [
    { x: -8, h: 58, lean: -5 },
    { x: -4, h: 67, lean: -2 },
    { x: 0, h: 62, lean: 1 },
    { x: 4, h: 70, lean: 3 },
    { x: 8, h: 59, lean: 6 },
  ];
  return (
    <g transform={`translate(${c.x},${c.y})`} data-seasonal-structure="cornstalk-bundle">
      <ellipse cx="0" cy="0" rx="13" ry="5" fill="#000" opacity="0.16" />
      {stalks.map(({ x, h, lean }, index) => (
        <g key={x} data-seasonal-part="corn-stalk" transform={`translate(${x},0) rotate(${lean})`}>
          <path d={`M0 -2 Q${lean * -0.12} ${-h / 2} 0 ${-h}`} fill="none" stroke="#b58b3d" strokeWidth="2.2" strokeLinecap="round" />
          <path d={`M0 ${-h * 0.42} Q${index % 2 ? 11 : -11} ${-h * 0.52} ${index % 2 ? 12 : -12} ${-h * 0.67} Q${index % 2 ? 4 : -4} ${-h * 0.61} 0 ${-h * 0.49} Z`} fill="#c39a46" />
          <path d={`M0 ${-h * 0.62} Q${index % 2 ? -10 : 10} ${-h * 0.74} ${index % 2 ? -8 : 8} ${-h * 0.88} Q${index % 2 ? -3 : 3} ${-h * 0.77} 0 ${-h * 0.69} Z`} fill="#d0aa55" />
        </g>
      ))}
      {[-5, 5].map((x) => (
        <g key={x} data-seasonal-part="corn-cob" transform={`translate(${x},-34) rotate(${x < 0 ? -12 : 12})`}>
          <ellipse cx="0" cy="0" rx="3.2" ry="7" fill="#d8a83e" />
          <path d="M-3 1 Q0 7 3 1 Q1 9 0 11 Q-1 9 -3 1 Z" fill="#7b7136" />
        </g>
      ))}
      <path d="M-10 -24 Q0 -20 10 -24 L9 -19 Q0 -16 -9 -19 Z" fill="#8a5346" />
      <path d="M-9 -21 Q0 -18 9 -21" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.16" />
    </g>
  );
}

export function AppleCrate() {
  const W = 0.8;
  const D = 0.6;
  const H = 17;
  const apples = [
    [0.19, 0.18, 8], [0.43, 0.15, 9], [0.65, 0.2, 8],
    [0.3, 0.4, 8], [0.56, 0.41, 9],
  ];
  return (
    <g data-seasonal-structure="apple-crate">
      <TintedBox gx={0} gy={0} dx={W} dy={D} h={H} fallback="#8b5d3d" dark={0.36} mid={0.2} />
      {[5, 11].map((lift) => (
        <g key={lift} transform={`translate(0,${-lift})`} opacity="0.8">
          <polygon data-seasonal-part="crate-slat" points={floorPatch(0.02, D - 0.09, W - 0.04, 0.06)} fill="#d0a06c" />
        </g>
      ))}
      {apples.map(([gx, gy, lift], index) => {
        const p = project(gx, gy);
        return <g key={`${gx}-${gy}`} transform={`translate(${p.x},${p.y - H - lift + 7})`} data-seasonal-part="apple">
          <circle cx="0" cy="0" r="5.1" fill={index % 2 ? "#b8483e" : "#c85b3f"} />
          <path d="M0 -4.5 q1 -4 3 -5" fill="none" stroke="#5d4b2e" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M2 -7 q4 -1 5 2 q-4 1 -5 -2 z" fill="#53663a" />
          <circle cx="-1.5" cy="-1.5" r="1.2" fill="#fff" opacity="0.16" />
        </g>;
      })}
    </g>
  );
}

export function MushroomPatch() {
  const mushrooms = [
    { gx: 0.22, gy: 0.25, h: 15, r: 8, cap: "#b6533d" },
    { gx: 0.5, gy: 0.18, h: 20, r: 9, cap: "#c06b3f" },
    { gx: 0.61, gy: 0.48, h: 13, r: 7, cap: "#8a5346" },
  ];
  return (
    <g data-seasonal-structure="mushroom-patch">
      <polygon points={floorPatch(0.05, 0.06, 0.7, 0.58)} fill="#6b5137" opacity="0.42" />
      <path d={`M${project(0.1, 0.55).x} ${project(0.1, 0.55).y} q9 -7 17 0 q-9 5 -17 0 z`} fill="#a8442f" opacity="0.72" />
      {mushrooms.map(({ gx, gy, h, r, cap }) => {
        const p = project(gx, gy);
        return <g key={`${gx}-${gy}`} transform={`translate(${p.x},${p.y})`} data-seasonal-part="mushroom">
          <path d={`M-2 -1 Q-3 ${-h * 0.55} -1.5 ${-h + 2} L1.5 ${-h + 2} Q3 ${-h * 0.55} 2 -1 Z`} fill="#e8d9bd" />
          <path d={`M${-r} ${-h + 1} Q0 ${-h - r * 0.85} ${r} ${-h + 1} Q0 ${-h + r * 0.35} ${-r} ${-h + 1} Z`} fill={cap} />
          <path d={`M${-r + 2} ${-h} Q0 ${-h - r * 0.58} ${r - 2} ${-h}`} fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.16" />
        </g>;
      })}
    </g>
  );
}

export function LeafGarland() {
  const leaves = [
    { x: 4, y: -66, color: "#a8442f", turn: -18 },
    { x: 12, y: -62, color: "#d58b3f", turn: 12 },
    { x: 21, y: -61, color: "#b6533d", turn: -8 },
    { x: 30, y: -63, color: "#d0a03f", turn: 16 },
    { x: 38, y: -68, color: "#963c2d", turn: -14 },
  ];
  return (
    <g transform={`skewY(${SKEW})`} data-seasonal-structure="leaf-garland">
      <path d="M2 -69 Q20 -55 40 -71" fill="none" stroke="#765039" strokeWidth="1.7" strokeLinecap="round" />
      {leaves.map(({ x, y, color, turn }) => (
        <g key={x} transform={`translate(${x},${y}) rotate(${turn})`} data-seasonal-part="garland-leaf">
          <path d="M0 -5 L2 -2 L6 -3 L4 1 L7 4 L2 4 L0 8 L-2 4 L-7 4 L-4 1 L-6 -3 L-2 -2 Z" fill={color} />
          <path d="M0 -4 L0 9" stroke="#6f3828" strokeWidth="0.8" opacity="0.6" />
        </g>
      ))}
      {[9, 34].map((x) => <circle key={x} cx={x} cy={x === 9 ? -58 : -61} r="2.2" fill="#7a4b2f" />)}
    </g>
  );
}

export function Wreath() {
  // A wall piece, so it lives in the wall's skewed plane like a picture frame.
  const cx = 14;
  const cy = -58;
  const leaves = [
    [8, 10.5, "#587343", 1], [39, 11.5, "#7d7b3d", 0.92], [72, 10.5, "#b46b37", 1.02],
    [106, 11.5, "#526d42", 0.9], [142, 10.2, "#c07d3b", 1], [174, 11.6, "#6f7a3d", 0.95],
    [207, 10.5, "#a65336", 1.04], [239, 11.3, "#4f7047", 0.92], [271, 10.4, "#c18a3e", 1],
    [303, 11.5, "#607846", 0.96], [334, 10.3, "#a85a38", 1.02],
  ];
  return (
    <g transform={`skewY(${SKEW})`} data-seasonal-structure="autumn-wreath">
      <path d={`M${cx - 10} ${cy - 2} Q${cx - 8} ${cy - 13} ${cx + 2} ${cy - 12}
        Q${cx + 13} ${cy - 9} ${cx + 11} ${cy + 2} Q${cx + 7} ${cy + 13} ${cx - 3} ${cy + 11}
        Q${cx - 14} ${cy + 7} ${cx - 10} ${cy - 2} Z`} fill="none" stroke="#6d4c34" strokeWidth="3.2" />
      <g fill="none" style={{ stroke: "var(--tint, #3f5f3a)" }} strokeWidth="4.5" strokeLinecap="round">
        <path data-seasonal-part="wreath-branch"
          d={`M${cx - 9} ${cy - 5} Q${cx - 2} ${cy - 14} ${cx + 8} ${cy - 7}`} />
        <path data-seasonal-part="wreath-branch"
          d={`M${cx + 10} ${cy - 3} Q${cx + 12} ${cy + 8} ${cx + 1} ${cy + 11}`} />
        <path data-seasonal-part="wreath-branch"
          d={`M${cx - 4} ${cy + 10} Q${cx - 14} ${cy + 5} ${cx - 9} ${cy - 5}`} />
      </g>
      {leaves.map(([angle, radius, fill, scale]) => {
        const r = (angle * Math.PI) / 180;
        const x = cx + Math.cos(r) * radius;
        const y = cy + Math.sin(r) * radius;
        return (
          <g key={angle} transform={`translate(${x},${y}) rotate(${angle + 90}) scale(${scale})`}
            data-seasonal-part="wreath-leaf">
            <path d="M-5 0 Q-3 -4 0 -2 Q3 -5 6 0 Q3 4 0 6 Q-3 4 -5 0 Z" fill={fill} />
            <path d="M0 -1 L0 6" stroke="#5f422e" strokeWidth="0.8" opacity="0.5" />
          </g>
        );
      })}
      {[18, 128, 224, 322].map((a) => {
        const r = (a * Math.PI) / 180;
        return <circle key={a} cx={cx + Math.cos(r) * 9.5} cy={cy + Math.sin(r) * 9.5} r="1.7" fill="#b9493e" />;
      })}
      <path data-seasonal-part="wreath-ribbon"
        d={`M${cx - 1} ${cy + 10} Q${cx - 8} ${cy + 7} ${cx - 9} ${cy + 13}
          Q${cx - 7} ${cy + 17} ${cx} ${cy + 12} Q${cx + 7} ${cy + 17} ${cx + 9} ${cy + 12}
          Q${cx + 8} ${cy + 7} ${cx + 1} ${cy + 10} Z`} fill="#a84445" />
      <path data-seasonal-part="wreath-ribbon-tail"
        d={`M${cx - 2} ${cy + 12} L${cx - 5} ${cy + 22} L${cx} ${cy + 19} L${cx} ${cy + 12} Z`}
        fill="#913940" />
      <path data-seasonal-part="wreath-ribbon-tail"
        d={`M${cx + 2} ${cy + 12} L${cx + 5} ${cy + 22} L${cx} ${cy + 19} L${cx} ${cy + 12} Z`}
        fill="#84333b" />
    </g>
  );
}

