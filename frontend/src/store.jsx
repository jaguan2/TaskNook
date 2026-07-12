import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { api, getToken, setToken } from "./lib/api";
import { applyAlgorithm } from "./lib/algorithms";
import { startRain, stopRain, setRainVolume } from "./lib/audio";
import { resolveMusicLink, stationKey } from "./lib/musicLink";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const FOCUS_PRESETS = [15, 25, 45, 60];

const LOCAL_ACCOUNT = { username: "you", password: "tasknook-local-cottage" };

// A few cozy lofi streams to start with; users can add their own via YouTube or Spotify link.
const BUILT_IN_STATIONS = [
  { provider: "youtube", id: "jfKfPfyJRdk", label: "lofi hip hop radio 📚" },
  { provider: "youtube", id: "4xDzrJKXOOY", label: "synthwave radio 🌃" },
  { provider: "youtube", id: "rUxyKA_-grg", label: "lofi sleep & chill 🌙" },
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
  const [algorithm, setAlgorithm] = useState(
    () => localStorage.getItem("tasknook.algo") || "custom"
  );

  // ---- Focus timer ----
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const tickRef = useRef(null);

  // ---- Ambient ----
  const [rainOn, setRainOn] = useState(false);
  const [rainVolume, setRainVol] = useState(0.5);
  const [musicOn, setMusicOn] = useState(false);
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
    const [t, s, f] = await Promise.all([
      api.listTasks(),
      api.stats(),
      api.listFriends(),
    ]);
    setTasks(t);
    setStats(s);
    setFriends(f);
  }, []);

  useEffect(() => {
    if (user) refreshAll().catch(() => {});
  }, [user, refreshAll]);

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

  const chooseAlgorithm = (key) => {
    setAlgorithm(key);
    localStorage.setItem("tasknook.algo", key);
  };

  const orderedTasks = applyAlgorithm(algorithm, tasks);
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  // ---------- Focus timer engine ----------
  const setFocus = (minutes) => {
    setFocusMinutes(minutes);
    if (!running) setRemaining(minutes * 60);
  };

  const startTimer = () => {
    if (remaining <= 0) setRemaining(focusMinutes * 60);
    setRunning(true);
  };
  const pauseTimer = () => setRunning(false);
  const resetTimer = () => {
    setRunning(false);
    setRemaining(focusMinutes * 60);
  };

  const completeFocusRef = useRef(null);
  const completeFocus = useCallback(async () => {
    setRunning(false);
    try {
      await api.logSession({
        minutes: focusMinutes,
        taskName: activeTask ? activeTask.name : "Focus",
      });
      await refreshAll();
    } catch {
      /* ignore */
    }
    // gentle chime via the audio context is optional; notify instead
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🌙 Focus block complete", {
        body: `${focusMinutes} cozy minutes logged. Time to stretch.`,
      });
    }
  }, [focusMinutes, activeTask, refreshAll]);

  // Keep the latest completeFocus in a ref so the ticking interval depends only
  // on `running` — selecting a different task mid-focus won't restart the timer.
  useEffect(() => {
    completeFocusRef.current = completeFocus;
  }, [completeFocus]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tickRef.current);
          completeFocusRef.current?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running]);

  // ---------- Ambient ----------
  const toggleRain = () => {
    setRainOn((on) => {
      if (on) stopRain();
      else startRain(rainVolume);
      return !on;
    });
  };
  const changeRainVolume = (v) => {
    setRainVol(v);
    setRainVolume(v);
  };
  const toggleMusic = () => setMusicOn((m) => !m);

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
    refreshAll,

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

    // ambient
    rainOn,
    toggleRain,
    rainVolume,
    changeRainVolume,
    musicOn,
    toggleMusic,
    musicStations,
    activeStationKey,
    selectStation,
    addCustomStation,
    removeCustomStation,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
