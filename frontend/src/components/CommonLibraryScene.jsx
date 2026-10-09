import { floorPatch, isoBox, project, wallRect } from "../lib/iso";
import { ambienceVars } from "../lib/motion";
import FloorSurface from "./IsoFloorSurface";

const bookColors = ["#877453", "#62746b", "#8f5555", "#6a657c", "#b19769", "#556875", "#9a7353"];
const bookcases = [
  ...[.32, 2.15, 3.98, 8.02, 9.85, 11.68, 16.22, 18.05, 19.88, 23.95, 25.78, 27.61]
    .map((at, seed) => ({ wall: "right", at, seed, level: "gallery", ladder: [3.98, 16.22, 25.78].includes(at) })),
  { wall: "left", at: .45, width: 43, seed: 7, level: "gallery" },
  { wall: "left", at: 12.3, seed: 3, level: "ground", ladder: true },
  { wall: "left", at: 18.2, seed: 5, level: "ground" },
];
const P = (gx, gy, z = 0) => {
  const p = project(gx, gy);
  return `${p.x},${p.y - z}`;
};
const wallPlane = (wall, at, z = 0) => {
  const p = wall === "left" ? project(0, at) : project(at, 0);
  return `matrix(${wall === "left" ? -1 : 1} .5 0 1 ${p.x} ${p.y - z})`;
};

function Bookcase({ wall, at, width = 32, seed, z }) {
  return <g data-library-bookcase="true" transform={wallPlane(wall, at, z)}>
    <path d={`M-3 0 V-172 L${width / 2} -183 L${width + 3} -172 V0 Z`} fill="#5f4333" stroke="#3e2d27" strokeWidth="1.2" />
    <path d={`M2 -6 V-167 Q${width / 2} -180 ${width - 2} -167 V-6 Z`} fill="#352c2b" />
    {[0, 1, 2, 3, 4].map((row) => {
      const bottom = -12 - row * 30;
      return <g key={row}>
        {Array.from({ length: Math.floor((width - 8) / 4.1) + 1 }, (_, i) => {
          const h = 17 + (seed * 5 + row * 7 + i * 3) % 10;
          const x = 4 + i * 4.1;
          return <g key={i}>
            <rect x={x} y={bottom - h} width={3.3} height={h} rx=".4" fill={bookColors[(seed + row + i) % bookColors.length]} />
            <path d={`M${x + .5} ${bottom - h + 3} h2.2 M${x + .5} ${bottom - 3} h2.2`} stroke="#e0c08c" strokeWidth=".55" opacity=".7" />
            <path d={`M${x + .65} ${bottom - h + 5} v${h - 10}`} stroke="#1c1b20" strokeWidth=".5" opacity=".25" />
          </g>;
        })}
        <rect x="2" y={bottom} width={width - 4} height="2.8" fill="#9b734c" />
        <path d={`M2 ${bottom + 2.8} h${width - 4}`} stroke="#2c2221" strokeWidth="1" />
      </g>;
    })}
    <path d={`M0 -169 V-2 M${width} -169 V-2 M-3 -172 H${width + 3} M-3 -3 H${width + 3}`} stroke="#b18c5e" strokeWidth="2.4" />
    <path d={`M2 -172 L${width / 2} -179 L${width - 2} -172`} fill="none" stroke="#d1ad76" strokeWidth="1.2" />
    <rect x="5" y="-6" width={width - 10} height="6" fill="#795738" />
  </g>;
}

