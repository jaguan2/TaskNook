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

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const FOCUS_PRESETS = [15, 25, 45, 60];

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

  // ---------- Bootstrap session ----------
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user } = await api.me();
          setUser(user);
        } catch {
          setToken(null);
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

  // ---------- Auth actions ----------
  const login = async (payload) => {
    const { token, user } = await api.login(payload);
    setToken(token);
    setUser(user);
  };
  const register = async (payload) => {
    const { token, user } = await api.register(payload);
    setToken(token);
    setUser(user);
  };
  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setTasks([]);
    setFriends([]);
  };

  // ---------- Task actions ----------
  const addTask = async (payload) => {
    await api.createTask(payload);
    await refreshAll();
  };
  const toggleTask = async (task) => {
    await api.updateTask(task.id, { completed: !task.completed });
    await refreshAll();
  };
  const editTask = async (id, payload) => {
    await api.updateTask(id, payload);
    await refreshAll();
  };
  const removeTask = async (id) => {
    if (activeTaskId === id) setActiveTaskId(null);
    await api.deleteTask(id);
    await refreshAll();
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

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tickRef.current);
          completeFocus();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, completeFocus]);

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

  const value = {
    user,
    booting,
    login,
    register,
    logout,

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
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
