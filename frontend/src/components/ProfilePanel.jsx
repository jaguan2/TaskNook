import { useState } from "react";
import { ChevronDown, RefreshCw, Shirt, UserRound } from "lucide-react";
import { useStore } from "../store";
import { ISO_SPRITES } from "./IsoItems";
import { HairBehind, HairFront, HairLength } from "./character/hair";
import { Hat } from "./character/hats";
import {
  BIO_MAX,
  EXPRESSIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  OUTFITS,
  PATTERNS,
  TROUSER_COLORS,
  MBTI_TYPES,
  MODELS,
  SKIN_TONES,
  ZODIAC,
  profileSummary,
} from "../lib/profile";
import { WIDTH_RANGE, HEIGHT_RANGE, TORSO_RANGE } from "../lib/body";
import { VISIT_ACCESS } from "../lib/visiting";

/**
 * The character editor's layout follows the convention every good creator
 * shares (Sims CAS, ACNH's mirror, Mii Maker — researched 2026-08-16):
 * the MODEL NEVER SCROLLS AWAY (a sticky preview the controls scroll under),
 * navigation is ONE level of category tabs, and COLOUR IS A PROPERTY OF THE
 * ITEM — swatch strips live inside the tab with the thing they colour, never
 * as sibling sections. Growth (eye colour, face shape, accessories) lands as
 * rows inside an existing tab or a new tab — never a third disclosure level.
 * The next step, when it's earned: lift this column into a dressing-room
 * scene mode (ACNH's mirror is furniture, not a menu).
 */
const TABS = [
  { key: "body", label: "Body" },
  { key: "face", label: "Face" },
  { key: "hair", label: "Hair" },
  { key: "outfit", label: "Outfit" },
  { key: "extras", label: "Extras" },
];

function CharacterPreview({ character, away }) {
  const Resident = ISO_SPRITES.resident;
  // A FIXED frame, sized for the biggest figure the sliders and catalog can
  // produce, with the feet pinned to a drawn floor. It used to re-measure
  // and refit per change — which quietly ZOOMED every body back to the same
  // apparent size, so the width and height sliders looked like they did
  // nothing (owner report). Against a fixed frame and a baseline, a bigger
  // body is simply bigger.
  return (
    <svg
      viewBox="-22 -100 44 108"
      className="h-32 w-full"
      role="img"
      aria-label="Preview of your character"
    >
      <ellipse cx="0" cy="1.6" rx="14" ry="2.6" fill="#000" opacity="0.18" />
      <Resident character={character} away={away} />
    </svg>
  );
}

/**
 * One hairstyle, worn — a head rendered with the style's real layers in the
 * user's own hair colour and skin. The icon IS the artwork, so it can never
 * drift from what the room draws.
 */
function HairIcon({ style, hairColor, skin }) {
  return (
    <svg viewBox="-15 -14 30 38" className="h-12 w-10" aria-hidden="true">
      <HairLength style={style} headY={0} color={hairColor} />
      <HairBehind style={style} headY={0} color={hairColor} />
      <circle cx="0" cy="0" r="7.3" fill={skin} />
      <HairFront style={style} headY={0} color={hairColor} />
      <circle cx="-2.9" cy="2" r="0.95" fill="#3a3142" />
      <circle cx="2.9" cy="2" r="0.95" fill="#3a3142" />
    </svg>
  );
}

/** A hat worn over the CURRENT hair — crown replaced, length surviving. */
function HatIcon({ hat, hair, hairColor, skin }) {
  const worn = hat !== "none";
  return (
    <svg viewBox="-15 -16 30 32" className="h-12 w-10" aria-hidden="true">
      <HairLength style={hair} headY={0} color={hairColor} />
      {!worn && <HairBehind style={hair} headY={0} color={hairColor} />}
      <circle cx="0" cy="0" r="7.3" fill={skin} />
      {!worn && <HairFront style={hair} headY={0} color={hairColor} />}
      <Hat kind={hat} headY={0} />
      <circle cx="-2.9" cy="2" r="0.95" fill="#3a3142" />
      <circle cx="2.9" cy="2" r="0.95" fill="#3a3142" />
    </svg>
  );
}

/** A garment worn by YOUR body — the torso close-up, colours and all. */
function GarmentIcon({ character, garment }) {
  const Resident = ISO_SPRITES.resident;
  return (
    <svg viewBox="-18 -50 36 34" className="h-12 w-10" aria-hidden="true">
      <Resident character={{ ...character, garment }} />
    </svg>
  );
}

function IconGrid({ label, options, value, onPick, renderIcon }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.key)}
          title={o.label}
          aria-label={o.label}
          aria-pressed={value === o.key}
          className={`flex w-14 flex-col items-center rounded-xl px-1 pb-1 pt-0.5 transition ${
            value === o.key
              ? "bg-glow/20 ring-1 ring-glow"
              : "bg-white/5 hover:bg-white/10"
          }`}
        >
          {renderIcon(o.key)}
          <span className="w-full truncate text-center text-[10px] leading-tight text-petal/70">
            {o.label}
          </span>
        </button>
      ))}
    </div>
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

