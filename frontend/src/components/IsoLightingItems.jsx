import { SKEW } from "../lib/iso";

/**
 * A loose strand of warm fairy lights for everyday rooms. The broad halos are
 * deliberately faint: the catalog supplies only a dim ambient light pass,
 * while these shapes make each bulb remain readable against the wall.
 */
export function FairyLights({ lit = true }) {
  const bulbs = [
    [4, -82],
    [13, -76],
    [23, -72],
    [33, -74],
    [43, -80],
    [53, -76],
    [63, -82],
  ];

  return (
    <g transform={`skewY(${SKEW})`} data-fairy-lights="true" data-lit={lit ? "true" : "false"}>
      <path
        d="M0 -84 Q17 -68 34 -76 Q51 -68 68 -84"
        fill="none"
        stroke="#554c48"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {bulbs.map(([x, y], index) => (
        <g key={x}>
          <path d={`M${x} ${y - 3} v3`} stroke="#554c48" strokeWidth="1" />
          <circle
            className={lit ? "room-breathe" : undefined}
            cx={x}
            cy={y + 1.5}
            r="5"
            fill="#ffd995"
            opacity={lit ? 0.12 : 0}
            style={{ animationDelay: `${index * -0.31}s` }}
          />
          <circle cx={x} cy={y + 1.5} r="1.75" fill={lit ? "#ffe4a8" : "#625b58"} />
          <circle cx={x - 0.5} cy={y + 1} r="0.55" fill={lit ? "#fff7d8" : "#8a817d"} />
        </g>
      ))}
    </g>
  );
}
