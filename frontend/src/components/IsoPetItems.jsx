import { useId } from "react";
import { project } from "../lib/iso";
import { tinted } from "../lib/tint";
import { VolumeDefs, sphereFill } from "./character/volume";

// A cat's silhouette is the whole read at this size, so both poses get the
// same four things the old blob version lacked: a HAUNCH (the raised mound of
// the back leg — without it a curled cat is just an oval), a muzzle with a
// nose and whiskers, pink inner ears, and a belly shadow so it sits ON the
// floor rather than hovering over it.
//
// CAT COATS (lib/isoRoom.js CAT_COATS owns the vocabulary; this owns the
// artwork — the same catalog-vs-artwork split as rotations). A coat is a
// PALETTE plus at most two mark systems, applied to every pose:
//   fur / chest  — the base and the lighter front (chest, muzzle, paws)
//   mark+stripes — tabby: a few tapering barrel stripes, forehead lines, and
//                  a RINGED tail (the same tail path re-stroked with a dash —
//                  pose-proof, since every pose already declares its tail)
//   patches      — calico: white base, two big colour patches per pose and a
//                  cap over one ear; ears in the two patch colours
//   point        — siamese: cream body, dark ears/muzzle/legs/tail, blue eyes
// "ink" is null: the classic drawing, still tintable via --tint (a tabby you
// could re-tint solid teal wouldn't be a tabby, so patterned coats paint
// fixed palettes and ignore the tint picker).
const CAT_COAT_STYLES = {
  ginger: { fur: "#d0834a", mark: "#9e5c2b", chest: "#f4e8d8", stripes: true },
  greytabby: { fur: "#8d8a99", mark: "#57545f", chest: "#e9e6ef", stripes: true },
  tuxedo: { fur: "#332b3e", white: "#f7f2ea" },
  calico: { fur: "#f2e9dd", patchA: "#d0834a", patchB: "#3a3142" },
  siamese: { fur: "#e8ddc9", point: "#5b4632", eye: "#8fc3e8" },
  // Tortoiseshell: the calico's patch system without the white — a dark base
  // mottled in two ambers, ears split like a proper tortie.
  tortie: { fur: "#3b3037", patchA: "#c27b3f", patchB: "#7a4a28" },
};

function CatFace({ x, y, r, asleep, fur, earL, earR, eye = "#ffe9b0", brow, muzzle, cap, vol }) {
  const skull = fur || tinted("#3a3142");
  const earLStyle = earL ? { fill: earL } : skull;
  const earRStyle = earR ? { fill: earR } : skull;
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={skull} />
      {/* a calico's colour cap over one side of the skull — before the ears
          so their wedges stay crisp on top of it */}
      {cap && <ellipse cx={x - r * 0.42} cy={y - r * 0.5} rx={r * 0.68} ry={r * 0.56} fill={cap} opacity="0.92" />}
      {/* the skull is a sphere — same volume gradient as every round mass.
          (The old flat sheen ellipse went with it: stacked on the gradient
          it read as a smudge, the hair-sheen lesson again.) */}
      {vol && <circle cx={x} cy={y} r={r} fill={vol} />}
      {/* ears: outer wedge on the skull, pink inner wedge inside it */}
      <polygon points={`${x - r * 0.8},${y - r * 0.6} ${x - r * 0.5},${y - r * 1.75} ${x + r * 0.05},${y - r * 0.8}`} style={earLStyle} />
      <polygon points={`${x - r * 0.62},${y - r * 0.75} ${x - r * 0.48},${y - r * 1.36} ${x - r * 0.17},${y - r * 0.87}`} fill="#e8a3a8" opacity="0.5" />
      {/* The near ear flicks. Outer wedge and pink inner in one group, or the
          lining would stay put while the ear moved out from under it. */}
      <g className="ear-twitch">
        <polygon points={`${x + r * 0.3},${y - r * 0.85} ${x + r * 1.1},${y - r * 1.2} ${x + r * 0.86},${y - r * 0.35}`} style={earRStyle} />
        <polygon points={`${x + r * 0.44},${y - r * 0.84} ${x + r * 0.87},${y - r * 1.03} ${x + r * 0.74},${y - r * 0.58}`} fill="#e8a3a8" opacity="0.5" />
      </g>
      {/* tabby forehead lines — the "M" every tabby wears, three short strokes */}
      {brow && (
        <g stroke={brow} strokeWidth="1" opacity="0.8" fill="none" strokeLinecap="round">
          <path d={`M${x - r * 0.3} ${y - r * 0.55} q 0.5 -${r * 0.28} 0 -${r * 0.5}`} />
          <path d={`M${x} ${y - r * 0.6} q 0.3 -${r * 0.3} 0 -${r * 0.55}`} />
          <path d={`M${x + r * 0.3} ${y - r * 0.55} q -0.5 -${r * 0.28} 0 -${r * 0.5}`} />
        </g>
      )}
      {/* muzzle — solid for the coats that paint one (tuxedo white, siamese
          mask), the classic translucent hint otherwise */}
      {muzzle ? (
        <ellipse cx={x - r * 0.25} cy={y + r * 0.45} rx={r * 0.62} ry={r * 0.42} fill={muzzle} opacity="0.95" />
      ) : (
        <ellipse cx={x - r * 0.25} cy={y + r * 0.45} rx={r * 0.6} ry={r * 0.4} fill="#fff" opacity="0.1" />
      )}
      <path d={`M${x - r * 0.32} ${y + r * 0.22} l${r * 0.18} ${r * 0.16} l${r * 0.18} ${-r * 0.16} z`} fill="#e8a3a8" opacity="0.85" />
      {asleep ? (
        <>
          <path d={`M${x - r * 0.72} ${y - r * 0.05} q${r * 0.24} ${r * 0.22} ${r * 0.48} 0`} fill="none" stroke="#0d0a12" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
          <path d={`M${x + r * 0.24} ${y - r * 0.1} q${r * 0.22} ${r * 0.2} ${r * 0.44} 0`} fill="none" stroke="#0d0a12" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
        </>
      ) : (
        <>
          <ellipse cx={x - r * 0.42} cy={y - r * 0.02} rx={r * 0.15} ry={r * 0.2} fill={eye} />
          <ellipse cx={x + r * 0.42} cy={y - r * 0.06} rx={r * 0.15} ry={r * 0.2} fill={eye} />
        </>
      )}
      {/* whiskers */}
      {[-0.1, 0.28].map((dy, i) => (
        <g key={i} stroke="#f7e9e2" strokeWidth="0.6" opacity="0.35" strokeLinecap="round">
          <line x1={x - r * 0.5} y1={y + r * (0.35 + dy)} x2={x - r * 1.5} y2={y + r * (0.15 + dy)} />
          <line x1={x + r * 0.1} y1={y + r * (0.38 + dy)} x2={x + r * 0.95} y2={y + r * (0.2 + dy)} />
        </g>
      ))}
    </g>
  );
}

