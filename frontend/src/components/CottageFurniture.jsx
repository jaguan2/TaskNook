// Front-view furniture with visible receiving surfaces, joined frames and
// shallow top planes. All origins remain the floor contact at (0,0).
const fabric = fallback => ({ fill: `var(--tint, ${fallback})` });
const wood = '#b58b68', edge = '#765647', lightWood = '#d0aa83';

function Upholstered({ wide = false }) {
  const w = wide ? 120 : 40, inner = w - 15, tone = wide ? '#7faf8f' : '#9b8bd6';
  return <g data-cottage-furniture={wide ? 'sofa' : 'armchair'}>
    <ellipse cy="1" rx={w + 14} ry="5" fill="#201923" opacity=".2" />
    <path d={`M${-w + 12} -19 l-4 19 M${w - 12} -19 l4 19`} stroke={edge} strokeWidth="6" />
    <path d={`M${-w} -31 V-87 Q${-w} -109 ${-w + 22} -109 H${w - 22} Q${w} -109 ${w} -87 V-31Z`} style={fabric(tone)} />
    <path d={`M${-w} -31 V-87 Q${-w} -109 ${-w + 22} -109 H${w - 22} Q${w} -109 ${w} -87 V-31Z`} fill="#24363a" opacity=".13" />
    {(wide ? [-1, 0, 1] : [0]).map((i) => {
      const left = wide ? i * 69 - 32 : -31, width = wide ? 64 : 62;
      return <g key={i}>
        <path d={`M${left} -89 Q${left} -101 ${left + 12} -101 H${left + width - 12} Q${left + width} -101 ${left + width} -89 L${left + width - 2} -48 Q${left + width / 2} -42 ${left + 2} -48Z`} style={fabric(tone)} />
        <path d={`M${left + 5} -88 Q${left + 7} -96 ${left + 16} -96 H${left + width - 12}`} stroke="#fff2df" strokeWidth="2" opacity=".18" fill="none" />
      </g>;
    })}
    <path d={`M${-w} -28 H${w} V-19 Q0 -14 ${-w} -19Z`} fill={edge} />
    <path d={`M${-inner} -49 Q0 -55 ${inner} -49 L${w} -32 Q0 -24 ${-w} -32Z`} style={fabric(tone)} />
    <path d={`M${-inner} -48 Q0 -53 ${inner} -48 L${w} -34 Q0 -27 ${-w} -34Z`} fill="#fff2df" opacity=".14" />
    <path d={`M${-w} -34 Q0 -27 ${w} -34 V-26 Q0 -19 ${-w} -26Z`} style={fabric(tone)} />
    {(wide ? [-37, 37] : []).map(x => <path key={x} d={`M${x} -49 l${x < 0 ? -2 : 2} 21`} stroke="#24363a" opacity=".2" />)}
    {[-1, 1].map(side => <g key={side}>
      <path d={`M${side * (w - 13)} -57 Q${side * (w + 8)} -65 ${side * (w + 14)} -50 L${side * (w + 14)} -30 Q${side * (w + 14)} -20 ${side * (w - 6)} -24Z`} style={fabric(tone)} />
      <path d={`M${side * (w - 10)} -55 Q${side * (w + 5)} -60 ${side * (w + 10)} -49`} fill="none" stroke="#fff2df" strokeWidth="2.5" opacity=".2" />
    </g>)}
    {/* A folded throw crosses the receiving arm rather than floating above it. */}
    <path d={`M${w - 40} -63 Q${w - 20} -70 ${w - 8} -57 L${w - 12} -24 Q${w - 26} -20 ${w - 43} -29Z`} fill="#e8d1ad" />
    <path d={`M${w - 36} -52 l20 3 M${w - 37} -42 l21 3 M${w - 38} -32 l21 3`} fill="none" stroke="#ae8c70" strokeWidth="1.8" opacity=".6" />
  </g>;
}
export function Sofa() { return <Upholstered wide />; }
export function Armchair() { return <g transform="scale(1.22,1.05)"><Upholstered /></g>; }

export function StudyChair() {
  return <g data-cottage-furniture="study-chair">
    <ellipse cy="1" rx="57" ry="5" fill="#201923" opacity=".19" />
    <path d="M-37 -54 L-47 0 M37 -54 L47 0 M-25 -52 L-20 -7 M25 -52 L20 -7" fill="none" stroke={edge} strokeWidth="6" strokeLinecap="round" />
    <path d="M-39 -18 H39" stroke={edge} strokeWidth="4" />
    <path d="M-46 -58 Q0 -72 46 -58 L52 -44 Q0 -33 -52 -44Z" fill={wood} />
    <path d="M-44 -59 Q0 -72 44 -59 L48 -49 Q0 -40 -48 -49Z" style={fabric('#9b8bd6')} />
    <path d="M-37 -54 L-40 -96 M37 -54 L40 -96" stroke={edge} strokeWidth="6" />
    <path d="M-44 -82 L-49 -105 Q-50 -124 -29 -124 H29 Q50 -124 49 -105 L44 -82 Q0 -69 -44 -82Z" style={fabric('#9b8bd6')} />
    <path d="M-44 -82 Q0 -70 44 -82 L43 -77 Q0 -65 -43 -77Z" fill="#392d42" opacity=".19" />
    <path d="M-39 -106 Q-38 -117 -26 -117 H26 Q38 -117 39 -106" stroke="#fff2df" strokeWidth="2" fill="none" opacity=".22" />
    <path d="M-43 -56 Q0 -45 43 -56" stroke="#fff2df" fill="none" opacity=".16" />
  </g>;
}

