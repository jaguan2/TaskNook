import { useCallback, useEffect, useRef, useState } from "react";
import { settleCommonGuest } from "./commonRooms";
import {
  advanceCommonPresence,
  createCommonPresence,
  createCommonPresences,
  joinCommonPresence,
} from "./commonPresence";

/**
 * Own the complete render-only lifecycle of common-place populations. The
 * application store composes entry/exit with its other destination rules, but
 * does not need to know how population deadlines or seat reservations work.
 */
export function useCommonPresence(showToast) {
  const [commonRoom, setCommonRoom] = useState(null);
  const commonRoomRef = useRef(null);
  const [commonPresence, setCommonPresence] = useState(() =>
    createCommonPresences()
  );
  const commonPresenceRef = useRef(commonPresence);

  const commitPresence = useCallback((next) => {
    commonPresenceRef.current = next;
    setCommonPresence(next);
  }, []);

  const enter = useCallback((sceneId) => {
    const presence = commonPresenceRef.current[sceneId] ||
      createCommonPresence(sceneId);
    const session = joinCommonPresence(presence);
    if (!session) return null;
    commonRoomRef.current = session;
    setCommonRoom(session);
    return session;
  }, []);

  const chooseSeat = useCallback((seatId) => {
    const previous = commonRoomRef.current;
    if (!previous) return null;
    const next = settleCommonGuest(previous, seatId);
    if (next === previous && previous.guestSeatId !== seatId) return false;
    commonRoomRef.current = next;
    setCommonRoom(next);
    return true;
  }, []);

  const leave = useCallback(() => {
    commonRoomRef.current = null;
    setCommonRoom(null);
  }, []);

  useEffect(() => {
    let timer = null;
    const schedule = () => {
      const deadlines = Object.values(commonPresenceRef.current)
        .map((presence) => presence?.nextChangeAt)
        .filter(Number.isFinite);
      if (!deadlines.length) return;
      timer = setTimeout(
        run,
        Math.max(0, Math.min(...deadlines) - Date.now())
      );
    };
    const run = () => {
      const now = Date.now();
      const current = commonPresenceRef.current;
      const visit = commonRoomRef.current;
      let changed = false;
      let joinedChange = null;
      const next = Object.fromEntries(
        Object.entries(current).map(([sceneId, presence]) => {
          const updated = advanceCommonPresence(presence, {
            now,
            reservedSeatId:
              visit?.sceneId === sceneId ? visit.guestSeatId : null,
          });
          if (updated !== presence) {
            changed = true;
            if (visit?.sceneId === sceneId) joinedChange = updated.change;
          }
          return [sceneId, updated];
        })
      );
      if (changed) commitPresence(next);
      if (visit) {
        const updated = next[visit.sceneId];
        if (updated && updated !== current[visit.sceneId]) {
          const session = { ...updated, guestSeatId: visit.guestSeatId };
          commonRoomRef.current = session;
          setCommonRoom(session);
        }
      }
      if (joinedChange) {
        const action = joinedChange.type === "joined" ? "joined us" : "headed home";
        showToast(`${joinedChange.person.label} ${action}`);
      }
      schedule();
    };
    schedule();
    return () => clearTimeout(timer);
  }, [commitPresence, showToast]);

  return {
    commonPresence,
    commonRoom,
    enterCommonPresence: enter,
    chooseCommonPresenceSeat: chooseSeat,
    leaveCommonPresence: leave,
  };
}
