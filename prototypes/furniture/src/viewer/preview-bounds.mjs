import { Box3 } from 'three';

// Box3.setFromObject includes invisible children. The hidden SVG calibration
// plane must not shrink or offset the standalone furniture's camera framing.
export function previewBounds(group) {
  const bounds = new Box3();
  for (const child of group.children) if (child.visible) bounds.union(new Box3().setFromObject(child));
  return bounds;
}
