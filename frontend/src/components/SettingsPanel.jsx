import { useEffect, useState } from "react";
import { MonitorCog, Palette, SunMedium, Waves, Wind } from "lucide-react";
import { useStore } from "../store";
import { paletteSwatch, hexToHsl, hslToHex, normalizeHex } from "../lib/palette";

const MOTION_OPTIONS = [
  { key: "auto", label: "Auto", Icon: MonitorCog },
  { key: "full", label: "Full", Icon: Wind },
  { key: "reduced", label: "Reduced", Icon: Waves },
];

// One-tap starting points for the custom scheme.
const QUICK_HUES = ["#d98a93", "#e0a53f", "#63c07a", "#4fa3e3", "#9b8bd6", "#c47b5a"];

// Backdrop hues for the custom scheme — only hue/saturation are used (the
// dark stops keep their fixed lightness, which is the legibility guarantee),
// so these chips are shown at a mid lightness the backdrop never actually
// reaches. First entry is "follow the accent", the classic behaviour.
const SURFACE_HUES = ["#6b5544", "#5d7290", "#5d7a62", "#7a5875", "#8a8494", "#8a4a4a"];

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

// Preset ramps live in index.css as [data-theme] blocks; the swatches here
// are their night / rose / petal stops.
const COLOR_SCHEMES = [
  { key: "plum", label: "Plum Night", swatch: ["#2b1830", "#d98a93", "#f3c6c0"] },
  { key: "abyss", label: "Abyssal Deep", swatch: ["#01162b", "#6a90b4", "#d2dbeb"] },
  { key: "shore", label: "Sea Breeze", swatch: ["#2c3943", "#9dabb4", "#ece6e3"] },
  { key: "linen", label: "Linen Afternoon", swatch: ["#3a4147", "#9b8c7d", "#d7d2c4"] },
  { key: "walnut", label: "Walnut Cream", swatch: ["#373a37", "#ab9d78", "#e5e2cd"] },
];

export default function SettingsPanel() {
  const {
    brightness,
    setBrightness,
    colorScheme,
    setColorScheme,
    customColor,
    setCustomColor,
    customSurface,
    setCustomSurface,
    motionMode,
    setMotionMode,
  } = useStore();

  const customSwatch = paletteSwatch(customColor);
  const { h, s } = hexToHsl(customColor);

  // Local draft so a half-typed hex ("#d9") doesn't fight the live value.
  const [hexDraft, setHexDraft] = useState(customColor);
  useEffect(() => setHexDraft(customColor), [customColor]);

  const commitHex = (value) => {
    setHexDraft(value);
    // Only commit a COMPLETE 6-digit colour: normalizeHex would expand a
    // 3-digit prefix ("#abc" → "#aabbcc") mid-typing and hijack the field.
    const raw = value.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(raw)) setCustomColor(`#${raw.toLowerCase()}`);
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <SunMedium size={15} className="text-petal/70" /> Brightness
        </p>
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
            aria-label="Scene brightness"
            className="flex-1 accent-glow"
          />
          <span className="text-xs text-petal/60">bright</span>
        </div>
      </section>

      {/* Motion. The room is full of small idle movement — swaying plants, a
          breathing cat, drifting clouds — and until now the only way to still
          it was a system-wide OS setting. */}
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <Waves size={15} className="text-petal/70" /> Motion
        </p>
        <p className="text-xs text-petal/60">
          {motionMode === "auto"
            ? "Following your system setting."
            : motionMode === "reduced"
            ? "The room holds still — plants, weather, the cat and the clouds."
            : "Everything moves, even if your system asks otherwise."}
        </p>
        <div className="flex flex-wrap gap-2">
          {MOTION_OPTIONS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMotionMode(m.key)}
              className={`pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
                motionMode === m.key
                  ? "bg-glow text-plum"
                  : "bg-white/10 text-petal hover:bg-white/20"
              }`}
            >
              <m.Icon size={13} /> {m.label}
            </button>
          ))}
        </div>
      </section>

      <hr className="border-white/10" />

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <Palette size={15} className="text-petal/70" /> Colour scheme
        </p>
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
                    normalizeHex(hexDraft) ? "text-cream" : "text-danger"
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

            {/* The backdrop can carry its OWN hue — teal accent on warm brown
                surfaces. Lightness is still the fixed dark ramp, so no pick
                here can wash the text out. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                Backdrop
              </span>
              <button
                onClick={() => setCustomSurface(null)}
                className={`pill px-2 py-0.5 text-[10px] transition ${
                  customSurface === null
                    ? "bg-glow text-plum"
                    : "bg-white/10 text-petal hover:bg-white/20"
                }`}
              >
                Match accent
              </button>
              {SURFACE_HUES.map((hex) => (
                <button
                  key={hex}
                  onClick={() => setCustomSurface(hex)}
                  title={hex}
                  aria-label={`Backdrop colour ${hex}`}
                  className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
                    customSurface === hex ? "border-glow" : "border-white/25"
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
