import { useEffect, useMemo, useRef, useState } from 'react';
import { furnitureDimensions, RESIZABLE_FURNITURE } from '../lib/furnitureDimensions';
import { resizeIsoPlacements } from '../lib/isoRoom';
import { useEventCallback } from './useEventCallback';
import { resizeFurnitureAtCorner, resizeFurnitureFromCorner } from '../lib/furnitureResize';

/** Local preview only. A real release commits once; cancellation never saves. */
export function useFurnitureResize({ placements, size, editMode, onResize, toGrid, svgRef }) {
  const active = useRef(null);
  const [preview, setPreview] = useState(null);
  const releaseCapture = useEventCallback(state => {
    if (svgRef.current?.hasPointerCapture?.(state.pointerId)) svgRef.current.releasePointerCapture(state.pointerId);
  });
  const end = useEventCallback(event => {
    const state = active.current;
    if (!state) return false;
    if (event?.pointerId != null && event.pointerId !== state.pointerId) return false;
    active.current = null;
    releaseCapture(state);
    setPreview(null);
    if (event?.type === 'pointerup' && state.moved && (state.changed || state.blocked)) {
      // Commit the last clear size when a drag reaches an obstacle. If no
      // size was clear, let the store explain the refused resize once.
      const target = state.changed ? state.lastValid : state.attempted;
      if (state.corner === 'front') onResize?.(state.id, target.dimensions);
      else onResize?.(state.id, target.dimensions, target.origin);
    }
    return true;
  });

  const start = useEventCallback((placement, event, corner = 'front') => {
    if (!editMode || !onResize || !RESIZABLE_FURNITURE[placement.item]) return;
    if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    const point = toGrid(event);
    if (!point) return;
    event.currentTarget?.focus?.();
    const original = { dimensions: placement.dimensions || null, origin: { gx: placement.gx, gy: placement.gy } };
    active.current = {
      id: placement.id, placement, corner, point,
      clientX: event.clientX, clientY: event.clientY, pointerId: event.pointerId,
      original, lastValid: original,
      attempted: null,
      moved: false, changed: false, blocked: false,
    };
    setPreview({ id: placement.id, ...active.current.lastValid, blocked: false });
    svgRef.current?.setPointerCapture?.(event.pointerId);
  });

  const move = useEventCallback(event => {
    const state = active.current;
    if (!state) return false;
    if (event.pointerId != null && event.pointerId !== state.pointerId) return false;
    const distance = Math.hypot(event.clientX - state.clientX, event.clientY - state.clientY);
    if (!state.moved && distance < 4) return true;
    const point = toGrid(event);
    if (!point) return true;
    // Returning to the press point restores even an authored off-grid size,
    // rather than turning a cancelled change into a normalized override.
    const target = distance < 4 ? state.original
      : resizeFurnitureFromCorner(state.placement, point.gx - state.point.gx, point.gy - state.point.gy, state.corner);
    if (!target) return true;
    const valid = resizeIsoPlacements(placements, state.id, target.dimensions, size, target.origin);
    state.moved = true;
    state.attempted = target;
    state.blocked = !valid;
    if (valid) {
      state.lastValid = target;
      state.changed = valid !== placements;
    }
    setPreview(previous => {
      const next = { id: state.id, ...state.lastValid, blocked: !valid };
      return previous?.dimensions?.w === next.dimensions?.w && previous?.dimensions?.d === next.dimensions?.d &&
        previous?.origin?.gx === next.origin.gx && previous?.origin?.gy === next.origin.gy && previous?.blocked === next.blocked ? previous : next;
    });
    return true;
  });

  const keyboard = useEventCallback((placement, event, corner = 'front') => {
    if (!editMode || !onResize || !RESIZABLE_FURNITURE[placement.item]) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (active.current) return;
    if (event.key === 'Home') { onResize(placement.id, null); return; }
    const { w, d } = furnitureDimensions(placement);
    const dw = event.key === 'ArrowRight' ? .5 : event.key === 'ArrowLeft' ? -.5 : 0;
    const dd = event.key === 'ArrowDown' ? .5 : event.key === 'ArrowUp' ? -.5 : 0;
    const target = resizeFurnitureAtCorner(placement, w + dw, d + dd, corner);
    if (corner === 'front') onResize(placement.id, target.dimensions);
    else onResize(placement.id, target.dimensions, target.origin);
  });

  useEffect(() => {
    if (!editMode) end({ type: 'pointercancel' });
    const cancel = event => {
      if (event.key !== 'Escape' || !active.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      end({ type: 'pointercancel' });
    };
    window.addEventListener('keydown', cancel, true);
    return () => window.removeEventListener('keydown', cancel, true);
  }, [editMode, end]);
  useEffect(() => () => {
    if (active.current) releaseCapture(active.current);
    active.current = null;
  }, [releaseCapture]);

  const rendered = useMemo(() => preview
    ? resizeIsoPlacements(placements, preview.id, preview.dimensions, size, preview.origin) || placements
    : placements, [placements, preview, size]);
  return { start, move, end, keyboard, placements: rendered, active: !!preview, blockedId: preview?.blocked ? preview.id : null };
}
