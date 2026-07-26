import { useState } from "react";
import { useStore } from "../store";
import { stationKey } from "../lib/musicLink";
import { SOUND_CHANNELS } from "../lib/audio";

export default function MusicPanel() {
  const {
    musicOn,
    toggleMusic,
    musicStations,
    activeStationKey,
    selectStation,
    addCustomStation,
    removeCustomStation,
    soundMix,
    setSoundLevel,
    stopAllSounds,
  } = useStore();

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");

  const anySound = SOUND_CHANNELS.some(({ key }) => (soundMix[key] || 0) > 0);

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

        <p className="rounded-xl bg-white/5 px-3 py-2.5 text-center text-xs text-petal/60">
          {musicOn
            ? "Playing in the bar at the bottom of the screen — it keeps going when this panel closes."
            : "Pick a station below to start a stream of cozy beats."}
        </p>

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
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      </section>

      <hr className="border-white/10" />

      {/* Ambient sound mixer */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-cream">🎚️ Ambient sounds</p>
          {anySound && (
            <button
              onClick={stopAllSounds}
              className="pill bg-white/10 px-3 py-1 text-xs font-semibold text-petal hover:bg-white/20"
            >
              Silence all
            </button>
          )}
        </div>
        <p className="text-xs text-petal/60">
          Layer as many as you like, each at its own volume. Procedurally
          generated — no downloads, plays even offline.
        </p>
        <div className="space-y-2">
          {SOUND_CHANNELS.map(({ key, label: name, icon }) => (
            <div key={key} className="flex items-center gap-2.5">
              <span className="w-24 shrink-0 text-xs text-petal">
                {icon} {name}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundMix[key] || 0}
                onChange={(e) => setSoundLevel(key, Number(e.target.value))}
                className="flex-1 accent-glow"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
