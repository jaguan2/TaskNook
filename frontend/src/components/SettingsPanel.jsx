import { useEffect, useState } from "react";
import { useStore } from "../store";
import { paletteSwatch, hexToHsl, hslToHex, normalizeHex } from "../lib/palette";

// One-tap starting points for the custom scheme.
const QUICK_HUES = ["#d98a93", "#e0a53f", "#63c07a", "#4fa3e3", "#9b8bd6", "#c47b5a"];

// The base colour's lightness is ignored by derivePalette (only hue +
// saturation matter), so slider edits write back at a fixed mid lightness.
const BASE_L = 60;

// A labelled range input with a coloured track — works everywhere, including
// the desktop WebView (unlike the native colour dialog).
function Slider({ label, min, max, value, onChange, trackStyle }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-petal/50">
        {label}
        <span className="font-mono normal-case text-petal/40">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={trackStyle}
        className="color-slider h-2 w-full rounded-full border border-white/10"
      />
    </label>
  );
}

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
    customColor,
    setCustomColor,
  } = useStore();

  const customSwatch = paletteSwatch(customColor);
  const { h, s } = hexToHsl(customColor);

  // Local draft so a half-typed hex ("#d9") doesn't fight the live value.
  const [hexDraft, setHexDraft] = useState(customColor);
  useEffect(() => setHexDraft(customColor), [customColor]);

  const commitHex = (value) => {
    setHexDraft(value);
    const hex = normalizeHex(value);
    if (hex) setCustomColor(hex);
  };

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

          {/* Custom — the ramp is derived from whatever colour you pick. */}
          <button
            onClick={() => setColorScheme("custom")}
            className={`pill flex items-center gap-2 px-3 py-1.5 text-xs font-semibold ${
              colorScheme === "custom"
                ? "bg-glow text-plum"
                : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            <span className="flex -space-x-1">
              {customSwatch.map((c, i) => (
                <span
                  key={i}
                  className="h-3 w-3 rounded-full border border-white/30"
                  style={{ backgroundColor: c }}
                />
              ))}
            </span>
            Custom
          </button>
        </div>

        {colorScheme === "custom" && (
          <div className="space-y-3 rounded-xl bg-white/5 p-3">
            {/* Preview + hex entry. The swatch is a native colour input too, so
                browsers get the OS picker as a bonus — but every control below
                works without it (the desktop WebView has no colour dialog). */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                aria-label="Pick a base colour"
                title="Base colour"
                className="h-9 w-9 shrink-0 rounded-lg border border-white/20 bg-transparent p-0"
              />
              <label className="flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                  Hex code
                </span>
                <input
                  type="text"
                  value={hexDraft}
                  onChange={(e) => commitHex(e.target.value)}
                  spellCheck="false"
                  placeholder="#d98a93"
                  className={`w-full rounded-lg bg-white/10 px-2 py-1 font-mono text-xs outline-none focus:bg-white/15 ${
                    normalizeHex(hexDraft) ? "text-cream" : "text-rose"
                  }`}
                />
              </label>
            </div>

            <Slider
              label="Hue"
              min={0}
              max={360}
              value={Math.round(h)}
              onChange={(v) => setCustomColor(hslToHex(v, s || 55, BASE_L))}
              trackStyle={{
                background:
                  "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
              }}
            />
            <Slider
              label="Saturation"
              min={0}
              max={100}
              value={Math.round(s)}
              onChange={(v) => setCustomColor(hslToHex(h, v, BASE_L))}
              trackStyle={{
                background: `linear-gradient(to right, ${hslToHex(h, 0, BASE_L)}, ${hslToHex(h, 100, BASE_L)})`,
              }}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                Quick
              </span>
              {QUICK_HUES.map((hex) => (
                <button
                  key={hex}
                  onClick={() => setCustomColor(hex)}
                  title={hex}
                  className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
                    customColor === hex ? "border-glow" : "border-white/25"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <p className="text-xs text-petal/60">
              Only the hue &amp; saturation are used — TaskNook builds the rest of
              the palette so it always stays readable.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
