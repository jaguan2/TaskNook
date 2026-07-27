import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { api, getToken, setToken } from "./lib/api";
import { readStored, writeStored } from "./lib/storage";
import { ALGORITHM_KEYS, applyAlgorithm, shuffledIds } from "./lib/algorithms";
import { normalizeHex } from "./lib/palette";
import { MOTION_MODES, applyMotionMode } from "./lib/motion";
import { SOUND_CHANNELS, applyMix, setChannel } from "./lib/audio";
import { resolveMusicLink, stationKey } from "./lib/musicLink";
import { locateBrowser, searchPlaces, fetchCurrentWeather } from "./lib/weather";
import {
  MAX_ITEMS,
  newPlacement,
  presetPlacements,
  validatePlacements,
} from "./lib/room";
import {
  ISO_MAX_ITEMS,
  clampIsoPlacement,
  defaultIsoLayout,
  isoPresetLayout,
  newIsoPlacement,
  nextRot,
  validateIsoLayout,
} from "./lib/isoRoom";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

// The two ambience axes, whitelisted because both are restored from
// localStorage and both index into lookup tables in the scene components.
const WEATHER_MODES = ["off", "cloudy", "rain", "leaves", "snow", "storm"];
const TIMES_OF_DAY = ["night", "sunset", "day"];

const LOCAL_ACCOUNT = { username: "you", password: "tasknook-local-cottage" };

