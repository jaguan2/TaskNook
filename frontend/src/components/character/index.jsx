// The character package: the little people the rooms are about.
//
// Split out of IsoItems.jsx (which keeps the furniture) because the character
// is the app's fastest-growing artwork — hair, garments and poses each earn
// entries at their own pace. The split follows the drawing's real seams:
//   lib/body.js      — the NUMBERS (geometry, anchors, slider ranges)
//   lib/profile.js   — the VOCABULARY (what exists, validation, labels)
//   body.jsx         — the body's artwork: legs, face, palette
//   hair.jsx         — HAIR_REGISTRY: one self-contained entry per style
//   garments.jsx     — GARMENT_REGISTRY: one entry per garment
//   this file        — assembly: poses, layers, animation gates
//
// The registries are the scalability move: adding a style used to mean edits
// to three switch statements that nothing tied together; now it's one object,
// and tests pin registry keys against the profile catalog both ways.
import { useId } from "react";
import { SKEW, project } from "../../lib/iso";
import { tinted, toneFor } from "../../lib/tint";
import { DEFAULT_CHARACTER, MOODS, coatOf, garmentOf } from "../../lib/profile";
import { HEAD_R, figureMetrics, torsoGeom } from "../../lib/body";
import {
  Arm,
  GLINT,
  HAIR,
  INK,
  SEAT_KNEE_Y,
  SHADE,
  SKIN,
  TROUSER,
  Face,
  SeatedLeg,
  SideFace,
  SideLeg,
  StandingLeg,
  hangLimb,
  pantsFormOf,
} from "./body";
import { Coat, DEFAULT_FINISH, GARMENT_REGISTRY, Garment, GarmentCollar } from "./garments";
import {
  HairBack,
  HairBehind,
  HairFront,
  HairLength,
  HairSide,
  HairSideLength,
} from "./hair";
import { Hat } from "./hats";

export { HAIR_REGISTRY } from "./hair";
export { GARMENT_REGISTRY } from "./garments";
export { HAT_REGISTRY } from "./hats";

/**
 * The resident. Small enough that only the silhouette carries, so what got
 * added over the first pass is all outline work: shoes distinct from trouser
 * legs, a bent knee when seated (a seated figure without one is a person
 * standing in a hole), a neck, shoulders wider than the waist, hands on the
 * ends of the arms, and a face that actually has an expression.
 */
