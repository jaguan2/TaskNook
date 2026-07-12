import { useState } from "react";
import { useStore } from "../store";

const TIME_OPTIONS = [
  { key: "night", label: "Night", icon: "🌙" },
  { key: "sunset", label: "Sunset", icon: "🌅" },
  { key: "day", label: "Day", icon: "☀️" },
];

export default function WeatherPanel() {
  const {
    realWeather,
    weatherStatus,
    weatherError,
    weatherLocationLabel,
    refreshRealWeather,
    searchWeatherCity,
    autoMatchWeather,
    toggleAutoMatchWeather,
    timeOfDay,
    setTimeOfDay,
  } = useStore();

  const [city, setCity] = useState("");

  const submitCity = (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    searchWeatherCity(city.trim());
  };

  return (
    <div className="space-y-5">
      {/* Real-world weather */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-cream">🌍 Right now</p>
          <button
            onClick={() => refreshRealWeather()}
            disabled={weatherStatus === "loading"}
            className="pill bg-white/10 px-3 py-1 text-xs font-semibold text-petal hover:bg-white/20 disabled:opacity-50"
          >
            {weatherStatus === "loading" ? "…" : "Refresh"}
          </button>
        </div>

        {realWeather ? (
          <div className="flex items-center gap-4 rounded-2xl bg-white/5 px-4 py-3">
            <span className="text-4xl leading-none">{realWeather.icon}</span>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-cream">{realWeather.tempF}°F</p>
              <p className="truncate text-xs text-petal/70">{realWeather.label}</p>
              {weatherLocationLabel && (
                <p className="truncate text-[10px] text-petal/50">{weatherLocationLabel}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-white/5 px-3 py-4 text-center text-xs text-petal/60">
            {weatherStatus === "loading"
              ? "Checking the sky…"
              : "See the real weather where you are, right in TaskNook."}
          </p>
        )}
        {weatherStatus === "error" && (
          <p className="text-xs text-rose">{weatherError}</p>
        )}

        <form onSubmit={submitCity} className="flex gap-1.5">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Or type a city…"
            className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-cream placeholder:text-petal/40 outline-none focus:bg-white/15"
          />
          <button
            type="submit"
            className="pill bg-white/10 px-3 py-1.5 text-xs font-semibold text-petal hover:bg-white/20"
          >
            Go
          </button>
        </form>
      </section>

      <hr className="border-white/10" />

      {/* Auto-match toggle */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-cream">🪄 Match my real weather</p>
          <button
            onClick={toggleAutoMatchWeather}
            className={`pill px-3 py-1 text-xs font-semibold ${
              autoMatchWeather ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {autoMatchWeather ? "On" : "Off"}
          </button>
        </div>
        <p className="text-xs text-petal/60">
          Automatically sets the cottage's weather ambience and time of day to
          match what's actually happening outside, refreshing every 15 minutes.
        </p>
      </section>

      <hr className="border-white/10" />

      {/* Time of day */}
      <section className="space-y-2">
        <p className="text-sm font-semibold text-cream">🕰️ Time of day</p>
        <div className="flex flex-wrap gap-1.5">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTimeOfDay(t.key)}
              className={`pill px-3 py-1.5 text-xs font-semibold ${
                timeOfDay === t.key
                  ? "bg-glow text-plum"
                  : "bg-white/10 text-petal hover:bg-white/20"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
