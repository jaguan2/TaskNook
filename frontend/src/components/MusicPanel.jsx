import { useStore } from "../store";

// A few cozy lofi streams (YouTube embeds). Loaded only while music is on.
const STATIONS = [
  { id: "jfKfPfyJRdk", label: "lofi hip hop radio 📚" },
  { id: "4xDzrJKXOOY", label: "synthwave radio 🌃" },
  { id: "rUxyKA_-grg", label: "lofi sleep & chill 🌙" },
];

export default function MusicPanel() {
  const { musicOn, toggleMusic, rainOn, toggleRain, rainVolume, changeRainVolume } =
    useStore();

  return (
    <div className="space-y-5">
      {/* Lofi music */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-cream">🎵 Lofi music</p>
          <button
            onClick={toggleMusic}
            className={`pill px-3 py-1 text-xs font-semibold ${
              musicOn ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {musicOn ? "On" : "Off"}
          </button>
        </div>

        {musicOn ? (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              title="lofi radio"
              width="100%"
              height="180"
              src={`https://www.youtube.com/embed/${STATIONS[0].id}?autoplay=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="block"
            />
          </div>
        ) : (
          <p className="rounded-xl bg-white/5 px-3 py-4 text-center text-xs text-petal/60">
            Turn on music for a stream of cozy beats to focus to.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {STATIONS.map((s) => (
            <a
              key={s.id}
              href={`https://www.youtube.com/watch?v=${s.id}`}
              target="_blank"
              rel="noreferrer"
              className="pill bg-white/10 px-3 py-1 text-xs text-petal hover:bg-white/20"
            >
              {s.label}
            </a>
          ))}
        </div>
      </section>

      <hr className="border-white/10" />

      {/* Rain ambience */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-cream">🌧️ Rain ambience</p>
          <button
            onClick={toggleRain}
            className={`pill px-3 py-1 text-xs font-semibold ${
              rainOn ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {rainOn ? "On" : "Off"}
          </button>
        </div>
        <p className="text-xs text-petal/60">
          Procedurally generated rainfall — no download, plays even offline.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-petal/60">vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={rainVolume}
            onChange={(e) => changeRainVolume(Number(e.target.value))}
            className="flex-1 accent-glow"
          />
        </div>
      </section>
    </div>
  );
}
