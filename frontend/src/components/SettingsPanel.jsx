import { useEffect, useState } from "react";
import { EyeOff, MonitorCog, Music2, Palette, SunMedium, Waves, Wind } from "lucide-react";
import { useAudioStore, useSettingsStore } from "../store";
import { paletteSwatch, hexToHsl, hslToHex, normalizeHex } from "../lib/palette";
import { useI18n } from "../i18n/I18nProvider";
import LanguageSettings from "./settings/LanguageSettings";

const MOTION_OPTIONS = [
  { key: "auto", labelKey: "settings.motion.auto", Icon: MonitorCog },
  { key: "full", labelKey: "settings.motion.full", Icon: Wind },
  { key: "reduced", labelKey: "settings.motion.reduced", Icon: Waves },
];

// Matches store.jsx's DEFAULT_HUD_VISIBILITY keys — a mismatched key here
// would silently no-op the button (setHudVisibility guards against unknown
// keys) instead of throwing, so keep the two lists in sync by hand.
const HUD_ELEMENTS = [
  { key: "timer", labelKey: "settings.hud.timer" },
  { key: "tasks", labelKey: "settings.hud.tasks" },
  { key: "music", labelKey: "settings.hud.music" },
  { key: "clock", labelKey: "settings.hud.clock" },
  { key: "chat", labelKey: "settings.hud.chat" },
];
const VIS_OPTIONS = [
  { key: "on", labelKey: "settings.hud.show" },
  { key: "faded", labelKey: "settings.hud.dim" },
  { key: "hidden", labelKey: "settings.hud.hide" },
];

const HUD_PRESETS = [
  { key: "on", labelKey: "settings.hud.showAll" },
  { key: "faded", labelKey: "settings.hud.dimAll" },
  { key: "hidden", labelKey: "settings.hud.hideAll" },
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
  { key: "plum", labelKey: "settings.colour.plum", swatch: ["#2b1830", "#d98a93", "#f3c6c0"] },
  { key: "abyss", labelKey: "settings.colour.abyss", swatch: ["#01162b", "#6a90b4", "#d2dbeb"] },
  { key: "shore", labelKey: "settings.colour.shore", swatch: ["#2c3943", "#9dabb4", "#ece6e3"] },
  { key: "linen", labelKey: "settings.colour.linen", swatch: ["#3a4147", "#9b8c7d", "#d7d2c4"] },
  { key: "walnut", labelKey: "settings.colour.walnut", swatch: ["#373a37", "#ab9d78", "#e5e2cd"] },
];

