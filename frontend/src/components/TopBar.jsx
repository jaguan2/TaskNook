import { useEffect, useState } from "react";
import {
  Clock3,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Music2,
} from "lucide-react";
import { useStore } from "../store";

// Historically the top bar — now the BOTTOM-RIGHT corner cluster (clock,
// ambient toggles, account), Virtual Cottage-style. The top corners belong to
// the focus card (left) and the to-do list (right); see HudFocusCard/HudTasks.

// Shared with WeatherPanel's Sky section — one source for the sky vocabulary.
// Icons are Lucide components (stroke icons re-tint with the theme; OS emoji
// don't and looked out of place — user feedback).
export const WEATHER_OPTIONS = [
  { key: "off", label: "Clear", Icon: CloudSun },
  { key: "cloudy", label: "Cloudy", Icon: Cloud },
  { key: "rain", label: "Rain", Icon: CloudRain },
  { key: "snow", label: "Snow", Icon: CloudSnow },
  { key: "storm", label: "Storm", Icon: CloudLightning },
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
  const { user, musicOn, toggleMusic, weatherMode, setWeather } = useStore();
  const now = useClock();
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);
  // The trigger mirrors the active option — including Clear, which used to
  // fall through to the rain icon and read as "rain is on".
  const WeatherIcon = (
    WEATHER_OPTIONS.find((w) => w.key === weatherMode) || WEATHER_OPTIONS[0]
  ).Icon;

  // Escape closes the popover. Capture phase + stopPropagation so App's own
  // Escape handler (which would close a drawer) doesn't also fire.
  useEffect(() => {
    if (!weatherMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setWeatherMenuOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [weatherMenuOpen]);

  return (
    <div className="intro-chrome absolute bottom-6 right-6 z-20 flex items-center gap-2">
      <IconToggle active={musicOn} onClick={toggleMusic} title="Music on/off" slashWhenOff>
        <Music2 size={18} />
      </IconToggle>

      <div className="relative">
        <button
          title="Weather ambience"
          aria-label="Weather ambience"
          onClick={() => setWeatherMenuOpen((o) => !o)}
          className={`pill grid h-11 w-11 place-items-center shadow-soft transition ${
            weatherMode !== "off"
              ? "bg-glow/90 text-plum"
              : "glass text-cream hover:bg-white/10"
          }`}
        >
          <WeatherIcon size={18} />
        </button>
        {weatherMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setWeatherMenuOpen(false)}
            />
            {/* opens UPWARD now that the cluster lives at the bottom */}
            <div className="glass absolute bottom-full right-0 z-40 mb-2 flex flex-col gap-1 rounded-2xl p-2 shadow-soft">
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
                  <w.Icon size={14} /> {w.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="glass pill flex items-center gap-2 px-4 py-2 text-cream shadow-soft">
        <Clock3 size={16} className="text-petal/70" />
        <span className="font-semibold tabular-nums">{fmtClock(now)}</span>
      </div>

      <div className="glass pill flex items-center gap-2 px-3 py-2 text-cream shadow-soft">
        <span className="text-base">{user?.avatar || "🌙"}</span>
        <span className="hidden sm:block text-sm font-semibold">
          {user?.displayName}
        </span>
      </div>
    </div>
  );
}

function IconToggle({ active, onClick, title, slashWhenOff, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`pill relative grid h-11 w-11 place-items-center shadow-soft transition ${
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
