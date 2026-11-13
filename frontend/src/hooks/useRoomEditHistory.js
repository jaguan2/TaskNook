import { useEffect, useReducer, useRef } from 'react';
import { applyRoomEditChanges, mergeRoomEditChanges, roomEditChanges } from '../lib/roomEditHistory';
import { useEventCallback } from './useEventCallback';

/** Session-local editing history. The existing room setter remains the only
 * persistence path; automatic updates do not become editor transactions. */
export function useRoomEditHistory(roomRef, setRoom, resetKey) {
  const history = useRef({ past: [], future: [] });
  const [, refresh] = useReducer(value => value + 1, 0);
  useEffect(() => {
    history.current = { past: [], future: [] };
    refresh();
  }, [resetKey]);
  const commit = useEventCallback((update, group = null) => {
    const before = roomRef.current;
    const after = typeof update === 'function' ? update(before) : update;
    if (!after || before === after) return;
    const changes = roomEditChanges(before, after);
    if (!changes.length) return;
    const state = history.current, previous = state.past.at(-1), now = Date.now();
    if (group && previous?.group === group && now - previous.time < 700) {
      previous.changes = mergeRoomEditChanges(previous.changes, changes);
      previous.time = now;
      if (!previous.changes.length) state.past.pop();
    } else {
      state.past.push({ changes, group, time: now });
      if (state.past.length > 40) state.past.shift();
    }
    state.future = [];
    roomRef.current = after;
    setRoom(after);
    refresh();
  });
  const step = useEventCallback(direction => {
    const state = history.current;
    const from = direction === 'before' ? state.past : state.future;
    const to = direction === 'before' ? state.future : state.past;
    const entry = from.pop();
    if (!entry) return;
    const next = applyRoomEditChanges(roomRef.current, entry.changes, direction);
    to.push({ ...entry, group: null });
    roomRef.current = next;
    setRoom(next);
    refresh();
  });
  const undo = useEventCallback(() => step('before'));
  const redo = useEventCallback(() => step('after'));
  return { commit, undo, redo, canUndo: !!history.current.past.length, canRedo: !!history.current.future.length };
}
