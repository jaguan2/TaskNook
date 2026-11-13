import { useEffect, useState } from "react";
import ShelfDecorControls from "./ShelfDecorControls";
import { SHELF_ITEMS } from "../lib/shelfDecor";
import { hexToHsl, hslToHex, normalizeHex } from "../lib/palette";
import { ITEMS, TINT_SWATCHES } from "../lib/room";
// Catalog-agnostic: callers may pass the catalog entry via the `item` prop
// (the iso room has its own catalog); without it we fall back to the flat
// room's ITEMS for backwards compatibility.

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

// Some flat-room furniture has a fixed set of pre-shaded colourways
// instead of free tinting — a swatch is a whole recoloured render, so the
// shading always stays right. The hex IS the stored tint. A separate
// component (not an early return above the full picker's hooks): the two
// pickers have different hook counts, and swapping modes inside ONE mounted
// component would change hook order between renders — a React crash.
function VariantPicker({ placement, item, onTint }) {
  const active = placement.tint || null;
  return (
    // bottom-6: the transport bar's spot on the shared bottom rail, which is
    // exactly what this popover replaces while decorating
    <div className="room-tint-picker glass absolute left-1/2 z-40 -translate-x-1/2 space-y-2 rounded-2xl p-3 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-cream">🎨 {item.label}</p>
        <button
          onClick={() => onTint(placement.id, null)}
          disabled={!active}
          className="text-[10px] font-semibold text-petal/60 hover:text-glow disabled:opacity-40"
        >
          Classic ↺
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        {Object.keys(item.variants).map((hex) => (
          <button
            key={hex}
            onClick={() => onTint(placement.id, hex)}
            title={item.variants[hex]}
            className={`h-6 w-6 rounded-full border-2 transition hover:scale-110 ${
              active === hex ? "border-white" : "border-black/30"
            }`}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <p className="text-[10px] text-petal/50">This piece comes in set colours.</p>
    </div>
  );
}

export default function RoomTintPicker({ placement, item: itemProp, onTint, onDecor, onClose, onResize }) {
  const item = itemProp || ITEMS[placement.item];
  // A placement whose catalog entry no longer exists (renamed or removed item)
  // must not take the whole app down — the scenes already skip unknown items.
  if (!item) return null;
  if (item.variants) {
    return <VariantPicker placement={placement} item={item} onTint={onTint} />;
  }
  return <FullTintPicker key={placement.id} placement={placement} item={item} onTint={onTint} onDecor={onDecor} onClose={onClose} onResize={onResize} />;
}

function FullTintPicker({ placement, item, onTint, onDecor, onClose, onResize }) {
  const [part, setPart] = useState('main');
  const partSpec = item.colorParts?.[part];
  const active = (part === 'main' ? placement.tint : placement.colors?.[part]) || null;
  const defaultColor = partSpec?.defaultColor || TINT_SWATCHES[0];
  const commitColor = value => part === 'main'
    ? onTint(placement.id, value)
    : onTint(placement.id, value, part);
  // Slider positions are LOCAL STATE, not re-derived from the committed hex on
  // every render. Deriving them was a dead end at both extremes: drag Lightness
  // to 0 and the tint is #000000, whose hue and saturation are 0 *by
  // definition* — so the hue and saturation sliders snapped to the left and
  // then wrote black wherever you dragged them (same at 100 with white). Only a
  // swatch or the hex field could escape. Local state remembers the hue you
  // were working in, so lightness is a round trip.
  // Untinted items start from the first swatch — something sensible to move
  // away from.
  const [hsl, setHsl] = useState(() => hexToHsl(active || defaultColor));
  const [hexDraft, setHexDraft] = useState(active || "");

  // Re-sync only when the tint changes from OUTSIDE these sliders (a swatch,
  // the hex field, "Classic ↺", or selecting a different item). A slider's own
  // change already agrees with `active`, so this never fights a drag.
  useEffect(() => {
    setHexDraft(active || "");
    setHsl((prev) => {
      if (!active) return hexToHsl(defaultColor);
      return hslToHex(prev.h, prev.s, prev.l) === active ? prev : hexToHsl(active);
    });
  }, [active, placement.id, part, defaultColor]);

  const { h, s, l } = hsl;

  const commitHex = (value) => {
    setHexDraft(value);
    // Only commit a COMPLETE 6-digit colour — normalizeHex would expand a
    // 3-digit prefix mid-typing and hijack the field (same as SettingsPanel).
    const raw = value.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(raw)) commitColor(`#${raw.toLowerCase()}`);
  };
  const fromSliders = (nh, ns, nl) => {
    setHsl({ h: nh, s: ns, l: nl });
    commitColor(hslToHex(nh, ns, nl));
  };

  return (
    // Finished-room clicks and Decorate selection share this bounded popover.
    <div className="room-tint-picker glass absolute left-1/2 z-40 w-60 -translate-x-1/2 max-h-[65vh] overflow-y-auto space-y-2 rounded-2xl p-3 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-cream">🎨 {item.label}</p>
        <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => commitColor(null)}
          aria-label={partSpec ? `Reset ${partSpec.label.toLowerCase()} colour` : undefined}
          disabled={!active}
          className="text-[10px] font-semibold text-petal/60 hover:text-glow disabled:opacity-40"
        >
          Classic ↺
        </button>
        {onClose && <button type="button" aria-label="Close item customizer" className="text-xs text-petal" onClick={onClose}>Close</button>}
        </div>
      </div>

      {onDecor && SHELF_ITEMS.includes(placement.item) && <ShelfDecorControls placement={placement} onDecor={onDecor} />}

      {onResize && <button type="button" aria-label={`Resize ${item.label.toLowerCase()}`} onClick={onResize}
        className="w-full rounded-lg bg-white/10 px-2 py-1 text-xs text-cream hover:bg-white/20">
        ↗ Resize {item.label.toLowerCase()}
      </button>}

      {item.colorParts && <label className="flex items-center justify-between gap-2 text-xs text-petal">
        Part
        <select aria-label="Furniture part" value={part} onChange={e => setPart(e.target.value)} className="rounded bg-night px-2 py-1 text-cream">
          {Object.entries(item.colorParts).map(([key, spec]) => <option key={key} value={key}>{spec.label}</option>)}
        </select>
      </label>}

      {/* Finish colour */}
      <div className="flex items-center gap-1.5">
        {TINT_SWATCHES.map((color) => (
          <button
            key={color}
            onClick={() => commitColor(color)}
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
          onChange={(e) => commitColor(e.target.value)}
          aria-label="Pick a colour"
          className="h-7 w-7 shrink-0 rounded-md border border-white/20 bg-transparent p-0"
        />
        <input
          type="text"
          value={hexDraft}
          onChange={(e) => commitHex(e.target.value)}
          spellCheck="false"
          placeholder="#rrggbb"
          aria-label={`${partSpec?.label || 'Finish'} colour hex`}
          className={`w-full select-text rounded-lg bg-white/10 px-2 py-1 font-mono text-xs outline-none focus:bg-white/15 ${
            !hexDraft || normalizeHex(hexDraft) ? "text-cream" : "text-danger"
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
