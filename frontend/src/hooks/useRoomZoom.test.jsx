// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { useRoomZoom, useRoomZoomKeys } from './useRoomZoom';
import { useIsoCamera } from './useIsoCamera';

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); document.body.innerHTML = ''; });
const viewBox = '-128 0 1152 648';

it('zooms the fixed frame, clamps repeated keys, resets and stands down for previews', () => {
  const { result, rerender, unmount } = renderHook(enabled => useRoomZoom({ viewBox, enabled }), { initialProps: true });
  fireEvent.keyDown(window, { ctrlKey: true, key: '=' });
  expect(Number(result.current.split(' ')[2])).toBeCloseTo(1152 / 1.12);
  act(() => { for (let i = 0; i < 80; i++) fireEvent.keyDown(window, { ctrlKey: true, key: '+' }); });
  expect(Number(result.current.split(' ')[2])).toBe(1152 * 220 / 640);
  fireEvent.keyDown(window, { ctrlKey: true, key: '0' });
  expect(result.current).toBe(viewBox);
  rerender(false); fireEvent.keyDown(window, { ctrlKey: true, key: '-' });
  expect(result.current).toBe(viewBox);
  unmount();
  const event = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, cancelable: true });
  window.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
});

it('prevents page zoom without changing a focused draft, and blocks the camera behind modals', () => {
  const onZoom = vi.fn(), onReset = vi.fn();
  renderHook(() => useRoomZoomKeys({ onZoom, onReset }));
  const input = document.createElement('input'); input.value = 'My unfinished task'; document.body.append(input); input.focus();
  const event = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true });
  input.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true); expect(onZoom).toHaveBeenCalledOnce();
  expect(input.value).toBe('My unfinished task'); expect(document.activeElement).toBe(input);
  const dialog = document.createElement('dialog'); dialog.setAttribute('open', ''); document.body.append(dialog);
  fireEvent.keyDown(window, { ctrlKey: true, key: '-' });
  fireEvent.keyDown(window, { ctrlKey: true, key: '0' });
  expect(onZoom).toHaveBeenCalledOnce(); expect(onReset).not.toHaveBeenCalled();
});

it('shares isometric limits and debounced persistence, cancels a pan, and resets the home camera', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useIsoCamera({ size: { w: 8, d: 6 }, saveView: true }));
  act(() => result.current.beginPan({ clientX: 0, clientY: 0, pointerId: 1 }));
  fireEvent.keyDown(window, { ctrlKey: true, key: '+' });
  const zoomed = { ...result.current.view };
  expect(zoomed.w).toBeCloseTo(640 / 1.12);
  act(() => result.current.commitPan()); expect(result.current.view).toEqual(zoomed);
  expect(localStorage.getItem('tasknook.isoView')).toBeNull();
  act(() => vi.advanceTimersByTime(300));
  expect(JSON.parse(localStorage.getItem('tasknook.isoView'))).toEqual(zoomed);
  fireEvent.keyDown(window, { ctrlKey: true, key: '0' });
  expect(result.current.view).toEqual({ x: 0, y: 0, w: 640, h: 480 });
});

it('does not save a visited isometric camera over the home view', () => {
  vi.useFakeTimers();
  localStorage.setItem('tasknook.isoView', JSON.stringify({ x: 15, y: 20, w: 500, h: 375 }));
  const before = localStorage.getItem('tasknook.isoView');
  const { result, unmount } = renderHook(() => useIsoCamera({ size: { w: 8, d: 6 }, saveView: false }));
  fireEvent.keyDown(window, { ctrlKey: true, key: '-' });
  expect(result.current.view.w).toBeCloseTo(640 * 1.12);
  act(() => vi.advanceTimersByTime(300)); unmount();
  expect(localStorage.getItem('tasknook.isoView')).toBe(before);
});
