import { useState } from "react";
import {
  AudioLines,
  BookOpen,
  CloudLightning,
  CloudRain,
  Coffee,
  Flame,
  Music2,
  Play,
  Snowflake,
  Wind,
} from "lucide-react";
import { useStore } from "../store";
import { stationKey } from "../lib/musicLink";
import { SOUND_CHANNELS } from "../lib/audio";
import { useArmed } from "../lib/useArmed";

// lib/audio.js stays UI-free (pure Web Audio), so the channel icons live
// here at the display layer.
const CHANNEL_ICONS = {
  rain: CloudRain,
  storm: CloudLightning,
  snow: Snowflake,
  wind: Wind,
  fireplace: Flame,
  cafe: Coffee,
  paper: BookOpen,
};

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
  // A pasted URL the user curated shouldn't vanish on one stray tap.
  const [armedKey, arm] = useArmed();

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
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <Music2 size={15} className="text-petal/70" /> Music
          </p>
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
                className={`pill flex items-center gap-1.5 px-3 py-1 text-xs ${s.custom ? "rounded-r-none" : ""} ${
                  musicOn && activeStationKey === stationKey(s)
                    ? "bg-glow font-semibold text-plum"
                    : "bg-white/10 text-petal hover:bg-white/20"
                }`}
              >
                {/* provider mark: Spotify's green dot, or a play glyph */}
                {s.provider === "spotify" ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#1db954]" />
                ) : (
                  <Play size={10} className="shrink-0" />
                )}
                {s.label}
              </button>
              {s.custom && (
                <button
                  onClick={() => arm(stationKey(s), () => removeCustomStation(s))}
                  title="Remove station"
                  className={`pill rounded-l-none bg-white/10 px-2 py-1 text-xs hover:bg-white/20 ${
                    armedKey === stationKey(s)
                      ? "font-bold text-danger"
                      : "text-petal/60 hover:text-danger"
                  }`}
                >
                  {armedKey === stationKey(s) ? "sure?" : "✕"}
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
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <AudioLines size={15} className="text-petal/70" /> Ambient sounds
          </p>
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
          {SOUND_CHANNELS.map(({ key, label: name }) => {
            const ChannelIcon = CHANNEL_ICONS[key] || AudioLines;
            return (
            <div key={key} className="flex items-center gap-2.5">
              <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-petal">
                <ChannelIcon size={13} className="shrink-0 text-petal/70" /> {name}
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
            );
          })}
        </div>
      </section>
    </div>
  );
}
