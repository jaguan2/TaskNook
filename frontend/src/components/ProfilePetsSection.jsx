import { useState } from "react";
import { PawPrint } from "lucide-react";
import { ISO_ITEMS, PET_NAME_MAX, PET_TEMPERS, petLooksFor } from "../lib/isoRoom";
import { PET_SPRITES } from "./IsoPetItems";
import Choices from "./ProfileChoiceGroup";

/**
 * Your PETS — who lives here beyond you (owner request, 2026-08-18): every
 * cat or dog placed in the room gets a NAME and a TEMPER. Identity lives on
 * the placement itself (a pet IS a placement), so two cats are two rows and
 * removing one takes its name with it. The temper reaches the wander engine
 * (lib/isoRoom.js `PET_TEMPERS`): a curious pet ranges the whole room and
 * won't settle on a rug; a sleepy one barely leaves its spot. The name shows
 * when you pick the pet up in the room.
 */
export default function ProfilePetsSection({ isoRoom, setPetIdentity, addIsoItem, removeIsoItem }) {
  const pets = (isoRoom?.placements || []).filter((p) => ISO_ITEMS[p.item]?.roamer);
  // Rehoming confirms in a POPUP over the card (owner, 2026-08-19 — this
  // one outranks the app's armed-button grammar): a pet has a name, and the
  // dialog is where there's room to say plainly that it can't be undone.
  const [confirmId, setConfirmId] = useState(null);
  // ONE Adopt button beside the title (owner, 2026-08-19: three buttons was
  // a row of shopping); the species pills appear only while adopting.
  const [adopting, setAdopting] = useState(false);
  return (
    <section>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-cream">
        <PawPrint size={15} className="text-petal/70" /> Your pets
        {/* Adopt from right here — the section is "who lives here", and going
            via the Room panel's furniture shelf to get a PET read as shopping.
            addIsoItem already owns the cap and no-floor refusal toasts. */}
        <button
          type="button"
          onClick={() => setAdopting((a) => !a)}
          aria-expanded={adopting}
          className={`ml-auto rounded-full border px-3 py-1 text-xs transition ${
            adopting
              ? "border-glow/60 bg-glow/15 text-cream"
              : "border-white/10 bg-white/5 text-petal hover:border-glow/50 hover:text-cream"
          }`}
        >
          🐾 Adopt
        </button>
      </p>
      {adopting && (
        <div className="mb-2 flex flex-wrap gap-2">
          {[
            ["cat", "🐈 A cat"],
            ["dog", "🐕 A dog"],
            ["bunny", "🐇 A rabbit"],
          ].map(([item, label]) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                addIsoItem(item);
                setAdopting(false);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-petal transition hover:border-glow/50 hover:text-cream"
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {pets.length === 0 ? (
        <p className="text-xs text-petal/50">
          No pets yet — adopt one above and it appears in your room, ready to
          name.
        </p>
      ) : (
        <div className="space-y-2">
          {pets.map((p) => {
            const Sprite = PET_SPRITES[p.item];
            return (
              <div
                key={p.id}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-2"
              >
                <div className="flex items-center gap-3">
                <svg
                  viewBox="-9 -26 32 40"
                  className="h-14 w-12 shrink-0"
                  aria-hidden="true"
                  style={p.tint ? { "--tint": p.tint } : undefined}
                >
                  <Sprite awake facing="front" look={p.look} />
                </svg>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* The ✕ shares the name row so it's ALIGNED with
                      something (owner: a corner-floated ✕ lined up with
                      nothing). Save on BLUR, not per keystroke — every
                      write saves the room. Keyed on the stored name so an
                      outside change (validation trimming it) refreshes the
                      field. */}
                  <div className="flex items-center gap-1.5">
                    <input
                      key={`${p.id}:${p.name || ""}`}
                      type="text"
                      defaultValue={p.name || ""}
                      placeholder={`Name your ${(ISO_ITEMS[p.item].label || "pet").toLowerCase()}`}
                      maxLength={PET_NAME_MAX}
                      aria-label="Pet name"
                      onBlur={(e) => setPetIdentity(p.id, { name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-cream placeholder:text-petal/40 focus:border-glow/60 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setConfirmId(p.id)}
                      title="Find them a new home"
                      aria-label="Find them a new home"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm text-petal/40 transition hover:bg-white/10 hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                  <Choices
                    label="Temper"
                    options={PET_TEMPERS}
                    value={p.temper || "mellow"}
                    onPick={(temper) => setPetIdentity(p.id, { temper })}
                  />
                  {/* The look — coat pattern for cats, breed for dogs. The
                      thumbnail above redraws live, so picking is trying on. */}
                  {petLooksFor(p.item) && (
                    <Choices
                      label={p.item === "dog" ? "Breed" : "Coat"}
                      options={petLooksFor(p.item)}
                      value={p.look || petLooksFor(p.item)[0].key}
                      onPick={(look) => setPetIdentity(p.id, { look })}
                    />
                  )}
                </div>
                </div>
                {/* The confirm POPUP, covering just this pet's card — a
                    euphemism plus silence reads as a trick, so the dialog
                    names what happens and that it's permanent. */}
                {confirmId === p.id && (
                  <div
                    role="alertdialog"
                    aria-label="Find them a new home?"
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-night/95 p-3 text-center backdrop-blur-sm"
                  >
                    <p className="text-xs font-semibold text-cream">
                      Find {p.name || `this ${(ISO_ITEMS[p.item].label || "pet").toLowerCase()}`} a
                      new home?
                    </p>
                    <p className="text-[10px] leading-snug text-petal/60">
                      They&apos;ll leave your room for good — this can&apos;t be
                      undone.
                    </p>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        autoFocus
                        onClick={() => setConfirmId(null)}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs text-cream transition hover:bg-white/20"
                      >
                        Keep them
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeIsoItem(p.id);
                          setConfirmId(null);
                        }}
                        className="rounded-full bg-danger/20 px-3 py-1 text-xs font-semibold text-danger transition hover:bg-danger/30"
                      >
                        New home
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-petal/50">
            Temper changes how they wander — curious pets range the whole room,
            sleepy ones barely leave their spot. Pick a pet up in the room to
            carry it somewhere new.
          </p>
        </div>
      )}
    </section>
  );
}

