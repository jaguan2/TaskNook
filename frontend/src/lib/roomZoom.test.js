import { describe, expect, it } from 'vitest';
import { roomZoomAction, ROOM_ZOOM_STEP, zoomRoomView } from './roomZoom';

describe('room zoom shortcuts', () => {
  it.each([['+', 'in'], ['=', 'in'], ['-', 'out'], ['_', 'out'], ['0', 'reset']])('handles Control + %s', (key, action) => {
    expect(roomZoomAction({ ctrlKey: true, key })).toBe(action);
    expect(roomZoomAction({ metaKey: true, key })).toBe(action);
  });
  it('accepts keypad zoom and leaves normal typing, AltGr and IME alone', () => {
    expect(roomZoomAction({ ctrlKey: true, code: 'NumpadAdd' })).toBe('in');
    expect(roomZoomAction({ ctrlKey: true, code: 'NumpadSubtract' })).toBe('out');
    for (const event of [{ key: '+' }, { ctrlKey: true, altKey: true, key: '+' },
      { ctrlKey: true, isComposing: true, key: '+' }, { ctrlKey: true, key: 'd' },
      { ctrlKey: true, code: 'Numpad0', key: 'Insert' }]) expect(roomZoomAction(event)).toBeNull();
  });
});

describe('bounded camera zoom', () => {
  const view = { x: 40, y: -20, w: 640, h: 480 };
  it('keeps a panned view centred and restores it after one step each way', () => {
    const centre = { x: 360, y: 220 };
    const zoomed = zoomRoomView(view, 1 / ROOM_ZOOM_STEP, centre, 220, 1600);
    expect(zoomed.x + zoomed.w / 2).toBeCloseTo(centre.x);
    expect(zoomed.y + zoomed.h / 2).toBeCloseTo(centre.y);
    expect(zoomed.w / zoomed.h).toBeCloseTo(4 / 3);
    const back = zoomRoomView(zoomed, ROOM_ZOOM_STEP, centre, 220, 1600);
    for (const key of ['x', 'y', 'w', 'h']) expect(back[key]).toBeCloseTo(view[key]);
  });
  it('preserves a wheel anchor and applies limits before computing the offset', () => {
    const anchor = { x: 520, y: 60 };
    for (const [factor, width] of [[.01, 220], [100, 2400]]) {
      const next = zoomRoomView(view, factor, anchor, 220, 2400);
      expect(next.w).toBe(width);
      expect((anchor.x - next.x) / next.w).toBeCloseTo((anchor.x - view.x) / view.w);
      expect((anchor.y - next.y) / next.h).toBeCloseTo((anchor.y - view.y) / view.h);
    }
  });
});
