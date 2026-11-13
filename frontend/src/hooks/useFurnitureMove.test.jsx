// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { useFurnitureMove } from './useFurnitureMove';
afterEach(cleanup);
const piece = { id: 'bed', item: 'bed', gx: 1, gy: 1, dimensions: { w: 1, d: 2 } };
const event = (data = {}) => ({ pointerId: 1, button: 0, gx: 1, gy: 1, clientX: 0, clientY: 0,
  preventDefault: vi.fn(), stopPropagation: vi.fn(), ...data });
function setup(placements = [piece]) {
  const onMove = vi.fn(), props = { placements, size: { w: 8, d: 8 }, editMode: true, onMove,
    toGrid: e => ({ gx: e.gx, gy: e.gy }), svgRef: { current: { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() } } };
  return { ...renderHook(value => useFurnitureMove(value), { initialProps: props }), props, onMove };
}
it('previews locally and commits once on a real release', () => {
  const { result, onMove } = setup();
  act(() => result.current.start(piece, event()));
  act(() => result.current.move(event({ clientX: 24, gx: 3 })));
  expect(result.current.placements[0].gx).toBe(3);
  expect(piece.gx).toBe(1);
  expect(result.current.preview.valid).toBe(true);
  expect(onMove).not.toHaveBeenCalled();
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onMove).toHaveBeenCalledTimes(1);
  expect(onMove).toHaveBeenCalledWith('bed', 3, 1);
});
it('marks an overlapping ghost invalid and cancels cleanly with Escape', () => {
  const { result, onMove } = setup([piece, { id: 'block', item: 'wardrobe', gx: 4, gy: 1 }]);
  act(() => result.current.start(piece, event()));
  act(() => result.current.move(event({ clientX: 24, gx: 4 })));
  expect(result.current.preview.valid).toBe(false);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(result.current.active).toBe(false);
  expect(onMove).not.toHaveBeenCalled();
  expect(result.current.placements[0]).toBe(piece);
});
it('ignores another pointer and aborts when leaving Decorate', () => {
  const { result, onMove, props, rerender } = setup();
  act(() => result.current.start(piece, event()));
  act(() => result.current.move(event({ pointerId: 2, clientX: 24, gx: 3 })));
  expect(result.current.active).toBe(false);
  act(() => result.current.move(event({ clientX: 24, gx: 3 })));
  rerender({ ...props, editMode: false });
  expect(result.current.active).toBe(false);
  expect(onMove).not.toHaveBeenCalled();
});

it('restores the original target when an active drag returns to its press point', () => {
  const { result, onMove } = setup();
  act(() => result.current.start(piece, event()));
  act(() => result.current.move(event({ clientX: 48, clientY: 24, gx: 3 })));
  act(() => result.current.move(event()));
  expect(result.current.placements[0]).toMatchObject({ gx: piece.gx, gy: piece.gy });
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onMove).not.toHaveBeenCalled();
});

it('preserves a boundary-clamped fractional position when returning to the press point', () => {
  const sofa = { id: 'sofa', item: 'sofa', gx: 1, gy: 7.15 };
  const { result, onMove } = setup([sofa]);
  const start = event({ gx: 1, gy: 7.15 });
  act(() => result.current.start(sofa, start));
  act(() => result.current.move(event({ clientX: 48, clientY: -24, gx: 1, gy: 5 })));
  act(() => result.current.move(start));
  expect(result.current.placements[0]).toMatchObject({ gx: sofa.gx, gy: sofa.gy });
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onMove).not.toHaveBeenCalled();
});
