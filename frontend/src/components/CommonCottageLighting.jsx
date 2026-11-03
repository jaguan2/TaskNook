import { floorPatch, project, wallRect } from "../lib/iso";
import { footOf, ISO_ITEMS } from "../lib/isoRoom";

export function CottageLightDefs({ uid }) {
  return <>
    <radialGradient id={`${uid}-contact`}>
      <stop stopColor="#251d24" stopOpacity=".32" />
      <stop offset=".7" stopColor="#251d24" stopOpacity=".12" />
      <stop offset="1" stopColor="#251d24" stopOpacity="0" />
    </radialGradient>
    <linearGradient id={`${uid}-wall-depth`} x1="0" y1="0" x2="0" y2="1">
      <stop stopColor="#302b39" stopOpacity="0" />
      <stop offset=".55" stopColor="#302b39" stopOpacity=".04" />
      <stop offset="1" stopColor="#302b39" stopOpacity=".3" />
    </linearGradient>
    <radialGradient id={`${uid}-warm-bounce`}>
      <stop stopColor="#ffe2a3" stopOpacity=".65" />
      <stop offset="1" stopColor="#ffe2a3" stopOpacity="0" />
    </radialGradient>
  </>;
}

export function CottageWallLight({ uid, roofH, strength }) {
  return <g pointerEvents="none">
    <polygon points={wallRect("left", 0, 9, 0, roofH)} fill={`url(#${uid}-wall-depth)`} />
    <polygon points={wallRect("right", 0, 11, 0, roofH)} fill={`url(#${uid}-wall-depth)`} />
    <g opacity={strength}>
      <polygon points={wallRect("left", .2, 3.1, 30, 95)} fill={`url(#${uid}-warm-bounce)`} />
      <polygon points={wallRect("right", 5.7, 4.7, 5, 110)} fill={`url(#${uid}-warm-bounce)`} />
    </g>
  </g>;
}

/** Narrow seams ground each floor against its walls, in that floor's own clip. */
export function CottageFloorShade({ surface, clipId }) {
  const { gx, gy, dx, dy, z } = surface;
  return <g transform={`translate(0,${-z})`} clipPath={`url(#${clipId})`} fill="#352b32" opacity=".15">
    <polygon points={floorPatch(gx, gy, dx, .18)} />
    <polygon points={floorPatch(gx, gy, .18, dy)} />
  </g>;
}

/** Light falls on the supporting worktop, not only the floor far below it.
 * Draw after the host sprite and before its supported books, mugs and lamp. */
export function CottageTableLight({ p, lamp, uid, strength }) {
  const [w, d] = footOf(p.item, p.rot);
  const [lw, ld] = footOf(lamp.item, lamp.rot);
  const at = project(lamp.gx - p.gx + lw / 2, lamp.gy - p.gy + ld / 2);
  const height = ISO_ITEMS[p.item].surface;
  const clipId = `${uid}-${p.id}-worktop`;
  return <g data-common-worktop-light={p.id} transform={`translate(0,${-height})`} pointerEvents="none">
    <defs><clipPath id={clipId}><polygon points={floorPatch(0, 0, w, d)} /></clipPath></defs>
    <g clipPath={`url(#${clipId})`}>
      <ellipse cx={at.x} cy={at.y} rx="37" ry="18.5" fill={`url(#${uid}-warm-bounce)`} opacity={strength * .65} />
    </g>
  </g>;
}
