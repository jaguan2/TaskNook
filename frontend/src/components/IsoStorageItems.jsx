import { floorPatch, isoBox, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { SoftBox, TintedBox } from "./IsoItemPrimitives";

/** Leaning rails meet three solid shelves; the upper boards are shallower. */
export function LadderShelf() {
  const H = 62;
  const rail = (gx) => {
    const foot = project(gx, 0.48);
    const footEnd = project(gx + 0.08, 0.48);
    const crown = project(gx, 0.06);
    const crownEnd = project(gx + 0.08, 0.06);
    const side = project(gx + 0.08, 0.42);
    const crownSide = project(gx + 0.08, 0);
    return <g key={gx}>
      <polygon points={`${foot.x},${foot.y} ${footEnd.x},${footEnd.y} ${crownEnd.x},${crownEnd.y - H} ${crown.x},${crown.y - H}`}
        style={tinted("#a87f5f")} />
      <polygon points={`${footEnd.x},${footEnd.y} ${side.x},${side.y} ${crownSide.x},${crownSide.y - H} ${crownEnd.x},${crownEnd.y - H}`}
        style={tinted("#a87f5f")} />
      <polygon points={`${footEnd.x},${footEnd.y} ${side.x},${side.y} ${crownSide.x},${crownSide.y - H} ${crownEnd.x},${crownEnd.y - H}`}
        fill="#000" opacity="0.25" />
    </g>;
  };
  const bowl = project(0.48, 0.16);
  return <g>
    {rail(0.03)}
    {rail(0.79)}
    {[12, 29, 46].map((height) => {
      const depth = 0.48 - height / H * 0.42;
      return <g key={height} transform={`translate(0,${-height})`}>
        <TintedBox gx={0.07} gy={0.035} dx={0.76} dy={depth} h={2.4}
          fallback="#b58c6a" dark={0.28} mid={0.13} />
      </g>;
    })}
    {/* Contents share the boards' real top heights, with air around them. */}
    <g transform="translate(0,-48.4)">
      {[[0.18, 8, "#85927c"], [0.33, 9, "#b48979"], [0.48, 7, "#c1ad85"]].map(([gx, height, fill]) =>
        <TintedBox key={gx} gx={gx} gy={0.065} dx={0.11} dy={0.11} h={height}
          fallback={fill} tint={false} dark={0.22} mid={0.1} />)}
    </g>
    <g transform={`translate(${bowl.x},${bowl.y - 31.4})`}>
      <path d="M-3.5 -4 Q-3.7 0 -1.3 0.8 L1.3 0.8 Q3.7 0 3.5 -4 Z" fill="#a7b5aa" />
      <ellipse cy="-4" rx="3.5" ry="1.5" fill="#d7ddd1" />
      <ellipse cy="-4" rx="2.6" ry="0.9" fill="#536758" />
    </g>
    <g transform="translate(0,-14.4)">
      <SoftBox gx={0.2} gy={0.1} dx={0.47} dy={0.23} h={2.6}
        fallback="#d5c8af" tint={false} radius={0.06} />
      <g transform="translate(0,-2.6)">
        <SoftBox gx={0.22} gy={0.1} dx={0.43} dy={0.22} h={2}
          fallback="#e2d8c3" tint={false} radius={0.05} />
      </g>
    </g>
  </g>;
}

/** A vertical plank face, expressed between two projected floor corners. */
function plankFace(a, b, bottom, top) {
  return `${a.x},${a.y - top} ${b.x},${b.y - top} ${b.x},${b.y - bottom} ${a.x},${a.y - bottom}`;
}

function SlattedCrate({ gx, gy, w, d, h, lid = false }) {
  const { A, B, C, D } = isoBox(gx, gy, w, d, h).corners;
  const paint = tinted("#b68b5e");
  const boards = [0.6, h * 0.38, h * 0.73];
  const faces = [[A, B, 0.3], [A, D, 0.38], [D, C, 0.1], [B, C, 0.24]];
  return <g>
    <TintedBox gx={gx} gy={gy} dx={w} dy={d} h={2} fallback="#b68b5e" dark={0.3} mid={0.15} />
    <polygon points={floorPatch(gx + 0.06, gy + 0.06, w - 0.12, d - 0.12)}
      transform="translate(0,-2)" fill="#000" opacity="0.5" />
    {faces.map(([from, to, shade], face) => <g key={face}>
      {boards.map((bottom) => <g key={bottom}>
        <polygon points={plankFace(from, to, bottom, bottom + 2.7)} style={paint} />
        <polygon points={plankFace(from, to, bottom, bottom + 2.7)} fill="#000" opacity={shade} />
      </g>)}
    </g>)}
    {/* Separate corner battens hold the slats; the gaps stay genuinely open. */}
    {[[gx, gy], [gx + w - 0.065, gy], [gx, gy + d - 0.065], [gx + w - 0.065, gy + d - 0.065]].map(([x, y]) =>
      <TintedBox key={`${x},${y}`} gx={x} gy={y} dx={0.065} dy={0.065} h={h}
        fallback="#b68b5e" dark={0.28} mid={0.13} />)}
    <g transform={`translate(0,${-h})`}>
      {lid ? [0, 1, 2].map((board) =>
        <TintedBox key={board} gx={gx + board * w / 3} gy={gy}
          dx={w / 3 - 0.018} dy={d} h={1.4} fallback="#b68b5e" dark={0.28} mid={0.13} />)
        : <>
          <polygon points={floorPatch(gx, gy, w, 0.055)} style={paint} />
          <polygon points={floorPatch(gx, gy + d - 0.055, w, 0.055)} style={paint} />
          <polygon points={floorPatch(gx, gy, 0.055, d)} style={paint} />
          <polygon points={floorPatch(gx + w - 0.055, gy, 0.055, d)} style={paint} />
        </>}
    </g>
  </g>;
}

/** A packed lower crate supports an open, slightly smaller upper crate. */
export function Crates() {
  return <g>
    <SlattedCrate gx={0} gy={0} w={0.8} d={0.7} h={14.6} lid />
    <g transform="translate(0,-16)">
      <SlattedCrate gx={0.08} gy={0.06} w={0.62} d={0.56} h={14} />
    </g>
  </g>;
}

/** Bound wicker, an inset opening and one soft cloth, rather than a cylinder. */
export function Basket() {
  const c = project(0.3, 0.3);
  const paint = tinted("#b58b58");
  const body = "M-11 -17 Q-10.5 -7 -8.5 -1 Q0 3.7 8.5 -1 Q10.5 -7 11 -17 Z";
  return <g transform={`translate(${c.x},${c.y})`}>
    <ellipse cy="-0.3" rx="8.5" ry="3.9" fill="#000" opacity="0.22" />
    <path d={body} style={paint} />
    <path d="M4 -16 Q8 -9 5.5 0.3 Q8 0.4 8.5 -1 Q10.5 -7 11 -17 Z" fill="#000" opacity="0.19" />
    {/* A few broad bands suggest wicker at room scale; no dense weave grid. */}
    {[-13, -9, -5].map((y) => <path key={y}
      d={`M${y === -5 ? -9 : -10} ${y} Q0 ${y + 5} ${y === -5 ? 9 : 10} ${y}`}
      fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.27" />)}
    <path d="M-6 -16 Q-7 -8 -5 -1 M0 -16 L0 1.3 M6 -16 Q7 -8 5 -1"
      fill="none" stroke="#000" strokeWidth="0.9" opacity="0.16" />
    <ellipse cy="-17" rx="11" ry="5" style={paint} />
    <ellipse cy="-17" rx="8.8" ry="3.4" fill="#000" opacity="0.65" />
    <path d="M-10 -16 Q0 -10 10 -16" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.3" />
    <path d="M3 -12.4 Q6 -10.3 8 -12.4" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
    <path d="M-6 -18 Q-8 -21 -4 -23 Q0 -24 3 -20 Q5 -17 2 -16 L0 -10 Q-2 -8 -4 -11 L-4 -16 Z" fill="#e9e0cd" />
    <path d="M-4 -20 Q-2 -17 -4 -16 M-1 -19 Q1 -16 -1 -11" fill="none" stroke="#000" strokeWidth="0.9" strokeLinecap="round" opacity="0.18" />
  </g>;
}
