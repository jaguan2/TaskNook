import { SKEW, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { BroadleafTree } from "./IsoTreePrimitives";

// The counterweight to winter: pastels, and everything is either growing or
// about to. Containers stay warm neutrals so the blossom keeps being the hero.

export function BlossomTree() {
  const c = project(0.75, 0.75);
  const crown = [
    { dx: -29, dy: -70, width: 50, height: 35, color: "#c96f91", dark: true, tilt: -9, variant: 1 },
    { dx: 8, dy: -70, width: 56, height: 38, color: "#dc8eaa", tilt: 4, variant: 2 },
    { dx: 35, dy: -82, width: 42, height: 33, color: "#dc8eaa", dark: true, tilt: 12, variant: 0 },
    { dx: -17, dy: -99, width: 54, height: 38, color: "#e5a0b9", tilt: 8, variant: 2 },
    { dx: 18, dy: -104, width: 53, height: 37, color: "#efb8cd", tilt: -6, variant: 1 },
  ];
  const flowers = [[-31, -78], [-12, -96], [18, -96], [34, -78], [6, -115], [24, -107]];
  return (
    <>
      <BroadleafTree center={c} kind="blossom" trunkColor="#7a5a4a"
        rearColor="#c86f91" clusters={crown} shadowOpacity={0.18}
        canopyDetails={<>{flowers.map(([dx, dy]) => (
          <g key={`${dx}-${dy}`} transform={`translate(${c.x + dx},${c.y + dy})`}>
            <circle cx="-2" cy="0" r="2.4" fill="#f7d7e2" />
            <circle cx="2" cy="0" r="2.4" fill="#edabc3" />
            <circle cy="-2" r="2.2" fill="#f9e0e8" />
            <circle r="0.8" fill="#e4b45f" />
          </g>
        ))}</>} />
      {/* petals on the way down, OUTSIDE the swaying canopy so they read loose */}
      {[
        [-18, -30],
        [12, -24],
        [-4, -16],
      ].map(([dx, dy]) => (
        <ellipse key={dx} cx={c.x + dx} cy={c.y + dy} rx="2.2" ry="1.2" fill="#f7cddd" opacity="0.75" />
      ))}
    </>
  );
}

export function Tulips() {
  // Cup-shaped heads on straight stems in a terracotta pot. The cup IS the read:
  // three notches at the top, oversized per rule 5.
  const c = project(0.3, 0.3);
  const stem = (x, h, fill, lean = 0, tilt = 0) => (
    <g key={x}>
      <path
        d={`M${x} -6 Q${x + lean * 0.3} ${-6 - h * 0.55} ${x + lean} ${-6 - h}`}
        fill="none"
        stroke="#4f7d52"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g transform={`translate(${x + lean},${-6 - h}) rotate(${tilt})`}>
        <path d="M-3.6 0 Q-4 -5 0 -6.2 Q4 -5 3.6 0 Q1.8 2 0 0.5 Q-1.8 2 -3.6 0 Z" fill={fill} />
        <path d="M0 -6.2 Q4 -5 3.6 0 Q1.8 2 0 0.5 Z" fill="#000" opacity="0.15" />
        <path d="M-2.5 -1.2 Q-1.8 -4.4 0 -5.2" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.2" />
      </g>
    </g>
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="9" ry="4" fill="#000" opacity="0.18" />
      {stem(-4.4, 11, "#e0607f", -1.4, -9)}
      {stem(4.2, 14, "#f0a2b8", 1.2, 8)}
      {stem(0, 18, "#e8546f", -0.3, -2)}
      {/* Broad, curved leaves overlap the stems at unequal heights. */}
      <path d="M-2 -7 Q-10 -8 -12 -19 Q-5 -16 -2 -7 Z" fill="#4f7d52" />
      <path d="M1 -7 Q8 -10 11 -18 Q12 -10 2 -6 Z" fill="#5d8f5f" />
      <path d="M-0.5 -8 Q-6 -14 -4 -22 Q1 -16 1 -8 Z" fill="#6a9b64" />
      <path d="M-7.4 -2 l1.4 -7 l12 0 l1.4 7 q-7.4 3 -14.8 0 z" style={tinted("#b5673f")} />
      <path d="M0 -2 l0 -9 l6 0 l1.4 7 q-3.7 1.6 -7.4 2 z" fill="#000" opacity="0.2" />
      <path d="M-8 -9.4 q8 -3 16 0 l0 2 q-8 3 -16 0 z" style={tinted("#c67a4e")} />
    </g>
  );
}

export function WateringCan() {
  // Body, spout, handle — the spout carries the silhouette, so it is long and
  // rises ABOVE the rim rather than poking out the side.
  const c = project(0.25, 0.22);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="8" ry="3.4" fill="#000" opacity="0.18" />
      <path d="M-6 -2 l-0.6 -11 q6.6 -2.6 13.2 0 l-0.6 11 q-6 2.6 -12 0 z" style={tinted("#7f9bb0")} />
      <path d="M0 -2 l0 -13.4 q4 0.4 6.6 2.4 l-0.6 11 q-3 1.4 -6 0.6 z" fill="#000" opacity="0.22" />
      <ellipse cx="0" cy="-13" rx="6.6" ry="2.6" style={tinted("#93b0c4")} />
      <ellipse cx="0" cy="-13" rx="4.6" ry="1.6" fill="#2b2350" opacity="0.3" />
      {/* spout, from the low side up past the rim */}
      <path
        d="M-6 -8 q-7 -1 -8.4 -10"
        fill="none"
        style={{ stroke: "var(--tint, #7f9bb0)" }}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <ellipse cx="-14.4" cy="-18.4" rx="2.6" ry="1.4" style={tinted("#93b0c4")} />
      <path
        d="M-2.6 -14 q4 -7 9.6 -2.6"
        fill="none"
        style={{ stroke: "var(--tint, #7f9bb0)" }}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </g>
  );
}

