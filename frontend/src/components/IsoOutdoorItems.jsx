import { floorPatch, project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { LeafCluster } from "./IsoItemPrimitives";
import { BroadleafTree, EvergreenCrown } from "./IsoTreePrimitives";

// Ground-planted, non-seasonal outdoor pieces. Their catalog identities and
// placement contracts stay in lib/isoRoom; this module owns only their art.

export function Tree() {
  const c = project(0.75, 0.75);
  const crown = [
    { dx: -29, dy: -71, width: 52, height: 36, color: "#32694f", dark: true, tilt: -8, variant: 1 },
    { dx: 8, dy: -70, width: 58, height: 39, color: "#397657", tilt: 4, variant: 2 },
    { dx: 36, dy: -84, width: 43, height: 34, color: "#397657", dark: true, tilt: 12, variant: 0 },
    { dx: -16, dy: -101, width: 55, height: 39, color: "#438460", tilt: 8, variant: 2 },
    { dx: 18, dy: -106, width: 54, height: 38, color: "#4b8d66", tilt: -6, variant: 1 },
  ];
  return (
    <BroadleafTree center={c} kind="broadleaf" trunkColor="#6b4a39"
      rearColor="#2c6149" clusters={crown} shadowOpacity={0.21} />
  );
}

export function Bush() {
  const c = project(0.5, 0.5);
  return (
    <g data-tree="bush">
      <ellipse cx={c.x} cy={c.y - 1} rx="22" ry="6" fill="#000" opacity="0.13" />
      <g fill="none" stroke="#5f4935" strokeLinecap="round" opacity="0.7">
        <path d={`M${c.x} ${c.y - 3} Q${c.x - 8} ${c.y - 14} ${c.x - 14} ${c.y - 18}`} strokeWidth="2.5" />
        <path d={`M${c.x + 1} ${c.y - 3} Q${c.x + 8} ${c.y - 14} ${c.x + 14} ${c.y - 18}`} strokeWidth="2.3" />
      </g>
      <g className="room-sway">
        <LeafCluster x={c.x - 12} y={c.y - 12} width={29} height={19}
          fallback="#3f7b5d" dark tilt={-8} variant={1} />
        <LeafCluster x={c.x + 12} y={c.y - 11} width={28} height={18}
          fallback="#4b8b67" tilt={7} variant={2} />
        <LeafCluster x={c.x - 1} y={c.y - 22} width={30} height={21}
          fallback="#4f946d" tilt={-2} variant={0} />
      </g>
    </g>
  );
}

const PINE_TIERS = Object.freeze([
  Object.freeze({ y: 14, left: 28, right: 24, lift: 23 }),
  Object.freeze({ y: 28, left: 24, right: 28, lift: 22 }),
  Object.freeze({ y: 43, left: 21, right: 19, lift: 21 }),
  Object.freeze({ y: 57, left: 15, right: 18, lift: 19 }),
  Object.freeze({ y: 70, left: 11, right: 13, lift: 17 }),
]);

export function Pine() {
  const c = project(0.6, 0.6);
  return (
    <g data-tree="pine">
      <path d={`M${c.x - 3.5} ${c.y} L${c.x - 2.4} ${c.y - 24}
        L${c.x + 2.4} ${c.y - 24} L${c.x + 3.5} ${c.y} Z`} fill="#6b4a39" />
      <EvergreenCrown center={c} tiers={PINE_TIERS}
        rearPalette={["#28513f", "#2d5944"]}
        frontPalette={["#32664d", "#397056"]} />
    </g>
  );
}

export function Birch() {
  const c = project(0.6, 0.6);
  return (
    <g data-tree="birch">
      <path d={`M${c.x - 4} ${c.y} Q${c.x - 3} ${c.y - 27} ${c.x - 2.6} ${c.y - 52}
        L${c.x + 3} ${c.y - 52} Q${c.x + 2.4} ${c.y - 26} ${c.x + 4} ${c.y} Z`}
        fill="#ddd6cc" />
      <path d={`M${c.x + 0.5} ${c.y - 1} Q${c.x + 0.8} ${c.y - 30} ${c.x + 3} ${c.y - 52}`}
        fill="none" stroke="#000" strokeWidth="2.3" opacity="0.13" />
      {[-8, -19, -30, -41].map((lift, index) => (
        <path key={lift} d={`M${c.x + (index % 2 ? -3.5 : -1)} ${c.y + lift}
          q${index % 2 ? 3.6 : 4.2} -1 ${index % 2 ? 5 : 3.5} 0`}
          fill="none" stroke="#3a3142" strokeWidth="2.1" opacity="0.55" strokeLinecap="round" />
      ))}
      <g fill="none" stroke="#cfc9c1" strokeLinecap="round">
        <path d={`M${c.x} ${c.y - 45} Q${c.x - 13} ${c.y - 58} ${c.x - 18} ${c.y - 69}`} strokeWidth="3" />
        <path d={`M${c.x + 1} ${c.y - 49} Q${c.x + 12} ${c.y - 63} ${c.x + 17} ${c.y - 72}`} strokeWidth="2.8" />
      </g>
      <g className="room-sway">
        <LeafCluster x={c.x - 15} y={c.y - 68} width={34} height={25}
          fallback="#78a984" dark tilt={-9} variant={2} />
        <LeafCluster x={c.x + 13} y={c.y - 61} width={27} height={21}
          fallback="#8bb995" tilt={8} variant={1} />
        <LeafCluster x={c.x + 3} y={c.y - 79} width={29} height={23}
          fallback="#86b690" tilt={-2} variant={0} />
      </g>
    </g>
  );
}

export function Hedge() {
  const c = project(0.8, 0.3);
  return (
    <g transform={`translate(${c.x},${c.y})`} data-tree="hedge">
      <ellipse cx="0" cy="0" rx="37" ry="8" fill="#000" opacity="0.14" />
      <path d="M-35 -2 Q-36 -17 -29 -22 Q-25 -31 -14 -27
        Q-5 -34 3 -28 Q14 -34 20 -26 Q31 -29 35 -19
        L35 -3 Q17 5 0 2 Q-18 5 -35 -2 Z" style={tinted("#3f7f63")} />
      <path d="M1 -28 Q14 -34 20 -26 Q31 -29 35 -19 L35 -3
        Q18 5 1 2 Z" fill="#17372b" opacity="0.2" />
      <path d="M-30 -18 Q-21 -24 -13 -20 M-8 -26 Q0 -30 7 -25 M13 -24 Q23 -27 30 -19"
        fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.1" strokeLinecap="round" />
      <g stroke="#4b4936" strokeWidth="1.7" opacity="0.55">
        <path d="M-20 -5 l0 6 M-7 -4 l0 6 M8 -4 l0 6 M22 -5 l0 6" />
      </g>
    </g>
  );
}

export function Rock() {
  const c = project(0.45, 0.4);
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <ellipse cx="-2" cy="0" rx="17" ry="4" fill="#000" opacity="0.16" />
      <path d="M-18 -1 L-16 -11 L-9 -19 L4 -22 L13 -16 L17 -6 L12 0 Z"
        style={tinted("#8d8178")} />
      <path d="M-9 -19 L4 -22 L2 -10 L-13 -8 Z" fill="#fff" opacity="0.12" />
      <path d="M4 -22 L13 -16 L17 -6 L2 -10 Z" fill="#000" opacity="0.2" />
      <path d="M-13 -8 L2 -10 L12 0 L-18 -1 Z" fill="#000" opacity="0.09" />
      <path d="M-9 -19 L2 -10 L4 -22 M2 -10 L12 0" fill="none"
        stroke="#403943" strokeWidth="0.8" opacity="0.24" />
    </g>
  );
}

