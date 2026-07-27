import { useState } from "react";
import { useStore } from "../store";
import { useArmed } from "../lib/useArmed";
import { WEATHER_OPTIONS } from "./TopBar";

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
    weatherMode,
    setWeather,
    weatherPresets,
    saveWeatherPreset,
    applyWeatherPreset,
    deleteWeatherPreset,
  } = useStore();

  const [city, setCity] = useState("");
  const [presetName, setPresetName] = useState("");
  const [armedName, arm] = useArmed();

  const submitCity = (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    searchWeatherCity(city.trim());
  };

  const submitPreset = (e) => {
    e.preventDefault();
    if (!presetName.trim()) return;
    saveWeatherPreset(presetName.trim());
    setPresetName("");
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
          <p className="text-xs text-danger">{weatherError}</p>
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

      {/* Weather conditions: the full weather × time matrix — "Cloudy ·
          Night" is ONE tap, not two coordinated ones. Each pill sets both
          weatherMode and timeOfDay. Visual only (same rule as the corner
          popover); the sound mix stays the Sounds panel's business. */}
      <section className="space-y-2">
        <p className="text-sm font-semibold text-cream">🌆 Weather conditions</p>
        <p className="text-xs text-petal/60">
          One tap sets the whole scene — clear night, cloudy day, rainy
          sunset… Visual only: sounds stay yours in the Sounds panel.
        </p>
        <div className="space-y-1">
          {WEATHER_OPTIONS.map((w) => (
            <div key={w.key} className="flex items-center gap-1.5">
              <span className="w-[4.5rem] shrink-0 text-xs text-petal">
                {w.icon} {w.label}
              </span>
              {TIME_OPTIONS.map((t) => {
                const active = weatherMode === w.key && timeOfDay === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setWeather(w.key);
                      setTimeOfDay(t.key);
                    }}
                    title={`${w.label} ${t.label.toLowerCase()}`}
                    className={`pill flex-1 px-2 py-1 text-[11px] font-semibold ${
                      active
                        ? "bg-glow text-plum"
                        : "bg-white/10 text-petal hover:bg-white/20"
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <hr className="border-white/10" />

      {/* Saved scene presets */}
      <section className="space-y-2">
        <p className="text-sm font-semibold text-cream">💾 Presets</p>
        <p className="text-xs text-petal/60">
          Save the current weather, time of day, and sound mix as a scene to
          recall in one click.
        </p>

        {weatherPresets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {weatherPresets.map((p) => (
              <div key={p.name} className="flex items-center">
                <button
                  onClick={() => applyWeatherPreset(p.name)}
                  title={`${p.weatherMode} · ${p.timeOfDay}`}
                  className="pill rounded-r-none bg-white/10 px-3 py-1 text-xs text-petal hover:bg-white/20"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => arm(p.name, () => deleteWeatherPreset(p.name))}
                  title="Delete preset"
                  className={`pill rounded-l-none bg-white/10 px-2 py-1 text-xs hover:bg-white/20 ${
                    armedName === p.name
                      ? "font-bold text-danger"
                      : "text-petal/60 hover:text-danger"
                  }`}
                >
                  {armedName === p.name ? "sure?" : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submitPreset} className="flex gap-1.5">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Name this scene…"
            className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-cream placeholder:text-petal/40 outline-none focus:bg-white/15"
          />
          <button
            type="submit"
            className="pill bg-white/10 px-3 py-1.5 text-xs font-semibold text-petal hover:bg-white/20"
          >
            Save current
          </button>
        </form>
      </section>
    </div>
  );
}
