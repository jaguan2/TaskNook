// Small objects share the same ceramic, paper and timber treatment as the
// furniture. Their origin is the receiving surface, not the centre of the art.
const tint = fallback => ({ fill: `var(--tint, ${fallback})` });

export function DeskPlant() {
  return <g>
    <path d="M0 -19 V-59 M0 -34 L-13 -48 M0 -45 L13 -59" stroke="#587861" strokeWidth="2.5" fill="none" />
    <path d="M0 -50 Q-24 -75 -17 -48 Q-13 -36 0 -40 M1 -56 Q25 -78 19 -55 Q14 -43 1 -46 M-1 -29 Q-26 -48 -20 -28 Q-14 -19 -1 -24 M1 -34 Q23 -52 20 -33 Q14 -23 1 -27" fill="#789b7c" />
    <path d="M-2 -59 Q-11 -80 0 -74 Q9 -66 -2 -59" fill="#a1b792" />
    <path d="M-18 -21 H18 L14 -3 Q0 3 -14 -3Z" style={tint('#bd826a')} />
    <path d="M5 -20 H18 L14 -3 Q9 0 5 0Z" fill="#5c3b41" opacity=".17" />
    <ellipse cy="-21" rx="18" ry="5" style={tint('#bd826a')} />
    <ellipse cy="-21" rx="14" ry="3" fill="#514136" />
    <path d="M0 -21 v-8" stroke="#587861" strokeWidth="2.5" />
    <path d="M-14 -16 Q0 -12 14 -16" stroke="#f2d3b3" fill="none" opacity=".35" />
  </g>;
}

export function Cactus() {
  return <g>
    <path d="M-3 -12 V-30 Q-3 -38 3 -35 Q6 -34 5 -29 V-13 M-3 -21 Q-11 -21 -10 -29 M5 -25 Q12 -25 11 -32" fill="none" stroke="#7f9f82" strokeWidth="6" strokeLinecap="round" />
    <path d="M1 -30 V-17" stroke="#c2caaa" opacity=".45" fill="none" />
    <path d="M-11 -12 H11 L8 0 H-8Z" style={tint('#bf8c8e')} />
    <ellipse cy="-12" rx="11" ry="3" fill="#d0b397" />
    <ellipse cy="-12" rx="8" ry="1.8" fill="#68513f" />
    <path d="M1 -12 v-5" stroke="#7f9f82" strokeWidth="4" />
    <path d="M-7 -7 H7" stroke="#f1d2b8" opacity=".35" />
  </g>;
}

export function HangPlant() {
  return <g data-cottage-decor="hanging-planter">
    <circle cy="-30" r="2.3" fill="#b7a07f" stroke="#755951" />
    <path d="M0 -28 L-14 -3 M0 -28 L14 -3 M0 -28 V-2" fill="none" stroke="#c6ae88" strokeWidth="1.3" />
    <path d="M-15 -3 H15 L11 11 Q0 16 -11 11Z" style={tint('#b78169')} />
    <ellipse cy="-3" rx="15" ry="4" fill="#d0ad88" />
    <ellipse cy="-3" rx="11.5" ry="2.5" fill="#564737" />
    <path d="M-7 -4 Q-18 13 -13 34 M0 -3 Q9 14 3 38 M8 -4 Q23 9 15 28" fill="none" stroke="#6b9475" strokeWidth="2" />
    {[[-13, 10, -1], [4, 14, 1], [17, 9, 1], [-14, 23, 1], [5, 29, -1], [16, 22, -1]].map(([x,y,d], i) =>
      <path key={i} d={`M${x} ${y} q${d * 12} -9 ${d * 10} 0 q${-d * 4} 7 ${-d * 10} 0Z`} fill={i % 2 ? '#8da886' : '#739776'} />)}
  </g>;
}

