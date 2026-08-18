import { useEffect, useRef, useState } from "react";
import { ChevronDown, PawPrint, RefreshCw, Shirt, UserRound } from "lucide-react";
import { useStore } from "../store";
import { ISO_ITEMS, PET_NAME_MAX, PET_TEMPERS } from "../lib/isoRoom";
import { ISO_SPRITES } from "./IsoItems";
import { HairBehind, HairFront, HairLength } from "./character/hair";
import { Hat } from "./character/hats";
import {
  BIO_MAX,
  COATS,
  DEFAULT_CHARACTER,
  EXPRESSIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  OUTFITS,
  PANTS,
  PATTERNS,
  SHOES,
  SHOE_COLORS,
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

/**
 * The dressing-room stage: drag sideways to SPIN the figure (a four-step
 * turntable — front, mirrored side-read, back, mirrored back; with two real
 * drawings plus their mirrors, quarter turns are the honest rotation), and
 * scroll to zoom. The frame stays FIXED per zoom level — it never refits to
 * the figure, because auto-fit is what once zoomed every slider change away.
 */
function CharacterStage({ character, angle, onSpin }) {
  const Resident = ISO_SPRITES.resident;
  const [zoom, setZoom] = useState(1.35);
  // The camera can MOVE now, not just zoom: dragging the empty stage pans
  // the view (the iso room's own grammar — drag-on-empty-space pans), while
  // dragging the FIGURE spins it. Double-click brings the camera home.
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
  const q = ((Math.round(angle / 90) % 4) + 4) % 4;
  // Three real drawings plus one mirror: front, the PROFILE, back, and the
  // profile mirrored — an honest turntable now that a side view exists.
  const facing = q === 0 ? "front" : q === 2 ? "back" : "side";
  const mirrored = q === 3;
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
      aria-label="Preview of your character — drag the figure to spin, drag the floor to move, scroll to zoom"
      onPointerDown={(e) => {
        // Hit-testing decides the gesture: the figure spins, everything
        // else pans.
        const spin = !!e.target.closest?.("[data-figure]");
        dragRef.current = {
          x: e.clientX,
          y: e.clientY,
          a: angle,
          px: pan.x,
          py: pan.y,
          spin,
        };
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!d) return;
        if (d.spin) {
          onSpin(d.a + (e.clientX - d.x) * 1.1);
        } else {
          // Pointer pixels → viewBox units, so the scene sticks to the
          // cursor at every zoom. Clamped so the figure can't be lost.
          const rect = svgRef.current?.getBoundingClientRect();
          const k = rect ? w / rect.width : 0.15;
          setPan({
            x: Math.max(-26, Math.min(26, d.px - (e.clientX - d.x) * k)),
            y: Math.max(-58, Math.min(58, d.py - (e.clientY - d.y) * k)),
          });
        }
      }}
      onPointerUp={() => {
        const wasSpin = dragRef.current?.spin;
        dragRef.current = null;
        // Settle on a clean quarter — a figure left mid-twist looks stuck.
        if (wasSpin) onSpin((a) => Math.round(a / 90) * 90);
      }}
      onPointerCancel={() => {
        const wasSpin = dragRef.current?.spin;
        dragRef.current = null;
        if (wasSpin) onSpin((a) => Math.round(a / 90) * 90);
      }}
      onDoubleClick={() => {
        setPan({ x: 0, y: 0 });
        setZoom(1.35);
      }}
    >
      {/* The figure draws 9.6px below the origin (project(0.4,0.4)), so the
          shadow belongs under the FEET at ~y12, not at the origin where it
          floated at shin height. */}
      <ellipse cx="0" cy="12" rx="15" ry="2.5" fill="#000" opacity="0.18" />
      <g transform={mirrored ? "scale(-1,1)" : undefined} data-figure>
        <Resident character={character} facing={facing} />
      </g>
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
    <svg viewBox="-15 -14 30 38" className="h-12 w-full" aria-hidden="true">
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
    <svg viewBox="-15 -16 30 32" className="h-12 w-full" aria-hidden="true">
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

/** A top worn by YOUR body — the torso close-up, coatless so the top shows. */
function GarmentIcon({ character, garment }) {
  const Resident = ISO_SPRITES.resident;
  return (
    <svg viewBox="-18 -50 36 34" className="h-12 w-full" aria-hidden="true">
      <Resident character={{ ...character, garment, coat: "none" }} />
    </svg>
  );
}

/** A coat over your CURRENT top — what layering actually looks like. */
function CoatIcon({ character, coat }) {
  const Resident = ISO_SPRITES.resident;
  return (
    <svg viewBox="-18 -50 36 34" className="h-12 w-full" aria-hidden="true">
      <Resident character={{ ...character, coat }} />
    </svg>
  );
}

/** A bottom on your own legs — the lower-half close-up. */
function PantsIcon({ character, pants }) {
  const Resident = ISO_SPRITES.resident;
  return (
    <svg viewBox="-16 -34 32 40" className="h-12 w-full" aria-hidden="true">
      <Resident character={{ ...character, pants }} />
    </svg>
  );
}

/** A pair of shoes on your own feet — ankles down. */
function ShoesIcon({ character, shoes }) {
  const Resident = ISO_SPRITES.resident;
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
          <Swatches
            label={`${label} colour`}
            options={swatches}
            value={swatchValue}
            onPick={onSwatch}
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

/**
 * Your PETS — who lives here beyond you (owner request, 2026-08-18): every
 * cat or dog placed in the room gets a NAME and a TEMPER. Identity lives on
 * the placement itself (a pet IS a placement), so two cats are two rows and
 * removing one takes its name with it. The temper reaches the wander engine
 * (lib/isoRoom.js `PET_TEMPERS`): a curious pet ranges the whole room and
 * won't settle on a rug; a sleepy one barely leaves its spot. The name shows
 * when you pick the pet up in the room.
 */
function PetsSection({ isoRoom, setPetIdentity }) {
  const pets = (isoRoom?.placements || []).filter((p) => ISO_ITEMS[p.item]?.roamer);
  return (
    <section>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-cream">
        <PawPrint size={15} className="text-petal/70" /> Your pets
      </p>
      {pets.length === 0 ? (
        <p className="text-xs text-petal/50">
          No pets yet — adopt one from the Room panel&apos;s Living things shelf,
          then name it here.
        </p>
      ) : (
        <div className="space-y-2">
          {pets.map((p) => {
            const Sprite = ISO_SPRITES[p.item];
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2"
              >
                <svg
                  viewBox="-9 -26 32 40"
                  className="h-14 w-12 shrink-0"
                  aria-hidden="true"
                  style={p.tint ? { "--tint": p.tint } : undefined}
                >
                  <Sprite awake facing="front" />
                </svg>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Save on BLUR, not per keystroke — every write saves the
                      room. Keyed on the stored name so an outside change
                      (validation trimming it) refreshes the field. */}
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
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-cream placeholder:text-petal/40 focus:border-glow/60 focus:outline-none"
                  />
                  <Choices
                    label="Temper"
                    options={PET_TEMPERS}
                    value={p.temper || "mellow"}
                    onPick={(temper) => setPetIdentity(p.id, { temper })}
                  />
                </div>
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
    isoRoom,
    setPetIdentity,
  } = useStore();
  const summary = profileSummary(profile);
  const [tab, setTab] = useState("hair");
  // The stage's turntable angle — dragging the figure spins it, the button
  // advances a quarter turn.
  const [spin, setSpin] = useState(0);

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
            <CharacterStage character={shown} angle={spin} onSpin={setSpin} />
            <button
              type="button"
              onClick={() => setSpin((a) => Math.round(a / 90) * 90 + 90)}
              title="Turn around"
              aria-label="Turn the character a quarter turn"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-petal/80 transition hover:bg-white/20"
            >
              <RefreshCw size={13} />
            </button>
            <span className="pointer-events-none absolute bottom-1.5 right-2.5 text-[10px] text-petal/40">
              drag me to spin · drag the floor to move · scroll to zoom
            </span>
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

      <PetsSection isoRoom={isoRoom} setPetIdentity={setPetIdentity} />

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
