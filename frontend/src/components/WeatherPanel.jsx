import { useState } from "react";
import { Clock, Globe, Moon, Save, Sun, Sunset, Wand2 } from "lucide-react";
import { useStore } from "../store";
import { useArmed } from "../lib/useArmed";
import { formatPopulation } from "../lib/weather";
import { WEATHER_OPTIONS } from "./TopBar";

const TIME_OPTIONS = [
  { key: "night", label: "Night", Icon: Moon },
  { key: "sunset", label: "Sunset", Icon: Sunset },
  { key: "day", label: "Day", Icon: Sun },
];

export default function WeatherPanel() {
  const {
    realWeather,
    weatherStatus,
    weatherError,
    weatherLocationLabel,
    weatherPlaces,
    chooseWeatherPlace,
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
    autoTimeOfDay,
    setAutoTimeOfDay,
  } = useStore();

  const [city, setCity] = useState("");
  // The name that produced the list on screen. The header used to interpolate
  // the live input, so clearing or retyping the field while the list was still
  // showing turned it into: More than one “” — which?
  const [searchedFor, setSearchedFor] = useState("");
  const [presetName, setPresetName] = useState("");
  const [armedName, arm] = useArmed();

  const submitCity = (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    // Stamped with the results, not on every keystroke — the header has to name
    // what was searched for, even after the field is cleared or retyped.
    setSearchedFor(city.trim());
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
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <Globe size={15} className="text-petal/70" /> Right now
          </p>
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
              <p className="text-2xl font-bold text-cream">
                {realWeather.tempF ?? "—"}°F
              </p>
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

        {/* Shown only when the name is genuinely shared. Population is the
            deciding detail — Gainesville, Florida is 140k and Gainesville,
            Alabama is a couple of hundred. */}
        {weatherPlaces.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
              More than one “{searchedFor}” — which?
            </p>
            {weatherPlaces.map((p) => (
              <button
                key={p.id}
                onClick={() => chooseWeatherPlace(p)}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-left transition hover:bg-white/15"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-cream">
                    {p.name}
                  </span>
                  <span className="block truncate text-[10px] text-petal/60">
                    {p.region}
                  </span>
                </span>
                {p.population > 0 && (
                  <span className="shrink-0 text-[10px] tabular-nums text-petal/40">
                    {formatPopulation(p.population)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <hr className="border-white/10" />

      {/* Auto-match toggle */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <Wand2 size={15} className="text-petal/70" /> Match my real weather
          </p>
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

      {/* Follow the clock. The offline half of the pair above: same "the room
          knows what time it is" result with no location, no network, and no
          opinion about the weather. Mutually exclusive with auto-match, which
          owns the time of day too and does it better when it's available. */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <Clock size={15} className="text-petal/70" /> Follow my clock
          </p>
          <button
            onClick={() => setAutoTimeOfDay(!autoTimeOfDay)}
            className={`pill px-3 py-1 text-xs font-semibold ${
              autoTimeOfDay ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {autoTimeOfDay ? "On" : "Off"}
          </button>
        </div>
        <p className="text-xs text-petal/60">
          Sets the time of day from your device's clock — dark in the evening,
          bright at midday — without needing your location or the internet.
          Picking an hour below turns this back off.
        </p>
      </section>

      <hr className="border-white/10" />

      {/* Weather conditions: the full weather × time matrix — "Cloudy ·
          Night" is ONE tap, not two coordinated ones. Each pill sets both
          weatherMode and timeOfDay. Visual only (same rule as the corner
          popover); the sound mix stays the Sounds panel's business. */}
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <Sunset size={15} className="text-petal/70" /> Weather conditions
        </p>
        <p className="text-xs text-petal/60">
          One tap sets the whole scene — clear night, cloudy day, rainy
          sunset… Visual only: sounds stay yours in the Sounds panel.
        </p>
        <div className="space-y-1">
          {WEATHER_OPTIONS.map((w) => (
            <div key={w.key} className="flex items-center gap-1.5">
              <span className="flex w-[4.5rem] shrink-0 items-center gap-1 text-xs text-petal">
                <w.Icon size={13} className="shrink-0 text-petal/70" /> {w.label}
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
                    className={`pill flex flex-1 items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold ${
                      active
                        ? "bg-glow text-plum"
                        : "bg-white/10 text-petal hover:bg-white/20"
                    }`}
                  >
                    <t.Icon size={12} /> {t.label}
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
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <Save size={15} className="text-petal/70" /> Presets
        </p>
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
                  aria-label="Delete preset"
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