/** The face props a coat implies, shared by every pose. */
function catFaceProps(C) {
  if (!C) return {};
  if (C.point) return { earL: C.point, earR: C.point, eye: C.eye, muzzle: C.point };
  if (C.white) return { muzzle: C.white };
  if (C.patchA) return { earL: C.patchA, earR: C.patchB, cap: C.patchA };
  return { brow: C.mark };
}

function Cat({ awake = false, moving = false, facing = "side", held = false, look }) {
  const c = project(0.6, 0.4);
  // The coat: null = the classic tintable ink cat; anything else paints its
  // own fixed palette (see CAT_COAT_STYLES above).
  const C = CAT_COAT_STYLES[look] || null;
  const fur = C ? { fill: C.fur } : tinted("#3a3142");
  const tail = C ? C.point || C.fur : "var(--tint, #3a3142)";
  const legFill = C?.point ? { fill: C.point } : fur;
  // Per-instance volume gradient (ids are document-global; a room holds many
  // cats). Every major mass gets the sphere — the marks paint UNDER it, so
  // stripes and patches curve with the body instead of sitting on it.
  const vid = useId();
  const vol = sphereFill(vid);
  const face = { ...catFaceProps(C), vol };
  // A tabby's tail rings: the pose's own tail path re-stroked with a dash,
  // so every pose gets rings without owning ring artwork.
  const rings = (d, w) =>
    C?.stripes && (
      <path d={d} fill="none" stroke={C.mark} strokeWidth={w} strokeLinecap="butt" strokeDasharray="2.6 3.4" opacity="0.85" />
    );
  // Ground shadows come from the scene now (one soft ellipse per item), so
  // the poses draw only the cat.
  // Picked up (pets are carryable at home, same gesture as the personas):
  // the classic scruff-hold — the body STRETCHES long, hind legs dangling
  // off the bottom, front legs pinned up by the hold, tail hanging with a
  // last curl. Same held-dangle swing as a carried person.
  if (held) {
    const tailD = "M5.6 -8 q4.4 8 1 13 q-2.2 3.2 -5.4 1.6";
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
        <VolumeDefs id={vid} />
        <g
          className="held-dangle"
          style={{ transformBox: "fill-box", transformOrigin: "center top" }}
        >
          {/* hind legs first, hanging limp below the body */}
          {[-5, 1.2].map((x, i) => (
            <g key={x}>
              <rect x={x} y="-6" width="4.2" height="10" rx="2.1" style={legFill} />
              {C?.white && <rect x={x} y="1" width="4.2" height="3.2" rx="1.6" fill={C.white} opacity="0.95" />}
              <rect x={x} y="-6" width="4.2" height="10" rx="2.1" fill="#000" opacity={i ? 0.1 : 0.22} />
            </g>
          ))}
          {/* the tail hangs and curls at the tip */}
          <path d={tailD} fill="none" stroke={tail} strokeWidth="3.6" strokeLinecap="round" />
          {rings(tailD, 3.6)}
          {/* the stretched body — a picked-up cat is longer than it has any
              right to be */}
          <ellipse cx="0" cy="-16" rx="8.4" ry="13.5" style={fur} />
          {/* the coat's marks ride the stretched barrel */}
          {(C?.chest || C?.white) && (
            <ellipse cx="0" cy="-13.5" rx="3.8" ry="9.5" fill={C.chest || C.white} opacity="0.92" />
          )}
          {C?.stripes && (
            <g stroke={C.mark} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.85">
              <path d="M-7 -23 q7 2.4 14 0" />
              <path d="M-7.6 -17 q7.6 2.6 15.2 0" />
              <path d="M-6.6 -11 q6.6 2.4 13.2 0" />
            </g>
          )}
          {C?.patchA && (
            <>
              <ellipse cx="-3.2" cy="-23.5" rx="4.6" ry="5.8" fill={C.patchA} opacity="0.92" />
              <ellipse cx="3.8" cy="-11.5" rx="4" ry="5.2" fill={C.patchB} opacity="0.92" />
            </>
          )}
          <ellipse cx="0" cy="-16" rx="8.4" ry="13.5" fill={vol} />
          {/* fur grain down the stretched flank */}
          <g stroke="#000" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.1">
            <path d="M-5 -22 q1.2 2.6 0.4 4.8" />
            <path d="M4 -16 q1.1 2.4 0.4 4.4" />
          </g>
          <ellipse cx="0" cy="-7" rx="6.2" ry="4.4" fill="#000" opacity="0.14" />
          {/* front legs pinned tight to the chest by the hold */}
          {[-6.2, 2.4].map((x) => (
            <g key={x}>
              <rect x={x} y="-27" width="3.8" height="9.5" rx="1.9" style={legFill} />
              {C?.white && <rect x={x} y="-20.5" width="3.8" height="3" rx="1.5" fill={C.white} opacity="0.95" />}
            </g>
          ))}
          <CatFace x={0} y={-33.5} r={7.6} asleep={false} fur={fur} {...face} />
        </g>
      </g>
    );
  }
  // The prowl pose IS the profile; a vertical-dominant glide turns the cat
  // toward the camera (face + chest, tail curling up behind) or away (the
  // back of the skull — ears, no face). Same facing economy as the people.
  if (awake && facing !== "side") {
    const rear = facing === "back";
    const tailD = "M7 -13 q9 -3 7 -16";
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
        <VolumeDefs id={vid} />
        <g className="tail-sway">
          <path d={tailD} fill="none" stroke={tail} strokeWidth="4" strokeLinecap="round" />
          {rings(tailD, 4)}
        </g>
        {[
          ["leg-step-b", 3.2],
          ["leg-step-a", -7.8],
        ].map(([cls, x]) => (
          <g key={x} className={moving ? cls : undefined}>
            <rect x={x} y="-13" width="4.6" height="14" rx="2.3" style={legFill} />
            {C?.white && <rect x={x} y="-2.2" width="4.6" height="3.2" rx="1.6" fill={C.white} opacity="0.95" />}
            <rect x={x} y="-13" width="4.6" height="14" rx="2.3" fill="#000" opacity="0.24" />
          </g>
        ))}
        <g className={moving ? "resident-type" : undefined}>
          {/* the body end-on: one compact mass, chest lit, belly falling away */}
          <ellipse cx="0" cy="-16" rx="10" ry="8.5" style={fur} />
          {/* coat marks, front only — a chest is a front story */}
          {!rear && (C?.chest || C?.white) && (
            <ellipse cx="0" cy="-13" rx="4.8" ry="4.4" fill={C.chest || C.white} opacity="0.92" />
          )}
          {C?.stripes && (
            <g stroke={C.mark} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.85">
              <path d="M-8.2 -19.5 q2.4 3 0 6.2" />
              <path d="M8.2 -19.5 q-2.4 3 0 6.2" />
            </g>
          )}
          {C?.patchA &&
            (rear ? (
              <>
                <ellipse cx="-4.2" cy="-17" rx="4.2" ry="4" fill={C.patchB} opacity="0.92" />
                <ellipse cx="5" cy="-14.5" rx="3.8" ry="3.6" fill={C.patchA} opacity="0.92" />
              </>
            ) : (
              <>
                <ellipse cx="-5.4" cy="-17" rx="4" ry="3.8" fill={C.patchA} opacity="0.92" />
                <ellipse cx="5.8" cy="-14.5" rx="3.6" ry="3.4" fill={C.patchB} opacity="0.92" />
              </>
            ))}
          <ellipse cx="0" cy="-16" rx="10" ry="8.5" fill={vol} />
          {/* fur grain: a few unequal tapered strokes that stop short of
              every edge — the hair texture doctrine, on fur */}
          <g stroke="#000" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.11">
            <path d="M-7.2 -18.5 q1.3 2.2 0.5 4.2" />
            <path d="M6.8 -17.5 q1.2 2 0.4 3.8" />
          </g>
          <path d="M-1.5 -21.5 q1.2 1.8 0.5 3.4" stroke="#fff" strokeWidth="0.9" fill="none" opacity="0.07" strokeLinecap="round" />
          <ellipse cx="0" cy="-11" rx="8.5" ry="3" fill="#000" opacity="0.16" />
          {rear ? (
            <g>
              {/* THE BACK READ (owner, 2026-08-19: "so we actually know it's
                  the back"): from behind a cat is two haunch MOUNDS with the
                  tail rising between them and a spine crease running up to
                  the neck — without them the rear was a face-less front. */}
              <ellipse cx="-4.3" cy="-11.5" rx="4.6" ry="3.9" style={fur} />
              <ellipse cx="4.3" cy="-11.5" rx="4.6" ry="3.9" style={fur} />
              <ellipse cx="-4.3" cy="-11.5" rx="4.6" ry="3.9" fill={vol} />
              <ellipse cx="4.3" cy="-11.5" rx="4.6" ry="3.9" fill={vol} />
              <path d="M0 -13.6 L0 -8.4" stroke="#000" strokeWidth="1.1" opacity="0.2" strokeLinecap="round" />
              <path d="M0 -20.5 L0 -14.5" stroke="#000" strokeWidth="0.9" opacity="0.1" strokeLinecap="round" />
              {/* the tail's root, knotting it into the body */}
              <ellipse cx="6.6" cy="-13" rx="2.3" ry="1.9" style={fur} />
              <circle cx="0" cy="-27" r="7.6" style={fur} />
              {/* the calico cap shows from behind too */}
              {C?.patchA && <ellipse cx="-2.6" cy="-30" rx="4.4" ry="3.6" fill={C.patchA} opacity="0.92" />}
              <circle cx="0" cy="-27" r="7.6" fill={vol} />
              {/* the nape crease — the skull sits ON the shoulders */}
              <path d="M-3.4 -20.6 q3.4 1.6 6.8 0" stroke="#000" strokeWidth="0.9" fill="none" opacity="0.16" strokeLinecap="round" />
              <polygon points="-6.2,-31.5 -4,-38.5 -0.4,-32.6" style={C?.point ? { fill: C.point } : C?.patchA ? { fill: C.patchA } : fur} />
              <g className="ear-twitch">
                <polygon points="2.4,-32.6 6.6,-37.4 7,-31" style={C?.point ? { fill: C.point } : C?.patchA ? { fill: C.patchB } : fur} />
              </g>
            </g>
          ) : (
            <CatFace x={0} y={-27} r={7.6} asleep={false} fur={fur} {...face} />
          )}
        </g>
      </g>
    );
  }
  if (awake) {
    // On the prowl: body up on legs, head high, tail curled skyward. The far
    // legs are drawn first and darkened, so the four of them read as depth
    // rather than as a fringe.
    //
    // `moving` gates the trot — it used to run off "displaced from home",
    // which is true almost always once a wanderer has wandered, so a cat
    // standing perfectly still trotted in place indefinitely. Now the legs
    // step and the body bounces only while a glide is actually in flight.
    const tailD = "M16 -22 q11 -3 8 -17";
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
        <VolumeDefs id={vid} />
        {/* The far pair, on the trot's diagonal clocks: rear rides A with the
            NEAR front leg, front rides B — leg-trot's fore-aft sweep replaced
            leg-step's vertical piston here, the same pedalling-not-walking
            fix the residents' stride made. */}
        {[
          ["leg-trot-a", 7],
          ["leg-trot-b", -12],
        ].map(([cls, x]) => (
          <g key={x} className={moving ? cls : undefined}>
            <rect x={x} y="-15" width="4.6" height="16" rx="2.3" style={legFill} />
            {C?.white && <rect x={x} y="-2.4" width="4.6" height="3.4" rx="1.7" fill={C.white} opacity="0.75" />}
            <rect x={x} y="-15" width="4.6" height="16" rx="2.3" fill="#000" opacity="0.28" />
          </g>
        ))}
        <g className={moving ? "resident-type" : undefined}>
          {/* haunch, then barrel — the two-mass body of a walking cat */}
          <ellipse cx="8" cy="-20" rx="10.5" ry="9.5" style={fur} />
          <ellipse cx="-1" cy="-18" rx="17" ry="9" style={fur} />
          {/* the coat's marks lie on the two masses */}
          {(C?.chest || C?.white) && (
            <ellipse cx="-13" cy="-15.5" rx="4.6" ry="5" fill={C.chest || C.white} opacity="0.92" />
          )}
          {C?.stripes && (
            <g stroke={C.mark} strokeWidth="1.7" fill="none" strokeLinecap="round" opacity="0.85">
              <path d="M-6.5 -25.5 q1.8 4 0 7.5" />
              <path d="M0 -26 q1.8 4.2 0 8" />
              <path d="M6 -25.5 q1.8 4.2 0 8" />
              <path d="M11 -27 q2.6 4.5 1 8" />
            </g>
          )}
          {C?.patchA && (
            <>
              <ellipse cx="8.5" cy="-21" rx="6" ry="5.4" fill={C.patchA} opacity="0.92" />
              <ellipse cx="-7" cy="-19.5" rx="4.8" ry="4.4" fill={C.patchB} opacity="0.92" />
            </>
          )}
          {/* the two masses each round off — haunch first, then the barrel */}
          <ellipse cx="8" cy="-20" rx="10.5" ry="9.5" fill={vol} />
          <ellipse cx="-1" cy="-18" rx="17" ry="9" fill={vol} />
          {/* fur grain along the barrel, one pale stroke on the haunch */}
          <g stroke="#000" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.11">
            <path d="M-8.5 -21.5 q1.6 2.6 0.6 5" />
            <path d="M-1.5 -22.5 q1.7 2.8 0.5 5.4" />
            <path d="M5 -23.5 q1.5 2.6 0.7 4.8" />
          </g>
          <path d="M10.5 -24.5 q1.3 2.2 0.5 4.2" stroke="#fff" strokeWidth="0.9" fill="none" opacity="0.07" strokeLinecap="round" />
          <ellipse cx="-1" cy="-12.5" rx="15" ry="3.6" fill="#000" opacity="0.16" />
          {/* the near pair joins the diagonals: front on A, rear on B */}
          <g className={moving ? "leg-trot-a" : undefined}>
            <rect x="-9.5" y="-16" width="4.6" height="16" rx="2.3" style={legFill} />
            {C?.white && <rect x="-9.5" y="-3" width="4.6" height="3.4" rx="1.7" fill={C.white} opacity="0.95" />}
          </g>
          <g className={moving ? "leg-trot-b" : undefined}>
            <rect x="9.5" y="-16" width="4.6" height="16" rx="2.3" style={legFill} />
            {C?.white && <rect x="9.5" y="-3" width="4.6" height="3.4" rx="1.7" fill={C.white} opacity="0.95" />}
          </g>
          <CatFace x={-15} y={-27} r={7.6} asleep={false} fur={fur} {...face} />
        </g>
        <g className="tail-sway">
          <path d={tailD} fill="none" stroke={tail} strokeWidth="4" strokeLinecap="round" />
          {rings(tailD, 4)}
        </g>
      </g>
    );
  }
  // Curled up asleep: the body breathes slowly from the belly, and once in a
  // long while the tail flicks (rarity is charm).
  const tailD = "M14 -3 q13 1 14 -8 q1 -8 -7 -9";
  return (
    <g transform={`translate(${c.x}, ${c.y}) scale(0.85)`}>
      <VolumeDefs id={vid} />
      {/* the tail wraps AROUND the curl and is drawn first, so the body sits
          on top of it — that overlap is what sells "curled up" */}
      <g className="tail-flick">
        <path d={tailD} fill="none" stroke={tail} strokeWidth="5" strokeLinecap="round" />
        {rings(tailD, 5)}
      </g>
      <g className="cat-breathe">
        <ellipse cx="0" cy="-7" rx="22" ry="11.5" style={fur} />
        <ellipse cx="9" cy="-12" rx="12" ry="9" style={fur} />
        {C?.stripes && (
          <g stroke={C.mark} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.85">
            <path d="M2 -16.5 q2.6 4.5 0 8.5" />
            <path d="M9 -18.5 q2.8 4.5 0.4 9" />
            <path d="M16 -15.5 q2.4 4 0.6 7.5" />
          </g>
        )}
        {C?.patchA && (
          <>
            <ellipse cx="5" cy="-13.5" rx="5.6" ry="4.6" fill={C.patchA} opacity="0.92" />
            <ellipse cx="14" cy="-6" rx="5" ry="4" fill={C.patchB} opacity="0.92" />
          </>
        )}
        {/* the curl is one soft loaf — the volume rounds it as a single mass */}
        <ellipse cx="0" cy="-7" rx="22" ry="11.5" fill={vol} />
        <ellipse cx="9" cy="-12" rx="12" ry="9" fill={vol} opacity="0.7" />
        {/* fur grain following the curl */}
        <g stroke="#000" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.1">
          <path d="M-6 -14 q1.8 3 0.6 5.6" />
          <path d="M12.5 -12 q1.6 2.6 0.5 5" />
          <path d="M3 -16 q1.5 2.6 0.5 4.6" />
        </g>
        <ellipse cx="0" cy="-2.5" rx="20" ry="5.5" fill="#000" opacity="0.2" />
        <CatFace x={-14} y={-13} r={8.2} asleep fur={fur} {...face} />
        {/* front paws tucked under the chin */}
        <ellipse cx="-8" cy="-3.6" rx="5" ry="2.8" style={C?.white ? { fill: C.white } : C?.point ? { fill: C.point } : fur} />
        <ellipse cx="-8" cy="-4.2" rx="4.4" ry="2.2" fill="#fff" opacity="0.08" />
      </g>
    </g>
  );
}


