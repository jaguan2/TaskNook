import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { api, getToken, setReauthorizer, setToken } from "./lib/api";
import { readJSON, readStored, removeStored, writeJSON, writeStored } from "./lib/storage";
import { toISO } from "./lib/dates";
import { timeOfDayNow } from "./lib/daylight";
import { ALGORITHM_KEYS, applyAlgorithm, shuffledIds } from "./lib/algorithms";
import { normalizeHex } from "./lib/palette";
import { validateCharacter, validateProfile } from "./lib/profile";
import { KNOCK_WAIT_MS, resolveVisitRoom } from "./lib/visiting";
import { BOND_POINTS, clampBond, levelFor } from "./lib/friendship";
import {
  MESSAGE_MAX,
  botReply,
  breakNudgeLine,
  dailyCheckIn,
  groupResponders,
  nudgeSpeaker,
  replyDelayMs,
  replyToOption,
} from "./lib/chat";
// One unprompted message a day, marked per device. See `deliverCheckIn`.
const CHECKIN_KEY = "tasknook.chat.checkin";
import { balance as unlockBalance, canAfford, costOf, owns, validateUnlocked } from "./lib/unlocks";
import { MOTION_MODES, applyMotionMode } from "./lib/motion";
import { SOUND_CHANNELS, applyMix, setChannel } from "./lib/audio";
import { resolveMusicLink, stationKey } from "./lib/musicLink";
import {
  locateBrowser,
  searchPlaces,
  fetchCurrentWeather,
  nextRandomWeather,
  RANDOM_WEATHER_INTERVAL_MS,
} from "./lib/weather";
import {
  MAX_ITEMS,
  newPlacement,
  presetPlacements,
  validatePlacements,
} from "./lib/room";
import {
  ISO_ITEMS,
  ISO_MAX_ITEMS,
  clampIsoPlacement,
  defaultIsoLayout,
  findFreeSpot,
  footOf,
  footprintFree,
  isoPresetLayout,
  freeSeatSpot,
  newIsoPlacement,
  nextRot,
  PET_TEMPERS,
  cleanPetName,
  isStorableLook,
  validateIsoLayout,
} from "./lib/isoRoom";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

// The two ambience axes, whitelisted because both are restored from
// localStorage and both index into lookup tables in the scene components.
const WEATHER_MODES = ["off", "cloudy", "rain", "leaves", "snow", "storm"];
const TIMES_OF_DAY = ["night", "sunset", "day"];

// Which persistent HUD surfaces a viewer can dial back — "on" (default),
// "faded" (dimmed but still there/interactive), or "hidden" (visibility:
// hidden, same convention as the decorating chrome fade — never unmounted,
// so nothing replays its .intro-chrome boot animation on return).
const HUD_VIS_MODES = ["on", "faded", "hidden"];
const DEFAULT_HUD_VISIBILITY = { timer: "on", tasks: "on", music: "on", clock: "on", chat: "on" };

const LOCAL_ACCOUNT = { username: "you", password: "tasknook-local-cottage" };

