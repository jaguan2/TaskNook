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
import { startWeather, stopWeather, setWeatherVolume } from "./lib/audio";
import { resolveMusicLink, stationKey } from "./lib/musicLink";
import { locateBrowser, geocodeCity, fetchCurrentWeather } from "./lib/weather";
import {
  MAX_ITEMS,
  newPlacement,
  presetPlacements,
  validatePlacements,
} from "./lib/room";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const FOCUS_PRESETS = [15, 25, 45, 60];

const LOCAL_ACCOUNT = { username: "you", password: "tasknook-local-cottage" };

// A few cozy lofi streams to start with; users can add their own via YouTube or Spotify link.
// Stored as video ids, not playlist ids. Links like ...&list=RD<id> are
// YouTube's auto-generated "radio" mixes, and RD… lists refuse to load in an
// iframe embed — the underlying video plays fine.
const BUILT_IN_STATIONS = [
  { provider: "youtube", id: "jfKfPfyJRdk", label: "lofi hip hop radio 📚" },
  { provider: "youtube", id: "4xDzrJKXOOY", label: "synthwave radio 🌃" },
  { provider: "youtube", id: "rUxyKA_-grg", label: "lofi sleep & chill 🌙" },
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
    if (!running) setRemaining(focusMinutes * 60);
  };

  // ---- Ambient ----
  const [weatherMode, setWeatherModeState] = useState("off");
  const [weatherVolume, setWeatherVol] = useState(0.5);
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
  const roomRef = useRef(roomPlacements);
  const roomSaveTimer = useRef(null);
  // Applying server state on boot must not immediately echo back as a "save".
  const roomSkipSave = useRef(true);

  useEffect(() => {
    roomRef.current = roomPlacements;
    if (roomSkipSave.current) {
      roomSkipSave.current = false;
      return undefined;
    }
    // Debounced persistence: dragging fires a state update per pointer move,
    // so both the mirror write and the API call wait for the dust to settle.
    clearTimeout(roomSaveTimer.current);
    roomSaveTimer.current = setTimeout(() => {
      localStorage.setItem("tasknook.room", JSON.stringify(roomPlacements));
      api
        .saveRoom(roomPlacements)
        .catch((err) => console.error("Failed to save room layout:", err));
    }, 600);
    return () => clearTimeout(roomSaveTimer.current);
  }, [roomPlacements]);

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
        // `server` is null only when the account has never saved a layout —
        // that's the one case where this device's layout should be adopted.
        // An EMPTY array is a real, deliberate choice ("Empty room"), so it
        // must win too; testing `.length` here would silently restore the
        // default preset over a room the user had emptied on purpose.
        if (server) {
          roomSkipSave.current = true;
          setRoomPlacements(server);
          localStorage.setItem("tasknook.room", JSON.stringify(server));
        } else {
          await api.saveRoom(roomRef.current);
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
  const setFocus = (minutes) => {
    setFocusMinutes(minutes);
    if (!running) {
      setRemaining(minutes * 60);
      setPhase("focus");
      setRound(1);
    }
  };

  const startTimer = () => {
    if (remaining <= 0) setRemaining(focusMinutes * 60);
    setRunning(true);
  };
  const pauseTimer = () => setRunning(false);
  const resetTimer = () => {
    setRunning(false);
    setPhase("focus");
    setRound(1);
    setRemaining(focusMinutes * 60);
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
        minutes: focusMinutes,
        taskName: activeTask ? activeTask.name : "Focus",
      });
      await refreshAll();
    } catch {
      /* ignore */
    }
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
  }, [phase, round, focusMinutes, pomodoro, activeTask, refreshAll]);

  // Keep the latest handler in a ref so the ticking interval depends only on
  // `running` — selecting a different task mid-focus won't restart the timer.
  const handlePhaseCompleteRef = useRef(null);
  useEffect(() => {
    handlePhaseCompleteRef.current = handlePhaseComplete;
  }, [handlePhaseComplete]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(tickRef.current);
  }, [running]);

  // Fire the phase handler from an effect (not inside the setState updater) so
  // it can safely set more state / await API calls.
  useEffect(() => {
    if (!running || remaining > 0) return;
    handlePhaseCompleteRef.current?.();
  }, [remaining, running]);

  // ---------- Ambient ----------
  const setWeather = (nextMode) => {
    setWeatherModeState(nextMode);
    startWeather(nextMode, weatherVolume);
  };
  const changeWeatherVolume = (v) => {
    setWeatherVol(v);
    setWeatherVolume(v);
  };
  const setTimeOfDay = (mode) => {
    setTimeOfDayState(mode);
    localStorage.setItem("tasknook.timeOfDay", mode);
  };
  const toggleMusic = () => setMusicOn((m) => !m);

  // A named snapshot of {weatherMode, timeOfDay, weatherVolume} so a whole
  // "scene" can be recalled in one click instead of resetting each control.
  const saveWeatherPreset = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset = { name: trimmed, weatherMode, timeOfDay, weatherVolume };
    setWeatherPresets((prev) => {
      const next = [...prev.filter((p) => p.name !== trimmed), preset];
      localStorage.setItem("tasknook.weather.presets", JSON.stringify(next));
      return next;
    });
  };
  const applyWeatherPreset = (name) => {
    const preset = weatherPresets.find((p) => p.name === name);
    if (!preset) return;
    changeWeatherVolume(preset.weatherVolume);
    setWeather(preset.weatherMode);
    setTimeOfDay(preset.timeOfDay);
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

  // Keep the latest setWeather/setTimeOfDay in refs so refreshRealWeather (and
  // the auto-match interval below) can stay a stable callback without ever
  // acting on a stale weatherVolume from whichever render first created it.
  const setWeatherRef = useRef(setWeather);
  const setTimeOfDayRef = useRef(setTimeOfDay);
  useEffect(() => {
    setWeatherRef.current = setWeather;
    setTimeOfDayRef.current = setTimeOfDay;
  });

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
        setWeatherRef.current(data.mode);
        setTimeOfDayRef.current(data.timeOfDay);
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
        setWeather(realWeather.mode);
        setTimeOfDay(realWeather.timeOfDay);
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

    algorithm,
    chooseAlgorithm,

    friends,
    stats,
    sessionDays,
    refreshAll,

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

    // timer
    focusMinutes,
    setFocus,
    focusPresets: FOCUS_PRESETS,
    remaining,
    running,
    startTimer,
    pauseTimer,
    resetTimer,
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