// ---- pets --------------------------------------------------------------- //
// Roamers, same engine as the cat: they wander on a visual-only offset and
// settle once they find something flat (`layer: -1`) to lie on. Each needs a
// distinct SILHOUETTE, since at this size that's all you get — the dog is long
// and low with a plumed tail, the rabbit is a vertical teardrop with ears.

// DOG BREEDS (lib/isoRoom.js DOG_BREEDS owns the vocabulary). A breed earns
// its slot the way every model does — by changing the SILHOUETTE: the shiba's
// pricked triangle ears and tail curled in a tight loop, the corgi's stub legs
// under a long body with oversized upright ears, the dalmatian's spots on
// white with dark folded ears. "golden" is null: the classic caramel drawing,
// still tintable via --tint; the named breeds paint fixed palettes (a lime
// dalmatian isn't a dalmatian).
//   ears: "folded" | "point" | "big"    tail: "plume" | "curl" | "nub" | "thin"
//   leg:  leg-height scale — the corgi's whole read; the body drops to match
const DOG_BREED_STYLES = {
  shiba: { fur: "#d97f4e", cream: "#f6ead8", ears: "point", tail: "curl", brows: true, socks: true },
  corgi: { fur: "#dd9b58", cream: "#f7f2ea", ears: "big", tail: "nub", blaze: true, socks: true, leg: 0.6, longer: true },
  dalmatian: { fur: "#f2eee7", ears: "folded", earColor: "#312a3b", tail: "thin", spots: "#312a3b" },
  // Husky: the shiba's silhouette (pricked ears, curled tail) in wolf grey,
  // with the white face blaze + brows that say sled dog rather than shiba.
  husky: { fur: "#8d90a0", cream: "#f4f2f5", ears: "point", tail: "curl", blaze: true, brows: true, socks: true },
};

