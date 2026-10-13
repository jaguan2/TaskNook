import { useCallback, useRef, useState } from "react";
import { readJSON, writeJSON } from "./storage";
import { LOOK_NAME_MAX, SAVED_LOOK_LIMIT, saveLookSnapshot, validateSavedLooks } from "./savedLooks";

const STORAGE_KEY = "tasknook.characterLooks";

export function useSavedLooks(showToast) {
  const [savedLooks, setLooks] = useState(() => validateSavedLooks(readJSON(STORAGE_KEY, [])));
  const current = useRef(savedLooks);
  const commit = useCallback((next) => {
    if (!writeJSON(STORAGE_KEY, next)) { showToast("Couldn't save your outfits on this device"); return false; }
    current.current = next;
    setLooks(next);
    return true;
  }, [showToast]);
  const saveCharacterLook = useCallback((label, character) => {
    const next = saveLookSnapshot(current.current, label, character);
    if (!next) {
      showToast(typeof label !== "string" || !label.trim() || label.trim().length > LOOK_NAME_MAX
        ? `Give this outfit a name up to ${LOOK_NAME_MAX} characters`
        : `You have ${SAVED_LOOK_LIMIT} saved outfits — remove one first`);
      return false;
    }
    return commit(next);
  }, [commit, showToast]);
  const removeCharacterLook = useCallback((key) => commit(current.current.filter((look) => look.key !== key)), [commit]);
  return { savedLooks, saveCharacterLook, removeCharacterLook };
}