export function Flowerbed() {
  const c = project(0.5, 0.3);
  const flowers = [
    { dx: -14, h: 10, kind: "daisy", color: "#e8b04b", lean: -1 },
    { dx: -7, h: 17, kind: "bell", color: "#df8ca8", lean: -2 },
    { dx: 0, h: 13, kind: "daisy", color: "#f1c85f", lean: 1 },
    { dx: 7, h: 19, kind: "bell", color: "#9f8ad1", lean: 2 },
    { dx: 14, h: 11, kind: "daisy", color: "#e8b04b", lean: 1 },
  ];
  return (
    <g>
      <polygon points={floorPatch(0, 0, 1, 0.6)} fill="#244d38" opacity="0.82" />
      <polygon points={floorPatch(0.07, 0.06, 0.86, 0.46)} fill="#5f4a37" opacity="0.5" />
      {/* Broad leaves make the patch a planted mass rather than dots on soil. */}
      <g fill="#4d8258">
        <path d={`M${c.x - 12} ${c.y - 1} Q${c.x - 20} ${c.y - 9} ${c.x - 17} ${c.y - 14} Q${c.x - 9} ${c.y - 9} ${c.x - 7} ${c.y - 2} Z`} />
        <path d={`M${c.x - 2} ${c.y - 1} Q${c.x - 8} ${c.y - 12} ${c.x - 3} ${c.y - 16} Q${c.x + 2} ${c.y - 9} ${c.x + 3} ${c.y - 1} Z`} />
        <path d={`M${c.x + 7} ${c.y - 1} Q${c.x + 12} ${c.y - 13} ${c.x + 18} ${c.y - 12} Q${c.x + 17} ${c.y - 4} ${c.x + 11} ${c.y} Z`} />
      </g>
      {flowers.map(({ dx, h, kind, color, lean }) => {
        const x = c.x + dx;
        const y = c.y - h;
        return <g key={`${dx}-${kind}`}>
          <path d={`M${c.x + dx * 0.82} ${c.y} Q${x - lean} ${c.y - h * 0.5} ${x + lean} ${y}`}
            fill="none" stroke="#49784e" strokeWidth="1.25" strokeLinecap="round" />
          <g transform={`translate(${x + lean},${y})`} data-flower-kind={kind}>
            <g className="room-sway">
              {kind === "daisy" ? <>
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <ellipse key={angle} cx="0" cy="-2.8" rx="1.8" ry="3.1"
                    transform={`rotate(${angle})`} style={tinted(color)} />
                ))}
                <circle r="1.5" fill="#fff2b0" />
              </> : <>
                <path d="M-3 -3 Q0 -6 3 -3 L2 1 Q0 3 -2 1 Z" style={tinted(color)} />
                <path d="M0 -5 Q3 -4 3 -2 L2 1 Q1 2 0 2 Z" fill="#000" opacity="0.14" />
              </>}
            </g>
          </g>
        </g>
      })}
    </g>
  );
}
