import { useId } from "react";
import { project } from "../lib/iso";
import { petAppearance } from "../lib/pets";
import { VolumeDefs, sphereFill } from "./character/volume";

// Palettes remain catalog-specific; only the classic coat accepts --tint.
const CAT_COATS = {
  ginger: { fur: "#d0834a", mark: "#9e5c2b", chest: "#f4e8d8", stripes: true },
  greytabby: { fur: "#8d8a99", mark: "#57545f", chest: "#e9e6ef", stripes: true },
  tuxedo: { fur: "#332b3e", chest: "#f7f2ea", socks: true },
  calico: { fur: "#f2e9dd", patchA: "#d0834a", patchB: "#3a3142" },
  siamese: { fur: "#e8ddc9", point: "#5b4632", eye: "#8fc3e8" },
  tortie: { fur: "#3b3037", patchA: "#c27b3f", patchB: "#7a4a28" },
};
const DOG_BREEDS = {
  shiba: { fur: "#d97f4e", chest: "#f6ead8", ears: "point", tail: "curl", brows: true, socks: true },
  corgi: { fur: "#dd9b58", chest: "#f7f2ea", ears: "big", tail: "nub", blaze: true, socks: true, short: true },
  dalmatian: { fur: "#f2eee7", ears: "folded", ear: "#312a3b", tail: "thin", spots: "#312a3b" },
  husky: { fur: "#8d90a0", chest: "#f4f2f5", ears: "point", tail: "curl", blaze: true, brows: true, socks: true },
};
const RABBIT_COATS = { snow: { fur: "#f7f2ea" }, cocoa: { fur: "#a9805d", chest: "#e9dcc9" } };
const CLASSIC = {
  cat: { fur: "var(--tint, #4b3e50)", eye: "#ead5a2" },
  dog: { fur: "var(--tint, #c98a4b)", chest: "#f2e7dc", ears: "folded", tail: "plume" },
  bunny: { fur: "var(--tint, #d9d2e4)" },
};

function paletteFor(species, look) {
  return ({ cat: CAT_COATS, dog: DOG_BREEDS, bunny: RABBIT_COATS }[species])[look] || CLASSIC[species];
}

/** One connected mass and one volume ramp. Coat marks clip to its outline,
 * so patches cannot become extra bumps in the animal's silhouette. */
function FurMass({ d, coat, vol, cx = 0, cy = -10, width = 9, view = "front" }) {
  const clip = `fur-${useId().replace(/:/g, "")}`;
  return <g data-pet-body={view}>
    <defs><clipPath id={clip}><path d={d} /></clipPath></defs>
    <path d={d} fill={coat.fur} />
    <g clipPath={`url(#${clip})`}>
      {coat.chest && view !== "back" && (view === "front"
        ? <path d={`M${cx - 3} ${cy - 2} Q${cx} ${cy - 4} ${cx + 3} ${cy - 2}
          L${cx + 2} ${cy + 3} Q${cx} ${cy + 6} ${cx - 2} ${cy + 3} Z`} fill={coat.chest} opacity=".9" />
        : <ellipse cx={view === "side" ? cx - width * .65 : cx} cy={cy + 3}
          rx={width * (view === "side" ? .28 : .5)} ry="7" fill={coat.chest} opacity=".9" />)}
      {coat.stripes && <g stroke={coat.mark} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".85">
        {[-.5, 0, .5].map(t => <path key={t} d={`M${cx + width * t} ${cy - 7} q2 3 0 6`} />)}
      </g>}
      {coat.patchA && <>
        <ellipse cx={cx - width * .4} cy={cy - 3} rx={width * .48} ry="5" fill={coat.patchA} />
        <ellipse cx={cx + width * .6} cy={cy + 2} rx={width * .35} ry="4.5" fill={coat.patchB} />
      </>}
      {coat.spots && <g fill={coat.spots}>
        <ellipse cx={cx - width * .5} cy={cy - 3} rx="2.6" ry="2.1" />
        <ellipse cx={cx + width * .45} cy={cy + 1} rx="2.1" ry="2.7" />
        <ellipse cx={cx + width * .1} cy={cy - 5} rx="1.7" ry="1.4" />
      </g>}
      <path d={d} fill={vol} opacity=".65" />
    </g>
  </g>;
}

