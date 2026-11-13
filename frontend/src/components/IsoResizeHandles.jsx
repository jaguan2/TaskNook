import { useId } from 'react';
import { floorPatch, project } from '../lib/iso';
import { FURNITURE_RESIZE_CORNERS } from '../lib/furnitureResize';
import { furnitureDimensions } from '../lib/furnitureDimensions';

/** Floor-space grips stay in the final selection overlay, above furniture.
 * The transparent non-scaling stroke keeps a useful hit target when zoomed out. */
export default function IsoResizeHandles({ placement, foot, label, blocked, onStart, onKeyboard }) {
  const clipId = useId();
  const dimensions = furnitureDimensions(placement);
  return <g data-resize-corners={placement.id}>
    {/* Padded hit targets keep their own grid quadrant, so a neighbouring
        handle cannot steal a touch when the room is zoomed out. */}
    <defs>{Object.entries(FURNITURE_RESIZE_CORNERS).map(([corner, edge]) => {
      const minX = edge.x ? foot[0] / 2 : -8, maxX = edge.x ? foot[0] + 8 : foot[0] / 2;
      const minY = edge.y ? foot[1] / 2 : -8, maxY = edge.y ? foot[1] + 8 : foot[1] / 2;
      return <clipPath key={corner} id={`${clipId}-${corner}`} clipPathUnits="userSpaceOnUse">
        <polygon points={floorPatch(minX, minY, maxX - minX, maxY - minY)} />
      </clipPath>;
    })}</defs>
    {Object.entries(FURNITURE_RESIZE_CORNERS).map(([corner, edge]) => {
      const at = project(edge.x * foot[0], edge.y * foot[1]);
      return <g key={corner} data-resize-corner={corner} role="button" tabIndex={0}
        aria-label={`Resize ${label.toLowerCase()} from ${corner} corner. ${dimensions.w} by ${dimensions.d} tiles. Arrow keys adjust width and depth. Home restores original size.`}
        style={{ cursor: edge.cursor, touchAction: 'none' }}
        onPointerDown={event => onStart(placement, event, corner)}
        onKeyDown={event => onKeyboard?.(placement, event, corner)}>
        <title>Drag corner to resize · Escape cancels</title>
        <circle data-resize-hit cx={at.x} cy={at.y} r="9" fill="transparent" stroke="transparent"
          strokeWidth="18" vectorEffect="non-scaling-stroke" pointerEvents="all" clipPath={`url(#${clipId}-${corner})`} />
        <circle cx={at.x} cy={at.y} r="4.5" fill={blocked ? '#b55b70' : '#ffe9b0'} stroke="#443346"
          strokeWidth="1.5" vectorEffect="non-scaling-stroke" pointerEvents="none" />
      </g>;
    })}
  </g>;
}
