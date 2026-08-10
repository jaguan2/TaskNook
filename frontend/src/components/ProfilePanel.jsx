import { useLayoutEffect, useRef, useState } from "react";
import { Shirt, Sparkles, UserRound } from "lucide-react";
import { useStore } from "../store";
import { ISO_SPRITES } from "./IsoItems";
import {
  BIO_MAX,
  EXPRESSIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  MBTI_TYPES,
  MODELS,
  SKIN_TONES,
  ZODIAC,
  profileSummary,
} from "../lib/profile";
import { WIDTH_RANGE, HEIGHT_RANGE } from "../lib/body";

/**
 * The resident, drawn with the character being edited. Measured with getBBox
 * for the same reason RoomPanel's item previews are: the sprite is drawn around
 * its own origin and reaches well above it, so no hand-written viewBox frames
 * it. Standing (not seated) because that's the pose that shows the whole outfit.
 */
function CharacterPreview({ character }) {
  const Resident = ISO_SPRITES.resident;
  const gRef = useRef(null);
  const [box, setBox] = useState(null);

  // Re-measure whenever the character changes: a bun or long hair is taller
  // than a buzz cut, and a stale box crops the new silhouette.
  useLayoutEffect(() => {
    const measured = gRef.current?.getBBox?.();
    if (measured && measured.width > 0 && measured.height > 0) setBox(measured);
  }, [character]);

  const pad = 6;
  const viewBox = box
    ? `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`
    : "-30 -60 60 70";

  return (
    <svg
      viewBox={viewBox}
      className="h-28 w-full"
      role="img"
      aria-label="Preview of your character"
    >
      <g ref={gRef}>
        <Resident character={character} />
      </g>
    </svg>
  );
}

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
        <Icon size={15} className="text-petal/70" /> {title}
      </p>
      {hint && <p className="text-xs text-petal/60">{hint}</p>}
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-petal/50">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-petal/40 focus:border-white/25 focus:outline-none";

/** A row of colour dots — the same control skin/hair/outfit all want. */
function Swatches({ options, value, onPick, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const active = value.toLowerCase() === o.hex.toLowerCase();
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onPick(o.hex)}
            aria-label={o.key}
            aria-pressed={active}
            title={o.key}
            style={{ background: o.hex }}
            className={`h-7 w-7 rounded-full border-2 transition ${
              active ? "border-glow scale-110" : "border-white/20 hover:border-white/50"
            }`}
          />
        );
      })}
    </div>
  );
}

