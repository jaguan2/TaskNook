import { useStore } from "../store";

const COLOR_SCHEMES = [
  { key: "plum", label: "Plum Night", swatch: ["#2b1830", "#d98a93", "#f3c6c0"] },
  { key: "forest", label: "Forest", swatch: ["#1a2b22", "#d9a25a", "#d7e6c4"] },
  { key: "ocean", label: "Ocean", swatch: ["#16232e", "#6fb8cf", "#cbe8ef"] },
  { key: "coffee", label: "Coffee", swatch: ["#2e2017", "#ba8f68", "#f5dda8"] },
];

export default function SettingsPanel() {
  const {
    weatherVolume,
    changeWeatherVolume,
    brightness,
    setBrightness,
    colorScheme,
    setColorScheme,
  } = useStore();

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <p className="text-sm font-semibold text-cream">🔊 Volume</p>
        <p className="text-xs text-petal/60">
          Controls the weather ambience (rain, snow, storm). Music volume is
          controlled inside its own player.
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
            className="flex-1 accent-glow"
          />
        </div>
      </section>

      <hr className="border-white/10" />

      <section className="space-y-2">
        <p className="text-sm font-semibold text-cream">☀️ Brightness</p>
        <p className="text-xs text-petal/60">Dims or brightens the whole scene.</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-petal/60">dim</span>
          <input
            type="range"
            min="0.6"
            max="1.3"
            step="0.05"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="flex-1 accent-glow"
          />
          <span className="text-xs text-petal/60">bright</span>
        </div>
      </section>

      <hr className="border-white/10" />

      <section className="space-y-2">
        <p className="text-sm font-semibold text-cream">🎨 Color scheme</p>
        <p className="text-xs text-petal/60">Re-tint the whole app, including the desk scene.</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_SCHEMES.map((s) => (
            <button
              key={s.key}
              onClick={() => setColorScheme(s.key)}
              className={`pill flex items-center gap-2 px-3 py-1.5 text-xs font-semibold ${
                colorScheme === s.key
                  ? "bg-glow text-plum"
                  : "bg-white/10 text-petal hover:bg-white/20"
              }`}
            >
              <span className="flex -space-x-1">
                {s.swatch.map((c, i) => (
                  <span
                    key={i}
                    className="h-3 w-3 rounded-full border border-white/30"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </span>
              {s.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
