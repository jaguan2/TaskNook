import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHALLENGES_KEY, CHALLENGES_ENABLED_KEY, addCustomChallenge, changeCustomProgress, normalizeChallenges,
  recordChallenge, removeCustomChallenge, replaceDailyChallenge, resetCustomChallenge,
} from "../lib/challenges";
import { readJSON, readStored, writeJSON, writeStored } from "../services/storage";

export function useChallenges(onSaveError, onProgress) {
  const [challengesEnabled, setEnabled] = useState(() => readStored(CHALLENGES_ENABLED_KEY) !== '0');
  const enabledRef = useRef(challengesEnabled);
  const [challenges, setChallenges] = useState(() =>
    normalizeChallenges(readJSON(CHALLENGES_KEY))
  );
  const progressRef = useRef(challenges);
  const commit = useCallback((next) => {
    if (!enabledRef.current) return;
    if (next === progressRef.current) return;
    const previous = progressRef.current;
    progressRef.current = next;
    // Save in the action itself, outside React updaters/effects: closing the
    // window immediately after a successful action must retain its credit.
    if (!writeJSON(CHALLENGES_KEY, next)) onSaveError?.("Couldn't save challenges — progress is kept for this session.");
    setChallenges(next);
    onProgress?.(previous, next);
  }, [onSaveError, onProgress]);
  const setChallengesEnabled = useCallback((enabled) => {
    if (typeof enabled !== 'boolean' || enabled === enabledRef.current) return;
    // The ref gates actions immediately, including later calls in this event.
    enabledRef.current = enabled;
    if (!writeStored(CHALLENGES_ENABLED_KEY, enabled ? '1' : '0')) onSaveError?.("Couldn't save the challenge setting — changed for this session.");
    setEnabled(enabled);
    if (enabled) commit(normalizeChallenges(progressRef.current));
  }, [commit, onSaveError]);
  const recordChallengeEvent = useCallback((event, amount = 1) => {
    if (!enabledRef.current) return;
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
    if (!challengesEnabled) return undefined;
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
  }, [commit, challengesEnabled]);

  return { challenges, challengesEnabled, setChallengesEnabled, recordChallengeEvent, replaceChallenge, addChallenge,
    advanceChallenge, resetChallenge, removeChallenge };
}