// Which garments layer a second colour — derived from the catalog, so a new
// layered garment can't forget to bring its colour row along.
const LAYERED = new Set(OUTFITS.filter((o) => o.inner).map((o) => o.key));

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

function BodySlider({ label, range, step, value, onDraft, onCommit }) {
  return (
    <label className="flex items-center gap-2 text-xs text-petal/70">
      <span className="w-11 shrink-0">{label}</span>
      <input
        type="range"
        min={range[0]}
        max={range[1]}
        step={step}
        value={value}
        aria-label={`Body ${label.toLowerCase()}`}
        onChange={(e) => onDraft(Number(e.target.value))}
        onPointerUp={onCommit}
        onBlur={onCommit}
        className="h-1 flex-1 accent-glow"
      />
    </label>
  );
}

/**
 * "About you" as an EXPANSION PANEL (the Material pattern): collapsed, the
 * header carries the filled values as one compact line, so nothing hidden
 * isn't visible in miniature. Open when empty — emptiness means you're still
 * setting up; completion means it gets out of the way (owner request).
 */
function AboutPanel({ profile, summary, draft, setDraft, commit, saveProfile }) {
  const [open, setOpen] = useState(() => !profile.displayName);
  const line = [
    profile.displayName,
    profile.pronouns,
    summary.mbti,
    summary.zodiac && `${summary.zodiacSymbol} ${summary.zodiacLabel}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <section className="rounded-2xl bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/5"
      >
        <UserRound size={15} className="shrink-0 text-petal/70" />
        <span className="shrink-0 text-sm font-semibold text-cream">About you</span>
        {!open && (
          <span className="min-w-0 flex-1 truncate text-right text-xs text-petal/50">
            {line || "say hello"}
          </span>
        )}
        <ChevronDown
          size={15}
          className={`ml-auto shrink-0 text-petal/50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          <p className="text-xs text-petal/60">
            Only ever stored on this machine, in your own database.
          </p>
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
          <Field label="Personality">
            <div className="grid grid-cols-4 gap-1.5">
              {MBTI_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  title={t.label}
                  aria-pressed={profile.mbti === t.key}
                  onClick={() =>
                    saveProfile({ mbti: profile.mbti === t.key ? "" : t.key })
                  }
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
              <p className="mt-1 text-xs text-petal/70">
                <span className="font-semibold text-cream">{summary.mbti}</span> — the{" "}
                {summary.mbtiLabel}
              </p>
            )}
          </Field>
        </div>
      )}
    </section>
  );
}