function Eyes({ side, asleep, color = "#302737", slit = false }) {
  return <g data-pet-eyes={asleep ? "closed" : "open"}>
    {(side ? [-3] : [-2.7, 2.7]).map(x => asleep
      ? <path key={x} d={`M${x - 1} -.7 q1 1 2 0`} fill="none" stroke={color} strokeWidth=".9" strokeLinecap="round" />
      : <g key={x}>
        <ellipse cx={x} cy="-1" rx={slit ? .95 : .72} ry=".95" fill={color} />
        {slit && <path d={`M${x} -1.65 v1.3`} stroke="#2d2633" strokeWidth=".48" strokeLinecap="round" />}
      </g>)}
  </g>;
}

function CatHead({ coat, vol, view, asleep }) {
  const side = view === "side", rear = view === "back";
  return <g>
    <path d={side ? "M-5 -5 Q-1 -9 4 -5 Q8 -2 5 3 Q1 7 -5 4 L-8 1 Q-6 -1 -5 -5 Z"
      : "M-6 -4 Q-3 -8 3 -7 Q8 -5 7 1 Q7 6 0 7 Q-7 6 -7 1 Z"} fill={coat.fur} />
    {coat.patchA && <path d="M-6 -4 Q-3 -8 0 -7 L0 -2 Q-4 0 -6 -4" fill={coat.patchA} />}
    <g fill={coat.point || coat.patchA || coat.fur}>
      <path d={side ? "M-5 -3 L-4 -11 Q-1 -10 1 -5 Z" : "M-6 -3 L-6 -11 Q-2 -10 -1 -5 Z"} />
      <g className={asleep ? undefined : "ear-twitch"}>
        <path d={side ? "M0 -5 L4 -10 Q6 -7 6 -2 Z" : "M1 -5 Q4 -11 6 -11 L7 -2 Z"}
          fill={coat.point || coat.patchB || coat.fur} />
      </g>
    </g>
    {!rear && <>
      <path d="M-5 -5 L-5 -8 L-2 -5 M3 -5 L5 -8 L5.5 -4" stroke="#dca3a1" strokeWidth=".9" fill="none" opacity=".65" />
      {coat.point && <ellipse cx={side ? -4 : 0} cy="2" rx="4" ry="3.5" fill={coat.point} />}
      {!coat.point && <ellipse cx={side ? -4.5 : 0} cy="3" rx={side ? 3.5 : 4.5} ry="2.7"
        fill={coat.chest || "#f5e2d3"} opacity={coat.chest ? .95 : .16} />}
      {coat.stripes && <path d="M-2 -4 l1 1 l1 -1 l1 1 l1 -1" fill="none" stroke={coat.mark} strokeWidth=".8" />}
      <Eyes side={side} asleep={asleep} color={coat.eye || "#ead5a2"} slit />
      <path d={side ? "M-8 1 l2 -.2 l-.5 1.5 Z" : "M-1 2 h2 l-1 1.2 Z"} fill="#cb9194" />
      <path d={side ? "M-6 3 l-5 -.5 M-6 4 l-5 1" : "M-3 3 l-6 -.7 M3 3 l6 -.7"}
        fill="none" stroke="#f5e4d9" strokeWidth=".55" opacity=".55" strokeLinecap="round" />
    </>}
    <path d={side ? "M-5 -5 Q-1 -9 4 -5 Q8 -2 5 3 Q1 7 -5 4 L-8 1 Q-6 -1 -5 -5 Z"
      : "M-6 -4 Q-3 -8 3 -7 Q8 -5 7 1 Q7 6 0 7 Q-7 6 -7 1 Z"} fill={vol} />
  </g>;
}