export function Bookshelf() {
  return <g data-cottage-furniture="bookcase">
    <ellipse cy="1" rx="43" ry="4" fill="#201923" opacity=".17" />
    <path d="M-40 -100 L-34 -105 H42 V-5 L36 0 H-40Z" style={fabric(wood)} />
    <path d="M36 -99 L42 -105 V-5 L36 0Z" fill="#33232b" opacity=".24" />
    <path d="M-34 -96 H31 V-8 H-34Z" fill="#735443" />
    <path d="M-34 -96 H31 V-88 H-34Z M-34 -52 H31 V-45 H-34Z" fill="#30232b" opacity=".22" />
    {[-52, -7].map(y => <g key={y}>
      <path d={`M-35 ${y - 3} H32 L36 ${y + 1} H-39Z`} fill={lightWood} />
      <path d={`M-39 ${y + 1} H36 v5 H-39Z`} style={fabric(wood)} />
    </g>)}
    {[-29, -19, -9, 1].map((x, i) => <g key={x}>
      <rect x={x} y={-84 + i % 2 * 5} width="8" height={29 - i % 2 * 5} rx="1" fill={['#80978b', '#ba8790', '#bda16e', '#8b839c'][i]} />
      <path d={`M${x + 2} -76 h4 M${x + 2} -61 h4`} stroke="#eadcc5" opacity=".55" />
    </g>)}
    <path d="M14 -62 h15 v7 H14Z M16 -69 h13 v7 H16Z" fill="#ded0b5" />
    {[-29, -19, -9].map((x, i) => <g key={x}>
      <rect x={x} y={-38 + i * 2} width="8" height={28 - i * 2} rx="1" fill={['#a89372', '#829888', '#a67c87'][i]} />
      <path d={`M${x + 2} -18 h4`} stroke="#e8dbc6" opacity=".6" />
    </g>)}
    <path d="M9 -24 h20 l-3 13 H12Z" fill="#ba8c70" />
    <ellipse cx="19" cy="-24" rx="10" ry="3" fill="#493b35" />
    <path d="M19 -24 v-13 M19 -29 q-14 -10 -11 -2 q4 6 11 2 M19 -32 q13 -13 11 -3 q-4 5 -11 3" stroke="#6e9577" fill="#88a78a" strokeWidth="1.5" />
    <path d="M-40 -100 H36 V0 M-35 -96 V-7" stroke="#efd2ab" fill="none" opacity=".28" />
  </g>;
}

export function Rug() {
  return <g data-cottage-furniture="woven-rug">
    <ellipse cy="2" rx="136" ry="40" fill="#271e29" opacity=".12" />
    <ellipse rx="134" ry="38" style={fabric('#b9959c')} />
    <ellipse rx="123" ry="32" fill="none" stroke="#ead9be" strokeWidth="2.5" opacity=".6" />
    <ellipse rx="112" ry="27" fill="none" stroke="#644d59" strokeWidth="1.5" opacity=".24" />
    <path d="M-94 -8 Q0 -26 94 -8 M-99 0 Q0 -17 99 0 M-94 8 Q0 -9 94 8" fill="none" stroke="#ead9be" opacity=".18" />
    <path d="M-134 0 h-5 M134 0 h5 M-131 -8 l-5 -1 M131 -8 l5 -1 M-131 8 l-5 1 M131 8 l5 1" stroke="#ccbda4" strokeWidth="2" />
  </g>;
}
export function RugStripe() {
  return <g data-cottage-furniture="striped-rug">
    <path d="M-91 -30 H91 L122 28 H-122Z" style={fabric('#829c98')} />
    <path d="M-96 -20 H96 M-107 2 H107 M-116 20 H116" stroke="#ead9be" strokeWidth="4" opacity=".5" />
    <path d="M-91 -30 H91 L122 28 H-122Z" fill="none" stroke="#433640" opacity=".22" />
    {Array.from({ length: 17 }, (_, i) => <path key={i} d={`M${-116 + i * 14} 29 v5`} stroke="#d7c7b1" strokeWidth="2" />)}
  </g>;
}
