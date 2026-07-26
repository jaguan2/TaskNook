import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { api, getToken, setToken } from "./lib/api";
import { applyAlgorithm, shuffledIds } from "./lib/algorithms";
import { SOUND_CHANNELS, applyMix, setChannel } from "./lib/audio";
import { resolveMusicLink, stationKey } from "./lib/musicLink";
import { locateBrowser, geocodeCity, fetchCurrentWeather } from "./lib/weather";
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
  validateIsoLayout,
} from "./lib/isoRoom";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const FOCUS_PRESETS = [15, 25, 45, 60];

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

  const [tasks, setTasks] = useState([]);
  const [friends, setFriends] = useState([]);
  const [stats, setStats] = useState({
    tasksTotal: 0,
    tasksDone: 0,
    completion: 0,
    focusMinutesToday: 0,
  });
  const [sessionDays, setSessionDays] = useState({});
  const [algorithm, setAlgorithm] = useState(
    () => localStorage.getItem("tasknook.algo") || "custom"
  );

  // ---- Focus timer ----
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const tickRef = useRef(null);
  // "timer" counts down to a target; "stopwatch" counts up open-ended and
  // logs whatever it measured when finished. Pomodoro belongs to timer mode.
  const [timerMode, setTimerModeState] = useState(() =>
    localStorage.getItem("tasknook.timerMode") === "stopwatch" ? "stopwatch" : "timer"
  );
  const [elapsed, setElapsed] = useState(0);

  // Pomodoro mode: focus → break → focus … for a set number of rounds.
  const [pomodoro, setPomodoroState] = useState(() => {
    const defaults = { enabled: false, breakMinutes: 5, rounds: 4 };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem("tasknook.pomodoro") || "{}") };
    } catch {
      return defaults;
    }
  });
  const [phase, setPhase] = useState("focus"); // "focus" | "break"
  const [round, setRound] = useState(1);

  const setPomodoro = (patch) => {
    setPomodoroState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("tasknook.pomodoro", JSON.stringify(next));
      return next;
    });
    // Changing the plan restarts the cycle from round 1 (but never yanks a
    // countdown that's actively running).
    setPhase("focus");
    setRound(1);
    if (!running) {
      setRemaining(focusMinutes * 60);
      setNudgeSeconds(0);
    }
  };

  // ---- Ambient ----
  const [weatherMode, setWeatherModeState] = useState("off");
  const [weatherVolume, setWeatherVol] = useState(0.5);
  // Per-channel ambience volumes (rain, storm, snow, wind, fireplace, birds).
  // Slider positions persist; actual audio only starts from a user gesture.
  const [soundMix, setSoundMixState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tasknook.soundMix") || "{}");
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
    localStorage.setItem("tasknook.soundMix", JSON.stringify(next));
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
  const [timeOfDay, setTimeOfDayState] = useState(
    () => localStorage.getItem("tasknook.timeOfDay") || "night"
  );
  const [musicOn, setMusicOn] = useState(false);

  // ---- Real-world weather ----
  const [realWeather, setRealWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState("idle"); // idle | loading | ready | error
  const [weatherError, setWeatherError] = useState("");
  const [weatherLocationLabel, setWeatherLocationLabel] = useState(
    () => localStorage.getItem("tasknook.weather.location") || ""
  );
  const [autoMatchWeather, setAutoMatchWeather] = useState(
    () => localStorage.getItem("tasknook.weather.automatch") === "1"
  );
  const weatherCoordsRef = useRef(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tasknook.weather.coords") || "null");
      } catch {
        return null;
      }
    })()
  );
  const autoMatchRef = useRef(autoMatchWeather);
  const [weatherPresets, setWeatherPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tasknook.weather.presets") || "[]");
    } catch {
      return [];
    }
  });

  // ---- Daily goal ----
  // Target focus minutes per day; drives the goal ring + streak in Progress.
  const [dailyGoal, setDailyGoalState] = useState(() => {
    const saved = Number(localStorage.getItem("tasknook.dailyGoal"));
    return saved >= 15 && saved <= 960 ? saved : 120;
  });
  const setDailyGoal = (minutes) => {
    const clamped = Math.min(960, Math.max(15, Math.round(Number(minutes) || 120)));
    setDailyGoalState(clamped);
    localStorage.setItem("tasknook.dailyGoal", String(clamped));
  };

  // ---- Settings ----
  const [brightness, setBrightnessState] = useState(
    () => Number(localStorage.getItem("tasknook.brightness")) || 1
  );
  const [colorScheme, setColorSchemeState] = useState(
    () => localStorage.getItem("tasknook.colorScheme") || "plum"
  );
  // Base colour for the "custom" scheme; the full ramp is derived from its
  // hue/saturation (see lib/palette.js). Defaults to the classic plum rose.
  const [customColor, setCustomColorState] = useState(
    () => localStorage.getItem("tasknook.customColor") || "#d98a93"
  );

  const [customStations, setCustomStations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tasknook.music.custom") || "[]");
    } catch {
      return [];
    }
  });
  const [activeStationKey, setActiveStationKey] = useState(
    () => localStorage.getItem("tasknook.music.station") || stationKey(BUILT_IN_STATIONS[0])
  );
  const musicStations = [...BUILT_IN_STATIONS, ...customStations];

  // ---------- Room (freeform decoration) ----------
  // The layout lives in the DB (rides the migration/backup system) with a
  // localStorage mirror so the room paints instantly on boot.
  const [roomPlacements, setRoomPlacements] = useState(() => {
    try {
      const saved = validatePlacements(
        JSON.parse(localStorage.getItem("tasknook.room") || "null")
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
        JSON.parse(localStorage.getItem("tasknook.isoRoom") || "null")
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
    const saved = Number(localStorage.getItem("tasknook.roomScale"));
    return saved >= 0.6 && saved <= 1.2 ? saved : 1;
  });
  const setRoomScale = useCallback((value) => {
    const clamped = Math.min(1.2, Math.max(0.6, Number(value) || 1));
    setRoomScaleState(clamped);
    localStorage.setItem("tasknook.roomScale", String(clamped));
  }, []);
  // Experimental: swap the flat scene for the static isometric mock (the
  // first look at the future Sims-style room). Decorating is disabled while
  // previewing — the mock has no placement engine yet.
  // The isometric room is the DEFAULT scene (user decision — the flat 2D
  // cottage is the opt-in throwback now).
  const [isoPreview, setIsoPreviewState] = useState(
    () => localStorage.getItem("tasknook.isoPreview") !== "0"
  );
  const setIsoPreview = useCallback((on) => {
    setIsoPreviewState(!!on);
    localStorage.setItem("tasknook.isoPreview", on ? "1" : "0");
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
  const addIsoItem = useCallback((key) => {
    const prev = isoRef.current;
    if (prev.placements.length >= ISO_MAX_ITEMS) return;
    const placement = newIsoPlacement(key, prev.placements, prev);
    if (!placement) return;
    setIsoRoom({ ...prev, placements: [...prev.placements, placement] });
    setLastIsoAddedId(placement.id);
    setRoomEditMode(true);
  }, []);
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
        const rot = p.rot ? 0 : 1;
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
  // Resizing keeps every item's footprint on the (possibly smaller) floor;
  // running through the validator also re-fits the corner cuts.
  const setIsoSize = useCallback((w, d) => {
    setIsoRoom((prev) => validateIsoLayout({ ...prev, w, d }));
  }, []);
  // Environment swap (room ↔ garden); validation drops wall decor outdoors.
  const setIsoEnv = useCallback((env) => {
    setIsoRoom((prev) => validateIsoLayout({ ...prev, env }));
  }, []);
  // Floor-plan painting (irregular shapes): toggle one tile of the mask.
  const setIsoTile = useCallback((x, y, on) => {
    setIsoRoom((prev) => {
      const rows = (
        prev.mask || Array.from({ length: prev.d }, () => "1".repeat(prev.w))
      ).map((r) => r.split(""));
      if (!rows[y] || rows[y][x] === undefined) return prev;
      rows[y][x] = on ? "1" : "0";
      const mask = rows.map((r) => r.join(""));
      // Refuse to paint away the last floor tile — a room must exist.
      if (!mask.some((r) => r.includes("1"))) return prev;
      return validateIsoLayout({ ...prev, mask });
    });
  }, []);
  const resetIsoShape = useCallback(
    () => setIsoRoom((prev) => validateIsoLayout({ ...prev, mask: undefined })),
    []
  );
  const clearIsoRoom = useCallback(
    () => setIsoRoom((prev) => ({ w: prev.w, d: prev.d, placements: [] })),
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
    // Debounced persistence: dragging fires a state update per pointer move,
    // so both the mirror write and the API call wait for the dust to settle.
    // Flat and iso layouts travel together in one PUT.
    clearTimeout(roomSaveTimer.current);
    roomSaveTimer.current = setTimeout(() => {
      localStorage.setItem("tasknook.room", JSON.stringify(roomPlacements));
      localStorage.setItem("tasknook.isoRoom", JSON.stringify(isoRoom));
      api
        .saveRoom(roomPlacements, isoRoom)
        .catch((err) => console.error("Failed to save room layout:", err));
    }, 600);
    return () => clearTimeout(roomSaveTimer.current);
  }, [roomPlacements, isoRoom]);

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
          }
        }
      }
      setBooting(false);
    })();
  }, []);

  const refreshAll = useCallback(async () => {
    const [t, s, f, d] = await Promise.all([
      api.listTasks(),
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
    if (user) refreshAll().catch(() => {});
  }, [user, refreshAll]);

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
            localStorage.setItem("tasknook.room", JSON.stringify(server));
          }
          if (serverIso) {
            setIsoRoom(serverIso);
            localStorage.setItem("tasknook.isoRoom", JSON.stringify(serverIso));
          }
        }
        if (!server || !serverIso) {
          // Push whatever half the server is missing (first run, or a save
          // from before the iso room existed).
          await api.saveRoom(server || roomRef.current, serverIso || isoRef.current);
        }
      } catch (err) {
        console.error("Failed to load room layout:", err);
      }
    })();
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
    }
  };
  const editTask = async (id, payload) => {
    try {
      await api.updateTask(id, payload);
      await refreshAll();
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };
  const removeTask = async (id) => {
    try {
      if (activeTaskId === id) setActiveTaskId(null);
      await api.deleteTask(id);
      await refreshAll();
    } catch (err) {
      console.error("Failed to delete task:", err);
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
    localStorage.setItem("tasknook.algo", "custom");
    await api.reorderTasks(orderedActive.map((t) => t.id));
    await refreshAll();
  };

  // ---------- Task groups (VC2-style to-do headers) ----------
  // Group names live on the tasks themselves (Task.group_name); this local
  // list only exists so a freshly created EMPTY group has somewhere to be
  // until its first task arrives.
  const [emptyGroups, setEmptyGroups] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tasknook.taskGroups") || "[]");
      return Array.isArray(saved) ? saved.filter((g) => typeof g === "string") : [];
    } catch {
      return [];
    }
  });
  const persistEmptyGroups = (next) => {
    setEmptyGroups(next);
    localStorage.setItem("tasknook.taskGroups", JSON.stringify(next));
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
    }
  };
  const toggleRoutine = (task) => editTask(task.id, { routine: !task.routine });

  const [randomOrder, setRandomOrder] = useState([]);

  const chooseAlgorithm = (key) => {
    setAlgorithm(key);
    localStorage.setItem("tasknook.algo", key);
    // Re-shuffle every time Random is picked, including clicking it again
    // while it's already active — that's the whole point of the button.
    if (key === "random") setRandomOrder(shuffledIds(tasks));
  };

  const orderedTasks = applyAlgorithm(algorithm, tasks, { randomOrder });
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  // ---------- Focus timer engine ----------
  // Mid-session ±time nudges (VC2-style). Tracked separately so the progress
  // bar's total stretches with the block and the logged session reflects the
  // time actually planned, not the preset.
  const [nudgeSeconds, setNudgeSeconds] = useState(0);
  const nudgeTimer = (deltaSec) => {
    if (timerMode !== "timer" || phase === "break") return;
    // Only count what actually applied: −1:00 with 30s left clamps to 1s, and
    // crediting the full minute would shrink the logged session and the
    // progress total by time that never existed.
    const applied = Math.max(1, remaining + deltaSec) - remaining;
    if (applied === 0) return;
    setRemaining((r) => Math.max(1, r + deltaSec));
    setNudgeSeconds((n) => n + applied);
  };

  const setFocus = (minutes) => {
    setFocusMinutes(minutes);
    if (!running) {
      setRemaining(minutes * 60);
      setPhase("focus");
      setRound(1);
      setNudgeSeconds(0);
    }
  };

  const startTimer = () => {
    if (timerMode === "timer" && remaining <= 0) setRemaining(focusMinutes * 60);
    setRunning(true);
  };
  const pauseTimer = () => setRunning(false);
  const resetTimer = () => {
    setRunning(false);
    if (timerMode === "stopwatch") {
      setElapsed(0);
      return;
    }
    setPhase("focus");
    setRound(1);
    setRemaining(focusMinutes * 60);
    setNudgeSeconds(0);
  };

  // Switching between countdown and stopwatch resets both clocks; blocked
  // while running so a mid-session flip can't eat tracked time.
  const setTimerMode = (mode) => {
    if (running || (mode !== "timer" && mode !== "stopwatch")) return;
    setTimerModeState(mode);
    localStorage.setItem("tasknook.timerMode", mode);
    setElapsed(0);
    setPhase("focus");
    setRound(1);
    setRemaining(focusMinutes * 60);
    setNudgeSeconds(0);
  };

  const notify = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  };

  // Runs when a countdown reaches zero. In pomodoro mode this advances the
  // focus/break cycle (the interval keeps ticking through transitions);
  // otherwise it just ends the block. Completed FOCUS phases are logged as
  // sessions — breaks never are.
  const handlePhaseComplete = useCallback(async () => {
    if (phase === "break") {
      setPhase("focus");
      setRound((r) => r + 1);
      setRemaining(focusMinutes * 60);
      notify("🌱 Back to it", `Round ${round + 1} of ${pomodoro.rounds} — ${focusMinutes} focused minutes.`);
      return;
    }
    try {
      await api.logSession({
        minutes: Math.max(1, Math.round((focusMinutes * 60 + nudgeSeconds) / 60)),
        taskName: activeTask ? activeTask.name : "Focus",
      });
      await refreshAll();
    } catch {
      /* ignore */
    }
    setNudgeSeconds(0);
    if (pomodoro.enabled && round < pomodoro.rounds) {
      setPhase("break");
      setRemaining(pomodoro.breakMinutes * 60);
      notify("☕ Break time", `${pomodoro.breakMinutes} minutes — stretch, hydrate, breathe.`);
    } else {
      setRunning(false);
      setPhase("focus");
      setRound(1);
      if (pomodoro.enabled) {
        notify("🎉 Pomodoro complete", `All ${pomodoro.rounds} rounds done — ${pomodoro.rounds * focusMinutes} minutes logged.`);
      } else {
        notify("🌙 Focus block complete", `${focusMinutes} cozy minutes logged. Time to stretch.`);
      }
    }
  }, [phase, round, focusMinutes, nudgeSeconds, pomodoro, activeTask, refreshAll]);

  // Keep the latest handler in a ref so the ticking interval depends only on
  // `running` — selecting a different task mid-focus won't restart the timer.
  const handlePhaseCompleteRef = useRef(null);
  useEffect(() => {
    handlePhaseCompleteRef.current = handlePhaseComplete;
  }, [handlePhaseComplete]);

  // timerMode can't change while running (setTimerMode blocks it), so adding
  // it to the deps never restarts a live interval.
  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(
      timerMode === "stopwatch"
        ? () => setElapsed((e) => e + 1)
        : () => setRemaining((r) => Math.max(0, r - 1)),
      1000
    );
    return () => clearInterval(tickRef.current);
  }, [running, timerMode]);

  // Fire the phase handler from an effect (not inside the setState updater) so
  // it can safely set more state / await API calls. Countdown mode only — a
  // stopwatch has no "zero" to reach.
  useEffect(() => {
    if (!running || remaining > 0 || timerMode !== "timer") return;
    handlePhaseCompleteRef.current?.();
  }, [remaining, running, timerMode]);

  // Ending a stopwatch logs whatever it measured (rounded to minutes) as a
  // focus session, exactly like a completed countdown block.
  const finishStopwatch = async () => {
    setRunning(false);
    const minutes = Math.round(elapsed / 60);
    setElapsed(0);
    if (minutes < 1) return; // nothing meaningful to log
    try {
      await api.logSession({
        minutes,
        taskName: activeTask ? activeTask.name : "Stopwatch",
      });
      await refreshAll();
    } catch {
      /* ignore */
    }
    notify("⏱️ Time tracked", `${minutes} cozy ${minutes === 1 ? "minute" : "minutes"} logged.`);
  };

  // "Focus today" including the CURRENT running block — the DB only knows
  // about completed sessions, which read as "the app isn't tracking me".
  const inSessionMinutes = !running
    ? 0
    : timerMode === "stopwatch"
    ? Math.floor(elapsed / 60)
    : phase === "focus"
    ? Math.max(0, Math.floor((focusMinutes * 60 + nudgeSeconds - remaining) / 60))
    : 0;
  const focusMinutesLive = (stats.focusMinutesToday || 0) + inSessionMinutes;

  // ---------- Ambient ----------
  // Weather quick-picks drive ONLY the visual (overlay + cottage window).
  // Sound is the mixer's business — picking a rainy scene without rain audio
  // is a legitimate mood, so the two never auto-couple.
  // Internal appliers: what auto-match calls. The PUBLIC setters below are
  // what the UI calls, and a manual pick switches auto-match OFF — otherwise
  // the 15-minute refresh silently overwrites the user's choice and the two
  // settings fight each other.
  const applyWeatherVisual = (nextMode) => setWeatherModeState(nextMode);
  const applyTimeOfDay = (mode) => {
    setTimeOfDayState(mode);
    localStorage.setItem("tasknook.timeOfDay", mode);
  };
  const setWeather = (nextMode) => {
    if (autoMatchRef.current) setAutoMatchWeather(false);
    applyWeatherVisual(nextMode);
  };
  const changeWeatherVolume = (v) => setWeatherVol(v);
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
    const preset = { name: trimmed, weatherMode, timeOfDay, weatherVolume, soundMix };
    setWeatherPresets((prev) => {
      const next = [...prev.filter((p) => p.name !== trimmed), preset];
      localStorage.setItem("tasknook.weather.presets", JSON.stringify(next));
      return next;
    });
  };
  const applyWeatherPreset = (name) => {
    const preset = weatherPresets.find((p) => p.name === name);
    if (!preset) return;
    setWeatherVol(preset.weatherVolume);
    setWeatherModeState(preset.weatherMode);
    setTimeOfDay(preset.timeOfDay);
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
    setWeatherPresets((prev) => {
      const next = prev.filter((p) => p.name !== name);
      localStorage.setItem("tasknook.weather.presets", JSON.stringify(next));
      return next;
    });
  };

  // ---------- Settings ----------
  const setBrightness = (v) => {
    setBrightnessState(v);
    localStorage.setItem("tasknook.brightness", String(v));
  };
  const setColorScheme = (scheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem("tasknook.colorScheme", scheme);
  };
  // Picking a colour implies you want the custom scheme.
  const setCustomColor = (hex) => {
    setCustomColorState(hex);
    localStorage.setItem("tasknook.customColor", hex);
    setColorScheme("custom");
  };

  // ---------- Real-world weather ----------
  useEffect(() => {
    autoMatchRef.current = autoMatchWeather;
    localStorage.setItem("tasknook.weather.automatch", autoMatchWeather ? "1" : "0");
  }, [autoMatchWeather]);

  const refreshRealWeather = useCallback(async (coordsOverride) => {
    setWeatherStatus("loading");
    setWeatherError("");
    try {
      const coords = coordsOverride || weatherCoordsRef.current || (await locateBrowser());
      weatherCoordsRef.current = coords;
      localStorage.setItem("tasknook.weather.coords", JSON.stringify(coords));
      const data = await fetchCurrentWeather(coords.lat, coords.lon);
      setRealWeather(data);
      setWeatherStatus("ready");
      if (autoMatchRef.current) {
        // Internal appliers — the public setters would disable auto-match.
        setWeatherModeState(data.mode);
        setTimeOfDayState(data.timeOfDay);
        localStorage.setItem("tasknook.timeOfDay", data.timeOfDay);
      }
    } catch (err) {
      setWeatherStatus("error");
      setWeatherError(err.message || "Couldn't get the weather");
    }
  }, []);

  const searchWeatherCity = async (name) => {
    setWeatherStatus("loading");
    setWeatherError("");
    try {
      const place = await geocodeCity(name);
      setWeatherLocationLabel(place.label);
      localStorage.setItem("tasknook.weather.location", place.label);
      await refreshRealWeather({ lat: place.lat, lon: place.lon });
    } catch (err) {
      setWeatherStatus("error");
      setWeatherError(err.message || "Couldn't find that place");
    }
  };

  const toggleAutoMatchWeather = () => {
    setAutoMatchWeather((v) => {
      const next = !v;
      if (next && realWeather) {
        applyWeatherVisual(realWeather.mode);
        applyTimeOfDay(realWeather.timeOfDay);
      }
      return next;
    });
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
    localStorage.setItem("tasknook.music.station", key);
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
      localStorage.setItem("tasknook.music.custom", JSON.stringify(next));
    }
    selectStation(station);
    return true;
  };

  const removeCustomStation = (station) => {
    const key = stationKey(station);
    const next = customStations.filter((s) => stationKey(s) !== key);
    setCustomStations(next);
    localStorage.setItem("tasknook.music.custom", JSON.stringify(next));
    if (activeStationKey === key) setStation(stationKey(BUILT_IN_STATIONS[0]));
  };

  // ---------- Room actions ----------
  // useCallback throughout: these are handed to <Cottage/>, which is memo'd so
  // it can skip the per-second focus-timer re-render. New function identities
  // every tick would defeat that entirely.
  const moveRoomItem = useCallback((id, x, y) => {
    setRoomPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  }, []);
  const addRoomItem = useCallback((key) => {
    setRoomPlacements((prev) => {
      if (prev.length >= MAX_ITEMS) return prev;
      const placement = newPlacement(key, prev);
      return placement ? [...prev, placement] : prev;
    });
    setRoomEditMode(true); // they'll want to drag the new arrival into place
  }, []);
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
    focusMinutesLive,
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
    clearIsoRoom,
    applyIsoPreset,

    // timer
    focusMinutes,
    setFocus,
    focusPresets: FOCUS_PRESETS,
    remaining,
    running,
    startTimer,
    pauseTimer,
    resetTimer,
    timerMode,
    setTimerMode,
    elapsed,
    finishStopwatch,
    nudgeSeconds,
    nudgeTimer,
    activeTask,
    activeTaskId,
    setActiveTaskId,
    pomodoro,
    setPomodoro,
    phase,
    round,

    // ambient
    weatherMode,
    setWeather,
    weatherVolume,
    changeWeatherVolume,
    soundMix,
    setSoundLevel,
    stopAllSounds,
    timeOfDay,
    setTimeOfDay,
    musicOn,
    toggleMusic,
    musicStations,
    activeStationKey,
    selectStation,
    addCustomStation,
    removeCustomStation,

    // real-world weather
    realWeather,
    weatherStatus,
    weatherError,
    weatherLocationLabel,
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
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
