import { SKEW, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { PaddedPanel, SoftBox, TintedBox } from "./IsoItemPrimitives";
import { bedDimensions, bedPillows } from '../lib/furnitureDimensions';

const TIMBER = "#946b50";
const BED_W = 2;
const BED_D = 2.8;
const BED_FRAME = 7;
const BED_MATTRESS = 8;

function BedDuvet({ dimensions }) {
  const { w, d } = bedDimensions({ item: 'bed', dimensions });
  const mapX = x => x <= .18 ? x : x >= 1.82 ? w - (2 - x) : .18 + (x - .18) * (w - .36) / 1.64;
  const mapD = y => 1.15 + (y - 1.15) * (d - 1.15) / (BED_D - 1.15);
  const at = (gx, gy) => project(mapX(gx), mapD(gy));
  const point = (gx, gy, lift) => {
    const p = at(gx, gy);
    return `${p.x},${p.y - lift}`;
  };
  const frontDrape = `M${point(0.05, 2.5, 11.8)} L${point(0.18, 2.65, 11.8)}
    L${point(1.82, 2.65, 11.8)} L${point(1.95, 2.52, 11.8)}
    L${point(1.95, 2.52, 2.5)} Q${point(1.86, 2.65, 1.6)} ${point(1.72, 2.65, 1.8)}
    Q${point(1.01, 2.65, 0.2)} ${point(0.31, 2.65, 1.8)}
    Q${point(0.05, 2.65, 2.2)} ${point(0.05, 2.5, 4)} Z`;
  const sideDrape = `M${point(1.95, 1.28, 11.8)} L${point(1.95, 2.52, 11.8)}
    L${point(1.95, 2.52, 2.5)} Q${point(1.95, 2.06, 0.8)} ${point(1.95, 1.48, 2)}
    Q${point(1.95, 1.15, 3.4)} ${point(1.95, 1.28, 5)} Z`;
  return <g data-furniture-part="duvet">
    {/* The hanging cloth has curved hems, not the flat lower faces of a
        twelve-pixel solid block. Its top stays at the established cover
        height so the occupied repaint still tucks the same sleeping rig. */}
    <g data-furniture-part="duvet-drape" style={tinted("#f2e9dd")}>
      <path d={frontDrape} /><path d={frontDrape} fill="#000" opacity=".12" />
      <path d={sideDrape} /><path d={sideDrape} fill="#000" opacity=".23" />
    </g>
    <g transform="translate(0,-10.5)" data-furniture-part="duvet-top">
      <SoftBox gx={0.05} gy={1.15} dx={w - 0.1} dy={d - 1.3}
        h={1.5} fallback="#f2e9dd" dark={0.23} mid={0.12} radius={0.13} />
    </g>
    <g transform={`translate(0,${-(BED_MATTRESS + 4)})`}>
      <SoftBox gx={0.07} gy={1.15} dx={w - 0.14} dy={0.14} h={0.65}
        fallback="#f2e9dd" dark={0.18} mid={0.08} radius={0.06} />
      {[0.36, 1.46].map((gx, i) => {
        const a = at(gx, 1.39);
        const b = at(gx + 0.13, 1.8 + i * 0.12);
        const c = at(gx + 0.04, 2.38);
        return <path key={gx} d={`M${a.x},${a.y} Q${b.x},${b.y} ${c.x},${c.y}`}
          fill="none" stroke="#000" strokeWidth="1.1" opacity="0.09" />;
      })}
      <path d={`M${at(0.13, 2.55).x},${at(0.13, 2.55).y}
        L${at(1.86, 2.55).x},${at(1.86, 2.55).y}`}
        fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.13" />
    </g>
  </g>;
}

/** The foreground cover reuses the very same drape as the unoccupied bed. */
export function BedTuckCover({ dimensions } = {}) {
  return <g data-bed-tuck-cover="true" transform={`translate(0,${-BED_FRAME})`}>
    <BedDuvet dimensions={dimensions} />
  </g>;
}

export function Bed({ colors, dimensions } = {}) {
  const { w, d } = bedDimensions({ item: 'bed', dimensions });
  const pillows = w === BED_W ? [.24, 1.16].map(gx => ({ gx, width: .6 })) :
    bedPillows(w).map(p => ({ gx: w / 2 + p.x - p.width * .41, width: p.width * .82 }));
  const panelWidth = 42.2 * w / BED_W;
  const head = project(0.12, 0.225);
  return <g data-furniture-family="bed">
    {/* A framed timber headboard belongs to the same warm furniture family
        as the chairs. The main colour remains the duvet, never the wood. */}
    <TintedBox gx={0} gy={0} dx={w} dy={0.22} h={32}
      fallback={colors?.frame || TIMBER} tint={false} dark={0.34} mid={0.18} />
    <g transform={`translate(${head.x},${head.y}) skewY(${SKEW})`} data-furniture-part="headboard-panel">
      <path d={`M0 -26 H${panelWidth} V-11 H0 Z`} fill="#000" opacity="0.12" />
      <path d={`M1 -25 H${panelWidth - 1} M1 -25 V-12`} fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.14" />
    </g>
    {[0, w - 0.12].map((gx) => <TintedBox key={gx} gx={gx} gy={0}
      dx={0.12} dy={0.24} h={33} fallback={colors?.frame || TIMBER} tint={false} dark={0.34} mid={0.18} />)}
    <TintedBox gx={0} gy={0.22} dx={w} dy={d - 0.22} h={BED_FRAME}
      fallback={colors?.frame || '#ab8362'} tint={false} dark={0.32} mid={0.18} />
    <g transform={`translate(0,${-BED_FRAME})`}>
      <SoftBox gx={0.13} gy={0.35} dx={w - 0.26} dy={d - 0.5} h={BED_MATTRESS}
        fallback={colors?.sheets || '#e9e0d4'} tint={false} dark={0.2} mid={0.1} radius={0.14} />
      <g transform={`translate(0,${-BED_MATTRESS})`} data-furniture-part="pillows">
        {pillows.map(({ gx, width }) => <SoftBox key={gx} gx={gx} gy={0.5} dx={width} dy={0.42}
          h={4.5} fallback={colors?.pillows || '#f7f2ea'} tint={false} dark={0.15} mid={0.07} radius={0.14} />)}
      </g>
      <BedDuvet dimensions={dimensions} />
    </g>
  </g>;
}

/** A joined upholstered hull, at the established 22px cushion height.
 * Short timber feet and a narrow rail restore the older compact silhouette;
 * rounded panels and cushions retain the later cloth construction. */
function Upholstered({ w, seats, back = false, depth = .85 }) {
  const D = depth, ARM = 0.2, BACK = 0.22;
  const inner = w - ARM * 2;
  const gap = 0.06;
  const cw = (inner - gap * (seats - 1)) / seats;
  const at = (i) => ARM + i * (cw + gap);
  // Real grid-space thickness joins the arms to the back. Screen-offset
  // upright shells left duplicate crowns and far arm ends above the rear
  // silhouette; a .22-tile back now contains both side-panel endpoints.
  const arm = (gx) => <g transform="translate(0,-7)" data-furniture-part="arm">
    <SoftBox gx={gx} gy={0.04} dx={ARM} dy={D - 0.08} h={20}
      radius={0.06} fallback="#d98a93" dark={0.26} mid={0.15} />
  </g>;
  const rest = <g transform="translate(0,-7)" data-furniture-part="backrest">
    <SoftBox gx={0} gy={back ? D - BACK : 0} dx={w} dy={BACK} h={35}
      radius={0.065} fallback="#d98a93" dark={0.26} mid={back ? 0.18 : 0.1} />
    {!back && Array.from({ length: seats }, (_, i) => {
      const p = project(at(i) + 0.06, BACK);
      return <g key={i} transform={`translate(${p.x},${p.y}) skewY(${SKEW})`}>
        <path d={`M0 -21 Q${(cw - 0.12) * 12} -19.6 ${(cw - 0.12) * 24} -21`}
          fill="none" stroke="#000" opacity="0.1" strokeWidth="0.8" />
      </g>;
    })}
  </g>;
  const gy = back ? 0.05 : BACK + 0.05;
  return <g data-furniture-family="upholstered">
    {[[0.08, 0.09], [w - 0.2, 0.09], [0.08, D - .21], [w - 0.2, D - .21]].map(([gx, gy]) =>
      <TintedBox key={`${gx}-${gy}`} gx={gx} gy={gy} dx={0.12} dy={0.12} h={4}
        fallback={TIMBER} tint={false} dark={0.36} mid={0.2} />)}
    <g transform="translate(0,-4)" data-furniture-part="timber-rail">
      <TintedBox gx={0.04} gy={0.05} dx={w - 0.08} dy={D - 0.1} h={3}
        fallback={TIMBER} tint={false} dark={0.34} mid={0.18} />
    </g>
    {!back && rest}
    {arm(0)}
    <g transform="translate(0,-7)" data-furniture-part="upholstered-base">
      <SoftBox gx={ARM - 0.02} gy={0.05} dx={inner + 0.04} dy={D - 0.1}
        h={8} radius={0.09} fallback="#d98a93" dark={0.3} mid={0.17} />
    </g>
    <g transform="translate(0,-15)" data-furniture-part="seat-pad">
      {Array.from({ length: seats }, (_, i) => <SoftBox key={i}
        gx={at(i) + 0.02} gy={gy} dx={cw - 0.04} dy={D - BACK - 0.12}
        h={7} radius={0.15} fallback="#e8a3a8" dark={0.2} mid={0.1} />)}
    </g>
    {!back && seats > 1 && (() => {
      const o = project(ARM + 0.06, BACK + 0.03);
      return <g transform={`translate(${o.x},${o.y - 7}) skewY(${SKEW})`}>
        <path d="M1 -14 Q-1 -20 2 -26 Q7 -28 12 -25 Q14 -19 12 -13 Q6 -11 1 -14 Z" fill="#e8d5b5" />
        <path d="M1 -14 Q6 -12 12 -13 L11 -15 Q5 -14 1 -16 Z" fill="#b8a17f" />
        <path d="M3 -24 Q6 -26 10 -23" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.3" />
      </g>;
    })()}
    {arm(w - ARM)}
    {back && rest}
    {seats > 1 && (() => {
      const o = project(w, back ? 0.18 : 0.35);
      return <g transform={`translate(${o.x},${o.y - 27}) skewY(${-SKEW})`}>
        <path d="M-7 0 Q-3 -1 0 0 L-0.5 13 Q-3.5 15 -7 12 Z" fill="#d4c4a3" />
        <path d="M-5 1 L-4.6 12 M-2 1 L-2.4 13" fill="none" stroke="#a68f70" strokeWidth="0.7" opacity="0.4" />
      </g>;
    })()}
  </g>;
}

export const Sofa = ({ back, dimensions }) => <Upholstered w={dimensions?.w || 2} depth={dimensions?.d || .85}
  seats={dimensions ? Math.round(dimensions.w) : 2} back={back} />;
export const Armchair = ({ back }) => <Upholstered w={1} seats={1} back={back} />;

export function Chair({ back = false }) {
  // 15.5 timber + 1.2 seat board + 2.3 cushion = the catalog's 19px seat.
  const SEAT = 15.5;
  const railY = back ? 0.55 : 0.06;
  const frame = <g data-furniture-part="backrest">
    {[0.07, 0.53].map((gx) => <TintedBox key={gx} gx={gx} gy={railY}
      dx={0.1} dy={0.09} h={41.8} fallback={TIMBER} tint={false} dark={0.34} mid={0.18} />)}
    <g transform={`translate(${project(0.07, railY + 0.09).x}, ${project(0.07, railY + 0.09).y - SEAT}) skewY(${SKEW})`}>
      <path d="M0 -26.5 Q6.7 -29 13.44 -26.5 L13.44 -13 Q6.7 -11.5 0 -13 Z" fill={TIMBER} />
      <path d="M1.5 -25 Q6.7 -26.8 11.94 -25 L11.94 -14.5 Q6.7 -13.3 1.5 -14.5 Z"
        style={tinted("#c28a65")} />
      <path d="M2 -24.5 Q6.7 -26.1 11.4 -24.5" fill="none" stroke="#fff"
        strokeWidth="0.75" opacity="0.16" />
    </g>
  </g>;
  return <g data-furniture-family="timber-chair">
    {!back && frame}
    {[[0.07, 0.09], [0.53, 0.09], [0.07, 0.53], [0.53, 0.53]].map(([gx, gy]) =>
      <TintedBox key={`${gx}-${gy}`} gx={gx} gy={gy} dx={0.1} dy={0.1} h={SEAT}
        fallback={TIMBER} tint={false} dark={0.36} mid={0.2} />)}
    <g transform={`translate(0,${-SEAT})`}>
      <TintedBox gx={0.03} gy={0.03} dx={0.64} dy={0.64} h={1.2}
        fallback={TIMBER} tint={false} dark={0.3} mid={0.16} />
      <g transform="translate(0,-1.2)" data-furniture-part="seat-pad">
        <SoftBox gx={0.04} gy={0.04} dx={0.62} dy={0.62} h={2.3}
          fallback="#c28a65" dark={0.2} mid={0.1} radius={0.12} />
      </g>
    </g>
    {back && frame}
  </g>;
}

export function DeskChair({ back = false }) {
  const c = project(0.4, 0.4);
  const SEAT = 19;
  const restGy = back ? 0.57 : 0.1;
  return <g data-furniture-family="desk-chair">
    <g transform={`translate(${c.x}, ${c.y})`}>
      {[0, 72, 144, 216, 288].map((deg) => {
        const r = deg * Math.PI / 180;
        return <g key={deg}>
          <line x1="0" y1="-2" x2={Math.cos(r) * 13} y2={-2 + Math.sin(r) * 6.5}
            stroke="#4d4355" strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="-2.6" x2={Math.cos(r) * 13} y2={-2.6 + Math.sin(r) * 6.5}
            stroke="#a89b98" strokeWidth="1" strokeLinecap="round" />
          <ellipse cx={Math.cos(r) * 13} cy={-0.8 + Math.sin(r) * 6.5}
            rx="2.5" ry="1.8" fill="#4d4355" stroke="#a89b98" strokeWidth="0.65" />
        </g>;
      })}
      <rect x="-1.6" y={-SEAT} width="3.2" height={SEAT - 2} fill="#3a3142" />
      <rect x="0" y={-SEAT + 1} width="1.1" height={SEAT - 4} fill="#a89b98" />
    </g>
    <g transform={`translate(0,${-SEAT})`}>
      <SoftBox gx={0.09} gy={0.1} dx={0.62} dy={0.58} h={1.2} radius={0.17}
        fallback="#4d4355" tint={false} dark={0.3} mid={0.16} />
      <g transform="translate(0,-1.2)" data-furniture-part="seat-pad">
        <SoftBox gx={0.1} gy={0.12} dx={0.6} dy={0.56} h={3.8} radius={0.18}
          fallback="#5b6b9b" dark={0.24} mid={0.1} />
      </g>
      <g transform="translate(0,-5)">
        <TintedBox gx={0.37} gy={restGy + 0.03} dx={0.06} dy={0.05} h={8}
          fallback="#4d4355" tint={false} dark={0.3} mid={0.16} />
        <g transform={`translate(${project(0.12, restGy + 0.11).x}, ${project(0.12, restGy + 0.11).y}) skewY(${SKEW})`} data-furniture-part="backrest">
          {/* The restrained corner radius and near-straight sides bring the
              shell back into the furniture's shared, quiet silhouette. */}
          <PaddedPanel width={13.44} height={23} bottom={1} radius={2.2}
            waist={0.25} thickness={1.5} fallback="#5b6b9b" mid={back ? 0.2 : 0.08} />
          {back && <path d="M5.4 -3 h2.6 v-8 h-2.6 Z" fill="#000" opacity="0.14" />}
        </g>
      </g>
    </g>
  </g>;
}
