import { useEffect, useMemo, useRef, useState } from 'react';
import { clampIsoPlacement, footOf, moveIsoPlacements, replaceFurniturePlacement, snapHalf } from '../lib/isoRoom';
import { useEventCallback } from './useEventCallback';

/** Pointer capture and transient placement preview belong to the scene. Only
 * a real release calls the store; Escape/cancellation restores the old room. */
export function useFurnitureMove({ placements, size, editMode, onMove, toGrid, svgRef }) {
  const gesture = useRef(null);
  const [preview, setPreview] = useState(null);
  const release = useEventCallback(state => {
    if (svgRef.current?.hasPointerCapture?.(state.pointerId)) svgRef.current.releasePointerCapture(state.pointerId);
  });
  const end = useEventCallback(event => {
    const state = gesture.current;
    if (!state || (event.pointerId != null && event.pointerId !== state.pointerId)) return false;
    gesture.current = null;
    release(state);
    setPreview(null);
    if (event.type === 'pointerup' && state.moved && (state.gx !== state.placement.gx || state.gy !== state.placement.gy)) onMove?.(state.id, state.gx, state.gy);
    return true;
  });
  const start = useEventCallback((placement, event) => {
    if (!editMode || !onMove || event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    const point = toGrid(event);
    if (!point) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget?.focus?.();
    gesture.current = { id: placement.id, placement, pointerId: event.pointerId,
      clientX: event.clientX, clientY: event.clientY, dx: point.gx - placement.gx, dy: point.gy - placement.gy,
      gx: placement.gx, gy: placement.gy, moved: false };
    svgRef.current?.setPointerCapture?.(event.pointerId);
  });
  const move = useEventCallback(event => {
    const state = gesture.current;
    if (!state || (event.pointerId != null && event.pointerId !== state.pointerId)) return false;
    const distance = Math.hypot(event.clientX - state.clientX, event.clientY - state.clientY);
    if (!state.moved && distance < 4) return true;
    const point = toGrid(event);
    if (!point) return true;
    // Boundary clamping can leave a non-half position. Returning to the press
    // area restores it exactly instead of snapping an abandoned move.
    const at = distance < 4 ? { gx: state.placement.gx, gy: state.placement.gy }
      : clampIsoPlacement(state.placement, snapHalf(point.gx - state.dx), snapHalf(point.gy - state.dy), size);
    state.moved = true;
    state.gx = at.gx; state.gy = at.gy;
    const valid = !!moveIsoPlacements(placements, state.id, at.gx, at.gy, size);
    setPreview(previous => previous?.gx === at.gx && previous?.gy === at.gy && previous?.valid === valid
      ? previous : { id: state.id, ...at, valid, foot: footOf(state.placement) });
    return true;
  });
  useEffect(() => {
    if (!editMode) end({ type: 'pointercancel' });
    const cancel = event => {
      if (event.key !== 'Escape' || !gesture.current) return;
      event.preventDefault(); event.stopImmediatePropagation();
      end({ type: 'pointercancel' });
    };
    window.addEventListener('keydown', cancel, true);
    return () => window.removeEventListener('keydown', cancel, true);
  }, [editMode, end]);
  useEffect(() => () => {
    if (gesture.current) release(gesture.current);
    gesture.current = null;
  }, [release]);
  const rendered = useMemo(() => {
    const original = preview && placements.find(p => p.id === preview.id);
    return original ? replaceFurniturePlacement(placements, original, { ...original, gx: preview.gx, gy: preview.gy }) : placements;
  }, [placements, preview]);
  return { start, move, end, placements: rendered, preview, active: !!preview,
    isDragging: useEventCallback(() => !!gesture.current) };
}
