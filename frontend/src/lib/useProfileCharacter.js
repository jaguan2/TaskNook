import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { validateCharacter, validateProfile } from "./profile";
import { readJSON, readStored, removeStored, writeStored } from "./storage";
import { createWriteQueue } from "./writeQueue";

const CHARACTER_KEY = "tasknook.character";
const CHARACTER_DIRTY_KEY = "tasknook.character.dirty";

/** Profile and resident persistence, including the character's recovery mirror. */
export function useProfileCharacter({ user, showToast }) {
  const [profile, setProfile] = useState({});
  const [character, setCharacter] = useState(() =>
    validateCharacter(readJSON(CHARACTER_KEY, null))
  );
  const profileRef = useRef(profile);
  const characterRef = useRef(character);
  const profileSaveVersion = useRef(0);
  const characterSaveVersion = useRef(0);
  const profileWriteRef = useRef(null);
  const characterWriteRef = useRef(null);

  if (!profileWriteRef.current) profileWriteRef.current = createWriteQueue(api.saveProfile);
  if (!characterWriteRef.current) characterWriteRef.current = createWriteQueue(api.saveProfile);

  useEffect(() => {
    profileRef.current = profile;
    characterRef.current = character;
  }, [profile, character]);

  // Profile is DB-only. Character has an instant-paint mirror plus a dirty
  // marker: if a save failed or the app closed before its PUT settled, the
  // newer device copy gets one chance to reach SQLite before the server copy
  // is allowed to replace it.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const profileVersion = profileSaveVersion.current;
      const version = characterSaveVersion.current;
      try {
        const data = await api.getProfile();
        const loadedProfile = validateProfile({ ...data?.profile, displayName: data?.displayName });
        if (profileVersion === profileSaveVersion.current) {
          profileRef.current = loadedProfile;
          setProfile(loadedProfile);
        }
        // A save may have completed while this older GET was in flight. Its
        // response must not repaint the character or start a duplicate sync.
        if (version !== characterSaveVersion.current) return;
        if (readStored(CHARACTER_DIRTY_KEY) === "1") {
          const mirror = readJSON(CHARACTER_KEY, null);
          if (mirror && typeof mirror === "object" && !Array.isArray(mirror)) {
            const recovered = validateCharacter(mirror);
            characterRef.current = recovered;
            setCharacter(recovered);
            await characterWriteRef.current({ character: recovered });
            if (version === characterSaveVersion.current) removeStored(CHARACTER_DIRTY_KEY);
            return;
          }
          // A marker without its snapshot cannot recover anything. Discard it
          // rather than replacing a valid server resident with the defaults.
          removeStored(CHARACTER_DIRTY_KEY);
        }
        const loadedCharacter = validateCharacter(data?.character);
        characterRef.current = loadedCharacter;
        setCharacter(loadedCharacter);
        writeStored(CHARACTER_KEY, JSON.stringify(loadedCharacter));
      } catch (err) {
        console.error("Failed to load profile:", err);
        // A plain GET failure is quiet because the mirror already painted a
        // resident. A pending recovery also attempted a WRITE, so it must say
        // that SQLite still has not caught up.
        if (
          version === characterSaveVersion.current &&
          readStored(CHARACTER_DIRTY_KEY) === "1"
        ) {
          showToast("Couldn't sync your saved character with the server 🌧️");
        }
      }
    })();
  }, [user, showToast]);

  /** Save part of the profile. Sections save independently — see test_profile.py. */
  const saveProfile = useCallback(async (patch) => {
    const version = ++profileSaveVersion.current;
    const next = validateProfile({ ...profileRef.current, ...patch });
    // Advance synchronously so a burst of patches composes rather than every
    // call reading the same pre-render snapshot.
    profileRef.current = next;
    setProfile(next);
    try {
      const { displayName, ...rest } = next;
      await profileWriteRef.current({
        ...(displayName ? { displayName } : {}),
        profile: rest,
      });
      return true;
    } catch (err) {
      console.error("Failed to save profile:", err);
      if (version === profileSaveVersion.current) {
        showToast("Couldn't save your profile 🌧️");
      }
      return false;
    }
  }, [showToast]);

  const saveCharacter = useCallback(async (patch) => {
    const version = ++characterSaveVersion.current;
    const next = validateCharacter({ ...characterRef.current, ...patch });
    characterRef.current = next;
    setCharacter(next);
    const mirrorSaved = writeStored(CHARACTER_KEY, JSON.stringify(next));
    const recoveryMarked = mirrorSaved && (
      writeStored(CHARACTER_DIRTY_KEY, "1") || readStored(CHARACTER_DIRTY_KEY) === "1"
    );
    try {
      await characterWriteRef.current({ character: next });
      if (version === characterSaveVersion.current) removeStored(CHARACTER_DIRTY_KEY);
      return true;
    } catch (err) {
      console.error("Failed to save character:", err);
      if (version === characterSaveVersion.current) {
        showToast(recoveryMarked
          ? "Couldn't save your character — it's still saved on this device 🌧️"
          : "Couldn't save your character, and this device couldn't keep a recovery copy 🌧️");
      }
      return false;
    }
  }, [showToast]);

  const getResidentIdentity = useCallback((fallbackName = "you") => ({
    character: characterRef.current,
    name: profileRef.current.displayName || fallbackName,
  }), []);

  return { profile, character, saveProfile, saveCharacter, getResidentIdentity };
}