function DogHead({ coat, vol, view, asleep }) {
  const side = view === "side", rear = view === "back";
  const ear = coat.ear || coat.fur;
  const point = coat.ears === "point", big = coat.ears === "big";
  return <g>
    <ellipse cy="-.5" rx="7" ry="6.5" fill={coat.fur} />
    {coat.spots && <ellipse cx="2" cy="-4" rx="2.4" ry="1.8" fill={coat.spots} />}
    {point || big ? <g fill={ear}>
      <path d={big ? "M-6 -2 Q-10 -14 -5 -13 Q-2 -12 -1 -5 Z" : "M-6 -2 L-5 -11 L0 -5 Z"} />
      <g className={asleep ? undefined : "ear-twitch"}>
        <path d={big ? "M1 -5 Q2 -14 6 -13 Q10 -12 7 -1 Z" : "M1 -5 L6 -11 L7 -1 Z"} />
      </g>
      {!rear && <path d="M-5 -4 L-5 -8 L-2.5 -5 M3 -5 L5 -8 L5.5 -4"
        fill="none" stroke={coat.chest || "#ddbaab"} strokeWidth="1.3" />}
    </g> : <>
      <path d="M-4 -5 Q-10 -8 -9 -1 Q-8 5 -5 4 L-3 -2 Z" fill={ear} />
      <g className={asleep ? undefined : "ear-twitch-hanging"}>
        <path d="M4 -5 Q9 -7 9 -1 Q9 5 6 4 L3 -2 Z" fill={ear} />
        <path d="M7 -4 Q10 1 7 4" fill="none" stroke="#352d35" strokeWidth="1" opacity=".18" />
      </g>
    </>}
    {!rear && <>
      {coat.blaze && <path d="M-1.5 -6 L1 -6 L2 4 L-2 4 Z" fill={coat.chest} />}
      {coat.brows && <path d="M-3.7 -3.2 l1.8 -.2 M2 -3.4 l1.8 .2" stroke={coat.chest} strokeWidth="1.3" strokeLinecap="round" />}
      <ellipse cx={side ? -5.5 : 0} cy="2.7" rx={side ? 5 : 4.5} ry="3" fill={coat.chest || "#eee5d8"} />
      <Eyes side={side} asleep={asleep} />
      <ellipse cx={side ? -9 : 0} cy="1.7" rx={side ? 1.5 : 1.3} ry="1" fill="#352c37" />
      <path d={side ? "M-8 3.4 q2 1 3 0" : "M0 2.8 v1.4"} stroke="#62504d" strokeWidth=".6" fill="none" />
    </>}
    <ellipse cy="-.5" rx="7" ry="6.5" fill={vol} />
  </g>;
}

