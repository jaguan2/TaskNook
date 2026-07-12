import { useState } from "react";
import { useStore } from "../store";
import { stationKey } from "../lib/musicLink";

// Spotify's embed needs a taller frame for content with a tracklist.
const SPOTIFY_TALL_KINDS = new Set(["playlist", "album", "show"]);

const WEATHER_OPTIONS = [
  { key: "off", label: "Off", icon: "🌤️" },
  { key: "rain", label: "Rain", icon: "🌧️" },
  { key: "snow", label: "Snow", icon: "❄️" },
  { key: "storm", label: "Storm", icon: "⛈️" },
];

function embedProps(station) {
  if (station.provider === "spotify") {
    return {
      src: `https://open.spotify.com/embed/${station.kind}/${station.id}?utm_source=generator&theme=0`,
      height: SPOTIFY_TALL_KINDS.has(station.kind) ? 352 : 152,
      allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
    };
  }
  return {
    src: `https://www.youtube.com/embed/${station.id}?autoplay=1`,
    height: 180,
    allow: "autoplay; encrypted-media",
  };
}

export default function MusicPanel() {
  const {
    musicOn,
    toggleMusic,
    musicStations,
    activeStationKey,
    selectStation,
    addCustomStation,
    removeCustomStation,
    weatherMode,
    setWeather,
    weatherVolume,
    changeWeatherVolume,
  } = useStore();

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  const activeStation = musicStations.find((s) => stationKey(s) === activeStationKey);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!addCustomStation(url, label)) {
      setError("Couldn't find a video or playlist in that link.");
      return;
    }
    setError("");
    setUrl("");
    setLabel("");
  };

  return (
    <div className="space-y-5">
      {/* Music */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-cream">🎵 Music</p>
          <button
            onClick={toggleMusic}
            className={`pill px-3 py-1 text-xs font-semibold ${
              musicOn ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {musicOn ? "On" : "Off"}
          </button>
        </div>

        {musicOn && activeStation ? (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              key={stationKey(activeStation)}
              title="music player"
              width="100%"
              className="block"
              {...embedProps(activeStation)}
              allowFullScreen
            />
          </div>
        ) : (
          <p className="rounded-xl bg-white/5 px-3 py-4 text-center text-xs text-petal/60">
            Pick a station below to start a stream of cozy beats.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {musicStations.map((s) => (
            <div key={stationKey(s)} className="flex items-center">
              <button
                onClick={() => selectStation(s)}
                className={`pill px-3 py-1 text-xs ${s.custom ? "rounded-r-none" : ""} ${
                  musicOn && activeStationKey === stationKey(s)
                    ? "bg-glow font-semibold text-plum"
                    : "bg-white/10 text-petal hover:bg-white/20"
                }`}
              >
                {s.provider === "spotify" ? "🟢" : "▶️"} {s.label}
              </button>
              {s.custom && (
                <button
                  onClick={() => removeCustomStation(s)}
                  title="Remove station"
                  className="pill rounded-l-none bg-white/10 px-2 py-1 text-xs text-petal/60 hover:bg-white/20 hover:text-petal"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube or Spotify link…"
              className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-cream placeholder:text-petal/40 outline-none focus:bg-white/15"
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="name (optional)"
              className="w-24 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-cream placeholder:text-petal/40 outline-none focus:bg-white/15"
            />
            <button
              type="submit"
              className="pill bg-white/10 px-3 py-1.5 text-xs font-semibold text-petal hover:bg-white/20"
            >
              Add
            </button>
          </div>
          {error && <p className="text-xs text-rose">{error}</p>}
        </form>
      </section>

      <hr className="border-white/10" />

      {/* Weather ambience */}
      <section className="space-y-3">
        <p className="text-sm font-semibold text-cream">🌦️ Weather ambience</p>
        <div className="flex flex-wrap gap-1.5">
          {WEATHER_OPTIONS.map((w) => (
            <button
              key={w.key}
              onClick={() => setWeather(w.key)}
              className={`pill px-3 py-1.5 text-xs font-semibold ${
                weatherMode === w.key
                  ? "bg-glow text-plum"
                  : "bg-white/10 text-petal hover:bg-white/20"
              }`}
            >
              {w.icon} {w.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-petal/60">
          Procedurally generated — no downloads, plays even offline.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-petal/60">vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={weatherVolume}
            onChange={(e) => changeWeatherVolume(Number(e.target.value))}
            disabled={weatherMode === "off"}
            className="flex-1 accent-glow disabled:opacity-40"
          />
        </div>
      </section>
    </div>
  );
}
