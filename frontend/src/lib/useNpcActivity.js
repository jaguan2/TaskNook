import { useEffect, useState } from "react";
import { npcActivity } from "./visiting";

// A clock local to this NPC: changing their pose must not tick the room,
// store, furniture or the user's focus timer. Idle has no activity prop.
export function useNpcActivity(username, ownActivity = null) {
  const [snapshot, setSnapshot] = useState(() => ({
    username, state: username ? npcActivity(username, Date.now()).state : null,
  }));
  useEffect(() => {
    if (!username) return undefined;
    const update = () => {
      const state = npcActivity(username, Date.now()).state;
      setSnapshot((prev) => prev.username === username && prev.state === state
        ? prev : { username, state });
    };
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [username]);
  if (!username) return ownActivity;
  const state = snapshot.username === username ? snapshot.state : npcActivity(username, Date.now()).state;
  return state === "idle" ? null : state;
}