function RabbitHead({ coat, vol, view, asleep }) {
  const side = view === "side", rear = view === "back";
  const outline = side ? "M-4 -5 Q1 -8 5 -3 Q8 3 2 5 Q-6 7 -8 2 Q-9 -1 -4 -5 Z"
    : "M-6 -3 Q-3 -8 3 -6 Q8 -3 6 3 Q3 7 -3 5 Q-8 3 -6 -3 Z";
  return <g>
    {/* Ears share this entire head's stage transform and meet the skull. */}
    <path d={asleep ? "M-3 -2 Q2 -12 10 -8 Q13 -5 1 1 Z" : "M-5 -2 Q-10 -19 -6 -20 Q-2 -20 -1 -3 Z"} fill={coat.fur} />
    <g className={asleep ? undefined : "ear-twitch"}>
      <path d={asleep ? "M1 -2 Q7 -12 13 -8 Q15 -5 3 2 Z" : "M1 -3 Q2 -21 6 -20 Q10 -19 5 -1 Z"} fill={coat.fur} />
      {!rear && <path d={asleep ? "M3 -2 Q9 -8 11 -7" : "M3 -5 Q4 -16 6 -17"}
        stroke="#d6a2a4" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7" />}
    </g>
    {!rear && !asleep && <path d="M-3 -5 Q-7 -16 -6 -17" stroke="#d6a2a4" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".5" />}
    <path d={outline} fill={coat.fur} />
    {!rear && <>
      <Eyes side={side} asleep={asleep} />
      <ellipse cx={side ? -7 : 0} cy="2.1" rx="1" ry=".7" fill="#c58b94" />
      <path d={side ? "M-7 3.2 l-4 .5" : "M-3 3 l-4 .5 M3 3 l4 .5"} stroke="#8b7b88" strokeWidth=".5" opacity=".5" />
    </>}
    <path d={outline} fill={vol} />
  </g>;
}

const HEADS = { cat: CatHead, dog: DogHead, bunny: RabbitHead };
function Head({ species, coat, vol, x = 0, y, scale, view, asleep }) {
  const Shape = HEADS[species];
  return <g data-pet-head={view} transform={`translate(${x},${y}) scale(${scale})`}>
    <Shape coat={coat} vol={vol} view={view} asleep={asleep} />
  </g>;
}

function Tail({ species, coat, pose }) {
  if (species === "bunny") return null;
  const d = species === "cat"
    ? { side: "M12 -12 Q23 -12 21 -26", front: "M5 -7 Q17 -10 12 -24",
      back: "M0 -4 Q17 -3 12 -22", rest: "M11 -4 Q23 -3 21 -13 Q17 -19 11 -14", held: "M5 -7 Q11 1 5 6" }[pose]
    : coat.tail === "curl" ? "M9 -10 C20 -9 19 -23 12 -20 C7 -18 12 -13 15 -16"
      : coat.tail === "nub" ? "M10 -10 q5 -2 5 -6"
        : { side: "M12 -11 Q23 -11 22 -22", front: "M5 -7 Q17 -10 13 -22",
          back: "M2 -5 Q17 -7 13 -21", rest: "M11 -4 Q24 -1 23 -11", held: "M5 -8 Q12 1 7 5" }[pose];
  return <g className={pose === "rest" ? "tail-flick" : pose === "held" ? undefined : "tail-sway"}>
    <path d={d} fill="none" stroke={coat.point || coat.fur} strokeWidth={species === "cat" || coat.tail === "thin" ? 3.5 : 4.6} strokeLinecap="round" />
    {coat.stripes && <path d={d} fill="none" stroke={coat.mark} strokeWidth="3.5" strokeDasharray="2 3" />}
  </g>;
}

function Paw({ x, top, length, coat, far, moving, beat = "a" }) {
  return <g className={moving ? `leg-trot-${beat}` : undefined} data-pet-paw="true">
    <path d={`M${x - 2} ${top} Q${x - 3} ${top + length * .4} ${x - 2} ${top + length}
      Q${x + 1} ${top + length + 1.5} ${x + 3} ${top + length} L${x + 2} ${top} Z`}
      fill={coat.point || coat.fur} />
    {coat.socks && <path d={`M${x - 2} ${top + length - 2} h4 l1 2 q-2 1.5 -5 0 Z`} fill={coat.chest} />}
    {far && <path d={`M${x - 2} ${top} h4 v${length} h-4 Z`} fill="#302838" opacity=".2" />}
  </g>;
}

function Quadruped({ species, coat, vol, appearance, awake, moving, facing, held }) {
  const cat = species === "cat";
  const shape = `scale(${appearance.bodyWidth},${appearance.bodyHeight})`;
  if (held) return <g className="held-dangle" style={{ transformBox: "fill-box", transformOrigin: "center top" }}>
    <Tail species={species} coat={coat} pose="held" />
    <Paw x={-3.5} top={-5} length={8} coat={coat} />
    <Paw x={3} top={-5} length={8} coat={coat} />
    <g transform={shape}><FurMass d="M-6 -21 Q-10 -17 -8 -8 Q-6 0 0 -1 Q8 0 8 -10 Q10 -18 5 -21 Z" coat={coat} vol={vol} cy={-12} view="held" /></g>
    <Paw x={-6} top={-19} length={7} coat={coat} />
    <Paw x={6} top={-19} length={7} coat={coat} />
    <Head species={species} coat={coat} vol={vol} y={-25} scale={appearance.head} view="front" />
  </g>;
  if (!awake) return <>
    <Tail species={species} coat={coat} pose="rest" />
    <g className="cat-breathe">
      <g transform={shape}><FurMass d="M-16 -3 Q-19 -10 -10 -14 Q-2 -19 9 -14 Q19 -11 18 -4 Q15 2 0 2 Q-11 3 -16 -3 Z"
        coat={coat} vol={vol} width={16} cy={-7} view="rest" /></g>
      <ellipse cx="-8" cy="0" rx="5" ry="2.1" fill={coat.socks ? coat.chest : coat.fur} />
      <Head species={species} coat={coat} vol={vol} x={-11} y={-9} scale={appearance.head} view="side" asleep />
    </g>
  </>;
  const side = facing === "side";
  const rear = facing === "back";
  if (side) {
    const leg = coat.short ? 5.5 : cat ? 9 : 8;
    const length = coat.short ? 17 : 14;
    return <>
      <Paw x={-8.5} top={-leg} length={leg} coat={coat} far moving={moving} beat="b" />
      <Paw x={8} top={-leg} length={leg} coat={coat} far moving={moving} />
      <Tail species={species} coat={coat} pose="side" />
      <g className={moving ? "pet-step-bob" : undefined} data-pet-torso="true">
        <g transform={`translate(0,${-leg})`}>
          <g transform={shape}><FurMass d={`M-${length} -3 Q-${length} -11 -4 -12 Q8 -15 ${length + 1} -9 Q${length + 6} -2 ${length} 2 Q5 6 -7 4 Q-12 4 -${length} -3 Z`}
            coat={coat} vol={vol} cy={-4} width={length} view="side" /></g>
        </g>
        <Head species={species} coat={coat} vol={vol} x={-12} y={-leg - 12} scale={appearance.head} view="side" />
      </g>
      <Paw x={-7} top={-leg} length={leg} coat={coat} moving={moving} />
      <Paw x={10} top={-leg} length={leg} coat={coat} moving={moving} beat="b" />
    </>;
  }
  return <>
    {!rear && <Tail species={species} coat={coat} pose="front" />}
    <g className={moving ? "pet-step-bob" : undefined} data-pet-torso="true">
      <g transform={shape}><FurMass d={coat.short
        ? "M-8 -13.5 Q-13 -9 -11 -5 Q-10 -2 0 -2 Q10 -2 11 -5 Q13 -9 7 -13.5 Z"
        : "M-7 -17 Q-12 -12 -10 -6 Q-9 -2 0 -2 Q9 -2 10 -6 Q12 -12 6 -17 Z"}
        coat={coat} vol={vol} cy={coat.short ? -8 : -10} view={rear ? "back" : "front"} /></g>
      {rear && <Tail species={species} coat={coat} pose="back" />}
      <Head species={species} coat={coat} vol={vol} y={coat.short ? -18 : cat ? -22 : -21.5} scale={appearance.head} view={rear ? "back" : "front"} />
    </g>
    <Paw x={-4} top={coat.short ? -5.5 : -9} length={coat.short ? 5.5 : 9} coat={coat} moving={moving} />
    <Paw x={4} top={coat.short ? -5.5 : -9} length={coat.short ? 5.5 : 9} coat={coat} moving={moving} beat="b" />
  </>;
}

function Rabbit({ coat, vol, appearance, awake, moving, facing, held }) {
  const view = held ? "front" : facing;
  const rear = view === "back", side = view === "side";
  const shape = `scale(${appearance.bodyWidth},${appearance.bodyHeight})`;
  if (!awake && !held) return <g className="cat-breathe">
    <g transform={shape}><FurMass d="M-12 -2 Q-15 -9 -5 -13 Q7 -15 13 -7 Q17 2 1 2 Q-8 3 -12 -2 Z" coat={coat} vol={vol} cy={-5} view="rest" width={12} /></g>
    <circle cx="12" cy="-3" r="3" fill="#eee6de" />
    <Head species="bunny" coat={coat} vol={vol} x={-8} y={-7} scale={appearance.head} view="side" asleep />
  </g>;
  const body = <>
    {side && <circle cx="9" cy="-4" r="3" fill="#eee6de" />}
    <g className={!held && moving ? "pet-step-bob" : undefined} data-pet-torso="true">
    <g transform={shape}><FurMass d={side ? "M-6 -14 Q6 -17 10 -9 Q15 1 1 2 Q-10 3 -10 -4 Q-10 -10 -6 -14 Z"
      : "M-5 -16 Q-11 -10 -9 -3 Q-8 2 0 2 Q9 2 10 -4 Q11 -11 5 -16 Z"}
      coat={coat} vol={vol} cy={-7} view={view} /></g>
    {rear && <circle cy="-3" r="3.5" fill="#eee6de" />}
    <Head species="bunny" coat={coat} vol={vol} x={side ? -5 : 0} y={held ? -19 : -15} scale={appearance.head} view={view} />
    {held && <>
      <ellipse cx="-5" cy="-10" rx="2.4" ry="4" fill={coat.fur} />
      <ellipse cx="5" cy="-10" rx="2.4" ry="4" fill={coat.fur} />
    </>}
    </g>
    <g data-pet-paw="true"><ellipse cx={side ? -4 : -4.5} cy="0" rx="4" ry="2" fill={coat.fur} /></g>
    <g data-pet-paw="true"><ellipse cx={side ? 5 : 4.5} cy="0" rx="4" ry="2" fill={coat.fur} /></g>
  </>;
  return held ? <g className="held-dangle" style={{ transformBox: "fill-box", transformOrigin: "center top" }}>{body}</g>
    : <g>{body}</g>;
}

function petSprite(species, gx, gy, baseScale) {
  return function Pet({ pet, now, awake = false, moving = false, facing = "side", held = false, look }) {
    const appearance = petAppearance(pet, now);
    const anchor = project(gx, gy);
    const id = useId();
    const props = { species, coat: paletteFor(species, look), vol: sphereFill(id), appearance, awake, moving, facing, held };
    return <g data-pet-stage={appearance.stage} data-pet-form={appearance.form}
      transform={`translate(${anchor.x},${anchor.y}) scale(${appearance.scale * baseScale})`}>
      <VolumeDefs id={id} />
      {species === "bunny" ? <Rabbit {...props} /> : <Quadruped {...props} />}
    </g>;
  };
}

export const Cat = petSprite("cat", .6, .4, .85);
export const Dog = petSprite("dog", .55, .35, .9);
export const Bunny = petSprite("bunny", .35, .3, 1);
export const PET_SPRITES = { cat: Cat, dog: Dog, bunny: Bunny };
