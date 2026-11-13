// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useRoomEditHistory } from './useRoomEditHistory';
afterEach(cleanup);

it('bounds history, invalidates redo after a new edit, and resets with the account', () => {
  const room = { current: { w: 8, d: 8, placements: [] } }, save = vi.fn();
  const { result, rerender } = renderHook(key => useRoomEditHistory(room, save, key), { initialProps: 'one' });
  const commit = result.current.commit;
  for (let i = 0; i < 45; i++) act(() => result.current.commit(prev => ({ ...prev, w: prev.w + 1 })));
  expect(result.current.commit).toBe(commit);
  for (let i = 0; i < 40; i++) act(() => result.current.undo());
  expect(room.current.w).toBe(13);
  expect(result.current.canUndo).toBe(false);
  expect(result.current.canRedo).toBe(true);
  act(() => result.current.redo());
  expect(room.current.w).toBe(14);
  act(() => result.current.commit(prev => ({ ...prev, d: 10 })));
  expect(result.current.canRedo).toBe(false);
  rerender('two');
  expect(result.current.canUndo).toBe(false);
});

it('groups slider writes and skips no-ops', () => {
  const room = { current: { w: 8, d: 8, placements: [] } }, save = vi.fn();
  const { result } = renderHook(() => useRoomEditHistory(room, save, 'account'));
  act(() => result.current.commit(prev => prev));
  expect(save).not.toHaveBeenCalled();
  for (const color of ['#112233', '#223344', '#334455']) act(() => result.current.commit(prev => ({ ...prev, wallColors: { left: color } }), 'wall:colour'));
  expect(save).toHaveBeenCalledTimes(3);
  act(() => result.current.undo());
  expect(room.current.wallColors).toBeUndefined();
  expect(result.current.canUndo).toBe(false);
  act(() => result.current.redo());
  expect(room.current.wallColors.left).toBe('#334455');
});
