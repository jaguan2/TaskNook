import { useEffect, useState } from "react";
import { hexToHsl, hslToHex, normalizeHex } from "../lib/palette";
import { ITEMS, TINT_SWATCHES } from "../lib/room";

// Full colour control for the selected room item: quick swatches, a hex
// field, and hue/saturation/lightness sliders covering the whole gamut.
// Sliders + hex are the PRIMARY controls — the desktop WebView has no native
// colour dialog, so the tiny <input type="color"> swatch is only a bonus for
// browsers (the same trade-off as the theme picker in SettingsPanel).
function Slider({ label, min, max, value, onChange, track }) {
  return (
    <label className="block">
      <span className="mb-0.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-petal/50">
        {label}
        <span className="font-mono normal-case text-petal/40">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: track }}
        className="color-slider h-2 w-full rounded-full border border-white/10"
      />
    </label>
  );
}

export default function RoomTintPicker({ placement, onTint }) {
  const item = ITEMS[placement.item];
  const active = placement.tint || null;
  // Sliders mirror the current tint; untinted items start from the first
  // swatch so there's something sensible to move away from.
  const { h, s, l } = hexToHsl(active || TINT_SWATCHES[0]);
  const [hexDraft, setHexDraft] = useState(active || "");

  // Selecting another item (or an external tint change) refreshes the draft.
  useEffect(() => setHexDraft(active || ""), [active, placement.id]);

  const commitHex = (value) => {
    setHexDraft(value);
    const hex = normalizeHex(value);
    if (hex) onTint(placement.id, hex);
  };
  const fromSliders = (nh, ns, nl) => onTint(placement.id, hslToHex(nh, ns, nl));

  return (
    // Bottom-centre: guaranteed clear while decorating — the focus timer that
    // normally lives there steps aside in edit mode, and the dock (viewport
    // left) stays untouched.
    <div className="glass absolute bottom-0 left-1/2 z-20 w-60 -translate-x-1/2 space-y-2 rounded-2xl p-3 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-cream">🎨 {item.label}</p>
        <button
          onClick={() => onTint(placement.id, null)}
          disabled={!active}
          className="text-[10px] font-semibold text-petal/60 hover:text-glow disabled:opacity-40"
        >
          classic ↺
        </button>
      </div>

      {/* quick picks */}
      <div className="flex items-center gap-1.5">
        {TINT_SWATCHES.map((color) => (
          <button
            key={color}
            onClick={() => onTint(placement.id, color)}
            title={color}
            className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
              active === color ? "border-white" : "border-black/30"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* hex + native picker (native = browser bonus; no dialog in WebView2) */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={active || hslToHex(h, s, l)}
          onChange={(e) => onTint(placement.id, e.target.value)}
          aria-label="Pick a colour"
          className="h-7 w-7 shrink-0 rounded-md border border-white/20 bg-transparent p-0"
        />
        <input
          type="text"
          value={hexDraft}
          onChange={(e) => commitHex(e.target.value)}
          spellCheck="false"
          placeholder="#rrggbb"
          className={`w-full select-text rounded-lg bg-white/10 px-2 py-1 font-mono text-xs outline-none focus:bg-white/15 ${
            !hexDraft || normalizeHex(hexDraft) ? "text-cream" : "text-rose"
          }`}
        />
      </div>

      <Slider
        label="Hue"
        min={0}
        max={360}
        value={Math.round(h)}
        onChange={(v) => fromSliders(v, Math.max(s, 8), l)}
        track="linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)"
      />
      <Slider
        label="Saturation"
        min={0}
        max={100}
        value={Math.round(s)}
        onChange={(v) => fromSliders(h, v, l)}
        track={`linear-gradient(to right, ${hslToHex(h, 0, l)}, ${hslToHex(h, 100, l)})`}
      />
      <Slider
        label="Lightness"
        min={0}
        max={100}
        value={Math.round(l)}
        onChange={(v) => fromSliders(h, s, v)}
        track={`linear-gradient(to right, ${hslToHex(h, s, 4)}, ${hslToHex(h, s, 50)}, ${hslToHex(h, s, 96)})`}
      />
    </div>
  );
}
