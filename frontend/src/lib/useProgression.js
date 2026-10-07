import { useCallback, useEffect, useRef, useState } from "react";
import { readJSON, writeJSON } from "./storage";
import {
  PROGRESSION_KEY, normalizeProgression, recordLogin, recordNeighbourXP,
  rewardChallengeProgress, syncStudyXP,
} from "./progression";

export function useProgression(ready, onSaveError) {
  const [progression, setProgression] = useState(() => normalizeProgression(readJSON(PROGRESSION_KEY)));
  const progressRef = useRef(progression);
  const commit = useCallback((next) => {
    if (next === progressRef.current) return;
    progressRef.current = next;
    if (!writeJSON(PROGRESSION_KEY, next)) onSaveError?.("Couldn't save your XP — it's kept for this session.");
    setProgression(next);
  }, [onSaveError]);
  const syncStudy = useCallback((minutes) => commit(syncStudyXP(progressRef.current, minutes)), [commit]);
  const recordNeighbour = useCallback((username) => commit(recordNeighbourXP(progressRef.current, username)), [commit]);
  const recordChallenges = useCallback((before, after) => commit(rewardChallengeProgress(progressRef.current, before, after)), [commit]);
  const checkIn = useCallback(() => commit(recordLogin(progressRef.current)), [commit]);

  useEffect(() => {
    if (!ready) return undefined;
    checkIn();
    const visible = () => { if (!document.hidden) checkIn(); };
    // Opening/returning/using the app counts as a check-in. An unattended
    // window crossing midnight does not extend a login streak by itself.
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pointerdown", checkIn, { passive: true });
    window.addEventListener("keydown", checkIn);
    return () => {
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pointerdown", checkIn);
      window.removeEventListener("keydown", checkIn);
    };
  }, [ready, checkIn]);

  return { progression, syncStudy, recordNeighbour, recordChallenges };
}
