import { useEffect, useState } from "react";
import { useStore } from "../store";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 20);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fmtClock(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TopBar() {
  const {
    user,
    activeTask,
    running,
    remaining,
    musicOn,
    toggleMusic,
    rainOn,
    toggleRain,
    logout,
  } = useStore();
  const now = useClock();

  const minutesToGo = Math.ceil(remaining / 60);
  const status = running ? "Focusing" : "Cozy break";
  const subtitle = activeTask
    ? activeTask.name
    : running
    ? `${minutesToGo} minutes to go`
    : "Pick a task & press play";

  return (
    <>
      {/* Top-left: current activity */}
      <div className="absolute left-6 top-6 z-20">
        <h1 className="text-2xl font-bold tracking-wide text-cream drop-shadow">
          {status}
        </h1>
        <p className="mt-1 text-sm font-medium text-petal/90">
          {running ? `${minutesToGo} minutes to go` : subtitle}
        </p>
        {activeTask && (
          <p className="mt-0.5 text-xs text-petal/60">on “{activeTask.name}”</p>
        )}
      </div>

      {/* Top-right: clock + ambient toggles + account */}
      <div className="absolute right-6 top-6 z-20 flex items-center gap-2">
        <div className="glass pill flex items-center gap-2 px-4 py-2 text-cream shadow-soft">
          <span className="text-base">🕗</span>
          <span className="font-semibold tabular-nums">{fmtClock(now)}</span>
        </div>

        <IconToggle active={musicOn} onClick={toggleMusic} title="Lofi music">
          🎵
        </IconToggle>
        <IconToggle active={rainOn} onClick={toggleRain} title="Rain ambience">
          🌧️
        </IconToggle>

        <div className="group relative">
          <button className="glass pill flex items-center gap-2 px-3 py-2 text-cream shadow-soft">
            <span className="text-base">{user?.avatar || "🌙"}</span>
            <span className="hidden sm:block text-sm font-semibold">
              {user?.displayName}
            </span>
          </button>
          <div className="invisible absolute right-0 mt-2 w-36 rounded-2xl glass p-2 opacity-0 shadow-soft transition group-hover:visible group-hover:opacity-100">
            <button
              onClick={logout}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-petal hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function IconToggle({ active, onClick, title, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`pill grid h-11 w-11 place-items-center text-lg shadow-soft transition ${
        active
          ? "bg-glow/90 text-plum"
          : "glass text-cream hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
