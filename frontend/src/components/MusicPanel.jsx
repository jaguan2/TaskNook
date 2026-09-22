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
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
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
    renameCustomStation,
    moveCustomStation,
    soundMix,
    setSoundLevel,
    stopAllSounds,
  } = useStore();

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [stationDraft, setStationDraft] = useState("");
  // A pasted URL the user curated shouldn't vanish on one stray tap.
  const [armedKey, arm] = useArmed();

  const anySound = SOUND_CHANNELS.some(({ key }) => (soundMix[key] || 0) > 0);
  const customStations = musicStations.filter((station) => station.custom);

  const beginRename = (station) => {
    setEditingKey(stationKey(station));
    setStationDraft(station.label);
  };

  const finishRename = (station) => {
    if (stationDraft.trim()) renameCustomStation(station, stationDraft);
    setEditingKey(null);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const result = addCustomStation(url, label);
    if (result === "invalid" || result === false) {
      setError("Couldn't find a video or playlist in that link.");
      return;
    }
    if (result === "limit") {
      setError("");
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

        {/* Only the EMPTY state gets a sentence. Once something is playing, the
            highlighted station below and the transport bar on screen already say
            so — a paragraph explaining that the bar exists is filler, and it was
            the biggest block in the panel. "Idle chrome shows nothing rather
            than placeholder text" (docs/DESIGN.md). */}
        {!musicOn && (
          <p className="rounded-xl bg-white/5 px-3 py-2.5 text-center text-xs text-petal/60">
            Pick a station below to start a stream of cozy beats.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {musicStations.map((s) => (
            <div key={stationKey(s)} className="flex items-center">
              {editingKey === stationKey(s) ? (
                <div className="flex items-center rounded-l-full bg-white/10 pl-2">
                  <input
                    autoFocus
                    value={stationDraft}
                    onChange={(e) => setStationDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishRename(s);
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                    maxLength={80}
                    aria-label="Station name"
                    className="w-24 bg-transparent px-1 py-1 text-xs text-cream outline-none"
                  />
                  <button
                    onClick={() => finishRename(s)}
                    aria-label="Save station name"
                    className="px-1 text-sage"
                  >
                    <Check size={11} />
                  </button>
                </div>
              ) : (
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
              )}
              {s.custom && (
                <div className="flex bg-white/10">
                  <button
                    onClick={() => beginRename(s)}
                    title="Rename station"
                    aria-label="Rename station"
                    className="px-1.5 py-1 text-petal/60 hover:text-cream"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={() => moveCustomStation(s, -1)}
                    disabled={customStations[0] === s}
                    title="Move station earlier"
                    aria-label="Move station earlier"
                    className="px-0.5 py-1 text-petal/60 hover:text-cream disabled:opacity-25"
                  >
                    <ChevronLeft size={11} />
                  </button>
                  <button
                    onClick={() => moveCustomStation(s, 1)}
                    disabled={customStations.at(-1) === s}
                    title="Move station later"
                    aria-label="Move station later"
                    className="px-0.5 py-1 text-petal/60 hover:text-cream disabled:opacity-25"
                  >
                    <ChevronRight size={11} />
                  </button>
                  <button
                    onClick={() => arm(stationKey(s), () => removeCustomStation(s))}
                    title="Remove station"
                    aria-label={armedKey === stationKey(s) ? "Confirm removing station" : "Remove station"}
                    className={`pill rounded-l-none bg-white/10 px-2 py-1 text-xs hover:bg-white/20 ${
                      armedKey === stationKey(s)
                        ? "font-bold text-danger"
                        : "text-petal/60 hover:text-danger"
                    }`}
                  >
                    {armedKey === stationKey(s) ? "sure?" : "✕"}
                  </button>
                </div>
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
                aria-label={`${name} volume`}
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
