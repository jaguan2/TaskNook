import { floorPatch, project, SKEW } from "../lib/iso";
import { TintedBox } from "./IsoItemPrimitives";

const raisedPoint = (gx, gy, height) => {
  const { x, y } = project(gx, gy);
  return `${x},${y - height}`;
};

// The top tray is a real catalog surface. Books live on the lower shelf so
// a player can put their own journal, plant or lamp on the clear upper tray.
export function BookTrolley() {
  const wheels = [[0.13, 0.12], [1.17, 0.12], [0.13, 0.58], [1.17, 0.58]];
  const books = [
    [0.2, 15, "#727f75"], [0.35, 18, "#a77d6d"],
    [0.5, 16, "#66798a"], [0.65, 14, "#b69c6e"],
  ];
  return (
    <g>
      {wheels.map(([gx, gy]) => {
        const { x, y } = project(gx, gy);
        return <g key={`${gx}-${gy}`} transform={`translate(${x},${y})`}>
          <path d="M0 -7 v4" stroke="#9b8b73" strokeWidth="2" />
          <ellipse cy="-2.7" rx="2.4" ry="2.7" fill="#4c463e" />
          <ellipse cx="0.6" cy="-2.8" rx="1.1" ry="1.5" fill="#a0927a" />
        </g>;
      })}
      {/* The far uprights sit behind both shelves and their contents. */}
      {[0.08, 1.14].map((gx) => <TintedBox key={gx} gx={gx} gy={0.04}
        dx={0.07} dy={0.07} h={36} fallback="#789388" />)}
      <g transform="translate(0,-7)">
        <TintedBox gx={0.04} gy={0.04} dx={1.22} dy={0.62} h={2.5}
          fallback="#bb9870" tint={false} />
      </g>
      <g transform="translate(0,-9.5)">
        {books.map(([gx, h, color]) => {
          const spine = project(gx, 0.53);
          return <g key={gx}>
            <TintedBox gx={gx} gy={0.17} dx={0.13} dy={0.36} h={h}
              fallback={color} tint={false} />
            <g transform={`translate(${spine.x},${spine.y}) skewY(${SKEW})`}>
              <path d={`M0.6 ${-h + 3} h1.9 M0.6 -3 h1.9`}
                stroke="#ead9b9" opacity="0.7" strokeWidth="0.8" />
            </g>
          </g>;
        })}
        {/* A horizontal folio leaves an open gap beside the standing books. */}
        <TintedBox gx={0.89} gy={0.18} dx={0.24} dy={0.36} h={3}
          fallback="#9f8066" tint={false} />
      </g>
      <g transform="translate(0,-29.5)">
        <TintedBox gx={0.02} gy={0.02} dx={1.26} dy={0.66} h={2.5}
          fallback="#bb9870" tint={false} />
      </g>
      {/* Low tray lips keep the top usable; an open side handle identifies
          the cart without a tall panel hiding furniture behind it. */}
      <g transform="translate(0,-32)">
        <TintedBox gx={0.02} gy={0.02} dx={1.26} dy={0.05} h={2.5} fallback="#789388" />
        <TintedBox gx={0.02} gy={0.02} dx={0.05} dy={0.66} h={2.5} fallback="#789388" />
      </g>
      {[0.08, 1.14].map((gx) => <TintedBox key={gx} gx={gx} gy={0.59}
        dx={0.07} dy={0.07} h={35} fallback="#789388" />)}
      <path d={`M${raisedPoint(1.2, 0.08, 35)} L${raisedPoint(1.2, 0.08, 42)}
        Q${raisedPoint(1.2, 0.08, 44)} ${raisedPoint(1.2, 0.17, 44)}
        L${raisedPoint(1.2, 0.49, 44)} Q${raisedPoint(1.2, 0.6, 44)} ${raisedPoint(1.2, 0.6, 42)}
        L${raisedPoint(1.2, 0.6, 35)}`}
        fill="none" stroke="var(--tint, #789388)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d={`M${raisedPoint(1.2, 0.19, 44)} L${raisedPoint(1.2, 0.48, 44)}`}
        stroke="#fff" opacity="0.23" strokeWidth="0.8" strokeLinecap="round" />
    </g>
  );
}

export function OpenJournal() {
  return (
    <g>
      <TintedBox gx={0} gy={0.02} dx={0.9} dy={0.6} h={1.4} fallback="#88684c" />
      <g transform="translate(0,-1.4)">
        <polygon points={floorPatch(0.04, 0.06, 0.82, 0.52)} fill="#c8bda4" />
      </g>
      {/* Two sloping page blocks meet at a raised, curved binding. */}
      <path d={`M${raisedPoint(0.04, 0.06, 2.6)} L${raisedPoint(0.45, 0.06, 5)}
        L${raisedPoint(0.45, 0.58, 5)} Q${raisedPoint(0.19, 0.58, 3.8)} ${raisedPoint(0.04, 0.58, 2.6)} Z`}
        fill="#eee2c7" />
      <path d={`M${raisedPoint(0.45, 0.06, 5)} L${raisedPoint(0.86, 0.06, 2.6)}
        L${raisedPoint(0.86, 0.58, 2.6)} Q${raisedPoint(0.63, 0.58, 4.2)} ${raisedPoint(0.45, 0.58, 5)} Z`}
        fill="#f8edd4" />
      <path d={`M${raisedPoint(0.45, 0.06, 5)} Q${raisedPoint(0.4, 0.31, 5.4)} ${raisedPoint(0.45, 0.58, 5)}`}
        fill="none" stroke="#a79a80" strokeWidth="0.7" />
      {[0.2, 0.31, 0.42].map((gy) => <g key={gy} stroke="#847f74" strokeWidth="0.5" opacity="0.47">
        <path d={`M${raisedPoint(0.12, gy, 3.1)} L${raisedPoint(0.36, gy, 4.4)}`} />
        <path d={`M${raisedPoint(0.54, gy, 4.4)} L${raisedPoint(0.77, gy, 3.1)}`} />
      </g>)}
      <path d={`M${raisedPoint(0.48, 0.18, 5)} L${raisedPoint(0.49, 0.64, 1.6)}
        L${raisedPoint(0.55, 0.6, 1.6)}`}
        stroke="#b87568" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <path d={`M${raisedPoint(0.77, 0.12, 4.2)} L${raisedPoint(0.83, 0.5, 4.2)}`}
        stroke="#665443" strokeWidth="2.1" strokeLinecap="round" />
      <path d={`M${raisedPoint(0.77, 0.12, 4.5)} L${raisedPoint(0.82, 0.44, 4.5)}`}
        stroke="#cea35e" strokeWidth="1.3" />
    </g>
  );
}