export function Monstera() {
  return <g data-cottage-decor="monstera">
    <path d="M0 -20 Q-7 -51 -24 -66 M1 -22 Q11 -58 20 -77 M0 -22 V-88" fill="none" stroke="#66866c" strokeWidth="2.5" />
    <path d="M-7 -45 Q-35 -43 -34 -66 Q-32 -80 -17 -69 Q-11 -84 -7 -69 Q0 -53 -7 -45Z" fill="#799b7b" />
    <path d="M7 -52 Q0 -75 16 -89 Q28 -96 29 -81 Q41 -83 34 -69 Q25 -51 7 -52Z" fill="#91ab88" />
    <path d="M-1 -65 Q-21 -83 -10 -94 Q1 -104 5 -91 Q20 -101 18 -85 Q14 -70 -1 -65Z" fill="#a6b794" />
    <path d="M-8 -48 L-23 -67 M8 -55 L23 -80 M0 -69 L1 -90" stroke="#527861" strokeWidth="1.2" fill="none" />
    <path d="M-27 -62 l8 3 M-25 -72 l7 7 M25 -66 l-8 2 M29 -75 l-8 6" stroke="#b6bc97" strokeWidth="2.3" opacity=".5" />
    <path d="M-23 -23 H23 L18 -3 Q0 4 -18 -3Z" style={tint('#b98469')} />
    <path d="M5 -22 H23 L18 -3 Q10 1 5 1Z" fill="#604243" opacity=".16" />
    <ellipse cy="-23" rx="23" ry="6" style={tint('#b98469')} />
    <ellipse cy="-23" rx="18" ry="3.8" fill="#544438" />
    <path d="M0 -23 v-9" stroke="#66866c" strokeWidth="2.5" />
    <path d="M-17 -16 Q0 -10 17 -16" stroke="#efd1ac" fill="none" opacity=".26" />
  </g>;
}

export function Books() {
  return <g>{[{ x: -28, y: -12, w: 58, c: '#859b86' }, { x: -25, y: -24, w: 55, c: '#bc8c92' }, { x: -30, y: -37, w: 57 }].map((b, i) => <g key={i}>
    <path d={`M${b.x} ${b.y} h${b.w} v11 h-${b.w}Z`} style={tint(b.c || '#9b8bd6')} />
    <path d={`M${b.x + 6} ${b.y + 2} h${b.w - 8} v7 h-${b.w - 8}Z`} fill="#e2d4b8" />
    <path d={`M${b.x + 7} ${b.y + 5} h${b.w - 10}`} stroke="#a99b87" strokeWidth=".7" opacity=".6" />
    <path d={`M${b.x} ${b.y} l3 -2 h${b.w - 2} l-1 2Z`} fill={b.c || '#9b8bd6'} />
    <path d={`M${b.x} ${b.y} h${b.w}`} stroke="#f7e6ce" opacity=".3" />
  </g>)}</g>;
}

export function Mug({ time }) {
  return <g>
    <path d="M13 -19 C29 -24 27 -5 14 -6" fill="none" stroke="var(--tint, #bc8b8d)" strokeWidth="4" />
    <path d="M-14 -22 H14 V-6 Q14 1 0 1 Q-14 1 -14 -6Z" style={tint('#bc8b8d')} />
    <path d="M6 -20 H14 V-6 Q13 -2 6 0Z" fill="#583b46" opacity=".16" />
    <ellipse cy="-22" rx="14" ry="4" fill="#e9d4bd" />
    <ellipse cy="-22" rx="10.5" ry="2.5" fill="#6c4c3e" />
    <path d="M-9 -16 V-6" stroke="#ffe9d0" strokeWidth="2" opacity=".3" strokeLinecap="round" />
    <g className={time?.static ? undefined : 'steam-wisp'}>
      <path d="M-5 -29 q-4 -6 0 -12 M3 -28 q-4 -5 0 -10" stroke="#e8d9cc" strokeWidth="1.2" fill="none" opacity=".45" />
    </g>
  </g>;
}

