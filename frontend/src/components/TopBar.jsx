import { useEffect, useState } from "react";
import {
  Clock3,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Leaf,
  Music2,
  Pin,
  PictureInPicture2,
} from "lucide-react";
import { useStore } from "../store";
import { readStored, writeStored } from "../lib/storage";
import {
  hasDesktopApi,
  onDesktopApiReady,
  setAlwaysOnTop as applyAlwaysOnTop,
} from "../lib/desktop";

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
  // A season rather than a forecast: no WMO code maps to it, so auto-match
  // never picks it — it's yours to set when you want autumn.
  { key: "leaves", label: "Falling leaves", Icon: Leaf },
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

export default function TopBar({ clockVisibility = "on" }) {
  const { user, musicOn, toggleMusic, weatherMode, setWeather, widgetMode, setWidgetMode } =
    useStore();
  const now = useClock();
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);

  // Always On Top only exists inside the packaged desktop window (pywebview's
  // js_api bridge) — undetectable until it's injected, so this starts closed
  // and flips open once `pywebviewready` fires. A plain browser tab never
  // gets it, which is correct: there's no OS window for a tab to pin.
  const [desktopReady, setDesktopReady] = useState(() => hasDesktopApi());
  const [alwaysOnTop, setAlwaysOnTopState] = useState(
    () => readStored("tasknook.alwaysOnTop") === "1"
  );
  useEffect(() => {
    if (desktopReady) return undefined;
    return onDesktopApiReady(() => setDesktopReady(hasDesktopApi()));
  }, [desktopReady]);
  // Re-apply a saved "on" preference once the bridge exists, so a relaunch
  // (esp. paired with Widget Mode) comes back pinned exactly as left —
  // same reasoning as musicOn's resume-on-boot.
  useEffect(() => {
    if (desktopReady && alwaysOnTop) applyAlwaysOnTop(true);
    // Only on the desktopReady transition, not every alwaysOnTop toggle —
    // toggleAlwaysOnTop below already applies those directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktopReady]);
  const toggleAlwaysOnTop = async () => {
    const next = !alwaysOnTop;
    setAlwaysOnTopState(next);
    writeStored("tasknook.alwaysOnTop", next ? "1" : "0");
    await applyAlwaysOnTop(next);
  };
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

      {/* Widget Mode: collapses the whole app to just the floating focus
          card — meant to sit beside other work, not replace the cottage.
          Works in a browser tab too, unlike Always On Top beside it. */}
      <IconToggle
        active={widgetMode}
        onClick={() => setWidgetMode(!widgetMode)}
        title="Widget Mode"
      >
        <PictureInPicture2 size={17} />
      </IconToggle>

      {/* Always On Top: desktop-only (pywebview js_api bridge) — pairs with
          Widget Mode to keep the timer visible over other windows while you
          work. Hidden entirely outside the packaged app; there's no OS
          window for a browser tab to pin. */}
      {desktopReady && (
        <IconToggle active={alwaysOnTop} onClick={toggleAlwaysOnTop} title="Always On Top">
          <Pin size={17} />
        </IconToggle>
      )}

      {/* h-11, not py-2: the two round toggles are 44px and these were 40px,
          so the cluster had two different pill heights sitting side by side.
          Same px-4 on both for an even rhythm across the row. "hidden" drops
          it from the DOM outright (not just invisible) — this pill carries no
          .intro-chrome/persistent-state concerns of its own (TopBar's own
          wrapper does, and TopBar itself never unmounts), so removing it lets
          the row reflow tight instead of leaving a gap for a clock nobody
          wants to see. */}
      {clockVisibility !== "hidden" && (
        <div
          className={`glass pill flex h-11 items-center gap-2 px-4 text-cream shadow-soft transition-opacity duration-300 ${
            clockVisibility === "faded" ? "opacity-30" : "opacity-100"
          }`}
        >
          <Clock3 size={16} className="text-petal/70" />
          <span className="font-semibold tabular-nums">{fmtClock(now)}</span>
        </div>
      )}

      <div className="glass pill flex h-11 items-center gap-2 px-4 text-cream shadow-soft">
        <span className="text-base leading-none">{user?.avatar || "🌙"}</span>
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
      aria-label={title}
      aria-pressed={active}
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
