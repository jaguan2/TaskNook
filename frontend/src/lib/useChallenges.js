import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHALLENGES_KEY, addCustomChallenge, changeCustomProgress, normalizeChallenges,
  recordChallenge, removeCustomChallenge, replaceDailyChallenge, resetCustomChallenge,
} from "./challenges";
import { readJSON, writeJSON } from "./storage";

export function useChallenges(onSaveError, onProgress) {
  const [challenges, setChallenges] = useState(() =>
    normalizeChallenges(readJSON(CHALLENGES_KEY))
  );
  const progressRef = useRef(challenges);
  const commit = useCallback((next) => {
    if (next === progressRef.current) return;
    const previous = progressRef.current;
    progressRef.current = next;
    // Save in the action itself, outside React updaters/effects: closing the
    // window immediately after a successful action must retain its credit.
    if (!writeJSON(CHALLENGES_KEY, next)) onSaveError?.("Couldn't save challenges — progress is kept for this session.");
    setChallenges(next);
    onProgress?.(previous, next);
  }, [onSaveError, onProgress]);
  const recordChallengeEvent = useCallback((event, amount = 1) => {
    commit(recordChallenge(progressRef.current, event, amount));
  }, [commit]);
  const replaceChallenge = useCallback((id) => commit(replaceDailyChallenge(progressRef.current, id)), [commit]);
  const addChallenge = useCallback((draft) => {
    const id = `custom-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
    commit(addCustomChallenge(progressRef.current, draft, id));
  }, [commit]);
  const advanceChallenge = useCallback((id, delta = 1) => commit(changeCustomProgress(progressRef.current, id, delta)), [commit]);
  const resetChallenge = useCallback((id) => commit(resetCustomChallenge(progressRef.current, id)), [commit]);
  const removeChallenge = useCallback((id) => commit(removeCustomChallenge(progressRef.current, id)), [commit]);

  useEffect(() => {
    writeJSON(CHALLENGES_KEY, progressRef.current);
    const checkDay = () => commit(normalizeChallenges(progressRef.current));
    const onVisible = () => {
      if (document.visibilityState === "visible") checkDay();
    };
    // Reconcile on returning from a throttled/minimised window as well as
    // while open across midnight. Ordinary checks keep the same state object.
    const interval = setInterval(checkDay, 60_000);
    window.addEventListener("focus", checkDay);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkDay);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [commit]);

  return { challenges, recordChallengeEvent, replaceChallenge, addChallenge,
    advanceChallenge, resetChallenge, removeChallenge };
}
