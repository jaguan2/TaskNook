import { useEffect, useRef, useState } from "react";
import { ChevronDown, Shirt, UserRound } from "lucide-react";
import { useProfileStore, useRoomStore, useSocialStore, useSystemStore, useTaskStore } from "../store";
import { Resident } from "./character";
import { HairBehind, HairFront, HairLength } from "./character/hair";
import { Hat } from "./character/hats";
import { Glasses } from "./character/glasses";
import { EyePair } from "./character/body";
import {
  BIO_MAX,
  COATS,
  DEFAULT_CHARACTER,
  EXPRESSIONS,
  EYE_COLORS,
  EYE_X_RANGE,
  EYE_Y_RANGE,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  OUTFITS,
  PANTS,
  PATTERNS,
  SCARF_COLORS,
  SCARVES,
  SEATED_POSES,
  SHOES,
  SHOE_COLORS,
  TROUSER_COLORS,
  MBTI_TYPES,
  MODELS,
  SKIN_TONES,
  ZODIAC,
  profileSummary,
  hatOf,
} from "../lib/profile";
import {
  BODY_SIZE_PRESETS,
  HEIGHT_RANGE,
  SHOULDER_RANGE,
  TORSO_RANGE,
  WIDTH_RANGE,
  bodySizePresetMatches,
  bodySizePresetPatch,
} from "../lib/body";
import { VISIT_ACCESS } from "../lib/visiting";
import CharacterPresets from "./CharacterPresets";
import SavedCharacterLooks from "./SavedCharacterLooks";
import LevelCard from "./LevelCard";
import Choices from "./ProfileChoiceGroup";
import ProfilePetsSection from "./ProfilePetsSection";

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
  { key: "looks", label: "Looks" },
  { key: "body", label: "Body" },
  { key: "face", label: "Face" },
  { key: "hair", label: "Hair" },
  { key: "outfit", label: "Outfit" },
  { key: "extras", label: "Extras" },
];

/**
 * The dressing-room stage has front, seated and back views. The seated view is
 * where sitting-style choices earn their slot; the side model still does not
 * meet the quality bar. Drag pans and the wheel zooms; the frame stays fixed
 * per zoom level so a slider change never resets the camera.
 */
