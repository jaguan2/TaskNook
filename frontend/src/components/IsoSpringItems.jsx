import { SKEW, project } from "../lib/iso";
import { tinted } from "../lib/tint";

// The counterweight to winter: pastels, and everything is either growing or
// about to. Containers stay warm neutrals so the blossom keeps being the hero.

export function BlossomTree() {
  // Same construction as the maple, in blossom: deep rose through to near-white
  // at the crown, with a few petals below the mass so it reads as dropping
  // rather than as a solid pink cloud.
  const c = project(0.75, 0.75);
  return (
    <g>
      <path
        d={`M${c.x - 5} ${c.y} L${c.x - 3} ${c.y - 42} L${c.x + 3} ${c.y - 42} L${c.x + 5} ${c.y} Z`}
        fill="#7a5a4a"
      />
      <g className="room-sway">
        <ellipse cx={c.x} cy={c.y - 54} rx="32" ry="20" style={tinted("#d98aa8")} />
        <ellipse cx={c.x} cy={c.y - 54} rx="32" ry="20" fill="#000" opacity="0.12" />
        <ellipse cx={c.x - 7} cy={c.y - 70} rx="25" ry="16" style={tinted("#eaa7c0")} />
        <ellipse cx={c.x + 8} cy={c.y - 83} rx="16" ry="11" style={tinted("#f7cddd")} />
        <ellipse cx={c.x + 10} cy={c.y - 85} rx="8" ry="5" fill="#fff" opacity="0.55" />
      </g>
      {/* petals on the way down, OUTSIDE the swaying canopy so they read loose */}
      {[
        [-18, -30],
        [12, -24],
        [-4, -16],
      ].map(([dx, dy]) => (
        <ellipse key={dx} cx={c.x + dx} cy={c.y + dy} rx="2.2" ry="1.2" fill="#f7cddd" opacity="0.75" />
      ))}
    </g>
  );
}

export function Tulips() {
  // Cup-shaped heads on straight stems in a terracotta pot. The cup IS the read:
  // three notches at the top, oversized per rule 5.
  const c = project(0.3, 0.3);
  const stem = (x, h, fill) => (
    <g key={x}>
      <path
        d={`M${x} -6 q${x * 0.14} ${-h * 0.55} 0 ${-h}`}
        fill="none"
        stroke="#4f7d52"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d={`M${x - 3.2} ${-6 - h} q0 -4.6 3.2 -5.4 q3.2 0.8 3.2 5.4 q-1.6 1.8 -3.2 0.4 q-1.6 1.4 -3.2 -0.4 z`}
        fill={fill}
      />
      <path d={`M${x} ${-11.4 - h} q3.2 0.8 3.2 5.4 q-1.6 1.8 -3.2 0.4 z`} fill="#000" opacity="0.16" />
    </g>
  );
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="0" cy="-1" rx="9" ry="4" fill="#000" opacity="0.18" />
      {stem(-4.4, 11, "#e0607f")}
      {stem(4.2, 14, "#f0a2b8")}
      {stem(0, 18, "#e8546f")}
      {/* two leaves, wide and low, so the pot isn't a bare cylinder */}
      <path d="M-2 -7 q-8 -3 -10 -10 q8 2 10 10 z" fill="#4f7d52" />
      <path d="M2 -7 q8 -2 10 -8 q-8 1 -10 8 z" fill="#5d8f5f" />
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
      <ellipse cx="0" cy="-2" rx="9" ry="3.8" style={tinted("#9d9aa8")} />
      <path d="M-3.6 -4 l1 -14 l5.2 0 l1 14 q-3.6 1.6 -7.2 0 z" style={tinted("#b0adba")} />
      <path d="M0 -4 l0 -18 l2.6 0 l1 14 q-1.8 1.2 -3.6 0.8 z" fill="#000" opacity="0.2" />
      <path d="M-11 -18 q11 -4 22 0 l-2.6 5 q-8.4 3 -16.8 0 z" style={tinted("#b0adba")} />
      <ellipse cx="0" cy="-18" rx="11" ry="4.4" style={tinted("#c2bfca")} />
      <ellipse className="room-breathe" cx="0" cy="-18" rx="8.4" ry="3.2" fill="#7fc4d8" opacity="0.75" />
      <ellipse className="pond-ripple" cx="1.4" cy="-18.4" rx="3.4" ry="1.3" fill="#fff" opacity="0.4" />
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

