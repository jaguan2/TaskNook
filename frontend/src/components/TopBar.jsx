import { useEffect, useState } from "react";
import { useStore } from "../store";

const WEATHER_OPTIONS = [
  { key: "off", label: "Off", icon: "🌤️" },
  { key: "rain", label: "Rain", icon: "🌧️" },
  { key: "snow", label: "Snow", icon: "❄️" },
  { key: "storm", label: "Storm", icon: "⛈️" },
];

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
    weatherMode,
    setWeather,
  } = useStore();
  const now = useClock();
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);
  const weatherIcon = { snow: "❄️", storm: "⛈️" }[weatherMode] || "🌧️";

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
      <div className="intro-chrome absolute left-6 top-6 z-20">
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
      <div className="intro-chrome absolute right-6 top-6 z-20 flex items-center gap-2">
        <div className="glass pill flex items-center gap-2 px-4 py-2 text-cream shadow-soft">
          <span className="text-base">🕗</span>
          <span className="font-semibold tabular-nums">{fmtClock(now)}</span>
        </div>

        <IconToggle active={musicOn} onClick={toggleMusic} title="Lofi music" slashWhenOff>
          🎵
        </IconToggle>

        <div className="relative">
          <button
            title="Weather ambience"
            onClick={() => setWeatherMenuOpen((o) => !o)}
            className={`pill grid h-11 w-11 place-items-center text-lg shadow-soft transition ${
              weatherMode !== "off"
                ? "bg-glow/90 text-plum"
                : "glass text-cream hover:bg-white/10"
            }`}
          >
            {weatherIcon}
          </button>
          {weatherMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setWeatherMenuOpen(false)}
              />
              <div className="glass absolute right-0 top-full z-40 mt-2 flex flex-col gap-1 rounded-2xl p-2 shadow-soft">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w.key}
                    onClick={() => {
                      setWeather(w.key);
                      setWeatherMenuOpen(false);
                    }}
                    className={`pill flex items-center gap-2 whitespace-nowrap px-3 py-1.5 text-left text-xs font-semibold ${
                      weatherMode === w.key
                        ? "bg-glow text-plum"
                        : "text-petal hover:bg-white/10"
                    }`}
                  >
                    {w.icon} {w.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="glass pill flex items-center gap-2 px-3 py-2 text-cream shadow-soft">
          <span className="text-base">{user?.avatar || "🌙"}</span>
          <span className="hidden sm:block text-sm font-semibold">
            {user?.displayName}
          </span>
        </div>
      </div>
    </>
  );
}

function IconToggle({ active, onClick, title, slashWhenOff, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`pill relative grid h-11 w-11 place-items-center text-lg shadow-soft transition ${
        active
          ? "bg-glow/90 text-plum"
          : "glass text-cream hover:bg-white/10"
      }`}
    >
      {children}
      {slashWhenOff && !active && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-[2px] w-7 rotate-45 rounded-full bg-cream/80" />
        </span>
      )}
    </button>
  );
}