export function PencilCup() {
  return <g>
    <path d="M-13 -25 H13 L11 -2 Q0 2 -11 -2Z" style={tint('#bc8b8d')} />
    <ellipse cy="-25" rx="13" ry="4" fill="#57464b" />
    <path d="M-6 -23 L-10 -51 M0 -22 L3 -56 M6 -23 L12 -48" stroke="#d8b071" strokeWidth="3" strokeLinecap="round" />
    <path d="M-10 -51 l-.5 -4 M3 -56 l.4 -4 M12 -48 l1 -4" stroke="#6b5b5b" strokeWidth="1.5" />
    <path d="M-12 -23 V-3 Q0 2 12 -3 V-23 Q0 -18 -12 -23Z" style={tint('#bc8b8d')} />
    <path d="M-8 -16 V-4 M-3 -15 V-3 M3 -15 V-3 M8 -16 V-4" stroke="#f1d6bd" opacity=".23" />
  </g>;
}

export function Frame() {
  return <g data-cottage-decor="landscape-print">
    <rect x="-21" y="-28" width="47" height="63" rx="2" fill="#201923" opacity=".16" />
    <rect x="-24" y="-32" width="48" height="64" rx="2" style={tint('#c8aa8d')} />
    <path d="M-21 29 V-29 H21" fill="none" stroke="#fff0d7" opacity=".45" />
    <path d="M-19 -27 H19 V27 H-19Z" fill="#e7d8bd" />
    <path d="M-15 -23 H15 V23 H-15Z" fill="#a4b4b1" />
    <circle cx="5" cy="-12" r="5" fill="#f0d6a6" />
    <path d="M-15 3 Q-6 -10 3 0 Q8 -4 15 -1 V23 H-15Z" fill="#80998b" />
    <path d="M-15 14 Q-4 0 6 13 Q11 8 15 11 V23 H-15Z" fill="#597b72" />
    <path d="M-10 21 Q-3 15 4 19 Q8 21 12 17" fill="none" stroke="#d8d1b2" strokeWidth="1.5" />
  </g>;
}

export function Polaroids() {
  return <g>
    <path d="M-26 -16 Q0 -11 26 -16" stroke="#8b6c58" fill="none" />
    {[-15, 6].map((x, i) => <g key={x} transform={`translate(${x},0) rotate(${i ? 5 : -6})`}>
      <rect x="-9" y="-12" width="18" height="26" rx="1" fill="#eadfcb" />
      <rect x="-6" y="-9" width="12" height="15" fill={i ? '#a9b5b6' : '#bca3a0'} />
      <circle cx="2" cy="-5" r="2" fill="#ecd2a2" />
      <path d="M-6 2 L-2 -5 L2 1 L6 -1 V6 H-6Z" fill={i ? '#729086' : '#806e85'} />
      <rect x="-2" y="-16" width="4" height="6" rx="1" fill="#c5a377" />
    </g>)}
  </g>;
}

export function Shelf() {
  return <g data-cottage-decor="stocked-shelf">
    <path d="M-26 2 v14 l10 -12 M25 2 v14 L15 4" fill="none" stroke="#755a50" strokeWidth="3" />
    <path d="M-35 -3 H32 L36 0 H-36Z" fill="#d3ae86" />
    <path d="M-36 0 H36 V6 H-36Z" style={tint('#ad8465')} />
    {[-28, -19, -10].map((x, i) => <g key={x}>
      <rect x={x} y={-23 + i * 2} width="7" height={20 - i * 2} rx="1" fill={['#839c88', '#bc8c92', '#a796b0'][i]} />
      <path d={`M${x + 1} -8 h5`} stroke="#ead9bd" opacity=".6" />
    </g>)}
    <path d="M11 -13 h17 l-2 10 H13Z" fill="#bb8b6c" />
    <ellipse cx="19.5" cy="-13" rx="8.5" ry="2.5" fill="#544236" />
    <path d="M19 -13 v-12 M19 -18 q-12 -12 -11 -3 q4 7 11 3 M20 -23 q13 -10 9 -1 q-3 4 -9 1 M26 -14 Q37 -9 31 13" stroke="#6c8c70" strokeWidth="1.5" fill="#8eaa87" />
    <path d="M32 3 q8 -4 6 3 q-4 3 -6 -3 M31 12 q-7 -2 -5 4 q4 2 5 -4" fill="#789a79" />
  </g>;
}