function DogHead({ x, y, r, asleep, fur, cream = "#f2e7dc", ears = "folded", earColor, blaze, brows, spots, vol }) {
  const skull = fur || tinted("#c98a4b");
  const earStyle = earColor ? { fill: earColor } : skull;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.88} style={skull} />
      {/* a dalmatian's one skull spot — over the crown, before the ears */}
      {spots && <ellipse cx={x + r * 0.34} cy={y - r * 0.5} rx={r * 0.3} ry={r * 0.24} fill={spots} opacity="0.9" />}
      {/* the skull models as a sphere, marks curving with it */}
      {vol && <ellipse cx={x} cy={y} rx={r} ry={r * 0.88} fill={vol} />}
      {ears === "folded" && (
        <>
          {/* folded ears hang beside the skull rather than standing up */}
          <ellipse cx={x - r * 0.85} cy={y + r * 0.1} rx={r * 0.32} ry={r * 0.6} style={earStyle} />
          <ellipse cx={x - r * 0.85} cy={y + r * 0.1} rx={r * 0.32} ry={r * 0.6} fill="#000" opacity={earColor ? 0.1 : 0.22} />
          {/* The near ear flicks while awake — same "alive and listening"
              signal as the cat's, but a folded ear HANGS, so it takes the
              top-hinged variant: bottom-origin would swing the attachment
              point, not the tip. Ear + its shade in one group, or the shading
              stays behind. */}
          <g className={asleep ? undefined : "ear-twitch-hanging"}>
            <ellipse cx={x + r * 0.85} cy={y + r * 0.05} rx={r * 0.3} ry={r * 0.58} style={earStyle} />
            <ellipse cx={x + r * 0.85} cy={y + r * 0.05} rx={r * 0.3} ry={r * 0.58} fill="#000" opacity="0.12" />
          </g>
        </>
      )}
      {ears === "point" && (
        <>
          {/* the shiba's pricked triangles — cat geometry, chunkier */}
          <polygon points={`${x - r * 0.9},${y - r * 0.45} ${x - r * 0.55},${y - r * 1.55} ${x - r * 0.02},${y - r * 0.7}`} style={earStyle} />
          <polygon points={`${x - r * 0.7},${y - r * 0.62} ${x - r * 0.52},${y - r * 1.2} ${x - r * 0.24},${y - r * 0.76}`} fill={cream} opacity="0.55" />
          <g className={asleep ? undefined : "ear-twitch"}>
            <polygon points={`${x + r * 0.22},${y - r * 0.72} ${x + r * 0.95},${y - r * 1.3} ${x + r * 0.92},${y - r * 0.3}`} style={earStyle} />
            <polygon points={`${x + r * 0.4},${y - r * 0.74} ${x + r * 0.82},${y - r * 1.05} ${x + r * 0.78},${y - r * 0.52}`} fill={cream} opacity="0.55" />
          </g>
        </>
      )}
      {ears === "big" && (
        <>
          {/* the corgi's radar dishes: upright, oversized, rounded — a third
              of the whole head's read */}
          <g transform={`rotate(-14 ${x - r * 0.72} ${y - r * 0.9})`}>
            <ellipse cx={x - r * 0.72} cy={y - r * 0.9} rx={r * 0.42} ry={r * 0.82} style={earStyle} />
            <ellipse cx={x - r * 0.72} cy={y - r * 0.78} rx={r * 0.24} ry={r * 0.52} fill="#e8a3a8" opacity="0.4" />
          </g>
          <g transform={`rotate(12 ${x + r * 0.76} ${y - r * 0.86})`}>
            <g className={asleep ? undefined : "ear-twitch"}>
              <ellipse cx={x + r * 0.76} cy={y - r * 0.86} rx={r * 0.4} ry={r * 0.8} style={earStyle} />
              <ellipse cx={x + r * 0.76} cy={y - r * 0.74} rx={r * 0.22} ry={r * 0.5} fill="#e8a3a8" opacity="0.4" />
            </g>
          </g>
        </>
      )}
      {/* the corgi's white blaze up the middle of the face, under eyes + nose */}
      {blaze && (
        <path
          d={`M${x - r * 0.3} ${y + r * 0.75} Q ${x - r * 0.22} ${y - r * 0.4} ${x - r * 0.12} ${y - r * 0.82}
              L ${x + r * 0.2} ${y - r * 0.78} Q ${x + r * 0.06} ${y - r * 0.35} ${x + r * 0.16} ${y + r * 0.75} z`}
          fill={cream}
          opacity="0.9"
        />
      )}
      {/* cream muzzle + black nose: the two marks that say "dog" fastest */}
      <ellipse cx={x - r * 0.1} cy={y + r * 0.5} rx={r * 0.62} ry={r * 0.42} fill={cream} opacity="0.85" />
      {/* the shiba's cream brow dots — the mask's smallest, most readable part */}
      {brows && (
        <>
          <circle cx={x - r * 0.42} cy={y - r * 0.4} r={r * 0.13} fill={cream} opacity="0.9" />
          <circle cx={x + r * 0.44} cy={y - r * 0.44} r={r * 0.13} fill={cream} opacity="0.9" />
        </>
      )}
      <ellipse cx={x - r * 0.28} cy={y + r * 0.34} rx={r * 0.18} ry={r * 0.13} fill="#2b2350" />
      {asleep ? (
        <>
          <path d={`M${x - r * 0.62} ${y - r * 0.05} q${r * 0.2} ${r * 0.2} ${r * 0.4} 0`} fill="none" stroke="#2b2350" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
          <path d={`M${x + r * 0.22} ${y - r * 0.08} q${r * 0.2} ${r * 0.2} ${r * 0.4} 0`} fill="none" stroke="#2b2350" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        </>
      ) : (
        <>
          <circle cx={x - r * 0.4} cy={y - r * 0.08} r={r * 0.15} fill="#2b2350" />
          <circle cx={x + r * 0.42} cy={y - r * 0.12} r={r * 0.15} fill="#2b2350" />
          <circle cx={x - r * 0.36} cy={y - r * 0.14} r={r * 0.06} fill="#fff" opacity="0.85" />
        </>
      )}
    </g>
  );
}