export default function ProfilePanel() {
  const {
    selfInRoom,
    setSelfInRoom,
    profile,
    character,
    saveProfile,
    saveCharacter,
    user,
    setVisitAccess,
  } = useStore();
  const summary = profileSummary(profile);
  const [tab, setTab] = useState("hair");
  // Preview the back of your head too — the residents really do turn around
  // in the room now, so the mirror should show what everyone else sees.
  const [previewAway, setPreviewAway] = useState(false);

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

  // The body sliders are local until release for the same reason: a drag
  // emits dozens of change events and saveCharacter round-trips. The draft
  // still feeds the preview, so the figure follows the thumb live.
  const [bodyDraft, setBodyDraft] = useState(null);
  const shown = bodyDraft ? { ...character, ...bodyDraft } : character;
  const commitBody = () => {
    if (bodyDraft) {
      saveCharacter(bodyDraft);
      setBodyDraft(null);
    }
  };
  const draftAxis = (key) => (v) => setBodyDraft({ ...(bodyDraft || {}), [key]: v });

  return (
    <div className="space-y-4">
      <AboutPanel
        profile={profile}
        summary={summary}
        draft={draft}
        setDraft={setDraft}
        commit={commit}
        saveProfile={saveProfile}
      />

      <section>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-cream">
          <Shirt size={15} className="text-petal/70" /> Your character
        </p>

        {/* THE STICKY STAGE: preview + tabs pin to the top of the drawer's
            scroll, so the figure is on screen for every adjustment below —
            the one rule every character creator shares. */}
        <div className="sticky top-0 z-20 -mx-1 rounded-b-2xl bg-plum/95 px-1 pb-2 backdrop-blur-md">
          <div className="relative rounded-2xl border border-white/10 bg-white/5 py-1">
            <CharacterPreview character={shown} away={previewAway} />
            <button
              type="button"
              onClick={() => setPreviewAway((a) => !a)}
              title={previewAway ? "Face the mirror" : "Turn around"}
              aria-label={previewAway ? "Show front" : "Show back"}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-petal/80 transition hover:bg-white/20"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="mt-2 flex gap-1" role="tablist" aria-label="Character">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                  tab === t.key
                    ? "bg-glow text-plum"
                    : "bg-white/10 text-petal hover:bg-white/20"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-3">
          {tab === "body" && (
            <>
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
              <Field label="Build">
                <div className="space-y-2">
                  <BodySlider
                    label="Width"
                    range={WIDTH_RANGE}
                    step="0.2"
                    value={shown.width}
                    onDraft={draftAxis("width")}
                    onCommit={commitBody}
                  />
                  {/* Legs and torso are separate axes — a long-legged figure
                      and a long-bodied one are different people. */}
                  <BodySlider
                    label="Legs"
                    range={HEIGHT_RANGE}
                    step="0.5"
                    value={shown.height}
                    onDraft={draftAxis("height")}
                    onCommit={commitBody}
                  />
                  <BodySlider
                    label="Torso"
                    range={TORSO_RANGE}
                    step="0.5"
                    value={shown.torso}
                    onDraft={draftAxis("torso")}
                    onCommit={commitBody}
                  />
                </div>
              </Field>
            </>
          )}

          {tab === "face" && (
            <Field label="Expression">
              <Choices
                label="Expression"
                options={EXPRESSIONS}
                value={character.expression}
                onPick={(expression) => saveCharacter({ expression })}
              />
            </Field>
          )}

          {tab === "hair" && (
            <>
              <Field label="Style">
                <IconGrid
                  label="Hairstyle"
                  options={HAIR_STYLES}
                  value={character.hair}
                  onPick={(hair) => saveCharacter({ hair })}
                  renderIcon={(key) => (
                    <HairIcon
                      style={key}
                      hairColor={character.hairColor}
                      skin={character.skin}
                    />
                  )}
                />
              </Field>
              {/* Colour lives WITH the thing it colours — pick the style,
                  its swatches sit right here (the Mii Maker mechanic). */}
              <Field label="Colour">
                <Swatches
                  label="Hair colour"
                  options={HAIR_COLORS}
                  value={character.hairColor}
                  onPick={(hex) => saveCharacter({ hairColor: hex })}
                />
              </Field>
            </>
          )}

          {tab === "outfit" && (
            <>
              <Field label="Garment">
                <IconGrid
                  label="Garment"
                  options={OUTFITS}
                  value={character.garment}
                  onPick={(garment) => saveCharacter({ garment })}
                  renderIcon={(key) => (
                    <GarmentIcon character={shown} garment={key} />
                  )}
                />
              </Field>
              <Field label="Colour">
                <Swatches
                  label="Outfit colour"
                  options={HAIR_COLORS}
                  value={character.outfit}
                  onPick={(hex) => saveCharacter({ outfit: hex })}
                />
              </Field>
              {/* The layered garments' second colour appears only when the
                  selected garment has somewhere to show it. */}
              {LAYERED.has(character.garment) && (
                <Field label="Under / straps">
                  <Swatches
                    label="Second colour"
                    options={SKIN_TONES}
                    value={character.inner}
                    onPick={(hex) => saveCharacter({ inner: hex })}
                  />
                </Field>
              )}
              <Field label="Pattern">
                <Choices
                  label="Pattern"
                  options={PATTERNS}
                  value={character.print}
                  onPick={(print) => saveCharacter({ print })}
                />
              </Field>
              <Field label="Trousers">
                <Swatches
                  label="Trouser colour"
                  options={TROUSER_COLORS}
                  value={character.trouser}
                  onPick={(hex) => saveCharacter({ trouser: hex })}
                />
              </Field>
            </>
          )}

          {tab === "extras" && (
            <Field label="Hat">
              <IconGrid
                label="Hat"
                options={HATS}
                value={character.hat}
                onPick={(hat) => saveCharacter({ hat })}
                renderIcon={(key) => (
                  <HatIcon
                    hat={key}
                    hair={character.hair}
                    hairColor={character.hairColor}
                    skin={character.skin}
                  />
                )}
              />
            </Field>
          )}
        </div>
      </section>

      <hr className="border-white/10" />

      {/* Room-facing settings — not appearance, so they stay out of the tabs. */}
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

      <Field label="Who can visit">
        <Choices
          label="Who can visit your room"
          options={VISIT_ACCESS}
          value={user?.visitAccess || "friends"}
          onPick={(value) => setVisitAccess(value)}
        />
        <p className="mt-1 text-xs text-petal/50">
          {VISIT_ACCESS.find((v) => v.key === (user?.visitAccess || "friends"))?.hint}
          . It&apos;ll matter the day friends can really drop by — for now
          it&apos;s your door, set how you like it.
        </p>
      </Field>

      {summary.zodiac && (
        <p className="text-center text-[11px] text-petal/40">
          {ZODIAC[summary.zodiac].symbol} {summary.zodiacLabel}
          {summary.mbti ? ` · ${summary.mbti}` : ""}
        </p>
      )}
    </div>
  );
}
