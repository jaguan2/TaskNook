import {
  CHARACTER_PRESETS,
  characterFromPreset,
  characterPresetMatches,
} from "../lib/characterPresets";
import { ISO_SPRITES } from "./IsoItems";

/** Complete starting looks, drawn by the same resident used in the room. */
export default function CharacterPresets({ character, onPick }) {
  const Resident = ISO_SPRITES.resident;
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Character looks">
      {CHARACTER_PRESETS.map((preset) => {
        const active = characterPresetMatches(character, preset);
        const shown = characterFromPreset(preset, character.skin);
        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => onPick(shown)}
            aria-pressed={active}
            className={`group flex min-h-28 items-center gap-1.5 overflow-hidden rounded-2xl border px-1.5 py-1 text-left transition ${
              active
                ? "border-glow/70 bg-glow/15 ring-1 ring-glow/40"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            <svg viewBox="-19 -66 38 80" className="h-24 w-[4.5rem] shrink-0" aria-hidden="true">
              <ellipse cx="0" cy="11" rx="13" ry="2.2" fill="#000" opacity="0.16" />
              <Resident character={shown} facing="front" />
            </svg>
            <span className="min-w-0 py-2">
              <span className="block text-xs font-semibold leading-tight text-cream">
                {preset.label}
              </span>
              <span className="mt-1 block text-[10px] leading-snug text-petal/55">
                {preset.tagline}
              </span>
              <span
                className={`mt-2 block text-[10px] font-semibold ${
                  active ? "text-glow" : "text-petal/40 group-hover:text-petal/65"
                }`}
              >
                {active ? "Wearing now" : "Try this look"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