// The feet stand away from the wall while the top hooks onto a shelf rail.
// Project both ends in room space so a ladder has depth rather than becoming
// a flat stripe on the bookcase. Its base shares the supporting floor height.
function ShelfLadder({ wall, at, z }) {
  const point = (along, away, h) => {
    const p = wall === "right" ? project(at + along, away) : project(away, at + along);
    return { x: p.x, y: p.y - z - h };
  };
  const rail = [point(.05, .03, 155), point(1.28, .03, 155)];
  const feet = [.28, .78].map((along) => point(along, .95, 2));
  const tops = [.28, .78].map((along) => point(along, .08, 155));
  return <g data-library-ladder="true" data-library-ladder-wall={wall}>
    <ellipse cx={(feet[0].x + feet[1].x) / 2} cy={(feet[0].y + feet[1].y) / 2 + 2}
      rx="12" ry="4" fill="#302433" opacity=".2" />
    <path d={`M${rail[0].x} ${rail[0].y} L${rail[1].x} ${rail[1].y}`} stroke="#b89559" strokeWidth="2.8" />
    {feet.map((foot, i) => <g key={i}>
      <path d={`M${foot.x} ${foot.y} L${tops[i].x} ${tops[i].y}`} stroke="#49362c" strokeWidth="4" />
      <path d={`M${foot.x - .6} ${foot.y} L${tops[i].x - .6} ${tops[i].y}`} stroke="#b48a56" strokeWidth="2.2" />
      <circle cx={foot.x} cy={foot.y} r="2.5" fill="#51413a" stroke="#b89559" strokeWidth=".8" />
      <circle cx={tops[i].x} cy={tops[i].y} r="2.2" fill="#51413a" stroke="#b89559" strokeWidth=".8" />
    </g>)}
    {Array.from({ length: 10 }, (_, i) => {
      const t = (i + 1) / 11;
      const left = point(.28, .95 - .87 * t, 2 + 153 * t);
      const right = point(.78, .95 - .87 * t, 2 + 153 * t);
      return <path key={i} d={`M${left.x} ${left.y} L${right.x} ${right.y}`} stroke="#c2a16f" strokeWidth="2.7" />;
    })}
  </g>;
}

function ArchedWindow({ wall, at, width, bottom, uid, seed }) {
  const h = 153;
  const arch = `M0 0 V${-h + 31} Q0 ${-h + 8} ${width / 2} ${-h} Q${width} ${-h + 8} ${width} ${-h + 31} V0 Z`;
  return <g data-library-window="true" transform={wallPlane(wall, at, bottom)}>
    <path d={arch} fill={`url(#${uid}-library-glass)`} stroke="#d1bea0" strokeWidth="8" strokeLinejoin="round" />
    <path d={arch} fill="none" stroke="#655b54" strokeWidth="2" />
    {[.25, .5, .75].map((t) => <path key={t} d={`M${width * t} -3 V${-h + 39}`} stroke="#c1b19a" strokeWidth="1.5" />)}
    {[-32, -64, -96].map((y) => <path key={y} d={`M3 ${y} H${width - 3}`} stroke="#c1b19a" strokeWidth="1.4" />)}
    <path d={`M${width / 2} ${-h + 6} V-96 M3 -96 Q${width / 2} -119 ${width - 3} -96`} fill="none" stroke="#c8b89b" strokeWidth="2" />
    <circle cx={width / 2} cy={-h + 28} r="12" fill="#d2b379" fillOpacity=".2" stroke="#c6b58f" strokeWidth="1.3" />
    <path d={`M${width / 2 - 9} ${-h + 28} h18 M${width / 2} ${-h + 37} v-18`} stroke="#dcc89b" strokeWidth="1" />
    <path d={`M7 -8 V-109 Q8 -124 16 -128 V-12 Z`} fill="#f3dfb2" opacity=".12" />
    <path d={`M-6 2 H${width + 6} M-3 7 H${width + 3}`} stroke="#bca27f" strokeWidth="4" />
    <circle cx={width * .7} cy="-75" r="1" fill="#e9e0c5" opacity={seed ? .5 : .3} />
  </g>;
}

function LibrarySurface({ surface, clipId, style }) {
  const { gx, gy, dx, dy, z, color } = surface;
  const box = isoBox(gx, gy, dx, dy, z || 8);
  const origin = project(gx, gy);
  return <>
    <g transform={!z ? "translate(0,8)" : undefined}>
      <polygon points={box.left} fill={z ? "#654932" : "#776a56"} />
      <polygon points={box.right} fill={z ? "#4f392d" : "#5d5246"} />
    </g>
    <g transform={`translate(0,${-z})`}>
      <polygon points={floorPatch(gx, gy, dx, dy)} fill={color} />
      <g clipPath={`url(#${clipId})`}><g transform={`translate(${origin.x},${origin.y})`}>
        <FloorSurface w={dx} d={dy} style={style} />
      </g></g>
    </g>
  </>;
}

