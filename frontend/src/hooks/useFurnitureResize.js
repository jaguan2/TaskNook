import { useEffect, useMemo, useRef, useState } from 'react';
import { furnitureDimensions, RESIZABLE_FURNITURE, snapFurnitureDimensions } from '../lib/furnitureDimensions';
import { footOf, resizeIsoPlacements } from '../lib/isoRoom';
import { useEventCallback } from './useEventCallback';

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
      onResize?.(state.id, state.changed ? state.lastValid : state.attempted);
    }
    return true;
  });

  const start = useEventCallback((placement, event) => {
    if (!editMode || !onResize || !RESIZABLE_FURNITURE[placement.item]) return;
    if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    const point = toGrid(event);
    if (!point) return;
    event.currentTarget?.focus?.();
    active.current = {
      id: placement.id, item: placement.item, rot: placement.rot || 0, point, foot: footOf(placement),
      clientX: event.clientX, clientY: event.clientY, pointerId: event.pointerId,
      lastValid: placement.dimensions || null, attempted: placement.dimensions || null,
      moved: false, changed: false, blocked: false,
    };
    setPreview({ id: placement.id, dimensions: placement.dimensions || null, blocked: false });
    svgRef.current?.setPointerCapture?.(event.pointerId);
  });

  const move = useEventCallback(event => {
    const state = active.current;
    if (!state) return false;
    if (event.pointerId != null && event.pointerId !== state.pointerId) return false;
    if (Math.hypot(event.clientX - state.clientX, event.clientY - state.clientY) < 4) return true;
    const point = toGrid(event);
    if (!point) return true;
    const width = state.foot[0] + point.gx - state.point.gx;
    const depth = state.foot[1] + point.gy - state.point.gy;
    const dimensions = state.rot % 2 ? snapFurnitureDimensions(state.item, depth, width) : snapFurnitureDimensions(state.item, width, depth);
    const valid = resizeIsoPlacements(placements, state.id, dimensions, size);
    state.moved = true;
    state.attempted = dimensions;
    state.blocked = !valid;
    if (valid) {
      state.lastValid = dimensions;
      state.changed = valid !== placements;
    }
    setPreview(previous => {
      const next = { id: state.id, dimensions: state.lastValid, blocked: !valid };
      return previous?.dimensions?.w === next.dimensions?.w && previous?.dimensions?.d === next.dimensions?.d &&
        previous?.blocked === next.blocked ? previous : next;
    });
    return true;
  });

  const keyboard = useEventCallback((placement, event) => {
    if (!editMode || !onResize || !RESIZABLE_FURNITURE[placement.item]) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (active.current) return;
    if (event.key === 'Home') { onResize(placement.id, null); return; }
    const { w, d } = furnitureDimensions(placement);
    const dw = event.key === 'ArrowRight' ? .5 : event.key === 'ArrowLeft' ? -.5 : 0;
    const dd = event.key === 'ArrowDown' ? .5 : event.key === 'ArrowUp' ? -.5 : 0;
    onResize(placement.id, snapFurnitureDimensions(placement.item, w + dw, d + dd));
  });

  useEffect(() => {
    if (!editMode) end({ type: 'pointercancel' });
    const cancel = event => {
      if (event.key !== 'Escape' || !active.current) return;
      event.preventDefault();
      event.stopPropagation();
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
    ? resizeIsoPlacements(placements, preview.id, preview.dimensions, size) || placements
    : placements, [placements, preview, size]);
  return { start, move, end, keyboard, placements: rendered, active: !!preview, blockedId: preview?.blocked ? preview.id : null };
}