export default function SettingsPanel() {
  const { t } = useI18n();
  const {
    brightness,
    setBrightness,
    colorScheme,
    setColorScheme,
    customColor,
    setCustomColor,
    customSurface,
    setCustomSurface,
    backdropStyle,
    setBackdropStyle,
    motionMode,
    setMotionMode,
    hudVisibility,
    setHudVisibility,
    setAllHudVisibility,
  } = useSettingsStore();
  const { autoResumeMusic, setAutoResumeMusic } = useAudioStore();

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
      <LanguageSettings />

      <hr className="border-white/10" />

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <SunMedium size={15} className="text-petal/70" /> {t("settings.brightness.title")}
        </p>
        <p className="text-xs text-petal/60">{t("settings.brightness.description")}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-petal/60">{t("settings.brightness.dim")}</span>
          <input
            type="range"
            min="0.6"
            max="1.3"
            step="0.05"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            aria-label={t("settings.brightness.aria")}
            className="flex-1 accent-glow"
          />
          <span className="text-xs text-petal/60">{t("settings.brightness.bright")}</span>
        </div>
      </section>

      {/* Motion. The room is full of small idle movement — swaying plants, a
          breathing cat, drifting clouds — and until now the only way to still
          it was a system-wide OS setting. */}
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <Waves size={15} className="text-petal/70" /> {t("settings.motion.title")}
        </p>
        <p className="text-xs text-petal/60">
          {motionMode === "auto"
            ? t("settings.motion.description.auto")
            : motionMode === "reduced"
            ? t("settings.motion.description.reduced")
            : t("settings.motion.description.full")}
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
              <m.Icon size={13} /> {t(m.labelKey)}
            </button>
          ))}
        </div>
      </section>

      <hr className="border-white/10" />

      {/* Each element keeps working underneath — the timer keeps ticking,
          music keeps playing — this only ever touches how much of it you
          SEE. "Faded" stays clickable; "Hidden" drops out of hit-testing too
          (see App.jsx's hudWrapClass). */}
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <EyeOff size={15} className="text-petal/70" /> {t("settings.hud.title")}
        </p>
        <p className="text-xs text-petal/60">
          {t("settings.hud.description")}
        </p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1" role="group" aria-label={t("settings.hud.allAria")}>
          {HUD_PRESETS.map((preset) => {
            const selected = Object.values(hudVisibility).every((mode) => mode === preset.key);
            return (
              <button
                key={preset.key}
                onClick={() => setAllHudVisibility(preset.key)}
                aria-pressed={selected}
                className={`pill px-2 py-1.5 text-[11px] font-semibold transition ${
                  selected
                    ? "bg-glow text-plum"
                    : "text-petal/80 hover:bg-white/10 hover:text-cream"
                }`}
              >
                {t(preset.labelKey)}
              </button>
            );
          })}
        </div>
        <div className="space-y-2 pt-1">
          {HUD_ELEMENTS.map((el) => (
            <div key={el.key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-petal/80">{t(el.labelKey)}</span>
              <div
                className="grid w-40 shrink-0 grid-cols-3 gap-0.5 rounded-full bg-white/5 p-0.5"
                role="group"
                aria-label={t("settings.hud.visibilityAria", { name: t(el.labelKey) }, `${t(el.labelKey)} visibility`)}
              >
                {VIS_OPTIONS.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setHudVisibility(el.key, v.key)}
                    aria-pressed={hudVisibility[el.key] === v.key}
                    className={`pill px-2 py-1 text-[10px] font-semibold transition ${
                      hudVisibility[el.key] === v.key
                        ? "bg-glow text-plum"
                        : "text-petal/70 hover:bg-white/10 hover:text-cream"
                    }`}
                  >
                    {t(v.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="rounded-lg bg-white/5 px-2.5 py-2 text-[11px] leading-relaxed text-petal/60">
          {t("settings.hud.help")}
        </p>
      </section>

      <hr className="border-white/10" />

      {/* Off means off, every time — even a session that ended mid-song boots
          silent (store.jsx's musicOn init + MusicDock's BOOTED_WITH_MUSIC_ON
          both gate on this same setting, so they can't disagree). */}
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <Music2 size={15} className="text-petal/70" /> {t("settings.music.title")}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-petal/60">
            {autoResumeMusic
              ? t("settings.music.description.on")
              : t("settings.music.description.off")}
          </p>
          <button
            onClick={() => setAutoResumeMusic(!autoResumeMusic)}
            aria-pressed={autoResumeMusic}
            className={`pill shrink-0 px-3 py-1.5 text-[10px] font-semibold transition ${
              autoResumeMusic
                ? "bg-glow text-plum"
                : "bg-white/10 text-petal hover:bg-white/20"
            }`}
          >
            {autoResumeMusic ? t("common.on") : t("common.off")}
          </button>
        </div>
      </section>

      <hr className="border-white/10" />

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
          <Palette size={15} className="text-petal/70" /> {t("settings.colour.title")}
        </p>
        <p className="text-xs text-petal/60">{t("settings.colour.description")}</p>
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
              {t(s.labelKey)}
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
            {t("settings.colour.custom")}
          </button>
        </div>

        <div
          role="group"
          aria-label={t("settings.backdrop.aria", undefined, "Backdrop style")}
          className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2"
        >
          <div>
            <p className="text-xs font-semibold text-cream">{t("settings.backdrop.title")}</p>
            <p className="text-[10px] text-petal/55">{t("settings.backdrop.description")}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            {[
              ["gradient", "settings.backdrop.gradient"],
              ["solid", "settings.backdrop.solid"],
            ].map(([key, labelKey]) => (
              <button
                key={key}
                onClick={() => setBackdropStyle(key)}
                aria-pressed={backdropStyle === key}
                className={`pill px-2.5 py-1 text-[10px] font-semibold ${
                  backdropStyle === key
                    ? "bg-glow text-plum"
                    : "bg-white/10 text-petal hover:bg-white/20"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
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
                aria-label={t("settings.colour.base")}
                title={t("settings.colour.base")}
                className="h-9 w-9 shrink-0 rounded-lg border border-white/20 bg-transparent p-0"
              />
              <label className="flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-petal/50">
                  {t("settings.colour.hex")}
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
              label={t("settings.colour.hue")}
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
              label={t("settings.colour.saturation")}
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
                {t("settings.colour.quick")}
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
                {t("settings.backdrop.title")}
              </span>
              <button
                onClick={() => setCustomSurface(null)}
                className={`pill px-2 py-0.5 text-[10px] transition ${
                  customSurface === null
                    ? "bg-glow text-plum"
                    : "bg-white/10 text-petal hover:bg-white/20"
                }`}
              >
                {t("settings.colour.matchAccent")}
              </button>
              {SURFACE_HUES.map((hex) => (
                <button
                  key={hex}
                  onClick={() => setCustomSurface(hex)}
                  title={hex}
                  aria-label={t("settings.colour.backdropAria", { hex })}
                  className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
                    customSurface === hex ? "border-glow" : "border-white/25"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <p className="text-xs text-petal/60">
              {t("settings.colour.note")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
