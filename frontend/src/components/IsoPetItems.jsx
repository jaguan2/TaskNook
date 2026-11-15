import { useId } from "react";
import { project } from "../lib/iso";
import { PET_DISPLAY_SCALE, petAppearance } from "../lib/pets";
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
function FurMass({ d, coat, vol, cx = 0, cy = -10, width = 9, view = "front", chestPath }) {
  const clip = `fur-${useId().replace(/:/g, "")}`;
  return <g data-pet-body={view}>
    <defs><clipPath id={clip}><path d={d} /></clipPath></defs>
    <path data-pet-silhouette="body" d={d} fill={coat.fur} />
    <g clipPath={`url(#${clip})`}>
      {coat.chest && view !== "back" && <path data-pet-mark="chest"
        d={chestPath || `M${cx - 3} ${cy - 2} Q${cx} ${cy - 4} ${cx + 3} ${cy - 2}
          L${cx + 2} ${cy + 3} Q${cx} ${cy + 6} ${cx - 2} ${cy + 3} Z`}
        fill={coat.chest} opacity=".9" />}
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
  const outline = side ? "M-5 -4 Q-3 -7 1 -6 Q6 -6 6 -1 Q6 4 1 5 L-4 4 Q-7 4 -8 1 L-6 0 Q-7 -2 -5 -4 Z"
    : "M-6 -4 Q-3 -8 3 -7 Q8 -5 7 1 Q7 6 0 7 Q-7 6 -7 1 Z";
  return <g>
    <path data-pet-skull="true" d={outline} fill={coat.fur} />
    {coat.patchA && <path d="M-6 -4 Q-3 -8 0 -7 L0 -2 Q-4 0 -6 -4" fill={coat.patchA} />}
    <g fill={coat.point || coat.patchA || coat.fur}>
      <path d={side ? "M-5 -3 L-4 -10 Q-1 -9 0 -5 Z" : "M-6 -3 L-6 -11 Q-2 -10 -1 -5 Z"} />
      <g className={asleep ? undefined : "ear-twitch"}>
        <path d={side ? "M0 -5 L3 -9 Q5 -7 5 -2 Z" : "M1 -5 Q4 -11 6 -11 L7 -2 Z"}
          fill={coat.point || coat.patchB || coat.fur} />
      </g>
    </g>
    {!rear && <>
      <path d={side ? "M-3.8 -4.8 L-3.5 -7.6 L-1.5 -5 M2 -5 L3 -7 L3.7 -4"
        : "M-5 -5 L-5 -8 L-2 -5 M3 -5 L5 -8 L5.5 -4"} stroke="#dca3a1" strokeWidth=".9" fill="none" opacity=".65" />
      {coat.point && <ellipse cx={side ? -4 : 0} cy="2" rx="4" ry="3.5" fill={coat.point} />}
      {!coat.point && (side ? <path d="M-6.5 .6 Q-3 -.3 -2 2 Q-2 4 -5 3.4 L-7 2.3 Z"
        fill={coat.chest || "#f5e2d3"} opacity={coat.chest ? .95 : .16} />
        : <ellipse cy="3" rx="4.5" ry="2.7" fill={coat.chest || "#f5e2d3"} opacity={coat.chest ? .95 : .16} />)}
      {coat.stripes && <path d="M-2 -4 l1 1 l1 -1 l1 1 l1 -1" fill="none" stroke={coat.mark} strokeWidth=".8" />}
      <Eyes side={side} asleep={asleep} color={coat.eye || "#ead5a2"} slit />
      <path d={side ? "M-8 1 l2 -.2 l-.5 1.5 Z" : "M-1 2 h2 l-1 1.2 Z"} fill="#cb9194" />
      <path d={side ? "M-6 3 l-5 -.5 M-6 4 l-5 1" : "M-3 3 l-6 -.7 M3 3 l6 -.7"}
        fill="none" stroke="#f5e4d9" strokeWidth=".55" opacity=".55" strokeLinecap="round" />
    </>}
    <path d={outline} fill={vol} />
  </g>;
}

