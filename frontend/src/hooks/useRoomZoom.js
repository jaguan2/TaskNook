import { useCallback, useEffect, useMemo, useState } from 'react';
import { roomZoomAction, ROOM_ZOOM_STEP, zoomRoomView } from '../lib/roomZoom';

// Match the standard isometric camera's relative range for fixed-frame rooms.
const MIN_FRAME_RATIO = 220 / 640;
const MAX_FRAME_RATIO = 2.5;

/** One listener belongs to the active room, never a preset thumbnail.
 * Modified zoom keys work while a task field is focused without changing its
 * draft. Prevent the browser's whole-page zoom, including behind a modal. */
export function useRoomZoomKeys({ onZoom, onReset, enabled = true }) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = event => {
      if (event.defaultPrevented) return;
      const action = roomZoomAction(event);
      if (!action) return;
      event.preventDefault();
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      if (action === 'reset') onReset();
      else onZoom(action === 'in' ? 1 / ROOM_ZOOM_STEP : ROOM_ZOOM_STEP);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled, onZoom, onReset]);
}

/** Keyboard camera for scenes that otherwise use a fixed frame. Zoom stays
 * local to that mounted room; no placement or home-camera data is rewritten. */
export function useRoomZoom({ viewBox, enabled = true }) {
  const base = useMemo(() => {
    const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
    return { x, y, w, h };
  }, [viewBox]);
  const [factor, setFactor] = useState(1);
  const onZoom = useCallback(step => setFactor(value => Math.min(MAX_FRAME_RATIO, Math.max(MIN_FRAME_RATIO, value * step))), []);
  const onReset = useCallback(() => setFactor(1), []);
  useRoomZoomKeys({ onZoom, onReset, enabled });
  const view = zoomRoomView(base, factor, { x: base.x + base.w / 2, y: base.y + base.h / 2 }, base.w * MIN_FRAME_RATIO, base.w * MAX_FRAME_RATIO);
  return `${view.x} ${view.y} ${view.w} ${view.h}`;
}