export function Resident({
  seated = false,
  lying = false,
  seatH = 0,
  // What the timer is doing: "focus" | "break" | null. One string rather than a
  // pair of booleans, because the states are mutually exclusive and two flags
  // can be set at once; it also still changes rarely, which is what the memo'd
  // scene needs.
  activity = null,
  moving = false,
  // Facing AWAY from the camera — the wander engine turns a figure around
  // when it walks up-screen. The body is symmetric enough to share; the head
  // swaps to the back of its hair and the garments to their backs.
  away = false,
  // The finer version: "front" | "side" | "back". The wander engine passes
  // this now (a mostly-horizontal glide shows the PROFILE — in a 2:1 room
  // that's most walks); `away` survives as the boolean it always was.
  facing = null,
  // Dangling from your cursor mid drag-and-drop. Limbs go limp and the whole
  // body swings from the scruff of the neck — the pinched-chibi pose, which is
  // the entire point of picking someone up rather than pointing at a tile.
  held = false,
  character,
}) {
  const c = project(0.4, 0.4);
  // Per-instance id for the torso clip the print pattern needs — SVG ids are
  // document-global and a room holds many residents.
  const clipId = useId();
  // The character is validated at the store boundary, but this sprite is also
  // rendered by panel previews and tests, so it stands alone with the classic
  // resident as its default.
  const ch = character || DEFAULT_CHARACTER;
  const skin = ch.skin || SKIN;
  const hairColor = ch.hairColor || HAIR;
  // The sweater stays the placement's --tint when one is set, falling back to
  // the profile's outfit colour. That ordering is deliberate: your profile
  // dresses every resident, and tinting ONE of them still overrides it.
  const outfit = tinted(ch.outfit || "#7faf8f");
  // Shoulder/waist/hem half-widths for this model × build. The ARMS and the
  // collar hang off the same `sh` the body actually has — placed from the
  // build's half-width alone, the narrower `fem` shoulders left both arms
  // floating in a gap beside the chest.
  const {
    sh,
    wa,
    hem,
    legW,
    thighW,
    shinW,
    legH,
    torsoH,
    waistDrop,
    standTorsoY,
    standHeadY,
    seatTorsoY,
    seatHeadY,
  } = figureMetrics(ch);
  // Lying down is its own drawing, not a squashed sitting pose: dropped on a
  // bed the resident used to perch bolt upright on the duvet.
  if (lying) {
    return (
      <g transform={`translate(${c.x}, ${c.y})`}>
        {/* A bed's long axis is a DIAGONAL on screen, and its head end is the
            one with the pillows. This pose was drawn flat along screen-x with
            the head at -x, which put the sleeper across the mattress at ~27° to
            it AND head-down at the foot of the bed, feet on the pillows.
            One wrapper fixes both: `scale(-1,1)` swaps the ends, then
            `rotate(-SKEW)` lays the body along the bed. SKEW is the projection's
            own angle (atan(TILE_H / TILE_W)) — the same number every wall sprite
            skews by — so the body follows the mattress exactly rather than by
            eye. Its own <g>: the breathe animation below can't share an element
            with a transform attribute. */}
        <g transform={`rotate(${-SKEW}) scale(-1,1)`}>
        <g className="body-breathe" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          {/* body along the bed, knees slightly raised */}
          <rect x="-20" y="-11" width="34" height="12" rx="6" style={outfit} />
          {/* Lit along the top, falling away underneath — the same two-tone
              treatment the standing figure got. Without it this pose stayed
              the one flat-green shape it always was while the other two
              picked up volume. */}
          <rect x="-19" y="-10.4" width="32" height="4" rx="2" fill="#fff" opacity="0.12" />
          <rect x="-20" y="-5" width="34" height="6" rx="3" fill="#000" opacity="0.12" />
          <ellipse cx="12" cy="-9" rx="8" ry="6" style={outfit} />
          {/* arm resting on top of the covers */}
          <rect x="-12" y="-14" width="14" height="4.6" rx="2.3" style={outfit} />
          <rect x="-12" y="-14" width="14" height="4.6" rx="2.3" fill="#fff" opacity="0.1" />
          <circle cx="1" cy="-11.7" r="2.4" fill={skin} />
          {/* head on the pillow, eyes closed whatever the waking expression.
              A collar at the neck end so the head doesn't read as set down
              beside the body. */}
          <ellipse cx="-16.5" cy="-11.5" rx="3.2" ry="4.4" style={outfit} />
          <circle cx="-23" cy="-13" r={HEAD_R} fill={skin} />
          <path d={`M-30.4 -13 a7.4 7.4 0 0 1 14.8 0 q-2 -2.6 -5 -2.2 q-4.4 -3 -8.8 0.6 z`} fill={hairColor} />
          <path d="M-26.4 -12.4 q1.6 1.4 3.2 0" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
          <path d="M-21 -12.6 q1.5 1.3 3 0" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
          <ellipse cx="-27" cy="-10" rx="1.6" ry="1" fill="#e8a3a8" opacity="0.4" />
        </g>
        </g>
      </g>
    );
  }
  // Seated, the body rests ON the seat, so the torso's bottom edge belongs at
  // the seat line (sinking a px into the cushion), not hovering above it —
  // and low enough that the thighs emerge from under it rather than behind it.
  const torsoY = seated ? seatTorsoY : standTorsoY;
  const headY = seated ? seatHeadY : standHeadY;
  // The floor is at +seatH (the scene lifts a seated resident by exactly
  // that), less a couple of px so the sole meets it instead of sinking
  // through. The floor keeps a low cushion from reducing the shin to a stub.
  const ankle = Math.max(SEAT_KNEE_Y + 6, seatH - 2);
  // Hands are on a keyboard, so the arms have a job and the idle gestures don't
  // get them. The head is free either way — someone yawning at their desk is
  // exactly the point.
  // Sleeve length: the COAT's sleeves cover the arm whenever one is worn
  // (that's what wearing a coat means); coatless, the top decides — a short
  // sleeve stops at the elbow and lets the forearm show as skin. A worn coat
  // also thickens the sleeve — outward only, so the hand hangs from the same
  // spot — because a shell one step proud of the torso over shirt-thin arms
  // reads as a bib, not a layer.
  const wornGarment = garmentOf(ch.garment);
  const coatWorn = !!ch.coat && ch.coat !== "none";
  const coatStyle = tinted(ch.coatColor || "#8a5346");
  const sleeveShort = !coatWorn && wornGarment.sleeves === "short";
  const sleeveBulk = coatWorn ? (ch.coat === "puffer" ? 1.6 : 0.9) : 0;
  // The arm's sleeve is painted by whatever's outermost — except the
  // `sleeves: "inner"` garments, whose whole point is arms in the SECOND
  // colour: the vest's shirt sleeves, the varsity's leather arms.
  const sleevesInner = coatWorn
    ? coatOf(ch.coat).sleeves === "inner"
    : wornGarment.sleeves === "inner";
  const armStyle = sleevesInner
    ? { fill: ch.inner || "#f2e9dd" }
    : coatWorn
    ? coatStyle
    : outfit;
  // THE LIGHT, resolved once for the whole figure: the OUTERMOST layer's
  // registry entry declares its finish (how strongly the shared form shadow
  // and highlight land — knit is matte, nylon sheens), its cuffs, and
  // whether it drapes past the hem; its colour's luminance rebalances the
  // shadow/highlight pair so near-black and cream garments still model.
  const outerEntry = GARMENT_REGISTRY[coatWorn ? ch.coat : ch.garment] || {};
  const finish = outerEntry.finish || DEFAULT_FINISH;
  const bodyTone = toneFor(coatWorn ? ch.coatColor || "#8a5346" : ch.outfit || "#7faf8f");
  const cuff = !!outerEntry.cuffs;
  const drape = !!outerEntry.drape;
  const trouser = ch.trouser || TROUSER;
  const pants = ch.pants || "trousers";
  // The skirt kinds: the legs render bare (see PANTS_FORM) and the flare is
  // drawn HERE, at hip level between the hair's length and the torso — it's
  // clothing on the hips, not part of a leg.
  const skirted = !!pantsFormOf(pants).bare;
  const skirtHem = -legH * (pants === "pleats" ? 0.42 : 0.52);
  const view = facing || (away ? "back" : "front");
  const back = view === "back";
  // A hat REPLACES the crown hair (front + behind layers), the research
  // rule: a hat drawn over the full dome reads as a balloon perched on a
  // wig. LENGTH survives — drapes, plaits and tails keep falling from under
  // the rim, which is what makes the hat read as worn over a hairstyle.
  const hatted = ch.hat && ch.hat !== "none";
  const typing = activity === "focus" && seated;
  // A break used to be indistinguishable from idle in the room: the phase
  // reached the app and stopped at the thought bubble. Now they put the keyboard
  // down, pick up a mug and stretch — the one moment the room should notice.
  const resting = activity === "break";
  // ---- the PROFILE: its own drawing, not a squeezed front ---------------- //
  // A body seen side-on is one leg wide: the torso narrows to its depth, both
  // legs stand near the centre line (near ahead of far), ONE arm shows, the
  // face gains a nose and loses an eye, and the hair swaps to its side
  // silhouette. Standing/walking only — a seated figure keeps the front pair,
  // because seats already choose their facing via rot + mirror.
  if (view === "side" && !seated && !lying) {
    const sSh = Math.max(4.8, sh * 0.6);
    const sWa = Math.max(4.4, wa * 0.62);
    const sHem = Math.max(4.6, hem * 0.62);
    return (
      <g transform={`translate(${c.x}, ${c.y})`}>
        <g
          className={held ? "held-dangle" : undefined}
          style={held ? { transformBox: "fill-box", transformOrigin: "center top" } : undefined}
        >
          <g className={moving ? "leg-stride-a" : undefined}>
            <g style={hangLimb(held, -5)}>
              <SideLeg far legW={legW} legH={legH} trouser={trouser} pants={pants} skin={skin} shoes={ch.shoes} shoeColor={ch.shoeColor} />
            </g>
          </g>
          <g className={moving ? "leg-stride-b" : undefined}>
            <g style={hangLimb(held, 6)}>
              <SideLeg legW={legW} legH={legH} trouser={trouser} pants={pants} skin={skin} shoes={ch.shoes} shoeColor={ch.shoeColor} />
            </g>
          </g>
          <g className={moving ? "walk-bob" : undefined}>
            <g className={moving ? "walk-roll" : undefined}>
              <HairSideLength style={ch.hair} headY={headY} color={hairColor} />
              {skirted && (
                <g>
                  <path
                    d={`M ${-sHem + 0.4} ${-legH + 2} L ${sHem - 0.4} ${-legH + 2}
                        L ${sHem + 2.4} ${skirtHem - 1.4} Q 0 ${skirtHem + 0.8} ${-sHem - 2.4} ${skirtHem - 1.4} Z`}
                    fill={trouser}
                  />
                  <path
                    d={`M ${-sHem - 2.4} ${skirtHem - 1.4} Q 0 ${skirtHem + 0.8} ${sHem + 2.4} ${skirtHem - 1.4}
                        L ${sHem + 1.4} ${skirtHem - 2.6} Q 0 ${skirtHem - 0.6} ${-sHem - 1.4} ${skirtHem - 2.6} Z`}
                    fill="#000"
                    opacity="0.14"
                  />
                  {pants === "pleats" &&
                    [-sHem * 0.5, sHem * 0.5].map((x) => (
                      <path
                        key={x}
                        d={`M ${x} ${-legH + 4} L ${x * 1.4} ${skirtHem - 1}`}
                        stroke="#000"
                        strokeWidth="0.8"
                        opacity="0.13"
                        fill="none"
                      />
                    ))}
                </g>
              )}
              <g
                className="body-breathe"
                style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
              >
                {(() => {
                  const geom = {
                    sh: sSh,
                    wa: sWa,
                    hem: sHem,
                    top: torsoY,
                    bot: torsoY + torsoH,
                    waistY: torsoY + waistDrop,
                  };
                  const { band } = torsoGeom(geom);
                  // The profile torso is NOT the front torso squeezed — a
                  // symmetric slab is what made the side view read as a
                  // plank (owner: "really unflattering"). A body seen
                  // side-on is an S: the chest carries FORWARD above the
                  // waist, the belly tucks in below it, and the seat sits
                  // BACK at the hem. The deviations are under a px each —
                  // silhouette language, not anatomy.
                  const top = torsoY;
                  const bot = torsoY + torsoH;
                  const waistY = torsoY + waistDrop;
                  const body = `M ${-sSh + 3.5} ${top}
                    Q ${-sSh - 0.4} ${top + 0.5} ${-sSh - 0.7} ${top + 7}
                    Q ${-sWa - 1} ${waistY} ${-sHem + 0.9} ${bot - 3}
                    Q ${-sHem + 0.9} ${bot} ${-sHem + 3.4} ${bot}
                    L ${sHem - 3} ${bot}
                    Q ${sHem + 0.8} ${bot} ${sHem + 0.8} ${bot - 3}
                    Q ${sWa + 0.9} ${waistY} ${sSh - 0.4} ${top + 7}
                    Q ${sSh} ${top + 0.5} ${sSh - 3.5} ${top} Z`;
                  return (
                    <>
                      <path d={body} style={outfit} />
                      {/* Wrap-around prints show side-on too — same shapes,
                          clipped to the narrow torso. */}
                      {ch.print && ch.print !== "none" && (
                        <>
                          <clipPath id={`${clipId}s`}>
                            <path d={body} />
                          </clipPath>
                          <g clipPath={`url(#${clipId}s)`} fill={ch.inner}>
                            {ch.print === "stripes" &&
                              [4.5, 9.5, 14.5].map((dy) => (
                                <rect key={dy} x={-sHem - 2} y={torsoY + dy} width={(sHem + 2) * 2} height="2.1" opacity="0.85" />
                              ))}
                            {ch.print === "chest" && (
                              <rect x={-sHem - 2} y={torsoY + 5} width={(sHem + 2) * 2} height="4.6" opacity="0.9" />
                            )}
                            {ch.print === "dots" &&
                              [5.5, 9.5, 13.5].flatMap((dy, row) =>
                                [-4, 0, 4].map((dx) => (
                                  <circle key={`${dx},${dy}`} cx={dx + (row % 2) * 2} cy={torsoY + dy} r="0.95" opacity="0.85" />
                                ))
                              )}
                          </g>
                        </>
                      )}
                      <g style={outfit}>
                        <Garment kind={ch.garment} {...geom} inner={ch.inner} outfit={outfit} view="side" />
                      </g>
                      <Coat
                        kind={ch.coat}
                        {...geom}
                        topColor={`var(--tint, ${ch.outfit || "#7faf8f"})`}
                        coatStyle={coatStyle}
                        view="side"
                      />
                      {/* the same ONE-light pass the front gets: form shadow
                          down the front edge (light sits behind a left-facing
                          profile), warm glint, hem occlusion */}
                      <path
                        d={`M ${-sSh + 0.4} ${torsoY + 4.5}
                            Q ${-sWa + 0.4} ${torsoY + waistDrop} ${-sHem + 0.4} ${torsoY + torsoH - 1.8}
                            L ${-sHem + 0.6} ${torsoY + torsoH - 0.3}
                            L ${-sHem + 2.6} ${torsoY + torsoH - 0.3}
                            Q ${-sWa + 2.4} ${torsoY + waistDrop} ${-sSh + 2.3} ${torsoY + 6}
                            Q ${-sSh + 1.2} ${torsoY + 4.7} ${-sSh + 0.4} ${torsoY + 4.5} z`}
                        fill={SHADE}
                        opacity={finish.shade * bodyTone.shade}
                      />
                      <ellipse
                        cx="0.8"
                        cy={torsoY + 3.5}
                        rx={sSh - 1.2}
                        ry="4.6"
                        fill={GLINT}
                        opacity={finish.glint * 1.3 * bodyTone.glint}
                      />
                      <path d={band} fill="#000" opacity="0.14" />
                      {!drape && (
                        <rect
                          x={-sHem + 1.2}
                          y={torsoY + torsoH - 0.2}
                          width={(sHem - 1.2) * 2}
                          height="1.8"
                          rx="0.9"
                          fill="#000"
                          opacity="0.13"
                        />
                      )}
                    </>
                  );
                })()}
                {/* the one visible arm, hanging at the body's centre line —
                    elbows bow BACKWARD, which a tiny sh does for free. It
                    casts a soft shadow onto the torso behind it (inside the
                    same wrappers, so the shadow swings with the arm): without
                    one the sleeve read as a stripe painted down the body. */}
                <g className={moving ? "walk-arm-a" : undefined}>
                  <g style={hangLimb(held, 8)}>
                    <path
                      d={`M 0.8 ${torsoY + 5.2} L 3.2 ${torsoY + 12.6} L 2.2 ${torsoY + 18}`}
                      stroke="#000"
                      strokeWidth="5.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity="0.1"
                    />
                    {/* sh=2.2 tucks the resting arm toward the BACK half of
                        the body, and edges off — with them the arm read as a
                        painted stripe down the torso at room scale (owner
                        screenshot, twice). The contact shadow above is what
                        separates it now. */}
                    <Arm
                      side={1}
                      sh={2.2}
                      torsoY={torsoY}
                      skin={skin}
                      outfit={armStyle}
                      shortSleeve={sleeveShort}
                      bulk={sleeveBulk}
                      cuff={cuff}
                      tone={bodyTone}
                      edges={false}
                    />
                  </g>
                </g>
                <rect x="-2.6" y={headY + HEAD_R - 1} width="5.2" height={torsoY - headY - HEAD_R + 4} fill={skin} />
                <rect x="-2.6" y={headY + HEAD_R - 1} width="5.2" height={torsoY - headY - HEAD_R + 4} fill="#000" opacity="0.16" />
                <ellipse cx="0" cy={torsoY + 1.5} rx={Math.max(2.8, sSh - 2)} ry="2.4" style={outfit} />
                <ellipse cx="0" cy={torsoY + 1.5} rx={Math.max(2.8, sSh - 2)} ry="2.4" fill="#fff" opacity="0.1" />
                <GarmentCollar kind={ch.garment} headY={headY} torsoY={torsoY} outfit={outfit} />
                {/* head-only gestures keep playing in profile; the arm ones
                    stand down — they're front-view choreography. The OUTER
                    wrapper carries the head's forward lean (an attribute
                    transform can't share the animated gesture elements): a
                    head centred over a chest that bulges forward read as a
                    slump, so the whole head unit shifts with the chest. */}
                <g transform="translate(-0.7 0)">
                <g className="gesture-yawn">
                  <g className="gesture-look">
                    <circle cx="0" cy={headY} r={HEAD_R} fill={skin} />
                    {!hatted && <HairSide style={ch.hair} headY={headY} color={hairColor} />}
                    <Hat kind={ch.hat} headY={headY} />
                    <SideFace expression={ch.expression} headY={headY} skin={skin} />
                  </g>
                </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    );
  }
  return (
    <g transform={`translate(${c.x}, ${c.y})`}>
      {/* Held: ONE wrapper for the whole body, pivoting at the top of the head
          (`center top` of the fill-box — the scruff your fingers have hold of).
          It can't share the element with the translate above, per the
          attribute-vs-animation rule, so it's its own <g>. */}
      <g
        className={held ? "held-dangle" : undefined}
        style={held ? { transformBox: "fill-box", transformOrigin: "center top" } : undefined}
      >
      {seated ? (
        <>
          <SeatedLeg side={-1} ankle={ankle} thighW={thighW} shinW={shinW} trouser={trouser} pants={pants} skin={skin} shoes={ch.shoes} shoeColor={ch.shoeColor} far />
          <SeatedLeg side={1} ankle={ankle} thighW={thighW} shinW={shinW} trouser={trouser} pants={pants} skin={skin} shoes={ch.shoes} shoeColor={ch.shoeColor} />
        </>
      ) : (
        <>
          {/* Legs run the full LEG_H — at 15px they were stubs under a long
              torso, which is most of what made the figure read as a toddler.
              The far one uses the depth colours the seated pose already had
              (TROUSER_FAR/SHOE_FAR) so two legs don't merge into one block.
              While moving they SCISSOR from the hip — a stiff clay-toy stride,
              swing fore-and-aft, not the old vertical piston that hopped each
              trouser leg straight up and read as pedalling in place. */}
          {/* Held, the legs hang: a few degrees apart from the hip, dead
              still. Feet that stay parallel and level read as standing on
              something, which is the one thing they must not read as when
              there's no floor under them. */}
          <g className={moving ? "leg-stride-a" : undefined}>
            <g style={hangLimb(held, -5)}>
              <StandingLeg side={-1} legW={legW} legH={legH} trouser={trouser} pants={pants} skin={skin} shoes={ch.shoes} shoeColor={ch.shoeColor} far />
            </g>
          </g>
          <g className={moving ? "leg-stride-b" : undefined}>
            <g style={hangLimb(held, 6)}>
              <StandingLeg side={1} legW={legW} legH={legH} trouser={trouser} pants={pants} skin={skin} shoes={ch.shoes} shoeColor={ch.shoeColor} />
            </g>
          </g>
        </>
      )}
      {/* Everything above the hips moves as ONE mass while walking — a bob (one
          per step) and a lean onto the planted foot (one per stride), the Animal
          Crossing waddle. TWO wrappers for the two clocks: both animate
          `transform`, and two animations on one element cancel — which is also
          why these sit outside body-breathe. HairLength rides inside, or long
          hair would shear off the rolling head. */}
      <g className={moving ? "walk-bob" : undefined}>
      <g className={moving ? "walk-roll" : undefined}>
      {/* Before the torso: length falls behind the body, not onto the chest. */}
      <HairLength style={ch.hair} headY={headY} color={hairColor} />
      {/* The skirt flare, over the bare legs and under the torso's hem.
          Standing only — seated, the cloth already drapes the lap via the
          leg drawing. */}
      {skirted && !seated && (
        <g>
          <path
            d={`M ${-hem + 0.6} ${-legH + 2} L ${hem - 0.6} ${-legH + 2}
                L ${hem + 3.6} ${skirtHem - 1.6} Q 0 ${skirtHem + 1} ${-hem - 3.6} ${skirtHem - 1.6} Z`}
            fill={trouser}
          />
          <path
            d={`M ${-hem - 3.6} ${skirtHem - 1.6} Q 0 ${skirtHem + 1} ${hem + 3.6} ${skirtHem - 1.6}
                L ${hem + 2.4} ${skirtHem - 3} Q 0 ${skirtHem - 0.6} ${-hem - 2.4} ${skirtHem - 3} Z`}
            fill="#000"
            opacity="0.14"
          />
          {/* two pipe folds falling from the waistband — hanging cloth
              gathers where it's suspended; wedges, not lines, and
              deliberately off-symmetric */}
          {pants === "skirt" &&
            [-0.5, 0.58].map((f) => (
              <path
                key={f}
                d={`M ${f * hem * 0.7} ${-legH + 3} L ${f * (hem + 2.8) - 0.8} ${skirtHem - 2.6}
                    L ${f * (hem + 2.8) + 0.8} ${skirtHem - 2.6} z`}
                fill={SHADE}
                opacity="0.13"
              />
            ))}
          {pants === "pleats" &&
            [-hem * 0.6, 0, hem * 0.6].map((x) => (
              <path
                key={x}
                d={`M ${x} ${-legH + 4} L ${x * 1.5} ${skirtHem - 1.2}`}
                stroke="#000"
                strokeWidth="0.8"
                opacity="0.13"
                fill="none"
              />
            ))}
        </g>
      )}
      <g className="body-breathe" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
        {/* The torso TAPERS: shoulders proud, waist drawn in. As a plain rect
            it was the same width top to bottom, which is what made the body
            read as a pill with a head on it rather than a person. */}
        {(() => {
          const { body, band } = torsoGeom({
            sh,
            wa,
            hem,
            top: torsoY,
            bot: torsoY + torsoH,
            waistY: torsoY + waistDrop,
          });
          return (
            <>
              <path d={body} style={outfit} />
              {/* The PRINT: pattern shapes in the inner colour, clipped to
                  the torso so they can never spill past the silhouette. Under
                  the garment layer — an outer shell covers its print exactly
                  the way a real jacket covers a shirt. */}
              {ch.print && ch.print !== "none" && (
                <>
                  <clipPath id={clipId}>
                    <path d={body} />
                  </clipPath>
                  <g clipPath={`url(#${clipId})`} fill={ch.inner}>
                    {ch.print === "stripes" &&
                      [4.5, 9.5, 14.5].map((dy) => (
                        <rect
                          key={dy}
                          x={-hem - 2}
                          y={torsoY + dy}
                          width={(hem + 2) * 2}
                          height="2.1"
                          opacity="0.85"
                        />
                      ))}
                    {ch.print === "chest" && (
                      <rect
                        x={-hem - 2}
                        y={torsoY + 5}
                        width={(hem + 2) * 2}
                        height="4.6"
                        opacity="0.9"
                      />
                    )}
                    {ch.print === "dots" &&
                      [5.5, 9.5, 13.5].flatMap((dy, row) =>
                        [-6, -2, 2, 6].map((dx) => (
                          <circle
                            key={`${dx},${dy}`}
                            cx={dx + (row % 2) * 2}
                            cy={torsoY + dy}
                            r="0.95"
                            opacity="0.85"
                          />
                        ))
                      )}
                  </g>
                </>
              )}
              {/* The garment, over the plain torso — see garments.jsx. Drawn
                  before the volume shading so the light catch and the waist
                  band fall across the whole dressed body, not just the bits of
                  torso the garment left showing. The COAT goes over the
                  finished top, in its own colour — the two-slot wardrobe. */}
              <g style={outfit}>
                <Garment
                  kind={ch.garment}
                  sh={sh}
                  wa={wa}
                  hem={hem}
                  top={torsoY}
                  bot={torsoY + torsoH}
                  waistY={torsoY + waistDrop}
                  inner={ch.inner}
                  outfit={outfit}
                  view={back ? "back" : "front"}
                />
              </g>
              <Coat
                kind={ch.coat}
                sh={sh}
                wa={wa}
                hem={hem}
                top={torsoY}
                bot={torsoY + torsoH}
                waistY={torsoY + waistDrop}
                topColor={`var(--tint, ${ch.outfit || "#7faf8f"})`}
                coatStyle={coatStyle}
                view={back ? "back" : "front"}
              />
              {/* Volume via the ONE light (docs/MODELS.md): a form-shadow
                  CRESCENT down the whole shadow side, following the torso's
                  own curve — the garment canvas was the only unshaded surface
                  on the figure, which is most of why clothes read flatter
                  than the body wearing them. It rides OVER the garment and
                  coat, so their marks dim inside the shadow the way fabric
                  detail really does. Strength = the outer layer's declared
                  finish × its colour's luminance tone. */}
              <ellipse cx="0" cy={torsoY + 4.6} rx="3.6" ry="1.3" fill="#000" opacity="0.1" />
              <path
                d={`M ${-sh + 0.5} ${torsoY + 4.5}
                    Q ${-wa + 0.5} ${torsoY + waistDrop} ${-hem + 0.5} ${torsoY + torsoH - 1.8}
                    L ${-hem + 0.7} ${torsoY + torsoH - 0.3}
                    L ${-hem + 3.4} ${torsoY + torsoH - 0.3}
                    Q ${-wa + 3.2} ${torsoY + waistDrop} ${-sh + 3.1} ${torsoY + 6.5}
                    Q ${-sh + 1.5} ${torsoY + 4.8} ${-sh + 0.5} ${torsoY + 4.5} z`}
                fill={SHADE}
                opacity={finish.shade * bodyTone.shade}
              />
              {/* the lit shoulder, biased toward the light */}
              <ellipse
                cx="1.2"
                cy={torsoY + 3.5}
                rx={sh - 1.5}
                ry="4.6"
                fill={GLINT}
                opacity={finish.glint * 1.3 * bodyTone.glint}
              />
              <path d={band} fill="#000" opacity="0.14" />
              {/* the hem's occlusion onto whatever's below — what grounds the
                  top ON the bottoms instead of floating beside them. Draping
                  layers (dress, cardigan) opt out: their own cloth is what's
                  below the hem. */}
              {!drape && (
                <rect
                  x={-hem + 1.5}
                  y={torsoY + torsoH - 0.2}
                  width={(hem - 1.5) * 2}
                  height="2"
                  rx="1"
                  fill="#000"
                  opacity="0.14"
                />
              )}
            </>
          );
        })()}
        {/* arms — they type when a focus block is running and they're seated,
            and otherwise stretch or reach up to rub an eye. The gesture
            wrappers are OUTSIDE the typing class and the rub is INSIDE it:
            two animations fighting over one element's transform would cancel,
            whereas nested ones compose. Typing wins outright though — hands on
            a keyboard are already the animation, and arms stretching mid-keystroke
            reads as a glitch rather than as a person. */}
        <g className={resting ? "break-stretch" : undefined}>
          {/* Gestures stand down mid-stride, the same way they yield to typing:
              an arm reaching overhead while the legs scissor reads as a glitch,
              and both animations would be fighting the swing below. */}
          <g className={typing || moving || held ? undefined : "gesture-stretch"}>
            <g className={typing ? "resident-type" : undefined}>
              {/* The FAR arm carries leg B's clock, so it opposes the far leg
                  (which is A) — contralateral swing, the thing that separates
                  walking from being wheeled along. */}
              <g className={moving ? "walk-arm-b" : undefined}>
                <g style={hangLimb(held, -7)}>
                {/* Two segments and an elbow — see Arm. A short sleeve stops
                    AT the joint and the forearm shows as skin. */}
                <Arm
                  side={-1}
                  sh={sh}
                  torsoY={torsoY}
                  skin={skin}
                  outfit={armStyle}
                  shortSleeve={sleeveShort}
                  bulk={sleeveBulk}
                  cuff={cuff}
                  tone={bodyTone}
                  far
                />
                </g>
              </g>
              {/* The eye-rub is suppressed on a break because this hand is
                  holding something: at 186° the mug would come up over the face
                  upside down. */}
              <g className={moving ? "walk-arm-a" : undefined}>
              <g className={typing || resting || moving || held ? undefined : "gesture-rub"}>
              <g style={hangLimb(held, 8)}>
                <Arm
                  side={1}
                  sh={sh}
                  torsoY={torsoY}
                  skin={skin}
                  outfit={armStyle}
                  shortSleeve={sleeveShort}
                  bulk={sleeveBulk}
                  cuff={cuff}
                  tone={bodyTone}
                />
                {/* The mug lives INSIDE the arm, so it tracks the hand through
                    every gesture for free — it rises with a stretch instead of
                    hanging in the air where the hand used to be. Same palette as
                    the catalog mug so the two read as the same object. */}
                {resting && (
                  <g transform={`translate(${sh + 0.9}, ${torsoY + 19.4})`}>
                    <rect x="-2.6" y="-3.4" width="5.2" height="4.6" rx="0.6" fill="#f2e9dd" />
                    <rect x="-2.6" y="-1.2" width="5.2" height="2.4" rx="0.6" fill="#000" opacity="0.14" />
                    <path d="M2.6 -2.6 q2 0.8 0 2.6" fill="none" stroke="#f2e9dd" strokeWidth="0.9" />
                    <ellipse cx="0" cy="-3.4" rx="2.6" ry="1.1" fill="#f7f2ea" />
                    <ellipse cx="0" cy="-3.4" rx="1.7" ry="0.7" fill="#5a3a24" />
                    <g className="steam-puff">
                      <ellipse cx="0" cy="-6.4" rx="1.1" ry="1.9" fill="#fff" opacity="0.32" />
                    </g>
                  </g>
                )}
              </g>
              </g>
              </g>
            </g>
          </g>
        </g>
        {/* Neck, then a collar sitting on the shoulders. The head used to
            meet the torso directly, which is a large part of why the figure
            read as a bundle rather than a body — the neck is short, but the
            collar is what actually sells it. It reaches from under the chin to
            just inside the torso top so no pose can leave a gap. */}
        <rect x="-2.6" y={headY + HEAD_R - 1} width="5.2" height={torsoY - headY - HEAD_R + 4} fill={skin} />
        <rect
          x="-2.6"
          y={headY + HEAD_R - 1}
          width="5.2"
          height={torsoY - headY - HEAD_R + 4}
          fill="#000"
          opacity="0.16"
        />
        <ellipse cx="0" cy={torsoY + 1.5} rx={sh - 3.4} ry="2.4" style={outfit} />
        <ellipse cx="0" cy={torsoY + 1.5} rx={sh - 3.4} ry="2.4" fill="#fff" opacity="0.1" />
        {/* A garment's own neck piece (the turtleneck's roll) — after the
            skin neck and the collar ellipse, or they'd paint over it. */}
        <GarmentCollar kind={ch.garment} headY={headY} torsoY={torsoY} outfit={outfit} />
        {/* The head is one unit so it can move as one, and each cycle that moves
            it needs its OWN element — two animations on one element would just
            cancel. So: yawn (tilts back), rub (leans into the raised hand),
            glance (turns). Everything inside keeps its own attribute transform
            (the crown sheen has one) — the rule is only that an animation may
            not share an ELEMENT with one. The neck and collar stay outside, so
            a turning head turns against a body that doesn't. */}
        <g className="gesture-yawn">
          {/* Both halves of the rub take the same gate, `moving` included: the
              arm half stands down mid-stride, and a head leaning into a hand
              that isn't raised is worse than no gesture at all. The yawn and
              the glance above are head-only and keep playing — yawning on the
              way across the room is fine. */}
          <g className={typing || resting || moving || held ? undefined : "gesture-rub-head"}>
            <g className="gesture-look">
              {/* Inside the gesture wrappers on purpose: hair turns with the
                  head. Behind the face is what matters, not behind the body.
                  Turned away, the face side of the skull IS the back of the
                  head: HairBack covers it and the hairline layers stand down. */}
              {!hatted && !back && (
                <HairBehind style={ch.hair} headY={headY} color={hairColor} />
              )}
              <circle cx="0" cy={headY} r={HEAD_R} fill={skin} />
              {back && !hatted && (
                <HairBack style={ch.hair} headY={headY} color={hairColor} />
              )}
              {!hatted && !back && (
                <HairFront style={ch.hair} headY={headY} color={hairColor} />
              )}
              {/* No assembly-level sheen: each style's registry entry carries
                  its own NOTCHED crown band now (hair.jsx `shine`), and the
                  generic ellipse stacked on top of it read as a smudge. Tight
                  gathered styles are deliberately matte. (The hat still
                  brings its own light catch.) */}
              {/* The hat, worn OVER the finished hair and its sheen — inside
                  the gesture group, so it turns with a glance instead of
                  hovering while the head moves under it. */}
              <Hat kind={ch.hat} headY={headY} />
              {!back && <Face expression={ch.expression} headY={headY} />}
              {!back && (
                <>
                  <ellipse cx="-5.2" cy={headY + 3.3} rx="1.7" ry="1" fill="#e8a3a8" opacity="0.4" />
                  <ellipse cx="5.2" cy={headY + 3.3} rx="1.7" ry="1" fill="#e8a3a8" opacity="0.4" />
                </>
              )}
              {/* The yawn itself. `opacity` is a presentation ATTRIBUTE, which the
                  keyframes outrank while they run but which takes over the moment
                  they don't — so under reduced motion the mouth is simply shut,
                  rather than a character left permanently gaping. */}
              {!back && (
                <ellipse
                  className="gesture-yawn-mouth"
                  cx="0"
                  cy={headY + 5.1}
                  rx="1.9"
                  ry="2.5"
                  fill={INK}
                  opacity="0"
                />
              )}
            </g>
          </g>
        </g>
      </g>
      </g>
      </g>
      </g>
    </g>
  );
}