/** A row of labelled pills — hairstyle, expression. */
function Choices({ options, value, onPick, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.key)}
          aria-pressed={value === o.key}
          className={`pill px-3 py-1.5 text-xs font-semibold transition ${
            value === o.key
              ? "bg-glow text-plum"
              : "bg-white/10 text-petal hover:bg-white/20"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ProfilePanel() {
  const { selfInRoom, setSelfInRoom, profile, character, saveProfile, saveCharacter } = useStore();
  const summary = profileSummary(profile);

  // Text inputs are local until blur: saveProfile round-trips to the server,
  // and re-rendering the field from server state on every keystroke is how you
  // get a cursor that jumps to the end of the line mid-word.
  const [draft, setDraft] = useState({
    displayName: profile.displayName || "",
    pronouns: profile.pronouns || "",
    bio: profile.bio || "",
  });

  const commit = (key) => {
    const value = draft[key] ?? "";
    if ((profile[key] || "") !== value) saveProfile({ [key]: value });
  };

  // The body sliders are local until release for the same reason the text
  // fields are local until blur: saveCharacter round-trips to the server,
  // and a drag emits dozens of change events. The draft still feeds the
  // preview, so the figure follows the thumb live.
  const [bodyDraft, setBodyDraft] = useState(null);
  const shown = bodyDraft ? { ...character, ...bodyDraft } : character;
  const commitBody = () => {
    if (bodyDraft) {
      saveCharacter(bodyDraft);
      setBodyDraft(null);
    }
  };

  return (
    <div className="space-y-5">
      <Section
        icon={UserRound}
        title="You"
        hint="Only ever stored on this machine, in your own database."
      >
        <Field label="Name">
          <input
            className={inputClass}
            value={draft.displayName}
            maxLength={60}
            placeholder="What should we call you?"
            onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            onBlur={() => commit("displayName")}
          />
        </Field>

        <Field label="Pronouns">
          <input
            className={inputClass}
            value={draft.pronouns}
            maxLength={32}
            placeholder="they/them"
            onChange={(e) => setDraft({ ...draft, pronouns: e.target.value })}
            onBlur={() => commit("pronouns")}
          />
        </Field>

        <Field label="Birthday">
          <input
            type="date"
            className={inputClass}
            value={profile.birthDate || ""}
            onChange={(e) => saveProfile({ birthDate: e.target.value })}
          />
        </Field>

        {summary.zodiac && (
          <p className="text-xs text-petal/70">
            <span className="text-base">{summary.zodiacSymbol}</span>{" "}
            <span className="font-semibold text-cream">{summary.zodiacLabel}</span> ·{" "}
            {summary.element}
            {summary.age != null && ` · ${summary.age}`}
          </p>
        )}

        <Field label="Bio">
          <textarea
            className={`${inputClass} h-16 resize-none`}
            value={draft.bio}
            maxLength={BIO_MAX}
            placeholder="A line about you."
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            onBlur={() => commit("bio")}
          />
        </Field>
      </Section>

      <hr className="border-white/10" />

      <Section icon={Sparkles} title="Personality" hint="Pick your type, or leave it blank.">
        <div className="grid grid-cols-4 gap-1.5">
          {MBTI_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              title={t.label}
              aria-pressed={profile.mbti === t.key}
              // Tapping the type you already have clears it — there's no other
              // way back to "prefer not to say" once you've chosen.
              onClick={() => saveProfile({ mbti: profile.mbti === t.key ? "" : t.key })}
              className={`pill py-1.5 text-[11px] font-semibold transition ${
                profile.mbti === t.key
                  ? "bg-glow text-plum"
                  : "bg-white/10 text-petal hover:bg-white/20"
              }`}
            >
              {t.key}
            </button>
          ))}
        </div>
        {summary.mbtiLabel && (
          <p className="text-xs text-petal/70">
            <span className="font-semibold text-cream">{summary.mbti}</span> — the{" "}
            {summary.mbtiLabel}
          </p>
        )}
      </Section>

      <hr className="border-white/10" />

      <Section
        icon={Shirt}
        title="Your character"
        hint="Only this one looks like you — the other residents stay themselves."
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 py-2">
          <CharacterPreview character={shown} />
        </div>

        {/* The switch that actually puts you in the scene. Without it the whole
            section edits someone who lives nowhere: a fresh room contains no
            residents at all, so nothing on screen changed as you picked. */}
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2.5">
          <span className="text-xs text-petal/80">
            Put me in the room
            <span className="mt-0.5 block text-[11px] text-petal/50">
              You&apos;ll appear once, and think about what you&apos;re doing.
            </span>
          </span>
          <input
            type="checkbox"
            checked={selfInRoom}
            onChange={(e) => setSelfInRoom(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-glow"
          />
        </label>

        {/* First, because it's the one choice that changes the silhouette —
            everything below is applied on top of whichever body you pick. */}
        <Field label="Model">
          <Choices
            label="Model"
            options={MODELS}
            value={character.model}
            onPick={(model) => saveCharacter({ model })}
          />
        </Field>

        <Field label="Skin">
          <Swatches
            label="Skin tone"
            options={SKIN_TONES}
            value={character.skin}
            onPick={(hex) => saveCharacter({ skin: hex })}
          />
        </Field>

        <Field label="Hair">
          <Choices
            label="Hairstyle"
            options={HAIR_STYLES}
            value={character.hair}
            onPick={(hair) => saveCharacter({ hair })}
          />
        </Field>

        <Field label="Hair colour">
          <Swatches
            label="Hair colour"
            options={HAIR_COLORS}
            value={character.hairColor}
            onPick={(hex) => saveCharacter({ hairColor: hex })}
          />
        </Field>

        <Field label="Outfit">
          <Swatches
            label="Outfit colour"
            options={HAIR_COLORS}
            value={character.outfit}
            onPick={(hex) => saveCharacter({ outfit: hex })}
          />
        </Field>

        <Field label="Expression">
          <Choices
            label="Expression"
            options={EXPRESSIONS}
            value={character.expression}
            onPick={(expression) => saveCharacter({ expression })}
          />
        </Field>

        <Field label="Body">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-petal/70">
              <span className="w-11 shrink-0">Width</span>
              <input
                type="range"
                min={WIDTH_RANGE[0]}
                max={WIDTH_RANGE[1]}
                step="0.2"
                value={shown.width}
                aria-label="Body width"
                onChange={(e) =>
                  setBodyDraft({ ...(bodyDraft || {}), width: Number(e.target.value) })
                }
                onPointerUp={commitBody}
                onBlur={commitBody}
                className="h-1 flex-1 accent-glow"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-petal/70">
              <span className="w-11 shrink-0">Height</span>
              <input
                type="range"
                min={HEIGHT_RANGE[0]}
                max={HEIGHT_RANGE[1]}
                step="0.5"
                value={shown.height}
                aria-label="Body height"
                onChange={(e) =>
                  setBodyDraft({ ...(bodyDraft || {}), height: Number(e.target.value) })
                }
                onPointerUp={commitBody}
                onBlur={commitBody}
                className="h-1 flex-1 accent-glow"
              />
            </label>
          </div>
        </Field>

        <p className="text-xs text-petal/50">
          Tinting one resident in the room still overrides this outfit, so a
          houseful of people needn&apos;t all dress the same.
        </p>
      </Section>

      {summary.zodiac && (
        <p className="text-center text-[11px] text-petal/40">
          {ZODIAC[summary.zodiac].symbol} {summary.zodiacLabel}
          {summary.mbti ? ` · ${summary.mbti}` : ""}
        </p>
      )}
    </div>
  );
}
