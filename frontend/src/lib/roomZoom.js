export const ROOM_ZOOM_STEP = 1.12;

/** Only modified zoom commands belong to the room. Alt/AltGr combinations
 * and composing input must keep their normal text/operating-system meaning. */
export function roomZoomAction(event) {
  if (event.altKey || event.isComposing || !(event.ctrlKey || event.metaKey)) return null;
  if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') return 'in';
  if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') return 'out';
  return event.key === '0' ? 'reset' : null;
}

/** Change the view width around a fixed world point, preserving its aspect
 * ratio and the point's relative screen position. Bounds match wheel zoom. */
export function zoomRoomView(view, factor, anchor, minWidth, maxWidth) {
  const width = Math.min(maxWidth, Math.max(minWidth, view.w * factor));
  const scale = width / view.w;
  return { x: anchor.x - (anchor.x - view.x) * scale,
    y: anchor.y - (anchor.y - view.y) * scale, w: width, h: view.h * scale };
}
