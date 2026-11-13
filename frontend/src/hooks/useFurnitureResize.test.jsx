// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { useFurnitureResize } from './useFurnitureResize';

afterEach(cleanup);
const bed = { id: 'bed', item: 'bed', gx: 0, gy: 0, dimensions: { w: 1, d: 2 } };
const event = (extra = {}) => ({ pointerId: 1, button: 0, clientX: 0, clientY: 0, gx: 0, gy: 0,
  preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra });
const setup = (extra = {}) => {
  const onResize = vi.fn();
  const props = { placements: [bed], size: { w: 8, d: 8 }, editMode: true, onResize,
    toGrid: e => ({ gx: e.gx, gy: e.gy }),
    svgRef: { current: { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() } }, ...extra };
  return { ...renderHook(p => useFurnitureResize(p), { initialProps: props }), props, onResize };
};

it.each([
  ['sofa', 1, { w: 2, d: 1 }, { gx: 0, gy: .5 }, { w: 2.5, d: 1 }],
  ['desk', 0, { w: 2, d: 1 }, { gx: .5, gy: .5 }, { w: 2.5, d: 1.5 }],
  ['shelf', 0, { w: 1, d: .5 }, { gx: 1, gy: .5 }, { w: 2, d: 1 }],
])('previews and saves a resized %s through the shared gesture', (item, rot, dimensions, delta, expected) => {
  const placement = { ...bed, item, rot, dimensions };
  const { result, onResize } = setup({ placements: [placement] });
  act(() => result.current.start(placement, event()));
  act(() => result.current.move(event({ clientX: 24, ...delta })));
  expect(result.current.placements[0].dimensions).toEqual(expected);
  expect(onResize).not.toHaveBeenCalled();
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onResize).toHaveBeenCalledWith('bed', expected);
});

it('previews a half-grid resize and commits once on release', () => {
  const { result, onResize } = setup();
  const start = result.current.start;
  act(() => result.current.start(bed, event()));
  act(() => result.current.move(event({ clientX: 24, clientY: 12, gx: 1, gy: 0 })));
  expect(result.current.placements[0].dimensions).toEqual({ w: 2, d: 2 });
  expect(onResize).not.toHaveBeenCalled();
  expect(result.current.start).toBe(start);
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onResize).toHaveBeenCalledTimes(1);
  expect(onResize).toHaveBeenCalledWith('bed', { w: 2, d: 2 });
  expect(bed.dimensions).toEqual({ w: 1, d: 2 });
});

it('cancels on pointer cancellation, Escape or leaving Decorate', () => {
  const { result, onResize, props, rerender } = setup();
  for (const cancel of [
    () => result.current.end(event({ type: 'pointercancel' })),
    () => fireEvent.keyDown(window, { key: 'Escape' }),
    () => rerender({ ...props, editMode: false }),
  ]) {
    rerender(props);
    act(() => result.current.start(bed, event()));
    act(() => result.current.move(event({ clientX: 24, gx: 1 })));
    act(cancel);
    expect(result.current.active).toBe(false);
    expect(onResize).not.toHaveBeenCalled();
  }
});

it('stops at the last clear size and ignores another pointer', () => {
  const obstacle = { id: 'cabinet', item: 'nightstand', gx: 2.5, gy: 0 };
  const { result, onResize } = setup({ placements: [bed, obstacle] });
  act(() => result.current.start(bed, event()));
  act(() => result.current.move(event({ clientX: 24, gx: 1 })));
  act(() => result.current.move(event({ clientX: 48, gx: 2 })));
  expect(result.current.blockedId).toBe('bed');
  expect(result.current.placements[0].dimensions).toEqual({ w: 2, d: 2 });
  act(() => result.current.move(event({ pointerId: 2, clientX: 90, gx: 4 })));
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onResize).toHaveBeenCalledTimes(1);
  expect(onResize).toHaveBeenCalledWith('bed', { w: 2, d: 2 });
});

