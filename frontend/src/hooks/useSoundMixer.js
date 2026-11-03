import { useCallback, useEffect, useRef, useState } from "react";
import { SOUND_CHANNELS, applyMix, normalizeSoundMix, setChannel } from "../services/audio";
import { readJSON, writeStored } from "../services/storage";

/** Persisted procedural-audio levels plus the Web Audio side effects. */
export function useSoundMixer() {
  const [soundMix, setSoundMixState] = useState(() => {
    try {
      return normalizeSoundMix(readJSON("tasknook.soundMix", {}));
    } catch {
      return {};
    }
  });
  const soundMixRef = useRef(soundMix);
  const saveTimer = useRef(null);
  soundMixRef.current = soundMix;

  useEffect(() => {
    if (!Object.values(soundMixRef.current).some((value) => value > 0)) return undefined;
    const resume = () => applyMix(soundMixRef.current);
    window.addEventListener("pointerdown", resume, { once: true });
    return () => window.removeEventListener("pointerdown", resume);
  }, []);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const applySoundPatch = useCallback((patch) => {
    const next = { ...soundMixRef.current };
    for (const [name, value] of Object.entries(patch)) {
      next[name] = Math.max(0, Math.min(1, Number(value) || 0));
    }
    soundMixRef.current = next;
    setSoundMixState(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      writeStored("tasknook.soundMix", JSON.stringify(soundMixRef.current));
    }, 250);
    for (const name of Object.keys(patch)) setChannel(name, next[name]);
  }, []);

  const setSoundLevel = useCallback(
    (name, value) => applySoundPatch({ [name]: value }),
    [applySoundPatch]
  );
  const stopAllSounds = useCallback(() => {
    const silence = {};
    for (const { key } of SOUND_CHANNELS) silence[key] = 0;
    applySoundPatch(silence);
  }, [applySoundPatch]);
  const applySoundMix = useCallback((mix) => {
    const next = {};
    for (const { key } of SOUND_CHANNELS) next[key] = mix?.[key] || 0;
    applySoundPatch(next);
  }, [applySoundPatch]);

  return { soundMix, setSoundLevel, stopAllSounds, applySoundMix };
}
