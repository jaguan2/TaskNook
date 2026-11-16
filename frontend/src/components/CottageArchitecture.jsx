import { COTTAGE_FRAME } from '../lib/room';

// Shallow perspective belongs to the illustration, not to placement math.
// The desk/floor anchors stay at y=400 and existing saved coordinates survive.
export default function CottageArchitecture({ uid, period }) {
  const light = period === 'day' ? .22 : period === 'sunset' ? .15 : .055;
  const rows = [398, 418, 447, 484, 530, 585, 648];
  const edges = Array.from({ length: 18 }, (_, i) => -480 + i * 112);
  const backX = x => 460 + (x - 460) * (101 / 353);
  return <g data-cottage-architecture="shallow-room" pointerEvents="none">
    <defs>
      <linearGradient id={`${uid}-plaster`} x2="0" y2="1">
        <stop style={{ stopColor: 'color-mix(in srgb, rgb(var(--color-plum)) 48%, #cbb1a1)' }} />
        <stop offset="1" style={{ stopColor: 'color-mix(in srgb, rgb(var(--color-wine)) 60%, #ad8d7d)' }} />
      </linearGradient>
      <linearGradient id={`${uid}-timber-floor`} x2="0" y2="1">
        <stop stopColor="#8d6e5c" />
        <stop offset="1" style={{ stopColor: 'color-mix(in srgb, rgb(var(--color-night)) 45%, #8f705c)' }} />
      </linearGradient>
      <linearGradient id={`${uid}-skirting-shadow`} x2="0" y2="1">
        <stop stopColor="#201820" stopOpacity=".4" />
        <stop offset="1" stopColor="#201820" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect x="-640" y="-960" width="2560" height="1608" fill={`url(#${uid}-plaster)`} />
    {/* Short returns and layered mouldings give the back wall a readable edge. */}
    <path d="M-128 -60 L-84 0 V396 L-128 422Z M984 0 L1024 -60 V422 L984 396Z" fill="#281f2c" opacity=".2" />
    <path d="M-84 0 V396 M984 0 V396" stroke="#ead5bd" strokeOpacity=".12" strokeWidth="3" />
    <rect x="-640" y="318" width="2560" height="78" fill="#382a32" opacity=".2" />
    <path d="M-640 318 H1920 M-640 323 H1920" stroke="#ead5bd" strokeWidth="2" opacity=".18" />
    {Array.from({ length: 15 }, (_, i) => <g key={i}>
      <path d={`M${-118 + i * 80} 334 h64 v48 h-64Z`} fill="none" stroke="#17151e" strokeWidth="2" opacity=".18" />
      <path d={`M${-117 + i * 80} 335 h62 v46`} fill="none" stroke="#ead5bd" opacity=".12" />
    </g>)}
    <rect x="-640" y="396" width="2560" height={COTTAGE_FRAME.h - 396} fill={`url(#${uid}-timber-floor)`} />
    <g data-cottage-floor="perspective-boards">
      {edges.slice(0, -1).map((x, i) => <path key={x}
        d={`M${backX(x)} 396 L${backX(x + 112)} 396 L${x + 112} 648 L${x} 648Z`}
        fill={i % 3 === 0 ? '#e6c29c' : '#392a2c'} opacity={i % 3 === 0 ? .065 : .045} />)}
      <path d={edges.map(x => `M${backX(x)} 396 L${x} 648`).join(' ')} fill="none" stroke="#38272b" strokeWidth="1.2" opacity=".32" />
      <path d={rows.slice(1).map((y, row) => edges.filter((_, i) => (i + row) % 3 === 0).map(x => {
        const t = (y - 295) / 353, left = 460 + (x - 460) * t, right = 460 + (x + 112 - 460) * t;
        return `M${left} ${y} H${right}`;
      }).join(' ')).join(' ')} fill="none" stroke="#38272b" strokeWidth="1.2" opacity=".25" />
    </g>
    <rect x="-640" y="393" width="2560" height="9" fill="#634c48" />
    <path d="M-640 393 H1920 M-640 396 H1920" stroke="#ddbea0" strokeWidth="1.2" opacity=".42" />
    <rect x="-640" y="402" width="2560" height="30" fill={`url(#${uid}-skirting-shadow)`} />
    {/* Window light lies on the floor plane, behind every movable object. */}
    <path data-cottage-window-light="" d="M102 402 H407 L610 548 L179 548Z" fill={period === 'night' ? '#b6c9df' : '#ffe0b1'} opacity={light} />
    <path d="M252 402 L362 548 M111 410 H418" stroke="#58434e" strokeWidth="5" opacity={light * .7} />
    <ellipse cx="320" cy="407" rx="283" ry="15" fill="#251c26" opacity=".22" />
  </g>;
}