it('supports keyboard sizes and reset while refusing read-only scenes', () => {
  const { result, onResize, props, rerender } = setup();
  act(() => result.current.keyboard(bed, { key: 'ArrowRight', preventDefault: vi.fn(), stopPropagation: vi.fn() }));
  expect(onResize).toHaveBeenLastCalledWith('bed', { w: 1.5, d: 2 });
  act(() => result.current.keyboard(bed, { key: 'Home', preventDefault: vi.fn(), stopPropagation: vi.fn() }));
  expect(onResize).toHaveBeenLastCalledWith('bed', null);
  onResize.mockClear();
  rerender({ ...props, editMode: false });
  act(() => result.current.start(bed, event()));
  expect(result.current.active).toBe(false);
  expect(onResize).not.toHaveBeenCalled();
});

it.each([
  ['back', -1, -1, 2, 2], ['right', 1, -1, 3, 2],
  ['front', 1, 1, 3, 3], ['left', -1, 1, 2, 3],
])('commits a %s corner drag as one position-and-size edit', (corner, dx, dy, gx, gy) => {
  const placement = { ...bed, gx: 3, gy: 3 };
  const { result, onResize } = setup({ placements: [placement] });
  act(() => result.current.start(placement, event(), corner));
  act(() => result.current.move(event({ clientX: 24, gx: dx, gy: dy })));
  expect(result.current.placements[0]).toMatchObject({ gx, gy, dimensions: { w: 2, d: 3 } });
  expect(onResize).not.toHaveBeenCalled();
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onResize).toHaveBeenCalledTimes(1);
  if (corner === 'front') expect(onResize).toHaveBeenCalledWith('bed', { w: 2, d: 3 });
  else expect(onResize).toHaveBeenCalledWith('bed', { w: 2, d: 3 }, { gx, gy });
});

it('keeps the last clear origin at an obstacle and cancels an anchored preview without saving', () => {
  const placement = { ...bed, gx: 3, gy: 3 };
  const obstacle = { id: 'cabinet', item: 'nightstand', gx: 1.5, gy: 3 };
  const { result, onResize } = setup({ placements: [placement, obstacle] });
  act(() => result.current.start(placement, event(), 'left'));
  act(() => result.current.move(event({ clientX: 24, gx: -.5 })));
  act(() => result.current.move(event({ clientX: 48, gx: -1 })));
  expect(result.current.blockedId).toBe('bed');
  expect(result.current.placements[0]).toMatchObject({ gx: 2.5, dimensions: { w: 1.5, d: 2 } });
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onResize).toHaveBeenCalledWith('bed', { w: 1.5, d: 2 }, { gx: 2.5, gy: 3 });
  onResize.mockClear();
  act(() => result.current.start(placement, event(), 'back'));
  act(() => result.current.move(event({ clientX: 24, gx: 0, gy: -1 })));
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onResize).not.toHaveBeenCalled();
  expect(result.current.placements[0]).toEqual(placement);
});

it('keyboard changes use the grabbed corner rather than moving the furniture', () => {
  const placement = { ...bed, gx: 3, gy: 3, rot: 1 };
  const { result, onResize } = setup({ placements: [placement] });
  act(() => result.current.keyboard(placement, { key: 'ArrowRight', preventDefault: vi.fn(), stopPropagation: vi.fn() }, 'back'));
  expect(onResize).toHaveBeenCalledWith('bed', { w: 1.5, d: 2 }, { gx: 3, gy: 2.5 });
});

it.each([bed.dimensions, undefined])('restores the original size and origin after returning to the press point (%j)', dimensions => {
  const placement = { ...bed, gx: 3, gy: 3, dimensions };
  const { result, onResize } = setup({ placements: [placement] });
  act(() => result.current.start(placement, event(), 'back'));
  act(() => result.current.move(event({ clientX: -48, clientY: -24, gx: -1 })));
  act(() => result.current.move(event()));
  expect(result.current.placements[0]).toEqual(placement);
  act(() => result.current.end(event({ type: 'pointerup' })));
  expect(onResize).not.toHaveBeenCalled();
});