function Chandelier({ uid, lampGlow, gx, gy }) {
  const centre = project(gx, gy);
  return <g data-library-chandelier="true" transform={`translate(${centre.x},${centre.y - 194})`}>
    <ellipse cy="34" rx="69" ry="41" fill={`url(#${uid}-light)`} opacity={lampGlow * .27} />
    <path d="M0 -72 V-12 M-3 -68 h6 M-2 -60 h4 M-2 -52 h4" stroke="#876943" strokeWidth="2" />
    <path d="M0 -12 Q-13 2 -36 19 M0 -12 Q13 2 36 19 M0 -12 V35" fill="none" stroke="#b89559" strokeWidth="2.3" />
    <ellipse cy="23" rx="39" ry="15" fill="none" stroke="#745234" strokeWidth="4" />
    <ellipse cy="21" rx="39" ry="15" fill="none" stroke="#d0ae6b" strokeWidth="2" />
    {Array.from({ length: 8 }, (_, i) => {
      const angle = i * Math.PI / 4;
      const x = Math.cos(angle) * 39, y = 21 + Math.sin(angle) * 15;
      return <g key={i} style={ambienceVars(i, 8)}>
        <path d={`M${x} ${y} v-11`} stroke="#ab864d" strokeWidth="2" />
        <ellipse cx={x} cy={y - 9} rx="4.1" ry="1.6" fill="#d1ae70" />
        <rect x={x - 1.7} y={y - 20} width="3.4" height="10.5" rx=".5" fill="#eed6a6" />
        <g className="pool-flicker">
          <ellipse cx={x} cy={y - 24} rx="7" ry="9" fill={`url(#${uid}-light)`} opacity={lampGlow * .75} />
          <path d={`M${x} ${y - 21} Q${x - 4} ${y - 25} ${x} ${y - 29} Q${x + 4} ${y - 25} ${x} ${y - 21}`} fill="#ffe8a6" />
        </g>
      </g>;
    })}
    <path d="M-3 37 Q0 46 3 37" fill="#d0ae6b" />
  </g>;
}

/** Architecture belongs to the fixed place; catalog props, seated people and
 * seat interaction retain the common-room renderer's existing ownership. */