export function BirdBath() {
  // A pedestal and a dish. The water is the only bright thing and it shimmers
  // like the pond does — `room-breathe` pulses opacity, which is right for water
  // and wrong for anything alive.
  const c = project(0.4, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="11" ry="4.6" fill="#000" opacity="0.2" />
      <ellipse cx="0" cy="-2.8" rx="9" ry="3.6" style={tinted("#9d9aa8")} />
      <ellipse cx="0" cy="-4.6" rx="6.5" ry="2.5" style={tinted("#b0adba")} />
      {/* Shaped pedestal: flared foot, narrow shaft and a small capital. */}
      <path d="M-5 -5 Q-3 -9 -2.2 -18 L2.2 -18 Q3 -9 5 -5 Q0 -2.5 -5 -5 Z"
        style={tinted("#aaa7b4")} />
      <path d="M0 -5 L0 -18 L2.2 -18 Q3 -9 5 -5 Q2.5 -3.5 0 -3.7 Z" fill="#000" opacity="0.2" />
      <ellipse cx="0" cy="-18.5" rx="5.3" ry="2.1" style={tinted("#bbb7c2")} />
      {/* Bowl underside and thick rolled rim. Water sits visibly below it. */}
      <path d="M-12 -22 Q0 -16 12 -22 L9 -16 Q0 -12 -9 -16 Z" style={tinted("#aaa7b4")} />
      <path d="M0 -16 Q8 -16 12 -22 L9 -16 Q5 -13 0 -13 Z" fill="#000" opacity="0.2" />
      <ellipse cx="0" cy="-22" rx="12" ry="5" style={tinted("#c2bfca")} />
      <ellipse cx="0" cy="-21.4" rx="9.4" ry="3.7" fill="#595b68" opacity="0.45" />
      <ellipse className="room-breathe" cx="0" cy="-21.8" rx="8.4" ry="3" fill="#7fc4d8" opacity="0.72" />
      <path d="M-10.4 -23 Q0 -27 10.4 -23" fill="none" stroke="#fff" strokeWidth="1.1" opacity="0.35" />
      <ellipse className="pond-ripple" cx="1.4" cy="-22" rx="3.4" ry="1.2" fill="#fff" opacity="0.38" />
    </g>
  );
}

export function SeedTray() {
  // Goes ON a table (`stacks`), so it is small and its read is the ROW: six
  // identical shoots in a shallow box. One shoot would be a weed.
  const c = project(0.35, 0.25);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-0.6" rx="10" ry="3.6" fill="#000" opacity="0.16" />
      <path d="M-9 -1.4 l0 -5 q9 -3 18 0 l0 5 q-9 3 -18 0 z" style={tinted("#8a6a4e")} />
      <path d="M0 -1.4 l0 -8 q5 0.6 9 2.6 l0 5 q-4.4 2 -9 2.4 z" fill="#000" opacity="0.22" />
      <ellipse cx="0" cy="-6.4" rx="9" ry="3" fill="#4a3628" />
      {[-6, -3.6, -1.2, 1.2, 3.6, 6].map((x, i) => (
        <path
          key={x}
          d={`M${x} -7 q${i % 2 ? 1.6 : -1.6} -3 0 -5.6`}
          fill="none"
          stroke="#5d8f5f"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ))}
      {[-6, -1.2, 3.6].map((x) => (
        <ellipse key={x} cx={x} cy={-12.4} rx="1.6" ry="0.9" fill="#79ab6b" />
      ))}
    </g>
  );
}

export function Bunting() {
  // Wall decor: up the wall in negative y, rightward in positive x (see Icicles —
  // both were first drawn downward from zero and ended up lying on the floor).
  //
  // The SAG is what makes it read as string rather than as a painted zigzag, so
  // the pennants hang from a curve instead of a straight run.
  const COLOURS = ["#f0a2b8", "#ffe9b0", "#a8d5c2", "#e8c7f0"];
  const RAIL = -98;
  const SPAN = 64;
  const SAG = 11;
  return (
    <g transform={`skewY(${SKEW})`}>
      <path
        d={`M0 ${RAIL} q${SPAN / 2} ${SAG * 1.6} ${SPAN} 0`}
        fill="none"
        stroke="#f7e9e2"
        strokeWidth="1"
        opacity="0.55"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const t = (i + 0.5) / 8;
        const x = t * SPAN;
        const y = RAIL + SAG * Math.sin(Math.PI * t); // level at the ends, lowest mid-run
        return (
          <g key={i}>
            <path d={`M${x - 3.2} ${y} L${x + 3.2} ${y} L${x} ${y + 8.5} Z`} fill={COLOURS[i % 4]} />
            <path d={`M${x} ${y} L${x + 3.2} ${y} L${x} ${y + 8.5} Z`} fill="#000" opacity="0.14" />
          </g>
        );
      })}
    </g>
  );
}