/**
 * The little cloud over your character's head, the way The Sims does it: a
 * puff of thought with one readable icon in it.
 *
 * Drawn ABOVE the resident's head and inside the same group, so when they're
 * seated (and the whole sprite is lifted by the seat height) the bubble rides
 * up with them instead of hanging in the air where they used to stand.
 *
 * One icon, no text — at room scale a word would be unreadable, and the whole
 * point is that you can tell at a glance from across the room.
 */
function ThoughtBubble({ mood, x = 10, y = -58, mirrored = false }) {
  const icon = MOODS[mood];
  if (!icon) return null;
  return (
    // The attribute transform goes on a WRAPPER and the animation on the
    // child: a CSS animation's `transform` property overrides an SVG
    // `transform` attribute outright, so with both on one element the offset
    // was thrown away and the cloud rendered on the character's chest.
    // (docs/MODELS.md §6 — third time this has bitten.)
    //
    // On an odd rotation the scene mirrors the whole persona, which would
    // hand you a backwards book and a mug with the handle on the wrong side —
    // lit from the left while the rest of the room is lit from the right.
    // Flipping again here cancels it, and the negated offset keeps the cloud
    // on the same side of the head on SCREEN.
    <g
      transform={mirrored ? `translate(${-x},${y}) scale(-1,1)` : `translate(${x},${y})`}
      aria-hidden="true"
    >
      {/* keyed by mood so switching book → mug REMOUNTS this group and the
          pop plays again; without it React swapped the icon in place and the
          transition passed by unannounced */}
      <g key={mood} className="thought-pop">
      {/* the two trailing puffs, smallest nearest the head */}
      <circle cx="-9" cy="12" r="1.5" fill="#f7f2ea" opacity="0.85" />
      <circle cx="-6" cy="7.5" r="2.3" fill="#f7f2ea" opacity="0.92" />
      {/* the cloud: four overlapping ellipses rather than one, so the outline
          is lumpy the way a thought bubble should be */}
      <ellipse cx="0" cy="-1" rx="11" ry="7.5" fill="#f7f2ea" />
      <ellipse cx="-7.5" cy="1" rx="5.5" ry="4.5" fill="#f7f2ea" />
      <ellipse cx="7.5" cy="1" rx="5.5" ry="4.5" fill="#f7f2ea" />
      <ellipse cx="-1" cy="-6" rx="7" ry="5" fill="#f7f2ea" />
      {icon === "book" ? (
        // an open book: two leaves either side of a spine
        <g>
          <path d="M-6 -1.5 q3 -2.2 5.4 0 l0 5 q-2.4 -1.8 -5.4 0 z" fill="#5b6b9b" />
          <path d="M6 -1.5 q-3 -2.2 -5.4 0 l0 5 q2.4 -1.8 5.4 0 z" fill="#7f8fc0" />
          <rect x="-0.5" y="-2.4" width="1" height="6.4" rx="0.5" fill="#3a3142" opacity="0.55" />
        </g>
      ) : (
        // a mug, with steam — the same read as the `mug` catalog item
        <g>
          <rect x="-4" y="-2.5" width="7.5" height="6" rx="1.2" fill="#c9847e" />
          <path d="M3.5 -1 q3 1 0 3.4" fill="none" stroke="#c9847e" strokeWidth="1.4" />
          <ellipse cx="-0.25" cy="-2.5" rx="3.75" ry="1.3" fill="#f2e2cf" />
          <path d="M-1.5 -5.5 q1.5 -1.6 0 -3.2" fill="none" stroke="#cbb6a0" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        </g>
      )}
      </g>
    </g>
  );
}

/**
 * You — the resident drawn with the character from your profile, and the only
 * one that thinks. Everyone else in the room stays generic on purpose.
 */
export function You({ mood, mirrored = false, ...rest }) {
  // The cloud hangs just above the head — and the head is somewhere different
  // in each pose. One fixed offset left it a whole head-height clear of a
  // SEATED character, which is the pose this feature exists for (you only
  // type while sitting), and stranded over the headboard when lying down.
  // Anchored to the body's head positions (plus a per-pose clearance) so a
  // proportion retune — or this character's own height slider — moves the
  // cloud with the skull instead of leaving it at a height the head no
  // longer reaches. Lying keeps its fixed spot — that pose's head is its
  // own drawing.
  const { standHeadY, seatHeadY } = figureMetrics(rest.character);
  const spot = rest.lying
    ? { x: -14, y: -30 }
    : rest.seated
    ? { x: 10, y: seatHeadY - 17 }
    : { x: 10, y: standHeadY - 15.5 };
  return (
    <g>
      <Resident {...rest} />
      <ThoughtBubble mood={mood} x={spot.x} y={spot.y} mirrored={mirrored} />
    </g>
  );
}