export default function CommonLibraryScene({ scene, uid, clip, glow, lampGlow, timeOfDay, layers, lightPools }) {
  const galleryZ = scene.surfaces.gallery.z;
  const galleryDepth = scene.surfaces.gallery.dy;
  const stairX = scene.w - 2.1;
  const railEnd = stairX - .4;
  const glass = timeOfDay === "night" ? ["#29364c", "#737587"] : timeOfDay === "sunset" ? ["#927c82", "#e5ba8a"] : ["#809fa9", "#dce1c5"];
  return <g data-library-architecture="grand-library">
    <defs>
      <linearGradient id={`${uid}-library-glass`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={glass[0]} /><stop offset="1" stopColor={glass[1]} />
      </linearGradient>
    </defs>
    <ellipse cx={(scene.w - scene.d) * 12} cy={(scene.w + scene.d) * 12 - 8}
      rx={(scene.w + scene.d) * 12} ry="35" fill="#1c1722" opacity=".2" />
    <polygon points={wallRect("left", 0, scene.d, 0, 240)} fill="#99907d" />
    <polygon points={wallRect("right", 0, scene.w, 0, 240)} fill="#7d7469" />
    {["left", "right"].map((wall) => <g key={wall}>
      <polygon points={wallRect(wall, 0, wall === "left" ? scene.d : scene.w, 0, 49)} fill="#614b3d" />
      <polygon points={wallRect(wall, 0, wall === "left" ? scene.d : scene.w, 47, 5)} fill="#b89466" />
      <polygon points={wallRect(wall, 0, wall === "left" ? scene.d : scene.w, 227, 13)} fill="#b4a68c" />
      <polygon points={wallRect(wall, 0, wall === "left" ? scene.d : scene.w, 234, 3)} fill="#d1b995" />
    </g>)}
    {[0, 3.15, 6.55, 8.95, 11.85, 14.7, 17.75, scene.d].map((at) => <g key={`pillar-${at}`} transform={wallPlane("left", at)}>
      <path d="M0 0 V-233 M-4 0 V-229" stroke="#c3b395" strokeWidth="5" />
      <path d="M-7 -220 H4 M-7 -215 H4 M-8 -6 H5" stroke="#d0b998" strokeWidth="3" />
    </g>)}
    <ArchedWindow wall="left" at={3.3} width={66} bottom={55} uid={uid} />
    <ArchedWindow wall="left" at={9.2} width={53} bottom={55} uid={uid} seed={1} />
    <ArchedWindow wall="left" at={15} width={53} bottom={55} uid={uid} />
    <ArchedWindow wall="right" at={5.5} width={53} bottom={galleryZ + 11} uid={uid} seed={1} />
    <ArchedWindow wall="right" at={13.25} width={53} bottom={galleryZ + 11} uid={uid} />
    <ArchedWindow wall="right" at={21} width={53} bottom={galleryZ + 11} uid={uid} seed={1} />
    {bookcases.map((shelf) => <Bookcase key={`${shelf.wall}-${shelf.at}`} {...shelf} z={scene.surfaces[shelf.level].z} />)}
    <g transform={wallPlane("left", 7.3, 132)}>
      <rect x="0" y="-46" width="29" height="45" rx="1" fill="#69503d" stroke="#c2a16b" strokeWidth="3" />
      <path d="M4 -5 V-39 H25 V-5 Z" fill="#4c5355" />
      <circle cx="14.5" cy="-28" r="6" fill="#ac8c6a" />
      <path d="M6 -10 Q7 -23 15 -22 Q23 -21 24 -10" fill="#766157" />
    </g>
    <LibrarySurface surface={scene.surfaces.ground} clipId={clip("ground")} style="tiles" />
    <g clipPath={`url(#${clip("ground")})`}>
      <polygon points={floorPatch(.25, .25, scene.w - .5, scene.d - .5)} fill="none" stroke="#79664f" strokeWidth="1.2" />
      <polygon points={floorPatch(.5, .5, scene.w - 1, scene.d - 1)} fill="none" stroke="#d6c29b" strokeWidth="1" />
      <ellipse cx="-180" cy="290" rx="140" ry="70" fill={`url(#${uid}-light)`} opacity={glow * .6} />
      <ellipse cx="230" cy="360" rx="180" ry="90" fill={`url(#${uid}-light)`} opacity={lampGlow * .28} />
    </g>
    <LibrarySurface surface={scene.surfaces.gallery} clipId={clip("gallery")} style="boards" />
    {[1, .75, .5, .25].map((fraction, i) => {
      const h = galleryZ * fraction;
      const b = isoBox(stairX, galleryDepth + i * .45, 1.8, .45, h);
      return <g key={h} data-library-step="true">
        <polygon points={b.left} fill="#786048" /><polygon points={b.right} fill="#5e4939" />
        <polygon points={b.top} fill="#b4956c" />
      </g>;
    })}
    {bookcases.filter((shelf) => shelf.ladder).map((shelf) => <ShelfLadder key={`${shelf.wall}-${shelf.at}`}
      {...shelf} z={scene.surfaces[shelf.level].z} />)}
    {lightPools("ground")}
    {layers("ground")}
    {lightPools("gallery")}
    {layers("gallery")}
    <g data-library-balustrade="true" strokeLinecap="round">
      <path d={`M${P(.2, galleryDepth, galleryZ + 21)} L${P(railEnd, galleryDepth, galleryZ + 21)}`} stroke="#c3a071" strokeWidth="3" />
      <path d={`M${P(.2, galleryDepth, galleryZ + 7)} L${P(railEnd, galleryDepth, galleryZ + 7)}`} stroke="#674a35" strokeWidth="2" />
      {Array.from({ length: 17 }, (_, i) => .2 + i * (railEnd - .2) / 16).map((gx) => <path key={gx}
        d={`M${P(gx, galleryDepth, galleryZ)} L${P(gx, galleryDepth, galleryZ + 23)}`} stroke="#8f6847" strokeWidth="2.5" />)}
      <path d={`M${P(scene.w - .2, galleryDepth, galleryZ + 22)} L${P(scene.w - .2, galleryDepth + 1.8, 22)} L${P(scene.w - .2, galleryDepth + 1.8)}`} fill="none" stroke="#a98458" strokeWidth="2.5" />
    </g>
    {[4.4, 10.5, 16].map((gy) => <Chandelier key={gy} uid={uid} lampGlow={lampGlow} gx={14} gy={gy} />)}
    {[[3.5, 4.2, 99], [5.7, 13, 120], [13.2, 6.6, 96], [19, 2.1, 144], [2.4, 16.2, 116], [25.3, 14.2, 95]].map(([gx, gy, z]) => {
      const at = project(gx, gy);
      return <g key={`${gx}-${gy}`} transform={`translate(${at.x},${at.y - z})`} style={ambienceVars(gx, gy)}>
        <circle className="sun-mote" r=".9" fill="#ffe4ad" />
      </g>;
    })}
  </g>;
}
