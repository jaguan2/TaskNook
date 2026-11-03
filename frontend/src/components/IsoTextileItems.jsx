import { floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { SoftBox } from "./IsoItemPrimitives";

/**
 * A proper flower-shaped floor seat. The broad petal outline stays readable
 * at room scale and gives lounges a softer option than another square pouf.
 */
export function FlowerCushion() {
  const c = project(0.5, 0.5);
  const petals = [
    [0, -8, 0],
    [13, -4, 51],
    [16, 7, 103],
    [7, 14, 154],
    [-7, 14, 206],
    [-16, 7, 257],
    [-13, -4, 309],
  ];

  return (
    <g transform={`translate(${c.x},${c.y})`} data-textile="flower-cushion">
      <ellipse cy="2" rx="25" ry="12" fill="#000" opacity="0.16" />
      {petals.map(([x, y, angle], index) => (
        <g key={angle} transform={`translate(${x},${y - 7}) rotate(${angle})`}>
          <ellipse cx="0" cy="0" rx="12" ry="8.5" style={tinted("#d98a93")} />
          <ellipse cx="2.5" cy="2" rx="9.5" ry="6.4" fill="#000" opacity={index > 3 ? 0.2 : 0.1} />
          <path d="M-7 -2 Q0 -7 7 -2" fill="none" stroke="#fff" strokeWidth="1" opacity="0.13" />
        </g>
      ))}
      <ellipse cy="-8" rx="11" ry="8" fill="#e2b85f" />
      <ellipse cx="-2.5" cy="-10.5" rx="5" ry="2.5" fill="#fff" opacity="0.18" />
      <ellipse cy="-8" rx="8.5" ry="6" fill="none" stroke="#8c6737" strokeWidth="0.8" opacity="0.26" strokeDasharray="2 2" />
    </g>
  );
}

/**
 * A folded throw for the floor or supported tabletops and dressers. The
 * staggered layers and loose fringe make it read as fabric instead of a tiny
 * storage box.
 */
export function FoldedBlanket() {
  const fringe = [0.08, 0.2, 0.32, 0.44, 0.56];
  return (
    <g data-textile="folded-blanket">
      <SoftBox gx={0.05} gy={0.08} dx={0.8} dy={0.5} h={4}
        fallback="#b98578" radius={0.08} dark={0.22} mid={0.1} />
      <g transform="translate(0,-4)">
        <SoftBox gx={0.1} gy={0.04} dx={0.76} dy={0.48} h={4}
          fallback="#b98578" radius={0.08} dark={0.2} mid={0.08} />
        <polygon points={floorPatch(0.1, 0.2, 0.76, 0.09)} fill="#f2e7dc" opacity="0.24" transform="translate(0,-4.1)" />
      </g>
      <g transform="translate(0,-8)">
        <SoftBox gx={0.03} gy={0.1} dx={0.8} dy={0.48} h={3.4}
          fallback="#b98578" radius={0.08} dark={0.2} mid={0.08} />
        <polygon points={floorPatch(0.03, 0.25, 0.8, 0.08)} fill="#f2e7dc" opacity="0.3" transform="translate(0,-3.5)" />
      </g>
      {fringe.map((gy, index) => {
        const a = project(0.84, gy);
        const b = project(0.94 + (index % 2) * 0.025, gy + 0.015);
        return <path key={gy} d={`M${a.x} ${a.y - 8} Q${b.x - 1} ${b.y - 4} ${b.x} ${b.y - 2}`}
          fill="none" stroke="var(--tint, #b98578)" strokeWidth="1.15" strokeLinecap="round" />;
      })}
    </g>
  );
}
