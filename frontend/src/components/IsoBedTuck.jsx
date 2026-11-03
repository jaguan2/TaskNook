import { project } from "../lib/iso";
import { ISO_ITEMS } from "../lib/isoRoom";
import { BedTuckCover } from "./IsoItems";

/**
 * The bed itself paints before its sleeper for depth sorting. Repainting only
 * its duvet beside the resolved persona gives the sleeper a real foreground
 * blanket without introducing a generic second character/body model.
 */
export default function IsoBedTuck({ lieOn, personaAt }) {
  if (!lieOn || !ISO_ITEMS[lieOn.item]?.tuck) return null;
  const bedAt = project(lieOn.gx, lieOn.gy);
  const cover = <BedTuckCover />;
  return (
    <g
      transform={`translate(${bedAt.x - personaAt.x},${bedAt.y - personaAt.y})`}
      // An unpainted bed uses the duvet's own fallback, never its sleeper's tint.
      style={{ "--tint": lieOn.tint || "initial" }}
    >
      {(lieOn.rot || 0) % 2 === 1 ? <g transform="scale(-1,1)">{cover}</g> : cover}
    </g>
  );
}
