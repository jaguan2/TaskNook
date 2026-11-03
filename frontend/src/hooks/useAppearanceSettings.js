import { useCallback, useEffect, useState } from "react";
import { MOTION_MODES, applyMotionMode } from "../lib/motion";
import { COLOR_SCHEME_KEYS, normalizeBrightness, normalizeHex } from "../lib/palette";
import {
  readJSON,
  readStored,
  removeStored,
  writeJSON,
  writeStored,
} from "../services/storage";

const HUD_VIS_MODES = ["on", "faded", "hidden"];
const DEFAULT_HUD_VISIBILITY = {
  timer: "on",
  tasks: "on",
  music: "on",
  clock: "on",
  chat: "on",
};

/** Owns persisted display preferences and their one DOM-side effect. */
export function useAppearanceSettings() {
  const [widgetMode, setWidgetModeState] = useState(
    () => readStored("tasknook.widgetMode") === "1"
  );
  const [brightness, setBrightnessState] = useState(() =>
    normalizeBrightness(readStored("tasknook.brightness"))
  );
  const [colorScheme, setColorSchemeState] = useState(() => {
    const saved = readStored("tasknook.colorScheme");
    return COLOR_SCHEME_KEYS.includes(saved) ? saved : "plum";
  });
  const [customColor, setCustomColorState] = useState(
    () => normalizeHex(readStored("tasknook.customColor")) || "#d98a93"
  );
  const [customSurface, setCustomSurfaceState] = useState(() =>
    normalizeHex(readStored("tasknook.customSurface"))
  );
  const [backdropStyle, setBackdropStyleState] = useState(() =>
    readStored("tasknook.backdrop") === "solid" ? "solid" : "gradient"
  );
  const [motionMode, setMotionModeState] = useState(() => {
    const saved = readStored("tasknook.motion");
    return MOTION_MODES.includes(saved) ? saved : "auto";
  });
  const [hudVisibility, setHudVisibilityState] = useState(() => {
    const saved = readJSON("tasknook.hudVisibility", {});
    const merged = { ...DEFAULT_HUD_VISIBILITY };
    for (const key of Object.keys(DEFAULT_HUD_VISIBILITY)) {
      if (HUD_VIS_MODES.includes(saved?.[key])) merged[key] = saved[key];
    }
    return merged;
  });

  const setWidgetMode = useCallback((value) => {
    const next = Boolean(value);
    setWidgetModeState(next);
    writeStored("tasknook.widgetMode", next ? "1" : "0");
  }, []);
  const setBrightness = useCallback((value) => {
    const clean = normalizeBrightness(value);
    setBrightnessState(clean);
    writeStored("tasknook.brightness", String(clean));
  }, []);
  const setColorScheme = useCallback((scheme) => {
    if (!COLOR_SCHEME_KEYS.includes(scheme)) return;
    setColorSchemeState(scheme);
    writeStored("tasknook.colorScheme", scheme);
  }, []);
  const setCustomColor = useCallback((hex) => {
    setCustomColorState(hex);
    writeStored("tasknook.customColor", hex);
    setColorScheme("custom");
  }, [setColorScheme]);
  const setCustomSurface = useCallback((hex) => {
    const clean = hex === null ? null : normalizeHex(hex);
    setCustomSurfaceState(clean);
    if (clean === null) removeStored("tasknook.customSurface");
    else writeStored("tasknook.customSurface", clean);
    setColorScheme("custom");
  }, [setColorScheme]);
  const setBackdropStyle = useCallback((style) => {
    if (style !== "gradient" && style !== "solid") return;
    setBackdropStyleState(style);
    writeStored("tasknook.backdrop", style);
  }, []);
  const setMotionMode = useCallback((mode) => {
    if (!MOTION_MODES.includes(mode)) return;
    setMotionModeState(mode);
    writeStored("tasknook.motion", mode);
    applyMotionMode(mode);
  }, []);
  const setHudVisibility = useCallback((key, mode) => {
    if (!(key in DEFAULT_HUD_VISIBILITY) || !HUD_VIS_MODES.includes(mode)) return;
    setHudVisibilityState((previous) => {
      const next = { ...previous, [key]: mode };
      writeJSON("tasknook.hudVisibility", next);
      return next;
    });
  }, []);
  const setAllHudVisibility = useCallback((mode) => {
    if (!HUD_VIS_MODES.includes(mode)) return;
    const next = Object.fromEntries(
      Object.keys(DEFAULT_HUD_VISIBILITY).map((key) => [key, mode])
    );
    writeJSON("tasknook.hudVisibility", next);
    setHudVisibilityState(next);
  }, []);

  useEffect(() => {
    applyMotionMode(motionMode);
    if (motionMode !== "auto") return undefined;
    let query;
    try {
      query = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      return undefined;
    }
    const onChange = () => applyMotionMode("auto");
    if (query.addEventListener) query.addEventListener("change", onChange);
    else query.addListener(onChange);
    return () => {
      if (query.removeEventListener) query.removeEventListener("change", onChange);
      else query.removeListener(onChange);
    };
  }, [motionMode]);

  return {
    widgetMode,
    setWidgetMode,
    brightness,
    setBrightness,
    colorScheme,
    setColorScheme,
    customColor,
    setCustomColor,
    customSurface,
    setCustomSurface,
    backdropStyle,
    setBackdropStyle,
    motionMode,
    setMotionMode,
    hudVisibility,
    setHudVisibility,
    setAllHudVisibility,
  };
}
