import { SKEW, floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { TintedBox } from "./IsoItemPrimitives";

// Indoor and porch-scale winter accents live apart from the snow landscape
// pieces. They fill the cozy half of the season without turning the outdoor
// Winter yard into a catalog showcase.

export function WoodenSled() {
  const c = project(0.7, 0.36);
  const slats = [0.14, 0.42, 0.7, 0.98];
  return <g data-holiday-structure="wooden-sled">
    <ellipse cx={c.x} cy={c.y + 1} rx="31" ry="8" fill="#000" opacity="0.14" />
    <g fill="none" stroke="#59616d" strokeWidth="2.4" strokeLinecap="round">
      <path data-seasonal-part="sled-runner" d={`M${c.x - 29} ${c.y + 1} Q${c.x - 31} ${c.y + 8} ${c.x - 18} ${c.y + 8} L${c.x + 26} ${c.y - 4} Q${c.x + 32} ${c.y - 6} ${c.x + 31} ${c.y - 13}`} />
      <path data-seasonal-part="sled-runner" d={`M${c.x - 17} ${c.y + 7} Q${c.x - 17} ${c.y + 12} ${c.x - 5} ${c.y + 9} L${c.x + 30} ${c.y}`} />
    </g>
    <path d={`M${c.x - 20} ${c.y + 4} L${c.x - 17} ${c.y - 7} M${c.x + 18} ${c.y - 6} L${c.x + 18} ${c.y - 16}`}
      stroke="#765039" strokeWidth="2.4" strokeLinecap="round" />
    {slats.map((gx) => <g key={gx} data-seasonal-part="sled-slat">
      <TintedBox gx={gx} gy={0.08} dx={0.2} dy={0.56} h={9}
        fallback="#9b6446" dark={0.32} mid={0.18} />
    </g>)}
    <path d={`M${c.x + 29} ${c.y - 12} Q${c.x + 42} ${c.y - 24} ${c.x + 34} ${c.y - 34}`}
      fill="none" stroke="#b58b62" strokeWidth="1.5" strokeLinecap="round" />
  </g>;
}

export function GiftPile() {
  const redTop = project(0.28, 0.335);
  const greenTop = project(0.63, 0.33);
  const goldTop = project(0.375, 0.27);
  return <g data-holiday-structure="gift-pile">
    <g data-seasonal-part="wrapped-gift">
      <TintedBox gx={0.02} gy={0.12} dx={0.52} dy={0.43} h={18}
        fallback="#a8444f" dark={0.32} mid={0.18} />
      <polygon points={floorPatch(0.22, 0.12, 0.11, 0.43)} fill="#e2c078" transform="translate(0,-18)" />
      <g transform={`translate(${redTop.x},${redTop.y - 18})`} fill="none" stroke="#e2c078"
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M0 0 Q-7 -8 -10 -3 Q-7 2 0 0 Q7 -8 10 -3 Q7 2 0 0" />
      </g>
    </g>
    <g data-seasonal-part="wrapped-gift">
      <TintedBox gx={0.48} gy={0.16} dx={0.3} dy={0.34} h={26}
        fallback="#597960" dark={0.32} mid={0.18} />
      <polygon points={floorPatch(0.59, 0.16, 0.08, 0.34)} fill="#ead9b9" transform="translate(0,-26)" />
      <path d={`M${greenTop.x} ${greenTop.y - 26} L${greenTop.x} ${greenTop.y}`}
        stroke="#ead9b9" strokeWidth="1.8" opacity="0.9" />
    </g>
    <g transform="translate(1,-18)" data-seasonal-part="wrapped-gift">
      <TintedBox gx={0.2} gy={0.12} dx={0.35} dy={0.3} h={14}
        fallback="#d0a14b" dark={0.3} mid={0.17} />
      <polygon points={floorPatch(0.33, 0.12, 0.08, 0.3)} fill="#8f4d4f" transform="translate(0,-14)" />
      <g transform={`translate(${goldTop.x},${goldTop.y - 14})`} fill="none" stroke="#8f4d4f"
        strokeWidth="1.7" strokeLinecap="round">
        <path d="M0 0 Q-6 -7 -9 -2 Q-6 2 0 0 Q6 -7 9 -2 Q6 2 0 0" />
      </g>
    </g>
  </g>;
}

export function SnowGlobe() {
  const c = project(0.18, 0.18);
  return <g transform={`translate(${c.x},${c.y})`} data-holiday-structure="snow-globe">
    <ellipse cx="0" cy="0" rx="10" ry="3.2" fill="#000" opacity="0.14" />
    <path d="M-9 -4 Q0 1 9 -4 L7 1 Q0 5 -7 1 Z" style={tinted("#8b5d45")} />
    <path d="M-8 -5 Q0 -9 8 -5 L8 -2 Q0 2 -8 -2 Z" fill="#4f3b3a" opacity="0.42" />
    <g data-seasonal-part="glass-dome">
      <path d="M-8 -7 Q-8 -24 0 -27 Q8 -24 8 -7 Q0 -2 -8 -7 Z"
        fill="#dcecf1" opacity="0.48" stroke="#c6e0e8" strokeWidth="1.2" />
      <path d="M-5 -11 Q0 -7 5 -11" fill="none" stroke="#eef4f8" strokeWidth="2.2" opacity="0.9" />
      <path d="M-1 -10 L-1 -14 L-7 -14 L-1 -21 L-5 -21 L0 -26 L5 -21 L2 -21 L7 -14 L2 -14 L2 -10 Z"
        fill="#45634b" />
      <path d="M-5 -15 Q0 -12 5 -15 M-3 -21 Q0 -19 3 -21" fill="none"
        stroke="#eef4f8" strokeWidth="1.4" opacity="0.86" />
      {[-4, 2, 5].map((x, index) => <circle key={x} cx={x} cy={-18 + index * 3}
        r="1" fill="#fff" opacity="0.88" />)}
      <path d="M-5 -21 Q-3 -25 0 -26" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.54" />
    </g>
  </g>;
}

export function EvergreenGarland() {
  const sprigs = [3, 10, 17, 24, 31, 38, 45];
  return <g transform={`skewY(${SKEW})`} data-holiday-structure="evergreen-garland">
    <path d="M0 -80 Q24 -66 48 -80" fill="none" stroke="#4d3b32" strokeWidth="1.8" />
    {sprigs.map((x, index) => {
      const y = -78 + Math.sin((index / (sprigs.length - 1)) * Math.PI) * 10;
      const turn = index < 3 ? -18 : index > 3 ? 18 : 0;
      return <g key={x} transform={`translate(${x},${y}) rotate(${turn})`}
        data-seasonal-part="evergreen-sprig">
        <path d="M0 -6 L0 6 M0 -3 L-6 -7 M0 -1 L6 -5 M0 2 L-7 4 M0 3 L7 6"
          fill="none" stroke={index % 2 ? "#3f6a4f" : "#365d47"}
          strokeWidth="2.4" strokeLinecap="round" />
      </g>;
    })}
    {[[11, -70], [25, -66], [38, -71]].map(([x, y]) => <g key={x}>
      <circle cx={x - 1.6} cy={y} r="1.8" fill="#b64d48" />
      <circle cx={x + 1.5} cy={y + 0.7} r="1.8" fill="#c75a4d" />
    </g>)}
    <path d="M21 -67 Q24 -73 27 -67 Q24 -63 21 -67 Z M23 -65 L20 -57 M25 -65 L29 -58"
      fill="#b3474b" stroke="#8f3640" strokeWidth="0.8" strokeLinejoin="round" />
  </g>;
}

export function KnitStocking() {
  return <g transform={`skewY(${SKEW})`} data-holiday-structure="knit-stocking">
    <path data-seasonal-part="stocking-body"
      d="M10 -82 L30 -82 L29 -57 Q28 -48 37 -47 Q42 -46 42 -40 Q38 -34 29 -35 L17 -39 Q10 -42 10 -52 Z"
      style={tinted("#a8444f")} />
    <path d="M9 -83 Q20 -87 31 -82 L31 -76 Q20 -72 9 -77 Z" fill="#eee0c7" />
    <path d="M29 -57 Q28 -48 37 -47 Q34 -42 29 -41 L22 -45 Z" fill="#000" opacity="0.16" />
    <path d="M13 -69 L27 -69 M13 -63 L27 -63 M14 -57 L27 -57"
      data-seasonal-part="knit-rib" stroke="#fff" strokeWidth="1.2" opacity="0.22" />
    <path d="M14 -51 Q20 -55 26 -51 Q20 -47 14 -51 Z" fill="none" stroke="#eee0c7"
      strokeWidth="1.4" opacity="0.72" />
    <path d="M12 -84 Q7 -88 8 -92" fill="none" stroke="#eee0c7" strokeWidth="1.6" strokeLinecap="round" />
  </g>;
}

export function BlanketBasket() {
  const c = project(0.35, 0.28);
  const rolls = [
    { x: -8, y: -23, color: "#b55f54", turn: -9 },
    { x: 1, y: -27, color: "#d4b178", turn: 4 },
    { x: 9, y: -22, color: "#647d72", turn: 11 },
  ];
  return <g transform={`translate(${c.x},${c.y})`} data-holiday-structure="blanket-basket">
    <ellipse cx="0" cy="0" rx="15" ry="5" fill="#000" opacity="0.14" />
    <path d="M-15 -19 Q0 -13 15 -19 L11 -2 Q0 5 -11 -2 Z" style={tinted("#8f684c")} />
    <path d="M-13 -15 Q0 -9 13 -15 M-12 -10 Q0 -4 12 -10 M-11 -5 Q0 1 11 -5"
      fill="none" stroke="#ead3a2" strokeWidth="1" opacity="0.46" />
    <path d="M-15 -19 Q0 -12 15 -19" fill="none" stroke="#d5ad73" strokeWidth="2.4" />
    {rolls.map(({ x, y, color, turn }) => <g key={x} transform={`translate(${x},${y}) rotate(${turn})`}
      data-seasonal-part="blanket-roll">
      <path d="M-5 -8 Q0 -12 5 -8 L5 7 Q0 10 -5 7 Q-4 -1 -5 -8 Z" fill={color} />
      <path d="M-5 -8 Q0 -5 5 -8 M-3 -1 L3 -1 M-3 3 L3 3" fill="none"
        stroke="#fff" strokeWidth="1" opacity="0.22" strokeLinecap="round" />
      <path d="M-5 7 l-2 3 M-2 8 l-1 3 M2 8 l1 3 M5 7 l2 3" stroke={color}
        strokeWidth="1.2" strokeLinecap="round" />
    </g>)}
  </g>;
}