// A few cozy lofi streams to start with; users can add their own via YouTube or Spotify link.
// Stored as video ids, not playlist ids. Links like ...&list=RD<id> are
// YouTube's auto-generated "radio" mixes, and RD… lists refuse to load in an
// iframe embed — the underlying video plays fine.
// The two "lofi ... radio" LIVE streams were removed 2026-07 — they refused
// to play in the embedded player (user-verified), while regular videos and
// playlists work fine.
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
  const [toast, setToast] = useState(null); // { id, message }
  const toastTimer = useRef(null);
  const showToast = useCallback((message) => {
    setToast({ id: Date.now(), message });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
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
      const saved = JSON.parse(readStored("tasknook.soundMix") || "{}");
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
  const applySoundPatch = useCallback((patch) => {
    const next = { ...soundMixRef.current };
    for (const [name, v] of Object.entries(patch)) {
      next[name] = Math.max(0, Math.min(1, Number(v) || 0));
    }
    soundMixRef.current = next;
    setSoundMixState(next);
    writeStored("tasknook.soundMix", JSON.stringify(next));
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
  const [musicOn, setMusicOn] = useState(false);

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
  const weatherCoordsRef = useRef(
    (() => {
      try {
        const c = JSON.parse(readStored("tasknook.weather.coords") || "null");
        // Shape-check: a corrupt cache would build latitude=undefined URLs
        // and error forever with no recovery path.
        return c && Number.isFinite(c.lat) && Number.isFinite(c.lon) ? c : null;
      } catch {
        return null;
      }
    })()
  );
  const autoMatchRef = useRef(autoMatchWeather);
  const [weatherPresets, setWeatherPresets] = useState(() => {
    try {
      const saved = JSON.parse(readStored("tasknook.weather.presets") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  // ---- Daily goal ----
  // Target focus minutes per day; drives the goal ring + streak in Progress.
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

  const [customStations, setCustomStations] = useState(() => {
    try {
      const saved = JSON.parse(readStored("tasknook.music.custom") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [activeStationKey, setActiveStationKey] = useState(
    () => readStored("tasknook.music.station") || stationKey(BUILT_IN_STATIONS[0])
  );
  const musicStations = [...BUILT_IN_STATIONS, ...customStations];
  // A saved key that no longer resolves — a built-in was retired (two lofi
  // streams were), or a custom station removed — used to leave the transport
  // bar rendering NOTHING: no controls, and no ✕ to stop the music. Always
  // resolve to a station that actually exists.
  const activeStation =
    musicStations.find((s) => stationKey(s) === activeStationKey) || musicStations[0];
  const resolvedStationKey = stationKey(activeStation);

  // ---------- Room (freeform decoration) ----------
  // The layout lives in the DB (rides the migration/backup system) with a
  // localStorage mirror so the room paints instantly on boot.
  const [roomPlacements, setRoomPlacements] = useState(() => {
    try {
      const saved = validatePlacements(
        JSON.parse(readStored("tasknook.room") || "null")
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
        JSON.parse(readStored("tasknook.isoRoom") || "null")
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
    setIsoRoom((prev) => ({
      ...prev,
      placements: prev.placements.map((p) => (p.id === id ? { ...p, gx, gy } : p)),
    }));
  }, []);
  // The id of the most recently added iso item — the scene auto-selects it
  // so the user can see what just appeared.
  const [lastIsoAddedId, setLastIsoAddedId] = useState(null);
  const addIsoItem = useCallback(
    (key) => {
      const prev = isoRef.current;
      // Both refusals used to be a bare `return` — the only actions in the app
      // that failed without saying anything, so the button just looked dead.
      if (prev.placements.length >= ISO_MAX_ITEMS) {
        showToast(`That's all ${ISO_MAX_ITEMS} pieces — put something away first 🪴`);
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
  const rotateIsoItem = useCallback((id) => {
    setIsoRoom((prev) => ({
      ...prev,
      placements: prev.placements.map((p) => {
        if (p.id !== id) return p;
        // Four facings for seating that ships a back view, two for everything
        // else (and for wall decor, where rot picks the wall, not a facing).
        const rot = nextRot(p.item, p.rot);
        const { rot: _dropped, ...rest } = p;
        return {
          ...rest,
          ...(rot && { rot }),
          ...clampIsoPlacement(p.item, p.gx, p.gy, prev, rot),
        };
      }),
    }));
  }, []);
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
    (change, lost) =>
      setIsoRoom((prev) => {
        const next = validateIsoLayout({ ...prev, ...change });
        const gone = prev.placements.length - next.placements.length;
        if (gone > 0) showToast(lost(gone, gone === 1 ? "piece" : "pieces"));
        return next;
      }),
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
  // Floor-plan painting (irregular shapes): toggle one tile of the mask.
  const setIsoTile = useCallback(
    (x, y, on) => {
      setIsoRoom((prev) => {
        const rows = (
          prev.mask || Array.from({ length: prev.d }, () => "1".repeat(prev.w))
        ).map((r) => r.split(""));
        if (!rows[y] || rows[y][x] === undefined) return prev;
        rows[y][x] = on ? "1" : "0";
        const mask = rows.map((r) => r.join(""));
        // Refuse to paint away the last floor tile — a room must exist.
        if (!mask.some((r) => r.includes("1"))) return prev;
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
        return next;
      });
    },
    [showToast]
  );
  const resetIsoShape = useCallback(
    () => setIsoRoom((prev) => validateIsoLayout({ ...prev, mask: undefined })),
    []
  );
  // Presets replace the whole iso layout, floor size included (validated so
  // preset `cuts` shorthand becomes a mask immediately).
  const applyIsoPreset = useCallback(
    (key) => setIsoRoom(validateIsoLayout(isoPresetLayout(key))),
    []
  );
  const roomRef = useRef(roomPlacements);
  const roomSaveTimer = useRef(null);
  // Applying server state on boot must not immediately echo back as a "save".
  const roomSkipSave = useRef(true);

  useEffect(() => {
    roomRef.current = roomPlacements;
    isoRef.current = isoRoom;
    if (roomSkipSave.current) {
      roomSkipSave.current = false;
      return undefined;
    }
    // The localStorage mirror is written SYNCHRONOUSLY — inside the debounce
    // it sat behind a cleanup-cancellable timer, so closing the window within
    // 600ms of a drag lost the edit from the mirror AND the server (the
    // skipped save that looks like a success). Only the network PUT waits
    // for the dust to settle. Flat and iso layouts travel in one PUT.
    writeStored("tasknook.room", JSON.stringify(roomPlacements));
    writeStored("tasknook.isoRoom", JSON.stringify(isoRoom));
    clearTimeout(roomSaveTimer.current);
    roomSaveTimer.current = setTimeout(() => {
      api
        .saveRoom(roomPlacements, isoRoom)
        .catch((err) => {
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

  // ---------- Task actions ----------
  const addTask = async (payload) => {
    await api.createTask(payload);
    await refreshAll();
  };
  // Fire-and-forget UI actions: swallow + log so a failed request can't surface
  // as an unhandled promise rejection from an onClick handler.
  const toggleTask = async (task) => {
    try {
      await api.updateTask(task.id, { completed: !task.completed });
      await refreshAll();
    } catch (err) {
      console.error("Failed to toggle task:", err);
      showToast("Couldn't save that change 🌧️");
    }
  };
  const editTask = async (id, payload) => {
    try {
      await api.updateTask(id, payload);
      await refreshAll();
    } catch (err) {
      console.error("Failed to update task:", err);
      showToast("Couldn't save that change 🌧️");
    }
  };
  const removeTask = async (id) => {
    try {
      if (activeTaskId === id) setActiveTaskId(null);
      await api.deleteTask(id);
      await refreshAll();
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
      await refreshAll();
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
      const saved = JSON.parse(readStored("tasknook.taskGroups") || "[]");
      return Array.isArray(saved) ? saved.filter((g) => typeof g === "string") : [];
    } catch {
      return [];
    }
  });
  const persistEmptyGroups = (next) => {
    setEmptyGroups(next);
    writeStored("tasknook.taskGroups", JSON.stringify(next));
  };
  const taskGroups = [
    ...new Set([...tasks.map((t) => t.group).filter(Boolean), ...emptyGroups]),
  ];
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
      await refreshAll();
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

  const orderedTasks = applyAlgorithm(algorithm, tasks, { randomOrder });
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

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
    applyWeatherVisual(nextMode);
  };
  const setTimeOfDay = (mode) => {
    if (autoMatchRef.current) setAutoMatchWeather(false);
    applyTimeOfDay(mode);
  };
  const toggleMusic = () => setMusicOn((m) => !m);

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
    applyWeatherVisual(preset.weatherMode);
    applyTimeOfDay(preset.timeOfDay);
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

  // ---------- Real-world weather ----------
  useEffect(() => {
    autoMatchRef.current = autoMatchWeather;
    writeStored("tasknook.weather.automatch", autoMatchWeather ? "1" : "0");
  }, [autoMatchWeather]);

  const refreshRealWeather = useCallback(async (coordsOverride) => {
    setWeatherStatus("loading");
    setWeatherError("");
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
    setAutoMatchWeather(next);
  };

  // While auto-match is on, keep real conditions from drifting stale.
  useEffect(() => {
    if (!autoMatchWeather) return undefined;
    refreshRealWeather();
    const id = setInterval(() => refreshRealWeather(), 15 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMatchWeather]);

  const setStation = (key) => {
    setActiveStationKey(key);
    writeStored("tasknook.music.station", key);
  };
  const selectStation = (station) => {
    setStation(stationKey(station));
    setMusicOn(true);
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
    setRoomPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
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

    friends,
    stats,
    sessionDays,
    refreshAll,
    dailyGoal,
    setDailyGoal,

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
    setIsoItemTint,
    setIsoSize,
    setIsoTile,
    resetIsoShape,
    setIsoEnv,
    applyIsoPreset,

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
    motionMode,
    setMotionMode,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
