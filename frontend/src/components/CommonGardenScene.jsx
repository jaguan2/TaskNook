import { floorPatch, isoBox, project } from "../lib/iso";
import FloorSurface from "./IsoFloorSurface";

function GardenSurface({ surface, clipId }) {
  const { gx, gy, dx, dy, z, color, style = "grass" } = surface;
  const box = isoBox(gx, gy, dx, dy, z || 6);
  const origin = project(gx, gy);
  return <>
    <g transform={!z ? "translate(0,6)" : undefined}>
      <polygon points={box.left} fill={z ? "#88745c" : "#526647"} />
      <polygon points={box.right} fill={z ? "#705d4d" : "#46593f"} />
    </g>
    <g transform={`translate(0,${-z})`}>
      <polygon points={floorPatch(gx, gy, dx, dy)} fill={color} />
      {/* The clip already uses room coordinates. Translate only the local
          material; moving its clip too would exclude the entire terrace. */}
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(${origin.x},${origin.y})`}>
          <FloorSurface w={dx} d={dy} style={style} />
        </g>
      </g>
    </g>
  </>;
}

/** Outdoor architecture for Willow Pond. Furniture, people, lighting and
 * seat interaction remain in CommonRoom; this component owns only the fixed
 * lawn/terrace/path/pergola composition that makes this place distinct. */
export default function CommonGardenScene({ scene, uid, clip, glow, layers, lightPools }) {
  const P = (gx, gy, z = 0) => {
    const p = project(gx, gy);
    return { x: p.x, y: p.y - z };
  };
  const lawnClip = clip("ground");
  const patioClip = clip("patio");
  const pergola = [P(0.75, 4.75), P(5.35, 4.75)];
  const bulbs = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return {
      x: pergola[0].x + (pergola[1].x - pergola[0].x) * t,
      y: pergola[0].y + (pergola[1].y - pergola[0].y) * t - 76 + Math.sin(t * Math.PI) * 7,
    };
  });
  const path = [
    [5.25, 8.15], [5.7, 7.6], [6.05, 7.05], [6.45, 6.55], [6.8, 6.05],
  ];
  const meadowDetails = [
    [1.1, 1.2, "#d9c272"], [2.15, 1.05, "#e2a88a"], [3.4, 1.45, "#cfb969"],
    [4.35, 2.65, "#dba69a"], [5.35, 3.45, "#c9b75f"], [1.0, 3.55, "#d5a075"],
    [2.3, 3.85, "#ddd081"], [3.45, 3.2, "#cfa48b"], [5.9, 5.2, "#d8c574"],
    [6.55, 7.25, "#d9a17d"], [7.4, 7.75, "#d9c278"], [8.1, 8.15, "#cfa184"],
    [10.75, 4.25, "#ddbd72"], [11.25, 5.6, "#d79c89"], [8.85, 0.55, "#d8c579"],
  ];
  const pondReeds = [[6.85, 1.55], [7.05, 1.2], [10.45, 2.45], [10.15, 3.15]];

  return <g data-garden-architecture="willow-pond">
    <ellipse cx="18" cy="214" rx="232" ry="38" fill="#263027" opacity=".18" />
    <GardenSurface surface={scene.surfaces.ground} clipId={lawnClip} />
    {/* A loose stepping-stone path avoids turning the garden into a second
        rectangular room. Its curve points from the open foreground toward
        the bench and pond, as in the supplied garden reference. */}
    <g data-garden-path="stepping-stones" clipPath={`url(#${lawnClip})`}>
      {path.map(([gx, gy], i) => <polygon key={`${gx}-${gy}`}
        points={floorPatch(gx, gy, 0.72, 0.52)} fill={i % 2 ? "#b8aa8c" : "#c4b596"}
        stroke="#756f62" strokeWidth=".7" opacity=".88" />)}
    </g>
    <GardenSurface surface={scene.surfaces.patio} clipId={patioClip} />
    {/* Dappled canopy light keeps the broad lawn from reading as one flat
        green tile while staying beneath every prop and seat target. */}
    <g clipPath={`url(#${lawnClip})`} opacity={glow * 0.42}>
      <ellipse cx="34" cy="72" rx="78" ry="31" fill={`url(#${uid}-light)`} />
      <ellipse cx="130" cy="120" rx="66" ry="24" fill={`url(#${uid}-light)`} />
      <ellipse cx="-105" cy="120" rx="58" ry="25" fill="#30452f" opacity=".25" />
    </g>
    {/* Tiny repeated marks do the work that loose petals, weeds and moss do
        in the reference: breaking up the broad lawn without adding another
        large object or interfering with a selectable seat. */}
    <g data-garden-details="meadow" clipPath={`url(#${lawnClip})`}>
      {meadowDetails.map(([gx, gy, color], i) => {
        const p = P(gx, gy);
        return <g key={`${gx}-${gy}`} transform={`translate(${p.x},${p.y})`} opacity=".82">
          <path d="M0 2 Q-1 -3 -3 -5 M0 2 Q1 -4 4 -6 M0 2 Q4 0 6 -2"
            fill="none" stroke="#486443" strokeWidth="1.1" strokeLinecap="round" />
          <circle cx={i % 2 ? -3 : 4} cy="-5" r="1.5" fill={color} />
          <circle cx={i % 2 ? 4 : -3} cy="-2" r="1.1" fill={color} opacity=".8" />
        </g>;
      })}
      {pondReeds.map(([gx, gy]) => {
        const p = P(gx, gy);
        return <g key={`${gx}-${gy}`} transform={`translate(${p.x},${p.y})`}>
          <path d="M0 3 Q-1 -8 -4 -14 M1 3 Q2 -10 5 -17 M3 3 Q7 -5 9 -9"
            fill="none" stroke="#4f7149" strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="-4" cy="-14" rx="1.5" ry="3.5" fill="#8b7048" />
          <ellipse cx="5" cy="-17" rx="1.5" ry="3.5" fill="#8b7048" />
        </g>;
      })}
    </g>
    {/* A slim vine-and-bulb pergola gives the study terrace a threshold but
        leaves both chairs fully visible. */}
    <g data-garden-pergola="true">
      <path d={`M${pergola[0].x} ${pergola[0].y - 2} L${pergola[0].x} ${pergola[0].y - 82}
        M${pergola[1].x} ${pergola[1].y - 2} L${pergola[1].x} ${pergola[1].y - 82}
        M${pergola[0].x} ${pergola[0].y - 80} L${pergola[1].x} ${pergola[1].y - 80}`}
        fill="none" stroke="#795b43" strokeWidth="6" strokeLinecap="round" />
      <path d={`M${bulbs[0].x} ${bulbs[0].y} Q${(bulbs[0].x + bulbs[8].x) / 2} ${bulbs[4].y + 8} ${bulbs[8].x} ${bulbs[8].y}`}
        fill="none" stroke="#48473d" strokeWidth="1.2" />
      {bulbs.map((bulb, i) => <g key={i} data-garden-bulb="true">
        <circle cx={bulb.x} cy={bulb.y} r="5" fill="#ffe1a0" opacity=".1" />
        <circle cx={bulb.x} cy={bulb.y} r="1.7" fill="#ffe6a7" />
        {i % 2 === 1 && <ellipse cx={bulb.x - 3} cy={bulb.y - 4} rx="4" ry="1.7"
          fill="#4f7651" transform={`rotate(${-20 + i * 6} ${bulb.x - 3} ${bulb.y - 4})`} />}
      </g>)}
    </g>
    {lightPools("ground")}
    {lightPools("patio")}
    {layers("ground")}
    {layers("patio")}
  </g>;
}