function Dog({ awake = false, moving = false, facing = "side", held = false, look }) {
  const c = project(0.55, 0.35);
  // The breed: null = the classic tintable golden; anything else paints its
  // own fixed palette and silhouette (see DOG_BREED_STYLES above).
  const B = DOG_BREED_STYLES[look] || null;
  const fur = B ? { fill: B.fur } : tinted("#c98a4b");
  const furStroke = B ? B.fur : "var(--tint, #c98a4b)";
  // The lighter front: chest + belly + tail tip. The dalmatian opts out — a
  // cream chest on a white dog is dirt, not marking.
  const cream = B ? B.cream || null : "#f2e7dc";
  // Per-instance soft-volume gradient, same as the cat's.
  const vid = useId();
  const vol = sphereFill(vid);
  const headProps = {
    fur,
    cream: cream || "#fbf8f2",
    ears: B?.ears || "folded",
    earColor: B?.earColor,
    blaze: B?.blaze,
    brows: B?.brows,
    spots: B?.spots,
    vol,
  };
  const tailKind = B?.tail || "plume";
  // Every pose declares its tail as (plume-path, curl-path, nub-path,
  // thin-path) and this picks + strokes the right one. The plume gets the
  // cream highlight riding in the same group; the curl gets a cream inner
  // arc (a shiba's tail shows its pale underside in the loop); the rest are
  // solid.
  const tailArt = ({ plume, curl, nub, thin }) => {
    if (tailKind === "curl")
      return (
        <>
          <path d={curl} fill="none" stroke={furStroke} strokeWidth="4.6" strokeLinecap="round" />
          {cream && <path d={curl} fill="none" stroke={cream} strokeWidth="1.7" strokeLinecap="round" opacity="0.5" />}
        </>
      );
    if (tailKind === "nub")
      return <path d={nub} fill="none" stroke={furStroke} strokeWidth="4.2" strokeLinecap="round" />;
    if (tailKind === "thin")
      return <path d={thin} fill="none" stroke={furStroke} strokeWidth="3.2" strokeLinecap="round" />;
    return (
      <>
        <path d={plume} fill="none" stroke={furStroke} strokeWidth="5.5" strokeLinecap="round" />
        {cream && <path d={plume} fill="none" stroke={cream} strokeWidth="2" strokeLinecap="round" opacity="0.35" />}
      </>
    );
  };
  const spots = (list) =>
    B?.spots && (
      <g fill={B.spots} opacity="0.9">
        {list.map(([x, y, rx, ry]) => (
          <ellipse key={`${x},${y}`} cx={x} cy={y} rx={rx} ry={ry ?? rx * 0.8} />
        ))}
      </g>
    );
  // Carried: same scruff-hold dangle as the cat, in dog proportions — a
  // rounder body, the folded ears hanging with gravity, tail down.
  if (held) {
    const legH = B?.leg ? 8 : 10.5;
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.9)`}>
        <VolumeDefs id={vid} />
        <g
          className="held-dangle"
          style={{ transformBox: "fill-box", transformOrigin: "center top" }}
        >
          {[-5.4, 1.4].map((x, i) => (
            <g key={x}>
              <rect x={x} y="-5" width="4.6" height={legH} rx="2.3" style={fur} />
              {B?.socks && <rect x={x} y={-5 + legH - 3} width="4.6" height="3" rx="1.5" fill={cream} opacity="0.95" />}
              <rect x={x} y="-5" width="4.6" height={legH} rx="2.3" fill="#000" opacity={i ? 0.1 : 0.24} />
            </g>
          ))}
          {tailArt({
            plume: "M5.4 -7 q4 7 1.4 11.5",
            curl: "M4.6 -9 a3.8 3.8 0 1 1 4.6 -3",
            nub: "M5 -8 q1.6 2 1 4",
            thin: "M5.4 -7 q4 7 1.4 11.5",
          })}
          <ellipse cx="0" cy="-15" rx="9.4" ry="12.5" style={fur} />
          {spots([[-3.4, -20.5, 2.4], [3.4, -12.5, 2.2], [1, -25, 1.8]])}
          {cream && <ellipse cx="0" cy="-11" rx="5.6" ry="6.8" fill={cream} opacity="0.5" />}
          <ellipse cx="0" cy="-15" rx="9.4" ry="12.5" fill={vol} />
          <g stroke="#000" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.1">
            <path d="M-5.2 -21 q1.2 2.4 0.4 4.6" />
            <path d="M4.2 -15 q1.1 2.2 0.4 4.2" />
          </g>
          {[-6.8, 2.6].map((x) => (
            <g key={x}>
              <rect x={x} y="-25.5" width="4.2" height="9" rx="2.1" style={fur} />
              {B?.socks && <rect x={x} y="-19.5" width="4.2" height="3" rx="1.5" fill={cream} opacity="0.95" />}
            </g>
          ))}
          <DogHead x={0} y={-31.5} r={7.8} asleep={false} {...headProps} />
        </g>
      </g>
    );
  }
  // Same facing economy as the cat: the trot is the profile, and turning
  // toward/away from the camera is its own compact drawing.
  if (awake && facing !== "side") {
    const rear = facing === "back";
    // The corgi: legs at 60%, and everything above them drops by the
    // difference — same silhouette trick as the side view. The drop rides a
    // WRAPPER inside the animated group (an attribute transform can't share
    // an element with the trot bounce).
    const legH = B?.leg ? 13 * B.leg : 13;
    const legY = 1 - legH;
    const drop = 13 - legH;
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.9)`}>
        <VolumeDefs id={vid} />
        <g transform={drop ? `translate(0, ${drop})` : undefined}>
          <g className="tail-sway">
            {tailArt({
              plume: "M5 -13 q8 -1 7 -14",
              curl: "M4.5 -14 a4.2 4.2 0 1 1 5.2 -3.2",
              nub: "M5 -13 q2.4 -0.8 3 -2.6",
              thin: "M5 -13 q7 0 8 -11",
            })}
          </g>
        </g>
        {[
          ["leg-step-b", 3.6],
          ["leg-step-a", -8.4],
        ].map(([cls, x]) => (
          <g key={x} className={moving ? cls : undefined}>
            <rect x={x} y={legY} width="4.8" height={legH} rx="2.4" style={fur} />
            {B?.socks && <rect x={x} y={1 - 3.2} width="4.8" height="3.2" rx="1.6" fill={cream} opacity="0.95" />}
            <rect x={x} y={legY} width="4.8" height={legH} rx="2.4" fill="#000" opacity="0.26" />
          </g>
        ))}
        <g className={moving ? "resident-type" : undefined}>
          <g transform={drop ? `translate(0, ${drop})` : undefined}>
            <ellipse cx="0" cy="-15" rx={B?.longer ? 11.5 : 10.5} ry="8" style={fur} />
            {spots([[-4.5, -17, 2.3], [4.2, -13, 2.1]])}
            {!rear && cream && <ellipse cx="0" cy="-12.5" rx="6" ry="4.4" fill={cream} opacity="0.5" />}
            <ellipse cx="0" cy="-15" rx={B?.longer ? 11.5 : 10.5} ry="8" fill={vol} />
            {/* fur grain */}
            <g stroke="#000" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.1">
              <path d="M-7.5 -17.5 q1.3 2.2 0.5 4" />
              <path d="M6.5 -16.5 q1.2 2 0.4 3.6" />
            </g>
            <ellipse cx="0" cy="-10.5" rx="8.6" ry="2.8" fill="#000" opacity="0.16" />
            {rear ? (
              <g>
                {/* the back read, dog edition: haunch mounds + tail root +
                    spine crease — same grammar as the cat's */}
                <ellipse cx="-4.4" cy="-11" rx="4.7" ry="3.7" style={fur} />
                <ellipse cx="4.4" cy="-11" rx="4.7" ry="3.7" style={fur} />
                <ellipse cx="-4.4" cy="-11" rx="4.7" ry="3.7" fill={vol} />
                <ellipse cx="4.4" cy="-11" rx="4.7" ry="3.7" fill={vol} />
                <path d="M0 -13 L0 -8.2" stroke="#000" strokeWidth="1.1" opacity="0.2" strokeLinecap="round" />
                <path d="M0 -19.5 L0 -14" stroke="#000" strokeWidth="0.9" opacity="0.1" strokeLinecap="round" />
                <ellipse cx="4.8" cy="-13" rx="2.3" ry="1.9" style={fur} />
                <ellipse cx="0" cy="-25" rx="7.8" ry="6.9" style={fur} />
                {B?.spots && <ellipse cx="1.8" cy="-28" rx="2.2" ry="1.8" fill={B.spots} opacity="0.9" />}
                <ellipse cx="0" cy="-25" rx="7.8" ry="6.9" fill={vol} />
                <path d="M-3.2 -18.9 q3.2 1.5 6.4 0" stroke="#000" strokeWidth="0.9" fill="none" opacity="0.16" strokeLinecap="round" />
                {(B?.ears || "folded") === "folded" ? (
                  <>
                    <ellipse cx="-6.4" cy="-24.6" rx="2.5" ry="4.6" style={B?.earColor ? { fill: B.earColor } : fur} />
                    <ellipse cx="-6.4" cy="-24.6" rx="2.5" ry="4.6" fill="#000" opacity={B?.earColor ? 0.1 : 0.22} />
                    <g className="ear-twitch-hanging">
                      <ellipse cx="6.4" cy="-24.9" rx="2.4" ry="4.5" style={B?.earColor ? { fill: B.earColor } : fur} />
                      <ellipse cx="6.4" cy="-24.9" rx="2.4" ry="4.5" fill="#000" opacity="0.12" />
                    </g>
                  </>
                ) : B.ears === "point" ? (
                  <>
                    <polygon points="-7,-28.5 -4.6,-36 -0.8,-29.8" style={fur} />
                    <g className="ear-twitch">
                      <polygon points="1.6,-29.8 5.2,-35.6 6.8,-28.3" style={fur} />
                    </g>
                  </>
                ) : (
                  <>
                    <g transform="rotate(-14 -5.6 -31)">
                      <ellipse cx="-5.6" cy="-31" rx="3.2" ry="6.2" style={fur} />
                    </g>
                    <g transform="rotate(12 5.9 -30.7)">
                      <g className="ear-twitch">
                        <ellipse cx="5.9" cy="-30.7" rx="3.1" ry="6" style={fur} />
                      </g>
                    </g>
                  </>
                )}
              </g>
            ) : (
              <DogHead x={0} y={-25} r={7.8} asleep={false} {...headProps} />
            )}
          </g>
        </g>
      </g>
    );
  }
  if (awake) {
    // Same `moving` gate as the cat: trot only while a glide is in flight.
    // Corgi geometry: legs at 60% height, the whole upper body dropping to
    // meet them, and a slightly longer barrel — long-and-low is the breed.
    const legH = B?.leg ? 14 * B.leg : 14;
    const drop = 14 - legH;
    return (
      <g transform={`translate(${c.x}, ${c.y}) scale(0.9)`}>
        <VolumeDefs id={vid} />
        {/* Far pair on the trot's diagonal clocks (rear with the near front
            leg) — leg-trot's fore-aft sweep, not leg-step's piston. */}
        {[
          ["leg-trot-a", 8],
          ["leg-trot-b", -11],
        ].map(([cls, x]) => (
          <g key={x} className={moving ? cls : undefined}>
            <rect x={x} y={1 - legH} width="4.8" height={legH} rx="2.4" style={fur} />
            {B?.socks && <rect x={x} y={1 - 3.4} width="4.8" height="3.4" rx="1.7" fill={cream} opacity="0.75" />}
            <rect x={x} y={1 - legH} width="4.8" height={legH} rx="2.4" fill="#000" opacity="0.3" />
          </g>
        ))}
        <g className={moving ? "resident-type" : undefined}>
          <g transform={drop ? `translate(0, ${drop})` : undefined}>
            <ellipse cx={B?.longer ? 7 : 6} cy="-19" rx="11" ry="9" style={fur} />
            <ellipse cx="-3" cy="-18" rx={B?.longer ? 18 : 16} ry="8.5" style={fur} />
            {/* the coat's body marks, on the two masses */}
            {spots([[2, -22.5, 2.5], [9.5, -16.5, 2.2], [-7, -14.5, 2.1], [-11, -21.5, 2.3]])}
            {/* cream chest + belly shadow */}
            {cream && <ellipse cx="-9" cy="-15" rx="8" ry="5" fill={cream} opacity="0.5" />}
            {/* haunch and barrel round off as two soft masses */}
            <ellipse cx={B?.longer ? 7 : 6} cy="-19" rx="11" ry="9" fill={vol} />
            <ellipse cx="-3" cy="-18" rx={B?.longer ? 18 : 16} ry="8.5" fill={vol} />
            {/* fur grain along the barrel */}
            <g stroke="#000" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.1">
              <path d="M-9.5 -20.5 q1.6 2.6 0.6 4.8" />
              <path d="M-2.5 -21.5 q1.6 2.7 0.5 5.2" />
              <path d="M4 -22.5 q1.5 2.5 0.6 4.6" />
            </g>
            <path d="M9.5 -23.5 q1.3 2.2 0.5 4" stroke="#fff" strokeWidth="0.9" fill="none" opacity="0.07" strokeLinecap="round" />
            <ellipse cx="-2" cy="-12" rx="14" ry="3.4" fill="#000" opacity="0.16" />
            {/* the near pair joins the diagonals: front on A, rear on B */}
            <g className={moving ? "leg-trot-a" : undefined}>
              <rect x="-9" y={-drop - legH} width="4.8" height={legH} rx="2.4" style={fur} />
              {B?.socks && <rect x="-9" y={-drop - 3.4} width="4.8" height="3.4" rx="1.7" fill={cream} opacity="0.95" />}
            </g>
            <g className={moving ? "leg-trot-b" : undefined}>
              <rect x="10" y={-drop - legH} width="4.8" height={legH} rx="2.4" style={fur} />
              {B?.socks && <rect x="10" y={-drop - 3.4} width="4.8" height="3.4" rx="1.7" fill={cream} opacity="0.95" />}
            </g>
            <DogHead x={-16} y={-26} r={7.8} asleep={false} {...headProps} />
          </g>
        </g>
        {/* the plume: a thick curl over the back, the dog's whole read at range.
            Both strokes go in ONE swaying group so the cream highlight travels
            with the tail instead of staying behind on the old path. The other
            breeds swap their own tails in: the shiba's tight loop, the corgi's
            nub, the dalmatian's thin taper. */}
        <g transform={drop ? `translate(0, ${drop})` : undefined}>
          <g className="tail-sway">
            {tailArt({
              plume: "M15 -23 q12 -2 10 -13",
              curl: "M13 -25 a4.8 4.8 0 1 1 5.6 -3.6",
              nub: "M15 -22.5 q2.8 -0.6 3.6 -3",
              thin: "M15 -23 q11 1 12.5 -9",
            })}
          </g>
        </g>
      </g>
    );
  }
  return (
    <g transform={`translate(${c.x}, ${c.y}) scale(0.9)`}>
      <VolumeDefs id={vid} />
      <g className="tail-flick">
        {tailArt({
          plume: "M13 -4 q14 2 15 -8",
          curl: "M12 -6 a4.4 4.4 0 1 1 5.4 -3.4",
          nub: "M13 -4 q2.6 -0.4 3.4 -2.4",
          thin: "M13 -4 q12 2 13.5 -7.5",
        })}
      </g>
      <g className="cat-breathe">
        <ellipse cx="0" cy="-7" rx="21" ry="10.5" style={fur} />
        <ellipse cx="8" cy="-11" rx="11" ry="8" style={fur} />
        {spots([[4, -13.5, 2.4], [12, -7.5, 2.2], [-4, -8, 2]])}
        {cream && <ellipse cx="-6" cy="-9" rx="12" ry="5" fill={cream} opacity="0.4" />}
        <ellipse cx="0" cy="-7" rx="21" ry="10.5" fill={vol} />
        <ellipse cx="8" cy="-11" rx="11" ry="8" fill={vol} opacity="0.7" />
        {/* fur grain following the loaf */}
        <g stroke="#000" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.1">
          <path d="M-4 -13 q1.7 2.8 0.6 5.2" />
          <path d="M12 -11 q1.5 2.5 0.5 4.8" />
        </g>
        <ellipse cx="0" cy="-2.5" rx="19" ry="5" fill="#000" opacity="0.2" />
        <DogHead x={-14} y={-12} r={8} asleep {...headProps} />
        {/* muzzle resting on the front paws — the pose that reads as content */}
        <ellipse cx="-9" cy="-3.4" rx="5.4" ry="2.8" style={B?.socks ? { fill: cream } : fur} />
        <ellipse cx="-9" cy="-4" rx="4.6" ry="2.2" fill={cream || "#fbf8f2"} opacity="0.35" />
      </g>
    </g>
  );
}