function CharacterStage({ character, view }) {
  const [zoom, setZoom] = useState(1.35);
  // The camera can MOVE now, not just zoom: dragging the stage pans the view
  // (the iso room's own grammar). Double-click brings the camera home.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  // Wheel zoom must preventDefault (the drawer would scroll), so it can't be
  // a React onWheel prop — React registers those passively. Same pattern as
  // the room's camera.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      setZoom((z) => Math.min(2.8, Math.max(0.8, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);
  // Zoom scales the window, anchored a little above the figure's middle so
  // zooming in walks up toward the face rather than the floor.
  const w = 46 / zoom;
  const h = 112 / zoom;
  // The figure spans roughly y −57…+14 (it draws 9.6px below the origin), so
  // its centre is ≈ −23 — the camera opens ON the body instead of a head
  // pinned to the frame's bottom half (owner: "when we first open it, it's
  // centered").
  const cy = -23 - (zoom - 1) * 10;
  return (
    <svg
      ref={svgRef}
      viewBox={`${-w / 2 + pan.x} ${cy - h / 2 + pan.y} ${w} ${h}`}
      className={`h-44 w-full ${dragRef.current ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ touchAction: "none" }}
      role="img"
      aria-label={`${view === "back" ? "Back" : view === "seated" ? "Seated" : "Front"} view of your character — drag to move and scroll to zoom`}
      onPointerDown={(e) => {
        dragRef.current = {
          x: e.clientX,
          y: e.clientY,
          px: pan.x,
          py: pan.y,
        };
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!d) return;
        // Pointer pixels → viewBox units, so the scene sticks to the cursor
        // at every zoom. Clamped so the figure can't be lost.
        const rect = svgRef.current?.getBoundingClientRect();
        const k = rect ? w / rect.width : 0.15;
        setPan({
          x: Math.max(-26, Math.min(26, d.px - (e.clientX - d.x) * k)),
          y: Math.max(-58, Math.min(58, d.py - (e.clientY - d.y) * k)),
        });
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onDoubleClick={() => {
        setPan({ x: 0, y: 0 });
        setZoom(1.35);
      }}
    >
      {/* The figure draws 9.6px below the origin (project(0.4,0.4)), so the
          shadow belongs under the FEET at ~y12, not at the origin where it
          floated at shin height. */}
      <ellipse cx="0" cy={view === "seated" && character.seatPose === "crossed" ? 4 : 12}
        rx="15" ry="2.5" fill="#000" opacity="0.18" />
      <g transform={view === "seated" ? "translate(0,-22)" : undefined}>
        <Resident character={character} facing={view === "back" ? "back" : "front"}
          seated={view === "seated"} seatH={view === "seated" ? 22 : 0} />
      </g>
    </svg>
  );
}

/**
 * One hairstyle, worn — a head rendered with the style's real layers in the
 * user's own hair colour and skin. The icon IS the artwork, so it can never
 * drift from what the room draws.
 */
function HairIcon({ style, hairColor, skin, eyeX, eyeY, eyeColor }) {
  return (
    <svg viewBox="-15 -14 30 38" className="h-12 w-full" aria-hidden="true">
      <HairLength style={style} headY={0} color={hairColor} />
      <HairBehind style={style} headY={0} color={hairColor} />
      <circle cx="0" cy="0" r="7.3" fill={skin} />
      <HairFront style={style} headY={0} color={hairColor} />
      <EyePair headY={0} eyeX={eyeX} eyeY={eyeY} eyeColor={eyeColor} />
    </svg>
  );
}

/** A hat worn over the CURRENT hair — crown replaced, length surviving. */
function HatIcon({ hat, hair, hairColor, skin, eyeX, eyeY, eyeColor }) {
  const worn = hat !== "none" && hatOf(hat).coversHair !== false;
  return (
    <svg viewBox="-15 -16 30 32" className="h-12 w-full" aria-hidden="true">
      <HairLength style={hair} headY={0} color={hairColor} />
      {!worn && <HairBehind style={hair} headY={0} color={hairColor} />}
      <circle cx="0" cy="0" r="7.3" fill={skin} />
      {!worn && <HairFront style={hair} headY={0} color={hairColor} />}
      <Hat kind={hat} headY={0} />
      <EyePair headY={0} eyeX={eyeX} eyeY={eyeY} eyeColor={eyeColor} />
    </svg>
  );
}

/** A top worn by YOUR body — the torso close-up, coatless so the top shows. */
function GarmentIcon({ character, garment }) {
  return (
    <svg viewBox="-18 -50 36 34" className="h-12 w-full" aria-hidden="true">
      <Resident character={{ ...character, garment, coat: "none" }} />
    </svg>
  );
}

/** A coat over your CURRENT top — what layering actually looks like. */
function CoatIcon({ character, coat }) {
  return (
    <svg viewBox="-18 -50 36 34" className="h-12 w-full" aria-hidden="true">
      <Resident character={{ ...character, coat }} />
    </svg>
  );
}

/** A bottom on your own legs — the lower-half close-up. */
function PantsIcon({ character, pants }) {
  return (
    <svg viewBox="-16 -34 32 40" className="h-12 w-full" aria-hidden="true">
      <Resident character={{ ...character, pants }} />
    </svg>
  );
}

/** A scarf at your own neck — chin-to-chest close-up, in its colour. */
function ScarfIcon({ character, scarf }) {
  return (
    <svg viewBox="-16 -52 32 28" className="h-12 w-full" aria-hidden="true">
      <Resident character={{ ...character, scarf }} />
    </svg>
  );
}

/** Glasses on your own face — the head close-up, frames over the real eyes. */
function GlassesIcon({ glasses, hair, hairColor, skin, eyeX, eyeY, eyeColor }) {
  return (
    <svg viewBox="-15 -14 30 30" className="h-12 w-full" aria-hidden="true">
      <HairLength style={hair} headY={0} color={hairColor} />
      <HairBehind style={hair} headY={0} color={hairColor} />
      <circle cx="0" cy="0" r="7.3" fill={skin} />
      <HairFront style={hair} headY={0} color={hairColor} />
      <EyePair headY={0} eyeX={eyeX} eyeY={eyeY} eyeColor={eyeColor} />
      <Glasses kind={glasses} headY={0} eyeX={eyeX} eyeY={eyeY} />
    </svg>
  );
}

/** A pair of shoes on your own feet — ankles down. */
function ShoesIcon({ character, shoes }) {
  return (
    <svg viewBox="-15 -1 30 15" className="h-12 w-full" aria-hidden="true">
      <Resident character={{ ...character, shoes }} />
    </svg>
  );
}

function IconGrid({ label, options, value, onPick, renderIcon, swatchesFor, swatchValue, onSwatch }) {
  // A real GRID, not a wrap of fixed-width chips: the cells share the row's
  // full width, so the drawer's space is spent on bigger icons instead of a
  // ragged right margin (owner: "utilize the blank space a little more").
  //
  // Colour lives IN the item now: tapping a tile selects it AND pops a
  // SMALL DIALOG of its colours at that tile (owner, twice: "popup the
  // options after someone clicks on an item", then "just make a small
  // dialog" — the first cut was a full-width strip, which read as a panel
  // section rather than a popup). `swatchesFor(key)` returns the palette
  // for a tile, or null for tiles with nothing to colour (a bare head,
  // "no coat"). The dialog anchors at the tile's centre, clamped so it
  // never leaves the drawer, and dismisses on any tap OUTSIDE it — no ✕
  // (owner: "people should just know to click out of it"; the ✕ also ate a
  // corner and skewed the padding).
  const [pop, setPop] = useState(null);
  const popRef = useRef(null);
  useEffect(() => {
    if (!pop) return undefined;
    const dismiss = (e) => {
      if (!popRef.current?.contains(e.target)) setPop(null);
    };
    // Escape closes the DIALOG, not the drawer under it — capture +
    // stopPropagation ahead of App's own Escape handler, the same grammar
    // as the clock cluster's weather popover.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setPop(null);
    };
    // pointerdown, so tapping ANOTHER tile closes this dialog first and
    // that tile's own click then opens its colours — one dialog at a time.
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [pop]);
  const swatches = pop ? swatchesFor?.(value) : null;
  return (
    <div className="relative">
      <div className="grid w-full grid-cols-5 gap-1.5" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={(e) => {
              onPick(o.key);
              const el = e.currentTarget;
              const wrap = el.offsetParent;
              const mid = el.offsetLeft + el.offsetWidth / 2;
              setPop(
                swatchesFor?.(o.key)
                  ? {
                      top: el.offsetTop + el.offsetHeight,
                      left: wrap
                        ? Math.min(Math.max(mid, 88), Math.max(88, wrap.clientWidth - 88))
                        : mid,
                    }
                  : null
              );
            }}
            title={o.label}
            aria-label={o.label}
            aria-pressed={value === o.key}
            className={`flex flex-col items-center rounded-xl px-0.5 pb-1 pt-0.5 transition ${
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
      {swatches && (
        <div
          ref={popRef}
          className="absolute z-20 w-max max-w-[10.5rem] -translate-x-1/2 rounded-xl border border-white/10 bg-plum/95 p-2.5 shadow-xl backdrop-blur-md"
          style={{ top: pop.top + 4, left: pop.left }}
        >
          {/* Picking a colour is the dialog's whole job, so the pick also
              DISMISSES it (owner, 2026-08-19: it used to sit there until
              you clicked away). The tile still reopens it any time. */}
          <Swatches
            label={`${label} colour`}
            options={swatches}
            value={swatchValue}
            onPick={(hex) => {
              onSwatch(hex);
              setPop(null);
            }}
          />
        </div>
      )}
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

function BodySlider({
  label,
  range,
  step,
  value,
  onDraft,
  onCommit,
  ariaPrefix = "Body",
  labels = ["Smaller", "Middle", "Larger"],
  neutralValue = (range[0] + range[1]) / 2,
}) {
  const size = value < neutralValue - Number(step) / 2
    ? labels[0]
    : value > neutralValue + Number(step) / 2
      ? labels[2]
      : labels[1];
  return (
    <label className="grid grid-cols-[4.25rem_1fr_3rem] items-center gap-2 text-xs text-petal/70">
      <span className="shrink-0">{label}</span>
      <input
        type="range"
        min={range[0]}
        max={range[1]}
        step={step}
        value={value}
        aria-label={`${ariaPrefix} ${label.toLowerCase()}`}
        onChange={(e) => onDraft(Number(e.target.value))}
        onPointerUp={onCommit}
        onBlur={onCommit}
        className="h-1 flex-1 accent-glow"
      />
      <span className="text-right text-[10px] text-petal/45">{size}</span>
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
  const { progression, profile, character, saveProfile, saveCharacter,
    savedLooks, saveCharacterLook, removeCharacterLook } = useProfileStore();
  const { sessionDays } = useTaskStore();
  const { user } = useSystemStore();
  const { setVisitAccess } = useSocialStore();
  const {
    selfInRoom,
    setSelfInRoom,
    isoRoom,
    setPetIdentity,
    addIsoItem,
    removeIsoItem,
  } = useRoomStore();
  const summary = profileSummary(profile);
  const [tab, setTab] = useState("looks");
  const [characterView, setCharacterView] = useState("front");
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

  // Character sliders are local until release for the same reason: a drag
  // emits dozens of change events and saveCharacter round-trips. The draft
  // still feeds the preview, so the figure follows the thumb live.
  const [axisDraft, setAxisDraft] = useState(null);
  const shown = axisDraft ? { ...character, ...axisDraft } : character;
  const commitAxes = () => {
    if (axisDraft) {
      saveCharacter(axisDraft);
      setAxisDraft(null);
    }
  };
  const draftAxis = (key) => (v) => setAxisDraft({ ...(axisDraft || {}), [key]: v });

  return (
    <div className="space-y-4">
      <LevelCard progression={progression} sessionDays={sessionDays} />
      <AboutPanel
        profile={profile}
        summary={summary}
        draft={draft}
        setDraft={setDraft}
        commit={commit}
        saveProfile={saveProfile}
      />

      <section>
        {/* The room switch lives in the HEADER, not buried under the tabs —
            it's the one control here that isn't appearance, and it should be
            one flick from anywhere (owner request). */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
            <Shirt size={15} className="text-petal/70" /> Your character
          </p>
          <label
            className="flex cursor-pointer items-center gap-1.5 text-xs text-petal/70"
            title="Your character appears once in the room, and thinks about what you're doing."
          >
            In the room
            <input
              type="checkbox"
              checked={selfInRoom}
              onChange={(e) => setSelfInRoom(e.target.checked)}
              className="h-4 w-4 accent-glow"
            />
          </label>
        </div>

        {/* THE STICKY STAGE: preview + tabs pin to the top of the drawer's
            scroll, so the figure is on screen for every adjustment below —
            the one rule every character creator shares. */}
        <div className="sticky top-0 z-20 -mx-1 rounded-b-2xl bg-plum/95 px-1 pb-2 backdrop-blur-md">
          <div className="relative rounded-2xl border border-white/10 bg-white/5 py-1">
            <CharacterStage character={shown} view={characterView} />
            <div
              className="absolute right-2 top-2 flex rounded-full bg-plum/75 p-0.5 backdrop-blur-sm"
              role="group"
              aria-label="Character preview view"
            >
              {["front", "seated", "back"].map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setCharacterView(view)}
                  aria-pressed={characterView === view}
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize transition ${
                    characterView === view
                      ? "bg-glow text-plum"
                      : "text-petal/70 hover:bg-white/10 hover:text-cream"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
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
          {tab === "looks" && (
            <>
              <p className="text-xs leading-relaxed text-petal/65">
                Start with a complete outfit, then make it yours. Your skin and face stay the same.
              </p>
              <SavedCharacterLooks character={character} looks={savedLooks} onPick={saveCharacter}
                onSave={saveCharacterLook} onRemove={removeCharacterLook} />
              <CharacterPresets character={character} onPick={saveCharacter} />
            </>
          )}

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
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Body size templates">
                    {BODY_SIZE_PRESETS.map((preset) => {
                      const selected = bodySizePresetMatches(shown, preset);
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => saveCharacter(bodySizePresetPatch(preset))}
                          className={`pill px-2.5 py-1 text-[11px] font-semibold transition ${
                            selected ? "bg-glow text-plum" : "bg-white/10 text-petal hover:bg-white/20"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <BodySlider
                    label="Width"
                    range={WIDTH_RANGE}
                    step="0.2"
                    value={shown.width}
                    onDraft={draftAxis("width")}
                    onCommit={commitAxes}
                  />
                  <BodySlider
                    label="Shoulders"
                    range={SHOULDER_RANGE}
                    step="0.2"
                    value={shown.shoulders}
                    onDraft={draftAxis("shoulders")}
                    onCommit={commitAxes}
                  />
                  {/* Legs and torso are separate axes — a long-legged figure
                      and a long-bodied one are different people. */}
                  <BodySlider
                    label="Legs"
                    range={HEIGHT_RANGE}
                    step="0.5"
                    value={shown.height}
                    onDraft={draftAxis("height")}
                    onCommit={commitAxes}
                  />
                  <BodySlider
                    label="Torso"
                    range={TORSO_RANGE}
                    step="0.5"
                    value={shown.torso}
                    onDraft={draftAxis("torso")}
                    onCommit={commitAxes}
                  />
                </div>
              </Field>
              <Field label="Sitting style">
                <Choices
                  label="Sitting style"
                  options={SEATED_POSES}
                  value={character.seatPose}
                  onPick={(seatPose) => {
                    setCharacterView("seated");
                    saveCharacter({ seatPose });
                  }}
                />
              </Field>
            </>
          )}

          {tab === "face" && (
            <>
              <Field label="Expression">
                <Choices
                  label="Expression"
                  options={EXPRESSIONS}
                  value={character.expression}
                  onPick={(expression) => saveCharacter({ expression })}
                />
              </Field>
              <Field label="Eye color">
                <Swatches
                  label="Eye color"
                  options={EYE_COLORS}
                  value={character.eyeColor}
                  onPick={(eyeColor) => saveCharacter({ eyeColor })}
                />
              </Field>
              <Field label="Eye placement">
                <div className="space-y-2">
                  <BodySlider
                    label="Spacing"
                    ariaPrefix="Eye"
                    labels={["Closer", "Balanced", "Wider"]}
                    neutralValue={DEFAULT_CHARACTER.eyeX}
                    range={EYE_X_RANGE}
                    step="0.1"
                    value={shown.eyeX}
                    onDraft={draftAxis("eyeX")}
                    onCommit={commitAxes}
                  />
                  <BodySlider
                    label="Height"
                    ariaPrefix="Eye"
                    labels={["Higher", "Middle", "Lower"]}
                    range={EYE_Y_RANGE}
                    step="0.05"
                    value={shown.eyeY}
                    onDraft={draftAxis("eyeY")}
                    onCommit={commitAxes}
                  />
                </div>
              </Field>
            </>
          )}

          {tab === "hair" && (
            <>
              <Field label="Style">
                {/* Only the SELECTED tile wears your colour — the rest stay
                    in the classic default (owner: "not all the other hair
                    colors need to change when you select a color"). A wall
                    of tiles repainting per swatch tap read as the panel
                    glitching; the figure above is where your colour shows.
                    Same rule for every wardrobe grid below. */}
                <IconGrid
                  label="Hairstyle"
                  options={HAIR_STYLES}
                  value={character.hair}
                  onPick={(hair) => saveCharacter({ hair })}
                  renderIcon={(key) => (
                    <HairIcon
                      style={key}
                      hairColor={
                        key === character.hair ? character.hairColor : DEFAULT_CHARACTER.hairColor
                      }
                      skin={character.skin}
                      eyeX={character.eyeX}
                      eyeY={character.eyeY}
                      eyeColor={character.eyeColor}
                    />
                  )}
                  swatchesFor={() => HAIR_COLORS}
                  swatchValue={character.hairColor}
                  onSwatch={(hex) => saveCharacter({ hairColor: hex })}
                />
              </Field>
            </>
          )}

          {tab === "outfit" && (
            <>
              {/* The wardrobe is three SLOTS now — top, coat over it, bottom —
                  each with its colour beside it (colour is a property of the
                  item, the Mii Maker rule). */}
              <Field label="Top">
                <IconGrid
                  label="Top"
                  options={OUTFITS}
                  value={character.garment}
                  onPick={(garment) => saveCharacter({ garment })}
                  renderIcon={(key) => (
                    <GarmentIcon
                      character={
                        key === character.garment
                          ? shown
                          : { ...shown, outfit: DEFAULT_CHARACTER.outfit }
                      }
                      garment={key}
                    />
                  )}
                  swatchesFor={() => HAIR_COLORS}
                  swatchValue={character.outfit}
                  onSwatch={(hex) => saveCharacter({ outfit: hex })}
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
              <Field label="Outer layer">
                <IconGrid
                  label="Outer layer"
                  options={COATS}
                  value={character.coat}
                  onPick={(coat) => saveCharacter({ coat })}
                  renderIcon={(key) => (
                    <CoatIcon
                      character={
                        key === character.coat
                          ? shown
                          : { ...shown, coatColor: DEFAULT_CHARACTER.coatColor }
                      }
                      coat={key}
                    />
                  )}
                  swatchesFor={(key) => (key === "none" ? null : TROUSER_COLORS)}
                  swatchValue={character.coatColor}
                  onSwatch={(hex) => saveCharacter({ coatColor: hex })}
                />
              </Field>
              <Field label="Bottoms">
                <IconGrid
                  label="Bottoms"
                  options={PANTS}
                  value={character.pants}
                  onPick={(pants) => saveCharacter({ pants })}
                  renderIcon={(key) => (
                    <PantsIcon
                      character={
                        key === character.pants
                          ? shown
                          : { ...shown, trouser: DEFAULT_CHARACTER.trouser }
                      }
                      pants={key}
                    />
                  )}
                  swatchesFor={() => TROUSER_COLORS}
                  swatchValue={character.trouser}
                  onSwatch={(hex) => saveCharacter({ trouser: hex })}
                />
              </Field>
              <Field label="Shoes">
                <IconGrid
                  label="Shoes"
                  options={SHOES}
                  value={character.shoes}
                  onPick={(shoes) => saveCharacter({ shoes })}
                  renderIcon={(key) => (
                    <ShoesIcon
                      character={
                        key === character.shoes
                          ? shown
                          : { ...shown, shoeColor: DEFAULT_CHARACTER.shoeColor }
                      }
                      shoes={key}
                    />
                  )}
                  swatchesFor={() => SHOE_COLORS}
                  swatchValue={character.shoeColor}
                  onSwatch={(hex) => saveCharacter({ shoeColor: hex })}
                />
              </Field>
            </>
          )}

          {tab === "extras" && (
            <>
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
                      eyeX={character.eyeX}
                      eyeY={character.eyeY}
                      eyeColor={character.eyeColor}
                    />
                  )}
                />
              </Field>
              <Field label="Scarf">
                <IconGrid
                  label="Scarf"
                  options={SCARVES}
                  value={character.scarf}
                  onPick={(scarf) => saveCharacter({ scarf })}
                  renderIcon={(key) => (
                    <ScarfIcon
                      character={
                        key === character.scarf
                          ? character
                          : { ...character, scarfColor: DEFAULT_CHARACTER.scarfColor }
                      }
                      scarf={key}
                    />
                  )}
                  swatchesFor={(key) => (key === "none" ? null : SCARF_COLORS)}
                  swatchValue={character.scarfColor}
                  onSwatch={(hex) => saveCharacter({ scarfColor: hex })}
                />
              </Field>
              {/* No swatches on purpose: frames are a fixed neutral, the
                  shoe-sole argument — see GLASSES in lib/profile.js. */}
              <Field label="Glasses">
                <IconGrid
                  label="Glasses"
                  options={GLASSES}
                  value={character.glasses}
                  onPick={(glasses) => saveCharacter({ glasses })}
                  renderIcon={(key) => (
                    <GlassesIcon
                      glasses={key}
                      hair={character.hair}
                      hairColor={character.hairColor}
                      skin={character.skin}
                      eyeX={character.eyeX}
                      eyeY={character.eyeY}
                      eyeColor={character.eyeColor}
                    />
                  )}
                />
              </Field>
            </>
          )}
        </div>
      </section>

      <hr className="border-white/10" />

      <ProfilePetsSection
        isoRoom={isoRoom}
        setPetIdentity={setPetIdentity}
        addIsoItem={addIsoItem}
        removeIsoItem={removeIsoItem}
      />

      <hr className="border-white/10" />

      <Field label="Who can visit">
        <Choices
          label="Who can visit your room"
          options={VISIT_ACCESS}
          value={user?.visitAccess || "friends"}
          onPick={(value) => setVisitAccess(value)}
        />
        <p className="mt-1 text-xs text-petal/50">
          {VISIT_ACCESS.find((v) => v.key === (user?.visitAccess || "friends"))?.hint}
          . Open means friends and simulated neighbours, not unrestricted public
          access. Any drop-in can be asked to leave from the visitor chip.
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
