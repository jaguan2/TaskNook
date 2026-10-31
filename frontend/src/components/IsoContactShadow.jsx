import { project, TILE_H, TILE_W } from "../lib/iso";

/** Shared floor contact: taller objects cast a slightly longer down-left shadow.
 * Callers exclude walls, flat decorations and objects supported above the floor. */
export default function IsoContactShadow({ foot, height, paint = "isoShadow" }) {
  const mid = project(foot[0] / 2, foot[1] / 2);
  const lean = Math.min(9, 2 + (height || 20) * 0.06);
  return <ellipse cx={mid.x - lean} cy={mid.y + lean * 0.5}
    rx={((foot[0] + foot[1]) * TILE_W) / 4 + 3 + lean * 0.4}
    ry={((foot[0] + foot[1]) * TILE_H) / 4 + 1.5} fill={`url(#${paint})`} />;
}