function DogHead({ coat, vol, view, asleep }) {
  const side = view === "side", rear = view === "back";
  const ear = coat.ear || coat.fur;
  const point = coat.ears === "point", big = coat.ears === "big";
  if (side) {
    const outline = "M-4 -5 Q0 -8 4 -5 Q7 -3 6 1 Q5 5 -1 5 L-8 4 Q-11 3 -10 0 L-6 -1 Q-7 -3 -4 -5 Z";
    return <g>
      <path data-pet-skull="true" d={outline} fill={coat.fur} />
      {coat.spots && <ellipse cx="2" cy="-4" rx="2.4" ry="1.8" fill={coat.spots} />}
      {coat.blaze && <path d="M-4 -5 L-2 -5 L-3 2 L-7 2 Z" fill={coat.chest} />}
      <g className={asleep ? undefined : point || big ? "ear-twitch" : "ear-twitch-hanging"}>
        <path d={big ? "M-1 -4 Q-4 -13 0 -13 Q4 -12 4 -4 Z" : point
          ? "M-1 -4 L0 -11 Q4 -9 4 -3 Z" : "M0 -5 Q6 -8 6 -1 Q5 4 2 3 L-1 -2 Z"} fill={ear} />
        {(point || big) && <path d="M.3 -5 L.5 -8.5 L2.5 -5" fill="none" stroke={coat.chest || "#ddbaab"} strokeWidth="1" />}
      </g>
      <path d="M-7 -.5 Q-12 -1 -10 2.8 Q-8 5 -3 3.8 L-3 1 Q-5 1 -7 -.5 Z" fill={coat.chest || "#eee5d8"} />
      {coat.brows && <path d="M-4 -3.1 l1.8 -.3" stroke={coat.chest} strokeWidth="1.2" strokeLinecap="round" />}
      <Eyes side asleep={asleep} />
      <ellipse cx="-9.8" cy="1" rx="1.2" ry=".9" fill="#352c37" />
      <path d="M-8 3.2 q2 1 3 0" stroke="#62504d" strokeWidth=".6" fill="none" />
      <path d={outline} fill={vol} />
    </g>;
  }
  return <g>
    <ellipse data-pet-skull="true" cy="-.5" rx="7" ry="6.5" fill={coat.fur} />
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
    <path data-pet-skull="true" d={outline} fill={coat.fur} />
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

function tailPath(species, coat, pose) {
  if (pose === "rest") return coat.tail === "nub" ? "M13 -3 q4 -1 4 -3" : "M12 -3 C21 -3 24 1 18 .3 Q15 0 13 -.5";
  if (pose === "held") return "M5 -8 Q12 1 7 5";
  if (species === "cat") return {
    side: "M12 -13 C22 -13 18 -25 23 -25", front: "M5 -7 Q17 -10 12 -24", back: "M0 -4 Q17 -3 12 -22",
  }[pose];
  if (coat.tail === "nub") return {
    side: "M10 -10 q5 -2 5 -6", front: "M4 -6 q4 -1 4 -4", back: "M0 -5 q4 -1 4 -4",
  }[pose];
  if (coat.tail === "curl") return {
    side: "M9 -10 C20 -9 19 -23 12 -20 C7 -18 12 -13 15 -16",
    front: "M5 -7 C15 -7 17 -19 11 -19 C7 -19 9 -12 12 -14",
    back: "M1 -5 C13 -4 16 -17 10 -18 C6 -18 7 -10 11 -12",
  }[pose];
  return { side: "M12 -11 Q23 -11 22 -22", front: "M5 -7 Q17 -10 13 -22", back: "M2 -5 Q17 -7 13 -21" }[pose];
}

function Tail({ species, coat, pose }) {
  if (species === "bunny") return null;
  const d = tailPath(species, coat, pose);
  return <g data-pet-tail={pose} className={pose === "rest" ? "tail-flick" : pose === "held" ? undefined : "tail-sway"}
    style={pose === "rest" ? { transformOrigin: "left top" } : undefined}>
    <path d={d} fill="none" stroke={coat.point || coat.fur} strokeWidth={species === "cat" || coat.tail === "thin" ? 3.5 : 4.6} strokeLinecap="round" />
    {coat.stripes && <path d={d} fill="none" stroke={coat.mark} strokeWidth="3.5" strokeDasharray="2 3" />}
  </g>;
}

function Paw({ x, top, length, coat, far, moving, beat = "a", hind = false }) {
  return <g className={moving ? `leg-trot-${beat}` : undefined} data-pet-paw="true">
    <path data-pet-limb={hind ? "hind" : "fore"} d={hind
      ? `M${x - 2} ${top} Q${x + 5} ${top + 2} ${x + 2} ${top + length * .6}
        L${x + 2} ${top + length - 1} Q${x + 3} ${top + length + 1} ${x - 3} ${top + length}
        L${x - 3} ${top + length - 1} L${x - 1} ${top + length * .55} Z`
      : `M${x - 2} ${top} Q${x - 3} ${top + length * .4} ${x - 2} ${top + length}
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
    <g data-pet-paw="far"><ellipse cx="-7" cy="-.8" rx="3.8" ry="1.5" fill={coat.fur} /></g>
    {/* Only the ribcage breathes. Tucked paws and the resting head stay put. */}
    <g className="cat-breathe" data-pet-torso="true"><g transform={shape}>
      <FurMass d={cat
        ? "M-13 -3 Q-17 -9 -8 -12 Q1 -15 10 -11 Q17 -8 16 -2 Q15 1 6 1 L-9 1 Q-13 1 -13 -3 Z"
        : "M-14 -3 Q-17 -10 -7 -12 Q3 -14 12 -10 Q19 -6 16 -1 Q13 2 4 1 L-10 1 Q-14 1 -14 -3 Z"}
        coat={coat} vol={vol} width={15} cy={-6} view="rest"
        chestPath="M-13 -8 Q-9 -10 -7 -6 L-5 0 Q-9 2 -12 0 Z" />
      <path d="M8 -7 Q14 -6 12 -1" fill="none" stroke="#302838" strokeWidth=".7" opacity=".16" />
    </g></g>
    <g data-pet-paw="hind"><ellipse cx="8" cy=".1" rx="4.1" ry="1.4" fill={coat.point || coat.fur} /></g>
    <g data-pet-paw="fore"><ellipse cx="-11" cy=".1" rx="3.8" ry="1.4" fill={coat.socks ? coat.chest : coat.point || coat.fur} /></g>
    <Head species={species} coat={coat} vol={vol} x={-12} y={cat ? -6.7 : -6.4} scale={appearance.head} view="side" asleep />
  </>;
  const side = facing === "side";
  const rear = facing === "back";
  if (side) {
    const leg = coat.short ? 5.5 : cat ? 9 : 8;
    const length = coat.short ? 17 : 14;
    return <>
      <Paw x={-10} top={-leg - 3} length={leg + 2} coat={coat} far moving={moving} beat="b" />
      <Paw x={7.5} top={-leg - 3} length={leg + 2} coat={coat} far hind moving={moving} />
      <Tail species={species} coat={coat} pose="side" />
      <g className={moving ? "pet-step-bob" : undefined} data-pet-torso="true">
        <g transform={`translate(0,${-leg})`}>
          <g transform={shape}><FurMass d={`M-${length} -3 Q-${length} -11 -7 -12 Q3 -13 ${length - 2} -10 Q${length + 3} -6 ${length} 1 Q8 3 3 1 Q-4 0 -8 2 Q-13 3 -${length} -3 Z`}
            coat={coat} vol={vol} cy={-4} width={length} view="side"
            chestPath="M-13 -9 Q-9 -11 -7 -7 L-7 1 Q-11 2 -13 -2 Z" /></g>
        </g>
        <Head species={species} coat={coat} vol={vol} x={-12} y={-leg - 12} scale={appearance.head} view="side" />
      </g>
      <Paw x={-8} top={-leg - 3} length={leg + 3} coat={coat} moving={moving} />
      <Paw x={10} top={-leg - 3} length={leg + 3} coat={coat} hind moving={moving} beat="b" />
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
  if (!awake && !held) return <>
    <circle cx="11" cy="-3.8" r="2.4" fill="#eee6de" />
    <g className="cat-breathe" data-pet-torso="true"><g transform={shape}>
      <FurMass d="M-10 -2 Q-13 -8 -5 -11 Q4 -15 11 -8 Q15 -1 8 1 L-5 1 Q-10 1 -10 -2 Z"
        coat={coat} vol={vol} cy={-5} view="rest" width={12}
        chestPath="M-10 -7 Q-6 -9 -5 -5 L-3 0 L-9 0 Z" />
      <path d="M5 -7 Q11 -6 9 -1" fill="none" stroke="#302838" strokeWidth=".6" opacity=".16" />
    </g></g>
    <g data-pet-paw="hind"><ellipse cx="6" cy=".1" rx="4.5" ry="1.4" fill={coat.fur} /></g>
    <g data-pet-paw="fore"><ellipse cx="-8" cy=".1" rx="3" ry="1.2" fill={coat.fur} /></g>
    <Head species="bunny" coat={coat} vol={vol} x={-8} y={-5.5} scale={appearance.head} view="side" asleep />
  </>;
  const body = <>
    {side && <circle cx="9" cy="-4" r="2.5" fill="#eee6de" />}
    <g className={!held && moving ? "pet-step-bob" : undefined} data-pet-torso="true">
    <g transform={shape}><FurMass d={side ? "M-8 -4 Q-10 -10 -4 -13 Q5 -18 10 -10 Q14 -4 9 0 Q3 2 -5 1 Q-8 1 -8 -4 Z"
      : "M-5 -16 Q-11 -10 -9 -3 Q-8 2 0 2 Q9 2 10 -4 Q11 -11 5 -16 Z"}
      coat={coat} vol={vol} cy={-7} view={view}
      chestPath={side ? "M-8 -9 Q-4 -10 -3 -6 L-3 0 L-7 0 Z" : undefined} /></g>
    {rear && <circle cy="-3" r="3.5" fill="#eee6de" />}
    <Head species="bunny" coat={coat} vol={vol} x={side ? -7 : 0} y={held ? -19 : side ? -12 : -15} scale={appearance.head} view={view} />
    {held && <>
      <ellipse cx="-5" cy="-10" rx="2.4" ry="4" fill={coat.fur} />
      <ellipse cx="5" cy="-10" rx="2.4" ry="4" fill={coat.fur} />
    </>}
    </g>
    <g data-pet-paw="true">{side
      ? <path d="M-8 -5 Q-5 -6 -5 -2 L-3 0 Q-3 1.5 -9 1 L-10 0 Z" fill={coat.fur} />
      : <ellipse cx="-4.5" cy="0" rx="4" ry="2" fill={coat.fur} />}</g>
    <g data-pet-paw="true"><ellipse cx={side ? 5 : 4.5} cy="0" rx={side ? 5 : 4} ry={side ? 1.6 : 2} fill={coat.fur} /></g>
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
      transform={`translate(${anchor.x},${anchor.y}) scale(${appearance.scale * baseScale * PET_DISPLAY_SCALE[species]})`}>
      <VolumeDefs id={id} />
      {species === "bunny" ? <Rabbit {...props} /> : <Quadruped {...props} />}
    </g>;
  };
}

export const Cat = petSprite("cat", .6, .4, .85);
export const Dog = petSprite("dog", .55, .35, .9);
export const Bunny = petSprite("bunny", .35, .3, 1);
export const PET_SPRITES = { cat: Cat, dog: Dog, bunny: Bunny };