// A few cozy lofi streams to start with; users can add their own via YouTube or Spotify link.
// Stored as video ids, not playlist ids. Links like ...&list=RD<id> are
// YouTube's auto-generated "radio" mixes, and RD… lists refuse to load in an
// iframe embed — the underlying video plays fine.
// The two "lofi ... radio" LIVE streams were removed 2026-07 — they refused
// to play in the embedded player (user-verified), while regular videos and
// playlists work fine.
// SPOTIFY stations behave differently from YouTube ones, and the difference is
// a trade, not an upgrade: the embed brings its own transport, so you can skip
// between tracks on an album (which a single YouTube video can't do) — but
// Spotify's embed keeps playback to itself, so TaskNook's own bar can't drive
// it and won't show a position, and an embed plays 30-second PREVIEWS unless
// the listener is signed in to Spotify Premium in that browser. That's why the
// YouTube version of the same set stays in the list rather than being replaced:
// one plays in full for everyone, the other is skippable.
// An `artist` link deliberately isn't accepted (`lib/spotify.js`) — only
// playlist/album/track/show/episode have an embed that plays.
const BUILT_IN_STATIONS = [
  { provider: "youtube", id: "4xDzrJKXOOY", label: "synthwave radio 🌃" },
  { provider: "youtube", id: "foEjHAkrIDA", label: "secret cafe r&b ☕" },
  { provider: "youtube", id: "mWI10M1M7JM", label: "jazzy chillhop 🧺" },
  { provider: "youtube", id: "WPfOjN8aY-Y", label: "weathering with you 🌦️" },
  {
    provider: "youtube",
    kind: "playlist",
    id: "PLwzQP2wCE5w5_L9yjomQyX2CMFa0T-pw_",
    label: "homework music 📝",
  },
  {
    provider: "spotify",
    kind: "album",
    id: "1c5jK2Zo2yKEHGmSedVbwE",
    label: "secret cafe r&b ☕ (skippable)",
  },
];

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  // Set only when the local-account bootstrap itself fails — App shows a real
  // error screen instead of silently rendering an empty cottage.
  const [bootError, setBootError] = useState(false);

  // One transient toast at a time (latest wins) — the shared "something went
  // wrong" channel. Failures must never be console-only: the UI otherwise
  // keeps looking like the action worked.
  // `ms` is how long it stays: 4s suits a failure you've just caused and are
  // looking at, but the break nudge arrives unprompted while your eyes are on
  // the work, so it asks for longer. Every toast is dismissible either way —
  // clicking it is faster than waiting.
  const [toast, setToast] = useState(null); // { id, message }
  const toastTimer = useRef(null);
  const showToast = useCallback((message, ms = 4000) => {
    setToast({ id: Date.now(), message });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);
  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const [tasks, setTasks] = useState([]);
  const [friends, setFriends] = useState([]);
  const [stats, setStats] = useState({
    tasksTotal: 0,
    tasksDone: 0,
    // List-wide (tasksTotal/tasksDone/completion) vs today-only
    // (tasksDoneToday/focusMinutesToday) — see build_stats in app.py.
    tasksDoneToday: 0,
    completion: 0,
    focusMinutesToday: 0,
  });
  const [sessionDays, setSessionDays] = useState({});
  const sessionDaysRef = useRef(sessionDays);
  sessionDaysRef.current = sessionDays;
  // Furniture bought with focus minutes. Mirrored to localStorage for an
  // instant paint, same as the room layout; the server copy wins on boot.
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return validateUnlocked(readJSON("tasknook.unlocked", []));
    } catch {
      return [];
    }
  });
  const [algorithm, setAlgorithm] = useState(() => {
    // Whitelist: TaskPanel indexes ALGORITHMS[algorithm] directly, so an
    // unknown stored key would crash the panel.
    const saved = readStored("tasknook.algo");
    return ALGORITHM_KEYS.includes(saved) ? saved : "custom";
  });

  // Which task the focus timer is pointed at. The TIMER ITSELF lives in
  // timer.jsx, its own provider — its 1Hz tick used to rebuild this context
  // every second and re-render every consumer in the app, whether or not it
  // showed a clock. Which task is active is task-domain state though, and
  // removeTask has to be able to clear it, so it stays here.
  const [activeTaskId, setActiveTaskId] = useState(null);

  // ---- Ambient ----
  // Persisted (and whitelisted) exactly like timeOfDay. It wasn't, and that
  // quietly broke the Weather-conditions matrix, whose whole point is that ONE
  // tap sets BOTH axes: pick "cloudy night", relaunch, and only the night came
  // back.
  const [weatherMode, setWeatherModeState] = useState(() => {
    const saved = readStored("tasknook.weatherMode");
    return WEATHER_MODES.includes(saved) ? saved : "off";
  });
  // Per-channel ambience volumes (rain, storm, snow, wind, fireplace, cafe,
  // paper).
  // Slider positions persist; actual audio only starts from a user gesture.
  const [soundMix, setSoundMixState] = useState(() => {
    try {
      const saved = readJSON("tasknook.soundMix", {});
      return saved && typeof saved === "object" ? saved : {};
    } catch {
      return {};
    }
  });
  const soundMixRef = useRef(soundMix);
  soundMixRef.current = soundMix;
  // Web Audio can't start until the user interacts with the page, so a saved
  // mix resumes on the first click/tap rather than on load.
  useEffect(() => {
    if (!Object.values(soundMixRef.current).some((v) => v > 0)) return undefined;
    const resume = () => applyMix(soundMixRef.current);
    window.addEventListener("pointerdown", resume, { once: true });
    return () => window.removeEventListener("pointerdown", resume);
  }, []);
  // Set several channels at once. Side effects (audio, mirror write) stay
  // OUTSIDE the setState updater — updaters must be pure, and StrictMode's
  // double-invoke would otherwise fire them twice. The ref carries the
  // freshest mix so back-to-back calls in one tick compose correctly.
  // The mix write is debounced, the AUDIO is not. A drag fires one of these per
  // pointer event, and `writeStored` is a synchronous serialise-and-write; the
  // only thing that needs to survive is the final value, whereas the gain change
  // and the state update have to be immediate or you can hear the lag.
  const mixSaveTimer = useRef(null);
  useEffect(() => () => clearTimeout(mixSaveTimer.current), []);
  const applySoundPatch = useCallback((patch) => {
    const next = { ...soundMixRef.current };
    for (const [name, v] of Object.entries(patch)) {
      next[name] = Math.max(0, Math.min(1, Number(v) || 0));
    }
    soundMixRef.current = next;
    setSoundMixState(next);
    clearTimeout(mixSaveTimer.current);
    mixSaveTimer.current = setTimeout(() => {
      // From the ref, so the last write always carries the latest mix.
      writeStored("tasknook.soundMix", JSON.stringify(soundMixRef.current));
    }, 250);
    for (const name of Object.keys(patch)) setChannel(name, next[name]);
  }, []);
  const setSoundLevel = useCallback(
    (name, v) => applySoundPatch({ [name]: v }),
    [applySoundPatch]
  );
  const stopAllSounds = useCallback(() => {
    const silence = {};
    for (const { key } of SOUND_CHANNELS) silence[key] = 0;
    applySoundPatch(silence);
  }, [applySoundPatch]);
  const [timeOfDay, setTimeOfDayState] = useState(() => {
    const saved = readStored("tasknook.timeOfDay");
    return TIMES_OF_DAY.includes(saved) ? saved : "night";
  });
  // Follow the wall clock, with no location and no network. Separate from
  // "Match my real weather" on purpose: that one needs geolocation, a fetch, and
  // your acceptance of the real weather visual — three things to want in order to
  // get the one thing most people are after, which is that the room is dark when
  // it's dark out.
  const [autoTimeOfDay, setAutoTimeOfDayState] = useState(
    () => readStored("tasknook.timeOfDay.auto") === "1"
  );
  // Settings → "Music on startup" — default true (today's long-standing
  // behavior: pick up where you left off). Read directly alongside musicOn's
  // own initializer rather than depending on a separate state's init order.
  const [autoResumeMusic, setAutoResumeMusicState] = useState(
    () => readStored("tasknook.autoResumeMusic") !== "0"
  );
  const setAutoResumeMusic = useCallback((value) => {
    setAutoResumeMusicState(value);
    writeStored("tasknook.autoResumeMusic", value ? "1" : "0");
  }, []);
  // Persisted, so the transport bar comes back after a relaunch cued where
  // the music stopped — closing the app shouldn't cost you your station.
  // Gated on autoResumeMusic: with it off, a session that ended with music
  // playing must still boot silent — "off" has to mean off, every time.
  const [musicOn, setMusicOn] = useState(
    () =>
      readStored("tasknook.music.on") === "1" &&
      readStored("tasknook.autoResumeMusic") !== "0"
  );

  // Widget Mode: the whole app collapses to just the (already-draggable)
  // focus card floating over a plain backdrop — meant to sit alongside other
  // work, not replace the cottage. Persisted like dockCollapsed/musicOn,
  // since leaving it on and relaunching (esp. paired with Always On Top on
  // desktop) is the exact use case.
  const [widgetMode, setWidgetModeState] = useState(
    () => readStored("tasknook.widgetMode") === "1"
  );
  const setWidgetMode = useCallback((value) => {
    setWidgetModeState(value);
    writeStored("tasknook.widgetMode", value ? "1" : "0");
  }, []);

  // ---- Real-world weather ----
  const [realWeather, setRealWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState("idle"); // idle | loading | ready | error
  const [weatherError, setWeatherError] = useState("");
  // Candidate places from the last city search, when the name matched more
  // than one. Empty means nothing to disambiguate.
  const [weatherPlaces, setWeatherPlaces] = useState([]);
  const [weatherLocationLabel, setWeatherLocationLabel] = useState(
    () => readStored("tasknook.weather.location") || ""
  );
  const [autoMatchWeather, setAutoMatchWeather] = useState(
    () => readStored("tasknook.weather.automatch") === "1"
  );
  // Weather that drifts on its own, like the real thing — no location, no
  // network, unlike "Match my real weather" above. Owns weatherMode the same
  // way auto-match and a manual pick do, so all three stay mutually
  // exclusive: only one thing may be driving the sky at a time.
  const [autoRandomWeather, setAutoRandomWeather] = useState(
    () => readStored("tasknook.weather.random") === "1"
  );
  const weatherCoordsRef = useRef(
    (() => {
      try {
        const c = readJSON("tasknook.weather.coords", null);
        // Shape-check: a corrupt cache would build latitude=undefined URLs
        // and error forever with no recovery path.
        return c && Number.isFinite(c.lat) && Number.isFinite(c.lon) ? c : null;
      } catch {
        return null;
      }
    })()
  );
  const autoMatchRef = useRef(autoMatchWeather);
  // So a random-weather roll (fired from inside a setTimeout) always steps
  // from the CURRENT condition, not one captured when the effect last ran —
  // without pulling weatherMode into that effect's deps, which would tear
  // down and restart the whole schedule on every roll.
  const weatherModeRef = useRef(weatherMode);
  const [weatherPresets, setWeatherPresets] = useState(() => {
    try {
      const saved = readJSON("tasknook.weather.presets", []);
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  // ---- Daily goal ----
  // Target focus minutes per day; drives the goal ring + streak in the Tasks
  // panel and the chip under the focus card.
  const [dailyGoal, setDailyGoalState] = useState(() => {
    const saved = Number(readStored("tasknook.dailyGoal"));
    return saved >= 15 && saved <= 960 ? saved : 120;
  });
  const setDailyGoal = (minutes) => {
    const clamped = Math.min(960, Math.max(15, Math.round(Number(minutes) || 120)));
    setDailyGoalState(clamped);
    writeStored("tasknook.dailyGoal", String(clamped));
  };

  // ---- Settings ----
  const [brightness, setBrightnessState] = useState(
    () => Number(readStored("tasknook.brightness")) || 1
  );
  const [colorScheme, setColorSchemeState] = useState(
    () => readStored("tasknook.colorScheme") || "plum"
  );
  // Base colour for the "custom" scheme; the full ramp is derived from its
  // hue/saturation (see lib/palette.js). Defaults to the classic plum rose.
  // normalizeHex on load: a corrupt value would derive "NaN NaN NaN" for
  // every theme variable and unstyle the whole app with no way back.
  const [customColor, setCustomColorState] = useState(
    () => normalizeHex(readStored("tasknook.customColor")) || "#d98a93"
  );
  // The custom scheme's backdrop hue — null means "follow the accent",
  // which is everything the one-colour custom scheme ever did. Stored
  // separately so the two can differ (teal accent on warm brown surfaces).
  const [customSurface, setCustomSurfaceState] = useState(() =>
    normalizeHex(readStored("tasknook.customSurface"))
  );

  // How much the room is allowed to move. "auto" follows the OS preference,
  // which is what everything did before there was a setting at all — the
  // other two let someone have a calm room without changing their whole
  // system, or keep the room alive despite a system-wide preference they set
  // for something else.
  const [motionMode, setMotionModeState] = useState(() => {
    const saved = readStored("tasknook.motion");
    return MOTION_MODES.includes(saved) ? saved : "auto";
  });
  const setMotionMode = useCallback((mode) => {
    if (!MOTION_MODES.includes(mode)) return;
    setMotionModeState(mode);
    writeStored("tasknook.motion", mode);
    applyMotionMode(mode);
  }, []);
  // Keep the attribute honest if the OS preference changes mid-session while
  // we're on "auto" — index.html only set it once, at boot.
  useEffect(() => {
    applyMotionMode(motionMode);
    if (motionMode !== "auto") return undefined;
    let mq;
    try {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      return undefined;
    }
    const onChange = () => applyMotionMode("auto");
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [motionMode]);

  // Per-element HUD fade/hide (Settings). Merged against the default shape
  // rather than trusted whole — an older save (or a hand-edited one) missing
  // a key must still yield "on" for that key, not undefined.
  const [hudVisibility, setHudVisibilityState] = useState(() => {
    const saved = readJSON("tasknook.hudVisibility", {});
    const merged = { ...DEFAULT_HUD_VISIBILITY };
    for (const key of Object.keys(DEFAULT_HUD_VISIBILITY)) {
      if (HUD_VIS_MODES.includes(saved?.[key])) merged[key] = saved[key];
    }
    return merged;
  });
  const setHudVisibility = useCallback((key, mode) => {
    if (!(key in DEFAULT_HUD_VISIBILITY) || !HUD_VIS_MODES.includes(mode)) return;
    setHudVisibilityState((prev) => {
      const next = { ...prev, [key]: mode };
      writeJSON("tasknook.hudVisibility", next);
      return next;
    });
  }, []);

  const [customStations, setCustomStations] = useState(() => {
    try {
      const saved = readJSON("tasknook.music.custom", []);
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [activeStationKey, setActiveStationKey] = useState(
    () => readStored("tasknook.music.station") || stationKey(BUILT_IN_STATIONS[0])
  );
  // Memoised so its identity is stable: a fresh array every render made every
  // consumer's effect deps change on any store update at all.
  const musicStations = useMemo(
    () => [...BUILT_IN_STATIONS, ...customStations],
    [customStations]
  );
  // A saved key that no longer resolves — a built-in was retired (two lofi
  // streams were), or a custom station removed — used to leave the transport
  // bar rendering NOTHING: no controls, and no ✕ to stop the music. Always
  // resolve to a station that actually exists.
  const activeStation =
    musicStations.find((s) => stationKey(s) === activeStationKey) || musicStations[0];
  const resolvedStationKey = stationKey(activeStation);

  // ---------- Profile & character ----------
  // The profile is DB-only (it's typed once and it's small). The character has
  // a mirror because the iso room draws it on the very first frame, and a
  // resident that appears with default hair and then changes reads as a glitch.
  const [profile, setProfile] = useState({});
  const [character, setCharacter] = useState(() => {
    try {
      return validateCharacter(readJSON("tasknook.character", null));
    } catch {
      return validateCharacter(null); // corrupted mirror — the classic resident
    }
  });

  // ---------- Room (freeform decoration) ----------
  // The layout lives in the DB (rides the migration/backup system) with a
  // localStorage mirror so the room paints instantly on boot.
  const [roomPlacements, setRoomPlacements] = useState(() => {
    try {
      const saved = validatePlacements(
        readJSON("tasknook.room", null)
      );
      if (saved) return saved;
    } catch {
      /* corrupted mirror — fall through to the default preset */
    }
    return presetPlacements("default");
  });
  const [roomEditMode, setRoomEditMode] = useState(false);
  // The isometric room's own layout: { w, d, placements } — decorated when
  // the iso view is active, persisted alongside the flat layout.
  const [isoRoom, setIsoRoom] = useState(() => {
    try {
      const saved = validateIsoLayout(
        readJSON("tasknook.isoRoom", null)
      );
      if (saved) return saved;
    } catch {
      /* corrupted mirror — fall through */
    }
    return defaultIsoLayout();
  });
  const isoRef = useRef(isoRoom);
  // The user's own size preference for the scene, multiplied onto the
  // responsive base size. A display preference, so it stays device-local
  // (localStorage) rather than in the DB.
  const [roomScale, setRoomScaleState] = useState(() => {
    const saved = Number(readStored("tasknook.roomScale"));
    return saved >= 0.6 && saved <= 1.2 ? saved : 1;
  });
  const setRoomScale = useCallback((value) => {
    const clamped = Math.min(1.2, Math.max(0.6, Number(value) || 1));
    setRoomScaleState(clamped);
    writeStored("tasknook.roomScale", String(clamped));
  }, []);
  // Experimental: swap the flat scene for the static isometric mock (the
  // first look at the future Sims-style room). Decorating is disabled while
  // previewing — the mock has no placement engine yet.
  // The isometric room is the DEFAULT scene (user decision — the flat 2D
  // cottage is the opt-in throwback now).
  const [isoPreview, setIsoPreviewState] = useState(
    () => readStored("tasknook.isoPreview") !== "0"
  );
  const setIsoPreview = useCallback((on) => {
    setIsoPreviewState(!!on);
    writeStored("tasknook.isoPreview", on ? "1" : "0");
  }, []);

  // ---------- Isometric room actions ----------
  const moveIsoItem = useCallback((id, gx, gy) => {
    setIsoRoom((prev) => {
      // Bail out when nothing moved. Positions snap to HALF TILES — about 25-30
      // screen pixels — so the large majority of the 60-120 pointermoves in a
      // drag resolve to the coordinates the item already has. Building a new
      // layout for those rebuilt the whole store context (re-rendering every
      // useStore consumer: the dock, the to-do list, the music bar, every open
      // panel, and RoomPanel's ~132 catalog sprites, which is necessarily on
      // screen while you drag) and re-ran the save effect: two whole-layout
      // JSON.stringify calls plus two SYNCHRONOUS localStorage writes, per
      // pointer event. Returning `prev` unchanged means React bails on the
      // identical reference and none of that happens.
      const cur = prev.placements.find((p) => p.id === id);
      if (!cur || (cur.gx === gx && cur.gy === gy)) return prev;
      return {
        ...prev,
        placements: prev.placements.map((p) => (p.id === id ? { ...p, gx, gy } : p)),
      };
    });
  }, []);
  // The id of the most recently added iso item — the scene auto-selects it
  // so the user can see what just appeared.
  const [lastIsoAddedId, setLastIsoAddedId] = useState(null);
  // Buying a piece. The balance is derived (focus minutes earned minus the
  // cost of what's owned) rather than stored, so it can never drift out of
  // step with the sessions it came from.
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;
  const unlockItem = useCallback(
    (key) => {
      const have = unlockedRef.current;
      if (owns(have, key)) return;
      if (!canAfford(sessionDaysRef.current, have, key)) {
        showToast(`${costOf(key)} focused minutes unlocks that one ✨`);
        return;
      }
      const next = [...have, key];
      unlockedRef.current = next;
      setUnlocked(next);
      writeStored("tasknook.unlocked", JSON.stringify(next));
      api.saveUnlocks(next).catch((err) => {
        console.error("Failed to save unlocks:", err);
        showToast("Couldn't save that unlock — it's still yours on this device 🌧️");
      });
    },
    [showToast]
  );

  const addIsoItem = useCallback(
    (key) => {
      const prev = isoRef.current;
      // Both refusals used to be a bare `return` — the only actions in the app
      // that failed without saying anything, so the button just looked dead.
      if (prev.placements.length >= ISO_MAX_ITEMS) {
        showToast(`That's all ${ISO_MAX_ITEMS} pieces — put something away first 🪴`);
        return;
      }
      // Inert while the store is empty (owns() is true for every free piece);
      // it's the guard that stops a premium item being placed without buying.
      if (!owns(unlockedRef.current, key)) {
        showToast(`${costOf(key)} focused minutes unlocks that one ✨`);
        return;
      }
      // `unique` pieces are singletons — there is only one of you. Without
      // this the picker happily added a second: it drew, it saved, and then
      // `validateIsoLayout` silently dropped it on the next boot, which is
      // the "furniture vanished with no word" failure this codebase already
      // learned to avoid once.
      if (ISO_ITEMS[key]?.unique && prev.placements.some((p) => p.item === key)) {
        showToast("There's only one of you 🙋");
        return;
      }
      const placement = newIsoPlacement(key, prev.placements, prev);
      if (!placement) {
        showToast("No floor free for that one — paint more tiles or try something smaller 🧩");
        return;
      }
      setIsoRoom({ ...prev, placements: [...prev.placements, placement] });
      setLastIsoAddedId(placement.id);
      setRoomEditMode(true);
    },
    [showToast]
  );
  const removeIsoItem = useCallback((id) => {
    setIsoRoom((prev) => ({
      ...prev,
      placements: prev.placements.filter((p) => p.id !== id),
    }));
  }, []);
  // Mirror-rotation: the footprint transposes, so re-clamp in the new
  // orientation (and wall items hop to the other wall).
  //
  // Clamping alone is NOT enough. `clampIsoPlacement` is bounds-only by design
  // ("mask validity is the caller's job"), and a transposed footprint can be
  // perfectly in bounds while lying across void tiles — so a turn near a painted
  // away region left the piece hanging over the hole. The drag engine then
  // refuses any target that isn't fully on floor, so every small nudge was
  // silently ignored and the item read as stuck; the invalid layout was saved,
  // and the next reload teleported it somewhere else without a word. That is the
  // failure `newIsoPlacement` was already fixed for, and it is reachable in the
  // shipped default room — the Loft is L-shaped, and ~5% of legal positions for
  // a bed, sofa, desk, bookcase or stairs strand on one turn.
  // Computed OUTSIDE the updater, like addIsoItem: updaters must stay pure
  // (StrictMode double-invokes them), and this one toasts on refusal.
  const rotateIsoItem = useCallback(
    (id) => {
      const prev = isoRef.current;
      let refused = false;
      const placements = prev.placements.map((p) => {
        if (p.id !== id) return p;
        // Four facings for seating that ships a back view, two for everything
        // else (and for wall decor, where rot picks the wall, not a facing).
        const rot = nextRot(p.item, p.rot);
        const { rot: _dropped, ...rest } = p;
        const at = clampIsoPlacement(p.item, p.gx, p.gy, prev, rot);
        const turned = { ...rest, ...(rot && { rot }), ...at };
        // Wall decor is glued to a wall by the clamp and never covers floor,
        // so the mask doesn't apply to it.
        if (ISO_ITEMS[p.item]?.wall) return turned;
        if (footprintFree(at.gx, at.gy, footOf(p.item, rot), prev)) return turned;
        // Prefer to keep the turn and move the piece, since the turn is what
        // was asked for. Only if the drawn floor has nowhere to put it does
        // the rotation get refused outright.
        const spot = findFreeSpot(p.item, rot, prev, at.gx, at.gy, prev.placements);
        if (spot) return { ...turned, ...spot };
        refused = true;
        return p;
      });
      if (refused) {
        // Same rule as the item cap and the reshape drops: a refusal the user
        // can see beats a control that silently does nothing.
        showToast("No room to turn that piece — the floor's too tight 🌿");
        return;
      }
      const next = { ...prev, placements };
      isoRef.current = next;
      setIsoRoom(next);
    },
    [showToast]
  );
  const setIsoItemTint = useCallback((id, tint) => {
    setIsoRoom((prev) => ({
      ...prev,
      placements: prev.placements.map((p) => {
        if (p.id !== id) return p;
        if (!tint) {
          const { tint: _dropped, ...rest } = p;
          return rest;
        }
        return { ...p, tint };
      }),
    }));
  }, []);
  // Reshaping the room runs the layout back through the validator, and the
  // validator is allowed to DELETE: wall art has nowhere to hang outdoors, and
  // a floor that just shrank may have no free spot left for a piece. That's
  // the right behaviour, but it used to happen in total silence — furniture
  // you owned vanished with no word, which reads as data loss rather than a
  // consequence of what you just did. Same rule as the item cap: a refusal
  // gets a toast.
  const reshapeIso = useCallback(
    // Also computed outside the updater — the toast is a side effect, and
    // StrictMode's double-invoke would otherwise run it twice per reshape.
    (change, lost) => {
      const prev = isoRef.current;
      const next = validateIsoLayout({ ...prev, ...change });
      const gone = prev.placements.length - next.placements.length;
      if (gone > 0) showToast(lost(gone, gone === 1 ? "piece" : "pieces"));
      isoRef.current = next;
      setIsoRoom(next);
    },
    [showToast]
  );
  const setIsoSize = useCallback(
    (w, d) =>
      reshapeIso({ w, d }, (n, s) => `The smaller floor had no room for ${n} ${s} 📦`),
    [reshapeIso]
  );
  // Environment swap; validation drops wall decor where there's no full wall.
  const setIsoEnv = useCallback(
    (env) =>
      reshapeIso({ env }, (n, s) => `Nothing to hang ${n} wall ${s} on out here 🖼️`),
    [reshapeIso]
  );
  // Walls decoupled from the floor: each floor sets a default, this overrides
  // it. Same reshape path as env — turning walls off drops wall decor, and
  // that deletion must be announced.
  const setIsoWalls = useCallback(
    (walls) =>
      reshapeIso({ walls }, (n, s) => `Nothing to hang ${n} wall ${s} on without walls 🖼️`),
    [reshapeIso]
  );
  // Floor-plan painting (irregular shapes): toggle one tile of the mask.
  const setIsoTile = useCallback(
    // Outside the updater like the others — doubly important here, because
    // drag-to-draw fires this on every pointerenter, making it the
    // highest-frequency toaster in the app. Advancing isoRef synchronously is
    // what lets a fast stroke's next tile build on this one instead of on the
    // last rendered mask.
    (x, y, on) => {
      const prev = isoRef.current;
      const rows = (
        prev.mask || Array.from({ length: prev.d }, () => "1".repeat(prev.w))
      ).map((r) => r.split(""));
      if (!rows[y] || rows[y][x] === undefined) return;
      rows[y][x] = on ? "1" : "0";
      const mask = rows.map((r) => r.join(""));
      // Refuse to paint away the last floor tile — a room must exist.
      if (!mask.some((r) => r.includes("1"))) return;
      const next = validateIsoLayout({ ...prev, mask });
      // Erasing a tile relocates what stood on it, but with nowhere left to
      // go the piece is dropped — say so, since a drag-to-erase gesture can
      // cross a lot of tiles quickly.
      const gone = prev.placements.length - next.placements.length;
      if (gone > 0) {
        showToast(
          `Nowhere left to put ${gone} ${gone === 1 ? "piece" : "pieces"} — ${
            gone === 1 ? "it's" : "they're"
          } gone 📦`
        );
      }
      isoRef.current = next;
      setIsoRoom(next);
    },
    [showToast]
  );
  const resetIsoShape = useCallback(
    () => setIsoRoom((prev) => validateIsoLayout({ ...prev, mask: undefined })),
    []
  );
  // Presets replace the whole iso layout, floor size included (validated so
  // preset `cuts` shorthand becomes a mask immediately).
  // "Put me in the room" — one `you` placement.
  //
  // DERIVED from the layout, never stored beside it. A separate persisted
  // flag was the obvious design and it drifted immediately: delete your
  // character with the ✕ in decorate mode and the flag still said "on", so
  // the toggle claimed you were in a room you weren't in, the next preset
  // resurrected someone you'd deliberately removed, and un-checking the box
  // did nothing visible (it only cleared the flag). The placement is also
  // the half that's server-backed, while a flag would be device-local — on
  // the desktop build those are two different lifetimes.
  const selfInRoom = isoRoom.placements.some((p) => p.item === "you");
  /** Add or remove the single `you`, leaving everything else untouched. */
  const withSelf = useCallback((layout, wanted) => {
    const has = layout.placements.some((p) => p.item === "you");
    if (wanted === has) return layout;
    if (!wanted) {
      return { ...layout, placements: layout.placements.filter((p) => p.item !== "you") };
    }
    // The cap applies here too: appended past it, `you` is the LAST placement
    // and therefore exactly the one validation truncates on the next load.
    if (layout.placements.length >= ISO_MAX_ITEMS) return null;
    const placement = newIsoPlacement("you", layout.placements, layout);
    if (!placement) return null; // genuinely nowhere to stand
    // Seated life: arriving in your room means taking a seat — the first
    // free one (or soft ground); the spawn-on-free-floor placement above
    // survives as the no-seat fallback.
    const seatAt = freeSeatSpot(layout.placements, "you");
    const seated = seatAt ? { ...placement, gx: seatAt.gx, gy: seatAt.gy } : placement;
    return { ...layout, placements: [...layout.placements, seated] };
  }, []);
  const setSelfInRoom = useCallback(
    (on) => {
      const prev = isoRef.current;
      const next = withSelf(prev, on);
      // null means we WANTED to add one and couldn't. An unchanged layout is
      // a different thing entirely — you're already where you asked to be.
      if (next === null) {
        showToast("No room for you right now — free up a piece or paint more tiles 🧩");
        return;
      }
      if (next !== prev) setIsoRoom(next);
    },
    [withSelf, showToast]
  );

  const applyIsoPreset = useCallback(
    // A preset replaces the layout wholesale, so carry `you` across —
    // otherwise trying a room silently evicts you from it. Read the PREVIOUS
    // layout for that intent; it's the same truth the toggle reads.
    (key) => {
      const wanted = isoRef.current.placements.some((p) => p.item === "you");
      const base = validateIsoLayout(isoPresetLayout(key));
      const carried = withSelf(base, wanted);
      // null = you were in the old room and this one has nowhere to stand.
      // The preset still applies (it's what was asked for), but a silent
      // eviction is the exact failure the reshape toasts exist to prevent.
      // Unreachable with the shipped presets — this is for a full custom room.
      if (carried === null)
        showToast("No space for you in that room — add yourself back once there's floor 🧩");
      const next = carried ?? base;
      isoRef.current = next;
      setIsoRoom(next);
    },
    [withSelf, showToast]
  );
  const roomRef = useRef(roomPlacements);
  // Read inside the save actions so a rapid second edit merges onto the latest
  // value rather than the one captured when the callback was created. The save
  // actions also advance these synchronously; this effect is the backstop that
  // catches the OTHER writer — the server-load effect, which calls the setters
  // directly.
  const profileRef = useRef(profile);
  const characterRef = useRef(character);
  // Who YOU are, for code that runs on a timer: a scheduled bot reply has to
  // know which members are "the others", and the closure that scheduled it may
  // be several renders stale by the time it fires.
  const userRef = useRef(user);
  // Same reason: the check-in and the break nudge both fire from timers and
  // need the CURRENT friend list, not whichever one was in scope when the
  // interval was created.
  const friendsRef = useRef(friends);
  useEffect(() => {
    profileRef.current = profile;
    characterRef.current = character;
    userRef.current = user;
    friendsRef.current = friends;
  }, [profile, character, user, friends]);
  const roomSaveTimer = useRef(null);
  // Applying server state on boot must not immediately echo back as a "save".
  const roomSkipSave = useRef(true);

  // Refs first, and unconditionally: the mirrors must track the layouts even on
  // the boot pass that skips saving.
  useEffect(() => {
    roomRef.current = roomPlacements;
  }, [roomPlacements]);
  useEffect(() => {
    isoRef.current = isoRoom;
  }, [isoRoom]);

  // The two mirrors are written by SEPARATE effects, each depending on its own
  // layout. Together in one effect, a flat-cottage drag re-stringified the
  // (up to 150-placement) iso layout on every pointer event and vice versa —
  // one of the two serializations was always wasted.
  //
  // The mirror is written SYNCHRONOUSLY — inside the debounce it sat behind a
  // cleanup-cancellable timer, so closing the window within 600ms of a drag lost
  // the edit from the mirror AND the server (the skipped save that looks like a
  // success). Don't re-debounce it.
  useEffect(() => {
    if (roomSkipSave.current) return;
    writeStored("tasknook.room", JSON.stringify(roomPlacements));
  }, [roomPlacements]);
  useEffect(() => {
    if (roomSkipSave.current) return;
    writeStored("tasknook.isoRoom", JSON.stringify(isoRoom));
  }, [isoRoom]);

  // ONE debounced PUT for both, since they travel together on the wire. It reads
  // the refs rather than the closure so it always sends the latest of each, and
  // clears the boot-skip flag once (it guards the mirrors above too, so it can
  // only be cleared after they've had their chance to run).
  useEffect(() => {
    if (roomSkipSave.current) {
      roomSkipSave.current = false;
      return undefined;
    }
    clearTimeout(roomSaveTimer.current);
    roomSaveTimer.current = setTimeout(() => {
      api.saveRoom(roomRef.current, isoRef.current).catch((err) => {
        console.error("Failed to save room layout:", err);
        showToast("Couldn't save the room — it's still safe on this device 🌧️");
      });
    }, 600);
    return () => clearTimeout(roomSaveTimer.current);
  }, [roomPlacements, isoRoom, showToast]);

  // ---------- Bootstrap session ----------
  // TaskNook is a single-user local app (SQLite file on this machine), so
  // there's no real account system to speak of — instead of a login screen,
  // sign into (or create, on first launch) one fixed local account.
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user } = await api.me();
          setUser(user);
          setBooting(false);
          return;
        } catch {
          setToken(null);
        }
      }
      try {
        const { token, user } = await api.login(LOCAL_ACCOUNT);
        setToken(token);
        setUser(user);
      } catch {
        try {
          const { token, user } = await api.register({
            ...LOCAL_ACCOUNT,
            displayName: "You",
          });
          setToken(token);
          setUser(user);
        } catch {
          // A concurrent bootstrap (e.g. React StrictMode's double effect
          // invocation in dev) may have just created the account — one more try.
          try {
            const { token, user } = await api.login(LOCAL_ACCOUNT);
            setToken(token);
            setUser(user);
          } catch (err) {
            console.error("Failed to set up the local TaskNook account:", err);
            setBootError(true);
          }
        }
      }
      setBooting(false);
    })();
  }, []);

  // Teach api.js how to get a fresh token when one is pruned mid-session. Same
  // login-or-register as boot; registered once, and it returns the token so the
  // interrupted call can be replayed.
  useEffect(() => {
    setReauthorizer(async () => {
      try {
        const { token, user } = await api.login(LOCAL_ACCOUNT);
        setToken(token);
        setUser(user);
        return token;
      } catch {
        try {
          const { token, user } = await api.register({
            ...LOCAL_ACCOUNT,
            displayName: "You",
          });
          setToken(token);
          setUser(user);
          return token;
        } catch (err) {
          console.error("Couldn't re-authenticate the local account:", err);
          return null;
        }
      }
    });
    return () => setReauthorizer(null);
  }, []);

  const refreshAll = useCallback(async () => {
    // listTasks goes FIRST, on its own — not in the Promise.all. GET /api/tasks
    // is what lazily resets daily routines, so a stats query racing alongside it
    // could be answered from the pre-reset rows: on the first refresh of a new
    // day the panel showed yesterday's completion (100%, "1 done") beside a list
    // that had already reset. It self-corrected on the next refresh, which is
    // exactly what makes it easy to miss.
    const t = await api.listTasks();
    const [s, f, d] = await Promise.all([
      api.stats(),
      api.listFriends(),
      api.sessionDays(),
    ]);
    setTasks(t);
    setStats(s);
    setFriends(f);
    setSessionDays(d);
  }, []);

  /**
   * Refresh only what a TASK write can have changed.
   *
   * A checkbox tick used to cost five round trips: the PUT, then `refreshAll`'s
   * four GETs — including the friends aggregation, which a task of yours cannot
   * possibly affect, and the per-day session map, which only a logged focus
   * block changes.
   *
   * The listTasks-first ordering is preserved deliberately, for the same reason
   * `refreshAll` documents above: GET /api/tasks is what lazily resets daily
   * routines, so a stats query racing alongside it can be answered from
   * pre-reset rows and show yesterday's completion for a moment on the first
   * refresh of a new day.
   */
  const refreshTasks = useCallback(async () => {
    const t = await api.listTasks();
    const s = await api.stats();
    setTasks(t);
    setStats(s);
  }, []);

  /** A logged focus block also moves the per-day map the streak and heatmap read. */
  const refreshFocus = useCallback(async () => {
    const [s, d] = await Promise.all([api.stats(), api.sessionDays()]);
    setStats(s);
    setSessionDays(d);
  }, []);

  useEffect(() => {
    if (user)
      refreshAll().catch(() =>
        showToast("Couldn't load your data — is the backend running? 🌧️")
      );
  }, [user, refreshAll, showToast]);


  // Reconcile the room with the server once signed in: the DB copy wins (it
  // survives cleared browser storage); if the DB has none yet, adopt this
  // device's layout so nothing the user arranged is lost.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await api.getRoom();
        const server = validatePlacements(data?.placements);
        const serverIso = validateIsoLayout(data?.iso);
        // A null server copy means "never saved" — the one case where this
        // device's layout should be adopted. An EMPTY layout is a real,
        // deliberate choice and must win; testing `.length` would silently
        // restore defaults over a room the user emptied on purpose.
        if (server || serverIso) {
          roomSkipSave.current = true;
          if (server) {
            setRoomPlacements(server);
            writeStored("tasknook.room", JSON.stringify(server));
          }
          if (serverIso) {
            setIsoRoom(serverIso);
            writeStored("tasknook.isoRoom", JSON.stringify(serverIso));
          }
        }
        if (!server || !serverIso) {
          // Push whatever half the server is missing (first run, or a save
          // from before the iso room existed).
          await api.saveRoom(server || roomRef.current, serverIso || isoRef.current);
        }
      } catch (err) {
        // This block also WRITES (pushing a first-run/legacy layout to the
        // server), so a failure here must not be console-only.
        console.error("Failed to load room layout:", err);
        showToast("Couldn't sync your room with the server 🌧️");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Unlocked furniture: the server copy wins on boot, and a first-run account
  // with none gets whatever the local mirror had (same rule as the room).
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { unlocked: server } = await api.getUnlocks();
        const clean = validateUnlocked(server);
        if (clean.length) {
          unlockedRef.current = clean;
          setUnlocked(clean);
          writeStored("tasknook.unlocked", JSON.stringify(clean));
        } else if (unlockedRef.current.length) {
          await api.saveUnlocks(unlockedRef.current);
        }
      } catch (err) {
        // Read-only failure: the mirror still has them, so don't shout.
        console.error("Failed to load unlocks:", err);
      }
    })();
  }, [user]);

  // Profile & character: unlike the room there's no local-first mirror to
  // reconcile — a profile is typed once and lives in the DB. The mirror exists
  // only so the resident draws with YOUR face on the very first paint instead
  // of flashing the default and swapping a moment later.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await api.getProfile();
        setProfile(validateProfile({ ...data?.profile, displayName: data?.displayName }));
        const chr = validateCharacter(data?.character);
        setCharacter(chr);
        writeStored("tasknook.character", JSON.stringify(chr));
      } catch (err) {
        // Read-only failure: the mirror already painted a resident, so this is
        // not worth a toast.
        console.error("Failed to load profile:", err);
      }
    })();
  }, [user]);

  /** Save part of the profile. Sections save independently — see test_profile.py. */
  const saveProfile = useCallback(
    async (patch) => {
      const next = validateProfile({ ...profileRef.current, ...patch });
      // Advance the ref SYNCHRONOUSLY, not just via the effect below. The
      // effect runs after render, so a burst of edits in one tick would every
      // one of them read the same pre-burst value and overwrite each other —
      // six picks in a row kept only the last.
      profileRef.current = next;
      setProfile(next); // optimistic: the form must not lag a keystroke behind
      try {
        const { displayName, ...rest } = next;
        await api.saveProfile({
          ...(displayName ? { displayName } : {}),
          profile: rest,
        });
      } catch (err) {
        console.error("Failed to save profile:", err);
        showToast("Couldn't save your profile 🌧️");
      }
    },
    [showToast]
  );

  const saveCharacter = useCallback(
    async (patch) => {
      const next = validateCharacter({ ...characterRef.current, ...patch });
      characterRef.current = next; // synchronous — see saveProfile
      setCharacter(next);
      // Mirror first: the room redraws from this immediately, and a failed
      // request shouldn't undo a choice the user can see on screen.
      writeStored("tasknook.character", JSON.stringify(next));
      try {
        await api.saveProfile({ character: next });
      } catch (err) {
        console.error("Failed to save character:", err);
        showToast("Couldn't save your character — it's still saved on this device 🌧️");
      }
    },
    [showToast]
  );

  // ---------- Task actions ----------
  const addTask = async (payload) => {
    await api.createTask(payload);
    await refreshTasks();
  };
  // Fire-and-forget UI actions: swallow + log so a failed request can't surface
  // as an unhandled promise rejection from an onClick handler.
  const toggleTask = async (task) => {
    try {
      await api.updateTask(task.id, { completed: !task.completed });
      await refreshTasks();
    } catch (err) {
      console.error("Failed to toggle task:", err);
      showToast("Couldn't save that change 🌧️");
    }
  };
  const editTask = async (id, payload) => {
    try {
      await api.updateTask(id, payload);
      await refreshTasks();
    } catch (err) {
      console.error("Failed to update task:", err);
      showToast("Couldn't save that change 🌧️");
    }
  };
  const removeTask = async (id) => {
    try {
      if (activeTaskId === id) setActiveTaskId(null);
      await api.deleteTask(id);
      await refreshTasks();
    } catch (err) {
      console.error("Failed to delete task:", err);
      showToast("Couldn't delete the task 🌧️");
    }
  };
  const reorderTasks = async (orderedActive) => {
    // Persist new manual positions and switch to custom ordering.
    setTasks((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      const reordered = orderedActive.map((t) => map.get(t.id) || t);
      const rest = prev.filter((t) => !orderedActive.find((o) => o.id === t.id));
      return [...reordered, ...rest];
    });
    setAlgorithm("custom");
    writeStored("tasknook.algo", "custom");
    try {
      await api.reorderTasks(orderedActive.map((t) => t.id));
      await refreshTasks();
    } catch (err) {
      console.error("Failed to save the task order:", err);
      showToast("Couldn't save the new order 🌧️");
    }
  };

  // ---------- Task groups (VC2-style to-do headers) ----------
  // Group names live on the tasks themselves (Task.group_name); this local
  // list only exists so a freshly created EMPTY group has somewhere to be
  // until its first task arrives.
  const [emptyGroups, setEmptyGroups] = useState(() => {
    try {
      const saved = readJSON("tasknook.taskGroups", []);
      return Array.isArray(saved) ? saved.filter((g) => typeof g === "string") : [];
    } catch {
      return [];
    }
  });
  const persistEmptyGroups = (next) => {
    setEmptyGroups(next);
    writeStored("tasknook.taskGroups", JSON.stringify(next));
  };
  // Walks every recorded day, on a map that grows for as long as the app is
  // used — and it was recomputed on every provider render.
  const balance = useMemo(() => unlockBalance(sessionDays, unlocked), [sessionDays, unlocked]);
  const taskGroups = useMemo(
    () => [...new Set([...tasks.map((t) => t.group).filter(Boolean), ...emptyGroups])],
    [tasks, emptyGroups]
  );
  const addTaskGroup = (name) => {
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed || taskGroups.includes(trimmed)) return false;
    persistEmptyGroups([...emptyGroups, trimmed]);
    return true;
  };
  const removeTaskGroup = async (name) => {
    persistEmptyGroups(emptyGroups.filter((g) => g !== name));
    const affected = tasks.filter((t) => t.group === name);
    if (!affected.length) return;
    try {
      await Promise.all(affected.map((t) => api.updateTask(t.id, { group: null })));
      // A group change is a task write like any other — it can't move the
      // friends list or the per-day session map, so it pays the narrow price.
      await refreshTasks();
    } catch (err) {
      console.error("Failed to ungroup tasks:", err);
      showToast("Couldn't ungroup those tasks 🌧️");
    }
  };
  const toggleRoutine = (task) => editTask(task.id, { routine: !task.routine });

  const [randomOrder, setRandomOrder] = useState([]);
  // The CHOICE of "random" is persisted, but the shuffle itself never was —
  // so relaunching with Random selected left randomOrder empty and every task
  // ranked equal, silently falling back to plain position order until the
  // button was clicked again. Seed a shuffle as soon as there's anything to
  // shuffle. (Re-clicking Random still reshuffles; that's its whole job.)
  useEffect(() => {
    if (algorithm !== "random" || randomOrder.length || !tasks.length) return;
    setRandomOrder(shuffledIds(tasks));
  }, [algorithm, tasks, randomOrder.length]);

  const chooseAlgorithm = (key) => {
    setAlgorithm(key);
    writeStored("tasknook.algo", key);
    // Re-shuffle every time Random is picked, including clicking it again
    // while it's already active — that's the whole point of the button.
    if (key === "random") setRandomOrder(shuffledIds(tasks));
  };

  // `applyAlgorithm` sorts the whole list. Unmemoised it re-sorted on every
  // provider render — which includes every store change anywhere in the app —
  // and handed consumers a new array each time, so nothing downstream could
  // memo on it either.
  const orderedTasks = useMemo(
    () => applyAlgorithm(algorithm, tasks, { randomOrder }),
    [algorithm, tasks, randomOrder]
  );
  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId) || null,
    [tasks, activeTaskId]
  );

  // The focus-timer engine (countdown/stopwatch, pomodoro cycle, session
  // logging) moved to timer.jsx — see the note on activeTaskId above.

  // ---------- Ambient ----------
  // Weather quick-picks drive ONLY the visual (overlay + cottage window).
  // Sound is the mixer's business — picking a rainy scene without rain audio
  // is a legitimate mood, so the two never auto-couple.
  // Internal appliers: what auto-match calls. The PUBLIC setters below are
  // what the UI calls, and a manual pick switches auto-match OFF — otherwise
  // the 15-minute refresh silently overwrites the user's choice and the two
  // settings fight each other.
  const applyWeatherVisual = (nextMode) => {
    setWeatherModeState(nextMode);
    writeStored("tasknook.weatherMode", nextMode);
  };
  const applyTimeOfDay = (mode) => {
    setTimeOfDayState(mode);
    writeStored("tasknook.timeOfDay", mode);
  };
  const setWeather = (nextMode) => {
    if (autoMatchRef.current) setAutoMatchWeather(false);
    // A hand-picked condition has to switch random weather off too, or the
    // next scheduled roll silently overwrites it a half hour later.
    setAutoRandomWeather(false);
    applyWeatherVisual(nextMode);
  };
  const setTimeOfDay = (mode) => {
    if (autoMatchRef.current) setAutoMatchWeather(false);
    // A hand-picked hour has to switch the clock off too, or the next tick
    // silently overwrites it — the same fight auto-match already had.
    setAutoTimeOfDay(false);
    applyTimeOfDay(mode);
  };

  // Mutually exclusive with auto-match, which also owns the time of day and does
  // it better when it's available (real sunrise/sunset knows your latitude and
  // the season; these are fixed bands). Layering them would just mean two
  // writers racing over one value.
  const setAutoTimeOfDay = (on) => {
    setAutoTimeOfDayState(on);
    writeStored("tasknook.timeOfDay.auto", on ? "1" : "0");
    if (on) {
      if (autoMatchRef.current) setAutoMatchWeather(false);
      applyTimeOfDay(timeOfDayNow());
    }
  };
  // ---------- Friendship (simulated social) ----------
  // The bond tally: username → points. lib/friendship.js owns what points are
  // worth and what the levels mean; this owns only the impure half — the
  // per-device tally in localStorage, and WHEN points accrue (a message sent,
  // a door stepped through, minutes spent in a friend's room). Per-device
  // rather than a DB column for the same reason the check-in marker is: the
  // whole feature is client-side theater, and the server never hears of it.
  const [friendship, setFriendship] = useState(() => {
    const saved = readJSON("tasknook.friendship", {});
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    const clean = {};
    for (const [name, pts] of Object.entries(saved)) {
      const n = clampBond(pts);
      if (n > 0) clean[name] = n;
    }
    return clean;
  });
  // Persisted by effect, not inside the updater — updaters must stay pure
  // (StrictMode double-invokes them; same rule the dock's toggle follows).
  useEffect(() => {
    writeJSON("tasknook.friendship", friendship);
  }, [friendship]);
  const addBond = useCallback((username, points) => {
    if (!username || !points) return;
    setFriendship((prev) => ({
      ...prev,
      [username]: clampBond((prev[username] || 0) + points),
    }));
  }, []);
  // Read inside reply timers, which fire long after the closure that made
  // them — same staleness rule as userRef/friendsRef.
  const friendshipRef = useRef(friendship);
  useEffect(() => {
    friendshipRef.current = friendship;
  }, [friendship]);
  const bondLevelOf = useCallback(
    (username) => levelFor(friendshipRef.current[username] || 0).level,
    []
  );

  // ---------- Visiting friends' rooms (simulated social) ----------
  // The scene swap is all this owns: fetch what the friend has stored, let
  // lib/visiting derive the rest (their home, their look, you as the guest),
  // and hand IsoRoom a read-only layout + personas. Never persisted.
  const [visiting, setVisiting] = useState(null);
  // Which friend's door is being knocked on (the invite-only wait).
  const [knockingId, setKnockingId] = useState(null);
  const knockTimer = useRef(null);
  // One visit in flight at a time: two rapid Visit clicks otherwise race two
  // fetches, and whichever RESOLVES last wins — potentially landing you in
  // the first friend's room after clicking the second.
  const visitBusyRef = useRef(false);
  // Walk orders are invisible until you know your character is grabbable, so
  // teach it ONCE PER DEVICE. This was a ref, which meant every launch, and a
  // tip you've already read is nagging. Shared by both rooms — whichever you
  // meet first, your own island or a friend's, is where you learn it.
  const hintWalk = useCallback(() => {
    if (readStored("tasknook.walkHinted") === "1") return;
    writeStored("tasknook.walkHinted", "1");
    showToast("Pick your little self up and set them on any seat 🪑", 4000);
  }, [showToast]);
  // At home the hint has no arrival to hang off, so it waits for the one moment
  // it's true: booted, not visiting, not decorating (a drag means something
  // else in there), and there is actually somebody standing in the room to
  // walk. Advice about a character you haven't placed is just noise.
  useEffect(() => {
    if (booting || visiting || roomEditMode || !isoPreview) return;
    if (!isoRoom.placements.some((p) => ISO_ITEMS[p.item]?.persona)) return;
    hintWalk();
  }, [booting, visiting, roomEditMode, isoPreview, isoRoom, hintWalk]);
  const visitFriend = async (friend) => {
    if (visitBusyRef.current) return false;
    visitBusyRef.current = true;
    try {
      const data = await api.friendRoom(friend.id);
      // A long-ago-added item must not arrive pre-selected (tint picker and
      // all) when the home scene remounts after the visit.
      setLastIsoAddedId(null);
      setVisiting({
        friend: data,
        ...resolveVisitRoom(data, {
          character: characterRef.current,
          name: profileRef.current.displayName || user?.displayName || "you",
        }),
      });
      hintWalk();
      // Showing up is how friendship starts; staying accrues by the minute
      // (the effect below).
      addBond(data.username, BOND_POINTS.visit);
      return true;
    } catch (err) {
      showToast(`Couldn't visit — ${err.message}`);
      return false;
    } finally {
      visitBusyRef.current = false;
    }
  };
  /**
   * A walk order landing: move the guest — you — to the tile the drag chose.
   * Render-only, like everything about a visit; the scene validated the spot
   * (mask + furniture + seat occupancy) before committing it.
   *
   * Takes the id even though a visit only ever has one walker, because at home
   * `onWalkTo` arms EVERY persona and the signature is shared. It's checked
   * rather than ignored: a stray order for someone else's placement in a
   * friend's room would be moving their furniture.
   */
  const moveVisitGuest = useCallback((id, gx, gy) => {
    setVisiting((v) => {
      if (!v?.guestId || id !== v.guestId) return v;
      let changed = false;
      const placements = v.layout.placements.map((p) => {
        if (p.id !== v.guestId || (p.gx === gx && p.gy === gy)) return p;
        changed = true;
        return { ...p, gx, gy };
      });
      return changed ? { ...v, layout: { ...v.layout, placements } } : v;
    });
  }, []);
  /**
   * Re-seating on your OWN island. The scene arms every persona (they're all
   * yours, all drawn with your character), validates the landing with the
   * same `personaCanSit` rule a visit uses — a free seat or soft ground,
   * bare floor only when the room offers nowhere to sit — and lands here.
   *
   * Unlike a visit, this one PERSISTS: the carry moves that resident's home
   * and the room saves. Finding your little person still on the sofa
   * tomorrow is what anyone expects of the seated life.
   */
  const walkIsoPersona = useCallback((id, gx, gy) => {
    setIsoRoom((prev) => {
      const cur = prev.placements.find((p) => p.id === id);
      // Its own updater rather than a call through to `moveIsoItem`, for the
      // living-things check: this is a write that happens OUTSIDE Decorate,
      // so it must never become a route for moving furniture there. Personas
      // AND pets (roamers) qualify — carrying your cat somewhere is the same
      // gesture as carrying your little self. `prev` is the only honest
      // place to ask what the id refers to.
      const it = cur && ISO_ITEMS[cur.item];
      if (!cur || !(it?.persona || it?.roamer)) return prev;
      if (cur.gx === gx && cur.gy === gy) return prev;
      return {
        ...prev,
        placements: prev.placements.map((p) => (p.id === id ? { ...p, gx, gy } : p)),
      };
    });
  }, []);
  /**
   * A pet's identity — name and temper — living ON its placement, because a
   * pet IS a placement: two cats are two rows, each with its own name, and
   * deleting the cat deletes the name with it. Refuses non-pets for the same
   * reason walkIsoPersona refuses furniture. Values are cleaned here AND in
   * validation (`cleanPetName` / the temper whitelist), so a bad write can't
   * survive either path; "mellow" is the default and stored implicitly.
   */
  const setPetIdentity = useCallback((id, patch) => {
    setIsoRoom((prev) => {
      const cur = prev.placements.find((p) => p.id === id);
      if (!cur || !ISO_ITEMS[cur.item]?.roamer) return prev;
      const next = { ...cur };
      if ("name" in patch) {
        const name = cleanPetName(patch.name);
        if (name) next.name = name;
        else delete next.name;
      }
      if ("temper" in patch) {
        const temper = PET_TEMPERS.some((t) => t.key === patch.temper && t.key !== "mellow")
          ? patch.temper
          : undefined;
        if (temper) next.temper = temper;
        else delete next.temper;
      }
      // The coat/breed rides the same identity write — default (first entry)
      // is stored implicitly, so picking it back just deletes the key.
      if ("look" in patch) {
        if (isStorableLook(cur.item, patch.look)) next.look = patch.look;
        else delete next.look;
      }
      return {
        ...prev,
        placements: prev.placements.map((p) => (p.id === id ? next : p)),
      };
    });
  }, []);
  // The knock lives HERE, not in the Friends panel: drawers close for all
  // sorts of reasons (Escape, a dock click, the arrival effect itself), and
  // a knock timer owned by the panel died with it — the toast promised an
  // answer that never came. "The bots always answer" means surviving the
  // panel.
  const knockFriend = (friend) => {
    if (knockingId || visitBusyRef.current) return;
    setKnockingId(friend.id);
    showToast(`You knock on ${friend.displayName}'s door…`, KNOCK_WAIT_MS);
    clearTimeout(knockTimer.current);
    knockTimer.current = setTimeout(async () => {
      setKnockingId(null);
      const ok = await visitFriend(friend);
      // Announce the welcome only if the door actually opened — a friend
      // removed mid-knock already toasted the failure.
      if (ok) showToast(`${friend.avatar} ${friend.displayName} lets you in!`, 2500);
    }, KNOCK_WAIT_MS);
  };
  const leaveVisit = useCallback(() => setVisiting(null), []);

  // Time TOGETHER is the slow, honest way the bond grows: one point per
  // minute spent in a friend's room, however you spend it — studying
  // together counts by simply being there, like real libraries. Keyed on the
  // username so a new visit restarts the clock, and the interval dies with
  // the visit (leaving mid-minute earns nothing, which is what a minute
  // means).
  useEffect(() => {
    const username = visiting?.friend?.username;
    if (!username) return undefined;
    const id = setInterval(() => addBond(username, BOND_POINTS.minuteTogether), 60_000);
    return () => clearInterval(id);
  }, [visiting?.friend?.username, addBond]);

  // ---- chat ------------------------------------------------------------ //
  //
  // The bots' replies are SCHEDULED, and — exactly like the knock above — the
  // timers live here rather than in the panel. A reply owed by a drawer that
  // has since closed never arrives, and "the bots always answer" is the whole
  // illusion. Every pending timer is tracked so the provider can clear them on
  // unmount instead of setting state into a dead tree.
  const [chats, setChats] = useState([]);
  const replyTimers = useRef(new Set());
  useEffect(() => {
    const timers = replyTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      setChats(await api.listChats());
    } catch (err) {
      // A read, and a background one at that — the panel shows what it has.
      console.error("Couldn't load chats:", err);
    }
  }, []);

  /** Open (or reopen) the thread with one friend. Idempotent server-side. */
  const openChatWith = async (friend) => {
    try {
      const chat = await api.openChat([friend.id]);
      await refreshChats();
      return chat;
    } catch (err) {
      showToast(`Couldn't open the chat — ${err.message}`);
      return null;
    }
  };

  const openGroupChat = async (friendIds, title) => {
    try {
      const chat = await api.openChat(friendIds, {
        isGroup: true,
        title: title?.trim() || undefined,
      });
      await refreshChats();
      return chat;
    } catch (err) {
      showToast(`Couldn't start the group — ${err.message}`);
      return null;
    }
  };

  /**
   * Say something, then let whoever is around answer.
   *
   * `onMessages` is handed the fresh list after each write so an open thread
   * repaints without polling — the reply may land long after the send
   * resolved, which is the point of scheduling it.
   */
  const sendChatMessage = async (chat, body, onMessages, optionId = null) => {
    const text = body.trim().slice(0, MESSAGE_MAX);
    if (!text || !chat) return;
    try {
      await api.sendMessage(chat.id, text);
      onMessages?.(await api.chatMessages(chat.id));
      refreshChats();
    } catch (err) {
      showToast(`Couldn't send — ${err.message}`);
      return;
    }

    // Who replies: the one friend, or a couple of the group who are free.
    const others = (chat.members || []).filter((m) => m.id !== userRef.current?.id);
    if (!others.length) return;
    // Saying something to someone is the cheapest brick in the friendship —
    // everyone who heard you gets it, which makes a group line worth more in
    // total but no more per person.
    others.forEach((m) => addBond(m.username, BOND_POINTS.message));
    const now = Date.now();
    const seed = Date.now() % 1000;
    const speaking = chat.isGroup
      ? groupResponders(others.map((m) => m.username), text, now, seed)
      : [others[0].username];

    speaking.forEach((username, i) => {
      const friend = others.find((m) => m.username === username);
      if (!friend) return;
      // Stagger a group so two people don't answer in the same instant.
      const delay = replyDelayMs(username, now, seed + i) + i * 900;
      const timer = setTimeout(async () => {
        replyTimers.current.delete(timer);
        try {
          // A picked option answers the OPTION, not the words on the button:
          // the intent is already known, so there's nothing to infer from the
          // text and no chance of the regexes reading it differently. The bond
          // level is read at FIRE time, not send time — the message that's
          // being answered may itself have tipped a level.
          const bond = bondLevelOf(username);
          const reply = optionId
            ? replyToOption(username, optionId, Date.now(), seed + i, bond)
            : botReply(username, text, Date.now(), seed + i, bond);
          await api.sendMessage(chat.id, reply, friend.id);
          onMessages?.(await api.chatMessages(chat.id));
          refreshChats();
        } catch {
          // A reply that fails is a bot who didn't answer — no toast for a
          // message the user never asked to send.
        }
      }, delay);
      replyTimers.current.add(timer);
    });
  };

  /**
   * A bot opens a thread and says something you didn't prompt.
   *
   * The one place an unprompted message is written, shared by the daily
   * check-in and the break nudge. Opening the thread is idempotent server-side,
   * so "message you" works whether or not you've ever spoken.
   */
  const botSays = useCallback(
    async (friend, body) => {
      try {
        const chat = await api.openChat([friend.id]);
        await api.sendMessage(chat.id, body, friend.id);
        refreshChats();
        return true;
      } catch {
        // Unprompted and cosmetic: a failure here is a friend who didn't
        // happen to message, not something to interrupt anyone about.
        return false;
      }
    },
    [refreshChats]
  );

  /**
   * A friend noticing you've been at it too long.
   *
   * Deliberately IN ADDITION to the toast, not instead of it: a chat message
   * can sit unread behind a closed drawer, and a health nudge that's easy to
   * miss isn't one. The toast interrupts; this is the warm version that's
   * still there when you come back.
   */
  const nudgeFromFriend = useCallback(
    async (spanLabel) => {
      const list = friendsRef.current || [];
      if (!list.length) return;
      const speaker = nudgeSpeaker(list.map((f) => f.username), Date.now());
      const friend = list.find((f) => f.username === speaker);
      if (friend) await botSays(friend, breakNudgeLine(speaker, spanLabel, Date.now() % 997));
    },
    [botSays]
  );

  /**
   * The day's unprompted hello, delivered once.
   *
   * `dailyCheckIn` decides who and when from the date alone; this only decides
   * whether it has HAPPENED, which is the one part that can't be pure. The
   * marker is per-device localStorage rather than a DB flag: the message itself
   * is already a durable row, and a second device would rightly get its own.
   *
   * Nothing fires before the appointed minute, so opening the app at 08:00
   * doesn't collect a message timed for the afternoon — it arrives while you're
   * there, which is the whole point of it being unprompted.
   */
  const deliverCheckIn = useCallback(async () => {
    const list = friendsRef.current || [];
    if (!list.length) return;
    const today = toISO(new Date());
    if (readStored(CHECKIN_KEY) === today) return;
    const plan = dailyCheckIn(list.map((f) => f.username), today);
    if (!plan) return;
    const nowDate = new Date();
    if (nowDate.getHours() * 60 + nowDate.getMinutes() < plan.minute) return;
    const friend = list.find((f) => f.username === plan.username);
    if (!friend) return;
    // Claim the day BEFORE the write: two ticks overlapping on a slow request
    // would otherwise both send it.
    writeStored(CHECKIN_KEY, today);
    const ok = await botSays(friend, plan.text);
    if (!ok) removeStored(CHECKIN_KEY); // let a failed day try again
  }, [botSays]);

  // Checked on a slow timer as well as on arrival: the app is left open for
  // hours at a time (it's half ambient furniture), so the appointed minute
  // usually passes while you're already looking at it.
  //
  // Waits for the FRIENDS, not just for boot. `setBooting(false)` fires the
  // moment the local account is authenticated, which is several requests before
  // `refreshAll` has loaded anyone to hear from — so this ran against an empty
  // list, bailed, and (having no dependency on `friends`) never re-ran. The
  // check-in then had to wait out the 5-minute interval, and a launch shorter
  // than that dropped the day's message entirely. Found by driving the real app
  // with the clock shifted past the scheduled minute; the unit tests couldn't
  // see it, because the bug was in WHEN the pure function gets called.
  // `friends.length` rather than `friends`: refreshAll hands back a new array
  // every time, which would tear down and rebuild the interval on every tick.
  useEffect(() => {
    if (booting || !user || !friends.length) return undefined;
    deliverCheckIn();
    const id = setInterval(deliverCheckIn, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [booting, user, friends.length, deliverCheckIn]);

  const markChatRead = useCallback(
    async (chatId) => {
      try {
        await api.markChatRead(chatId);
        refreshChats();
      } catch {
        /* unread badges are not worth a toast */
      }
    },
    [refreshChats]
  );

  const deleteChat = async (chatId) => {
    try {
      await api.deleteChat(chatId);
      await refreshChats();
      return true;
    } catch (err) {
      showToast(`Couldn't delete the chat — ${err.message}`);
      return false;
    }
  };

  // Chats load on their own rather than inside refreshAll: the list is only
  // read by the Friends panel and its unread badge, and every task tick would
  // otherwise pay for it — the same reasoning that split refreshTasks out.
  // Declared HERE, below refreshChats: a dependency array is evaluated during
  // render, so referencing it further up the body is a temporal-dead-zone
  // ReferenceError that blanks the whole app on boot.
  useEffect(() => {
    if (user) refreshChats();
  }, [user, refreshChats]);
  // Your own door. Matters the day friends can really visit; today it's a
  // preference the bots politely respect.
  const setVisitAccess = async (value) => {
    try {
      const res = await api.setVisitAccess(value);
      setUser((u) => (u ? { ...u, visitAccess: res.visitAccess } : u));
    } catch (err) {
      showToast(`Couldn't change your door — ${err.message}`);
    }
  };

  const toggleMusic = () => {
    // Outside the updater — updaters must stay pure (StrictMode double-invokes).
    writeStored("tasknook.music.on", musicOn ? "0" : "1");
    setMusicOn((m) => !m);
  };

  // A named snapshot of the whole ambience "scene" — weather visual, time of
  // day, and the full sound mix — recalled in one click.
  const saveWeatherPreset = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset = { name: trimmed, weatherMode, timeOfDay, soundMix };
    // Persist outside the updater (purity — StrictMode double-invokes them).
    const next = [...weatherPresets.filter((p) => p.name !== trimmed), preset];
    writeStored("tasknook.weather.presets", JSON.stringify(next));
    setWeatherPresets(next);
  };
  const applyWeatherPreset = (name) => {
    const preset = weatherPresets.find((p) => p.name === name);
    if (!preset) return;
    // (Presets saved before the mixer also carry a `weatherVolume` — it drove
    // a slider that no longer exists and is simply ignored now.)
    // Recalling a scene is a manual pick: use the internal appliers for both
    // axes and disable auto-match EXPLICITLY — the old mix of one internal
    // and one public setter got the same net result only by accident.
    // Through the same whitelists the storage READS use. Presets are only
    // written from already-valid live state, so this isn't reachable today — but
    // the appliers write straight back into the whitelist-guarded
    // `tasknook.weatherMode` / `tasknook.timeOfDay` keys, so one hand-edited or
    // legacy preset could put a value in there that the scene's lookup tables
    // don't know. Cheap to close, and it makes the guarantee "these two keys only
    // ever hold known values" true on every path rather than by luck.
    applyWeatherVisual(
      WEATHER_MODES.includes(preset.weatherMode) ? preset.weatherMode : weatherMode
    );
    applyTimeOfDay(TIMES_OF_DAY.includes(preset.timeOfDay) ? preset.timeOfDay : timeOfDay);
    setAutoMatchWeather(false);
    // A saved scene is an explicit user snapshot, so restoring its sounds IS
    // what applying it means (unlike the weather quick-picks, which are
    // visual-only). Legacy presets from before the mixer just set the visual.
    if (preset.soundMix) {
      const patch = {};
      for (const { key } of SOUND_CHANNELS) patch[key] = preset.soundMix[key] || 0;
      applySoundPatch(patch);
    }
  };
  const deleteWeatherPreset = (name) => {
    const next = weatherPresets.filter((p) => p.name !== name);
    writeStored("tasknook.weather.presets", JSON.stringify(next));
    setWeatherPresets(next);
  };

  // ---------- Settings ----------
  const setBrightness = (v) => {
    setBrightnessState(v);
    writeStored("tasknook.brightness", String(v));
  };
  const setColorScheme = (scheme) => {
    setColorSchemeState(scheme);
    writeStored("tasknook.colorScheme", scheme);
  };
  // Picking a colour implies you want the custom scheme.
  // (motion setter is below, next to its state)
  const setCustomColor = (hex) => {
    setCustomColorState(hex);
    writeStored("tasknook.customColor", hex);
    setColorScheme("custom");
  };
  // null = follow the accent again (the key is removed, not stored as "null").
  const setCustomSurface = (hex) => {
    const clean = hex === null ? null : normalizeHex(hex);
    setCustomSurfaceState(clean);
    if (clean === null) removeStored("tasknook.customSurface");
    else writeStored("tasknook.customSurface", clean);
    setColorScheme("custom");
  };

  // ---------- Real-world weather ----------
  useEffect(() => {
    autoMatchRef.current = autoMatchWeather;
    writeStored("tasknook.weather.automatch", autoMatchWeather ? "1" : "0");
  }, [autoMatchWeather]);

  /**
   * Fetch real conditions. `background: true` for the silent 15-minute poll.
   *
   * A background refresh must never touch the visible status: a transient blip
   * while the panel happened to be open flipped it to "error" with an alarming
   * message, for something the user didn't ask for and can't act on — and the
   * previous good reading is still perfectly serviceable. Only a refresh the user
   * triggered gets to report failure.
   */
  const refreshRealWeather = useCallback(async (coordsOverride, { background = false } = {}) => {
    if (!background) {
      setWeatherStatus("loading");
      setWeatherError("");
    }
    try {
      const coords = coordsOverride || weatherCoordsRef.current || (await locateBrowser());
      weatherCoordsRef.current = coords;
      writeStored("tasknook.weather.coords", JSON.stringify(coords));
      const data = await fetchCurrentWeather(coords.lat, coords.lon);
      setRealWeather(data);
      setWeatherStatus("ready");
      if (autoMatchRef.current) {
        // Internal appliers — the public setters would disable auto-match.
        setWeatherModeState(data.mode);
        writeStored("tasknook.weatherMode", data.mode);
        setTimeOfDayState(data.timeOfDay);
        writeStored("tasknook.timeOfDay", data.timeOfDay);
      }
    } catch (err) {
      if (background) return; // keep the last good reading and stay quiet
      setWeatherStatus("error");
      setWeatherError(err.message || "Couldn't get the weather");
    }
  }, []);

  /** Commit to one place: remember it and fetch its weather. */
  const chooseWeatherPlace = async (place) => {
    setWeatherPlaces([]);
    setWeatherLocationLabel(place.label);
    writeStored("tasknook.weather.location", place.label);
    await refreshRealWeather({ lat: place.lat, lon: place.lon });
  };

  const searchWeatherCity = async (name) => {
    setWeatherStatus("loading");
    setWeatherError("");
    setWeatherPlaces([]);
    try {
      const places = await searchPlaces(name);
      // One match is unambiguous — don't make someone confirm it. Several
      // means the name is genuinely shared (Gainesville is in Florida AND
      // Alabama), and guessing for them is how you end up showing the wrong
      // state's weather with no way to correct it.
      if (places.length === 1) {
        await chooseWeatherPlace(places[0]);
        return;
      }
      setWeatherPlaces(places);
      setWeatherStatus("idle");
    } catch (err) {
      setWeatherStatus("error");
      setWeatherError(err.message || "Couldn't find that place");
    }
  };

  const toggleAutoMatchWeather = () => {
    // Side effects (other setState calls) outside the updater — updaters
    // must be pure, and `autoMatchWeather` is already in scope.
    const next = !autoMatchWeather;
    if (next && realWeather) {
      applyWeatherVisual(realWeather.mode);
      applyTimeOfDay(realWeather.timeOfDay);
    }
    // Auto-match owns the time of day too, so the two can't both be on —
    // otherwise its 15-minute refresh and the clock tick take turns overwriting
    // each other's value.
    if (next) setAutoTimeOfDay(false);
    // And it owns weatherMode, same axis random weather drives — the two
    // refreshes would otherwise fight over the sky.
    if (next) setAutoRandomWeather(false);
    setAutoMatchWeather(next);
  };

  // Turning random weather on hands weatherMode to the drift schedule below;
  // auto-match (which also owns weatherMode) has to stand down for the same
  // reason it stands down for a manual pick.
  const toggleRandomWeather = () => {
    const next = !autoRandomWeather;
    if (next && autoMatchRef.current) setAutoMatchWeather(false);
    setAutoRandomWeather(next);
  };

  // While the clock is driving the scene, re-check it. A minute is far finer
  // than the bands need (they turn over on the hour), but it's one cheap
  // comparison and it means a room left open through dusk actually gets dark
  // instead of waiting for a reload. `applyTimeOfDay` is the internal applier,
  // so this doesn't switch itself off the way a manual pick does.
  useEffect(() => {
    if (!autoTimeOfDay) return undefined;
    applyTimeOfDay(timeOfDayNow());
    const id = setInterval(() => applyTimeOfDay(timeOfDayNow()), 60 * 1000);
    return () => clearInterval(id);
    // No exhaustive-deps suppression needed: `applyTimeOfDay` only calls a
    // setState and a storage write, so a stale closure of it behaves identically
    // and re-subscribing on every render would tear the interval down for nothing.
  }, [autoTimeOfDay]);

  // While auto-match is on, keep real conditions from drifting stale.
  useEffect(() => {
    if (!autoMatchWeather) return undefined;
    refreshRealWeather();
    const id = setInterval(
      () => refreshRealWeather(undefined, { background: true }),
      15 * 60 * 1000
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMatchWeather]);

  useEffect(() => {
    weatherModeRef.current = weatherMode;
  }, [weatherMode]);

  useEffect(() => {
    writeStored("tasknook.weather.random", autoRandomWeather ? "1" : "0");
  }, [autoRandomWeather]);

  // Random weather: a condition holds for RANDOM_WEATHER_INTERVAL_MS (30
  // minutes), then steps to a new one via nextRandomWeather's weighted
  // transitions. `nextRollAt` persists across reloads — closing the app
  // doesn't pause the clock, so reopening past a scheduled roll catches up
  // immediately instead of waiting out a stale timer, the same reasoning
  // the music bar's resume-on-boot already follows.
  useEffect(() => {
    if (!autoRandomWeather) return undefined;
    let timer;
    const roll = () => {
      applyWeatherVisual(nextRandomWeather(weatherModeRef.current));
      const at = Date.now() + RANDOM_WEATHER_INTERVAL_MS;
      writeStored("tasknook.weather.random.nextRollAt", String(at));
      timer = setTimeout(roll, RANDOM_WEATHER_INTERVAL_MS);
    };
    const savedAt = Number(readStored("tasknook.weather.random.nextRollAt"));
    const remaining = savedAt > 0 ? savedAt - Date.now() : 0;
    timer = setTimeout(roll, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [autoRandomWeather]);

  const setStation = (key) => {
    setActiveStationKey(key);
    writeStored("tasknook.music.station", key);
  };
  const selectStation = (station) => {
    setStation(stationKey(station));
    setMusicOn(true);
    writeStored("tasknook.music.on", "1");
  };

  // Adds (and switches to) a station from a pasted YouTube or Spotify link.
  // Returns false if no video/playlist could be parsed, so the UI can show an error.
  const addCustomStation = (url, label) => {
    const resolved = resolveMusicLink(url);
    if (!resolved) return false;
    const station = { ...resolved, label: label.trim() || "custom station 🎧", custom: true };
    const key = stationKey(station);
    if (!musicStations.some((s) => stationKey(s) === key)) {
      const next = [...customStations, station];
      setCustomStations(next);
      writeStored("tasknook.music.custom", JSON.stringify(next));
    }
    selectStation(station);
    return true;
  };

  const removeCustomStation = (station) => {
    const key = stationKey(station);
    const next = customStations.filter((s) => stationKey(s) !== key);
    setCustomStations(next);
    writeStored("tasknook.music.custom", JSON.stringify(next));
    if (activeStationKey === key) setStation(stationKey(BUILT_IN_STATIONS[0]));
  };

  // ---------- Room actions ----------
  // useCallback throughout: these are handed to <Cottage/>, which is memo'd so
  // it can skip the per-second focus-timer re-render. New function identities
  // every tick would defeat that entirely.
  const moveRoomItem = useCallback((id, x, y) => {
    // Same bail-out as moveIsoItem: the flat scene snaps to GRID, so most
    // pointermoves during a drag ask for the position the item is already at.
    setRoomPlacements((prev) => {
      const cur = prev.find((p) => p.id === id);
      if (!cur || (cur.x === x && cur.y === y)) return prev;
      return prev.map((p) => (p.id === id ? { ...p, x, y } : p));
    });
  }, []);
  const addRoomItem = useCallback(
    (key) => {
      // Logic outside the updater: updaters must stay pure (StrictMode
      // double-invokes them) and this one now needs to report failure.
      const prev = roomRef.current;
      if (prev.length >= MAX_ITEMS) {
        showToast(`That's all ${MAX_ITEMS} pieces — put something away first 🪴`);
        return;
      }
      // A null placement here means a `fixed` singleton is already up, which
      // the panel already shows as a disabled "up ✓" button — no toast needed.
      const placement = newPlacement(key, prev);
      if (!placement) return;
      setRoomPlacements([...prev, placement]);
      setRoomEditMode(true); // they'll want to drag the new arrival into place
    },
    [showToast]
  );
  const removeRoomItem = useCallback((id) => {
    setRoomPlacements((prev) => prev.filter((p) => p.id !== id));
  }, []);
  const applyRoomPreset = useCallback((key) => setRoomPlacements(presetPlacements(key)), []);
  const clearRoom = useCallback(() => setRoomPlacements([]), []);
  // tint: an #rrggbb string recolours the item's main material; null returns
  // it to the classic colour (the key is removed so saves stay minimal).
  const setRoomItemTint = useCallback((id, tint) => {
    setRoomPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (!tint) {
          const { tint: _dropped, ...rest } = p;
          return rest;
        }
        return { ...p, tint };
      })
    );
  }, []);

  const value = {
    user,
    booting,
    bootError,
    toast,
    showToast,
    dismissToast,

    tasks,
    orderedTasks,
    addTask,
    toggleTask,
    editTask,
    removeTask,
    reorderTasks,

    taskGroups,
    addTaskGroup,
    removeTaskGroup,
    toggleRoutine,

    algorithm,
    chooseAlgorithm,

    profile,
    character,
    saveProfile,
    saveCharacter,

    friends,
    stats,
    sessionDays,
    refreshAll,
    refreshTasks,
    refreshFocus,
    dailyGoal,
    setDailyGoal,

    // chat
    chats,
    refreshChats,
    openChatWith,
    nudgeFromFriend,
    openGroupChat,
    sendChatMessage,
    markChatRead,
    deleteChat,
    friendship,

    // room decoration
    roomPlacements,
    roomEditMode,
    setRoomEditMode,
    moveRoomItem,
    addRoomItem,
    removeRoomItem,
    applyRoomPreset,
    clearRoom,
    setRoomItemTint,
    roomScale,
    setRoomScale,
    isoPreview,
    setIsoPreview,
    isoRoom,
    lastIsoAddedId,
    moveIsoItem,
    addIsoItem,
    removeIsoItem,
    rotateIsoItem,
    unlocked,
    unlockItem,
    unlockBalance: balance,
    setIsoItemTint,
    setIsoSize,
    setIsoTile,
    resetIsoShape,
    setIsoEnv,
    setIsoWalls,
    visiting,
    visitFriend,
    knockFriend,
    knockingId,
    leaveVisit,
    moveVisitGuest,
    walkIsoPersona,
    setPetIdentity,
    setVisitAccess,
    applyIsoPreset,
    selfInRoom,
    setSelfInRoom,

    // the timer's target task (the timer itself is in timer.jsx)
    activeTask,
    activeTaskId,
    setActiveTaskId,

    // ambient
    weatherMode,
    setWeather,
    soundMix,
    setSoundLevel,
    stopAllSounds,
    timeOfDay,
    setTimeOfDay,
    musicOn,
    toggleMusic,
    autoResumeMusic,
    setAutoResumeMusic,
    widgetMode,
    setWidgetMode,
    musicStations,
    activeStationKey: resolvedStationKey,
    selectStation,
    addCustomStation,
    removeCustomStation,

    // real-world weather
    realWeather,
    weatherStatus,
    weatherError,
    weatherLocationLabel,
    weatherPlaces,
    chooseWeatherPlace,
    autoMatchWeather,
    autoRandomWeather,
    toggleRandomWeather,
    autoTimeOfDay,
    setAutoTimeOfDay,
    toggleAutoMatchWeather,
    refreshRealWeather,
    searchWeatherCity,
    weatherPresets,
    saveWeatherPreset,
    applyWeatherPreset,
    deleteWeatherPreset,

    // settings
    brightness,
    setBrightness,
    colorScheme,
    setColorScheme,
    customColor,
    setCustomColor,
    customSurface,
    setCustomSurface,
    motionMode,
    setMotionMode,
    hudVisibility,
    setHudVisibility,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
