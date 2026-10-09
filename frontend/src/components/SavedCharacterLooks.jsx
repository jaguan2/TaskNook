import { useState } from "react";
import { useArmed } from "../lib/useArmed";
import { LOOK_NAME_MAX, SAVED_LOOK_LIMIT } from "../lib/savedLooks";
import { characterFromPreset, characterPresetMatches } from "../lib/characterPresets";

// The profile preview stays pinned above these controls. Bring a focused
// field into the visible middle when returning from a look farther down.
const revealControl = (event) => event.currentTarget.scrollIntoView?.({ block: "center" });

export default function SavedCharacterLooks({ character, looks, onPick, onSave, onRemove }) {
  const [name, setName] = useState("");
  const [armedId, arm] = useArmed();
  return <section className="space-y-2" aria-label="Saved outfits">
    <p className="text-xs font-semibold text-cream">My outfits · {looks.length}/{SAVED_LOOK_LIMIT}</p>
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (onSave(name, character)) setName(""); }}>
      <input aria-label="Outfit name" value={name} onFocus={revealControl} onChange={(event) => setName(event.target.value)} maxLength={LOOK_NAME_MAX}
        placeholder="Name this outfit" className="min-w-0 flex-1 scroll-mt-64 rounded-xl bg-white/10 px-3 py-2 text-xs text-cream outline-none focus:ring-1 focus:ring-glow" />
      <button type="submit" onFocus={revealControl} disabled={!name.trim()} className="pill scroll-mt-64 bg-glow px-3 text-xs font-semibold text-plum disabled:opacity-40">Save look</button>
    </form>
    <p className="text-[10px] text-petal/55">Saved on this device. Saving the same name updates that outfit.</p>
    {looks.map((look) => <div key={look.key} className="flex gap-1 rounded-xl bg-white/5">
      <button type="button" onFocus={revealControl} aria-label={`Wear ${look.label}`} aria-pressed={characterPresetMatches(character, look)}
        onClick={() => onPick(characterFromPreset(look, character.skin))} className="flex-1 scroll-mt-64 truncate px-3 py-2 text-left text-xs text-cream hover:text-glow">
        {look.label}{characterPresetMatches(character, look) ? " · wearing" : ""}
      </button>
      <button type="button" onFocus={revealControl} aria-label={`Remove outfit ${look.label}`} onClick={() => arm(look.key, () => onRemove(look.key))}
        className="scroll-mt-64 px-3 text-xs text-danger hover:bg-danger/10">{armedId === look.key ? "sure?" : "✕"}</button>
    </div>)}
  </section>;
}