// Bunny coats — smaller set than the cat's, same contract: "cloud" is the
// classic lilac-grey and stays tintable; the named coats paint fixed fur.
const BUNNY_COATS = {
  snow: { fur: "#f7f2ea", earInner: 0.65 },
  cocoa: { fur: "#a9805d", belly: "#e9dcc9" },
};

function Bunny({ awake = false, moving = false, look }) {
  const c = project(0.35, 0.3);
  const B = BUNNY_COATS[look] || null;
  const fur = B ? { fill: B.fur } : tinted("#d9d2e4");
  const vid = useId();
  const vol = sphereFill(vid);
  // `twitch` puts the flick on an INNER group: the outer <g> carries the
  // rotate attribute, and an animation sharing that element would override it
  // (the standard SVG trap). An upright ear pivots at its base, so the stock
  // ear-twitch's bottom origin is right here — only the dog's folded ears
  // need the hanging variant.
  const ear = (x, tilt, dark, twitch) => (
    <g transform={`rotate(${tilt} ${x} ${awake ? -20 : -9})`}>
      <g className={twitch ? "ear-twitch" : undefined}>
        <ellipse cx={x} cy={awake ? -27 : -12} rx="2.9" ry={awake ? 9.5 : 6} style={fur} />
        <ellipse cx={x} cy={awake ? -27 : -12} rx="1.5" ry={awake ? 7 : 4.2} fill="#e8a3a8" opacity={dark ? 0.25 : B?.earInner || 0.5} />
        {dark && <ellipse cx={x} cy={awake ? -27 : -12} rx="2.9" ry={awake ? 9.5 : 6} fill="#000" opacity="0.18" />}
      </g>
    </g>
  );
  if (awake) {
    // Sitting up on the haunches: a vertical teardrop, ears apart and alert.
    // The bounce is a hop, so it only plays while actually moving.
    return (
      <g transform={`translate(${c.x}, ${c.y})`}>
        <VolumeDefs id={vid} />
        {ear(-4.5, -14, true)}
        {ear(3.5, 12, false, true)}
        <g className={moving ? "resident-type" : undefined}>
          <ellipse cx="0" cy="-8" rx="9.5" ry="8.5" style={fur} />
          {B?.belly && <ellipse cx="0" cy="-6" rx="5.2" ry="4.6" fill={B.belly} opacity="0.85" />}
          <ellipse cx="0" cy="-8" rx="9.5" ry="8.5" fill={vol} />
          <ellipse cx="-0.5" cy="-16" rx="7" ry="6.2" style={fur} />
          <ellipse cx="-0.5" cy="-16" rx="7" ry="6.2" fill={vol} />
          <ellipse cx="-2" cy="-18" rx="4" ry="2.4" fill="#fff" opacity="0.2" />
          <circle cx="-3.4" cy="-16.5" r="1.15" fill="#2b2350" />
          <circle cx="2.6" cy="-16.8" r="1.15" fill="#2b2350" />
          <ellipse cx="-0.4" cy="-13.8" rx="1.1" ry="0.8" fill="#e8a3a8" />
          {/* forepaws tucked to the chest */}
          <ellipse cx="-3.5" cy="-6" rx="2.6" ry="3.4" style={fur} />
          <ellipse cx="3" cy="-6" rx="2.6" ry="3.4" style={fur} />
        </g>
        <ellipse cx="0" cy="-1" rx="10" ry="3.4" fill="#000" opacity="0.16" />
        <circle cx="9" cy="-6" r="3.4" fill="#f7e9e2" opacity="0.85" />
      </g>
    );
  }
  // Loafed: legs folded away, ears laid back along the spine.
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      <VolumeDefs id={vid} />
      {ear(6, 62, true)}
      {ear(7.5, 78, false)}
      <g className="cat-breathe">
        <ellipse cx="0" cy="-6" rx="13" ry="7.5" style={fur} />
        <ellipse cx="-8" cy="-8.5" rx="6.5" ry="5.6" style={fur} />
        <ellipse cx="0" cy="-6" rx="13" ry="7.5" fill={vol} />
        <ellipse cx="-8" cy="-8.5" rx="6.5" ry="5.6" fill={vol} opacity="0.7" />
        <ellipse cx="-3" cy="-9.5" rx="7" ry="3" fill="#fff" opacity="0.18" />
        <ellipse cx="0" cy="-2" rx="12" ry="3.6" fill="#000" opacity="0.18" />
        <path d="M-11.4 -8.8 q1.4 1.3 2.8 0" fill="none" stroke="#2b2350" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        <ellipse cx="-13" cy="-7.4" rx="1" ry="0.75" fill="#e8a3a8" />
      </g>
      <circle cx="11" cy="-5" r="3.2" fill="#f7e9e2" opacity="0.8" />
    </g>
  );
}


export const PET_SPRITES = { cat: Cat, dog: Dog, bunny: Bunny };
export { Cat, Dog, Bunny };
