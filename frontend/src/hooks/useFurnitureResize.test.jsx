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
