import { useCallback, useRef } from "react";

/**
 * Stable function identity with the current implementation behind it. This is
 * for context actions whose closures legitimately change with store state: the
 * consumer should not re-render merely because the command was refreshed.
 */
export function useEventCallback(callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  return useCallback((...args) => callbackRef.current(...args), []);
}
