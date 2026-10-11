// Authored seated lower-body silhouettes. Chair height still owns the floor
// line; the pose only changes how the legs travel from hip to knee to ankle.
// Keeping this separate from body.jsx prevents each new personality pose from
// turning the shared standing/profile body module into another switchboard.
import { farColor } from "../../lib/body";
import { toneFor } from "../../lib/tint";
import {
  FrontShoe,
  GLINT,
  SEAT_KNEE_X,
  SEAT_KNEE_Y,
  SHADE,
  SHOE,
  SKIN,
  STITCH,
  TROUSER,
  pantsFormOf,
} from "./body";

const geometryFor = (pose, side, floorAnkle) => {
  if (pose === "ankles") {
    return {
      hipX: side * 3.4,
      kneeX: side * (SEAT_KNEE_X + 0.2),
      kneeY: SEAT_KNEE_Y,
      ankleX: side * -1.8,
      ankleY: floorAnkle,
      shoeTurn: side * -7,
    };
  }
  if (pose === "crossed") {
    return {
      hipX: side * 3.2,
      kneeX: side * (SEAT_KNEE_X + 2.1),
      kneeY: SEAT_KNEE_Y + 0.8,
      ankleX: side * -3.1,
      ankleY: SEAT_KNEE_Y + 6.2,
      shoeTurn: side * -13,
    };
  }
  return {
    hipX: side * 3.6,
    kneeX: side * SEAT_KNEE_X,
    kneeY: SEAT_KNEE_Y,
    ankleX: side * SEAT_KNEE_X,
    ankleY: floorAnkle,
    shoeTurn: 0,
  };
};

/** A skirt spans BOTH thighs. Separate cloth strokes turn it into shorts. */
export function SeatedSkirt({ hem, thighW, ankle, pants, color, pose = "relaxed" }) {
  const waist = hem - 0.5;
  const poseSpread = pose === "crossed" ? 1.5 : 0;
  const kneeWidth = Math.max(hem + 1.2, SEAT_KNEE_X + thighW / 2 + poseSpread);
  const bottom = pants === "maxi" ? ankle - 1.5 : SEAT_KNEE_Y + (pants === "pleats" ? 4 : 2.8);
  const edge = kneeWidth - (pants === "maxi" ? 0.6 : 0);
  const tone = toneFor(color);
  return (
    <g data-seated-skirt={pants}>
      <path d={`M ${-waist} -2 Q ${-kneeWidth} 1 ${-edge} ${bottom}
        Q 0 ${bottom + 1.8} ${edge} ${bottom} Q ${kneeWidth} 1 ${waist} -2 Z`} fill={color} />
      <path d={`M ${-edge + 0.5} ${SEAT_KNEE_Y - 1} Q 0 ${SEAT_KNEE_Y + 2.6} ${edge - 0.5} ${SEAT_KNEE_Y - 1}
        L ${edge} ${bottom} Q 0 ${bottom + 1.8} ${-edge} ${bottom} Z`}
        fill={SHADE} opacity={0.16 * tone.shade} />
      <path d={`M ${-waist + 1} 0 Q 1 4 ${waist - 1} 0`} fill="none" stroke={GLINT}
        strokeWidth="1.3" opacity={0.18 * tone.glint} strokeLinecap="round" />
      {(pants === "pleats" ? [-0.58, 0, 0.58] : pants === "maxi" ? [-0.38] : [-0.4, 0.55]).map((f) => (
        <path data-skirt-fold={pants} key={f} d={`M ${f * waist} 0 L ${f * edge - 0.8} ${bottom - 0.6}
          L ${f * edge + 0.6} ${bottom - 0.6} Z`} fill={SHADE} opacity={0.18 * tone.shade} />
      ))}
      <path d={`M ${-edge} ${bottom} Q 0 ${bottom + 1.8} ${edge} ${bottom}`}
        fill="none" stroke="#000" strokeWidth="1.1" opacity="0.18" />
    </g>
  );
}

export function SeatedLeg({
  side,
  ankle,
  pose = "relaxed",
  thighW = 7.5,
  shinW = 6.5,
  far = false,
  trouser = TROUSER,
  pants = "trousers",
  skin = SKIN,
  shoes = "sneakers",
  shoeColor = SHOE,
}) {
  const leg = geometryFor(pose, side, ankle);
  const { hipX, kneeX, kneeY, ankleX, ankleY, shoeTurn } = leg;
  const cloth = far ? farColor(trouser) : trouser;
  const form = pantsFormOf(pants);
  const bareShin = form.shorts || form.bare;
  const thighPaint = form.bare ? (far ? farColor(skin) : skin) : cloth;
  const extra = (form.wide || 0) * 0.75 + (form.slim || 0);
  const tone = toneFor(trouser);
  const clothWidth = (form.shorts ? thighW : shinW) + extra;
  const dx = ankleX - kneeX;
  const dy = ankleY - kneeY;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const at = (along, across = 0) => ({
    x: kneeX + ux * along + px * across,
    y: kneeY + uy * along + py * across,
  });
  const hem = at(Math.max(0, length - (form.shorts ? length - 0.6 : 2.6)));
  const hemA = { x: hem.x + px * (clothWidth / 2 - 0.4), y: hem.y + py * (clothWidth / 2 - 0.4) };
  const hemB = { x: hem.x - px * (clothWidth / 2 - 0.4), y: hem.y - py * (clothWidth / 2 - 0.4) };
  const shadeA = at(1, -clothWidth / 4);
  const shadeB = at(Math.max(2, length - 1), -clothWidth / 4);
  const creaseA = at(1);
  const creaseB = at(Math.max(2, length - 2));
  return (
    <g>
      {bareShin && (
        <path d={`M${kneeX} ${kneeY} L${ankleX} ${ankleY}`}
          stroke={far ? farColor(skin) : skin} strokeWidth={shinW - 1.4}
          strokeLinecap="round" fill="none" />
      )}
      <path d={`M${hipX} 0 L${kneeX} ${kneeY}`}
        stroke={thighPaint} strokeWidth={thighW + extra} strokeLinecap="round" fill="none" />
      {!bareShin && <path d={`M${kneeX} ${kneeY} L${ankleX} ${ankleY}`}
        stroke={cloth} strokeWidth={shinW + extra} strokeLinecap="round" fill="none" />}
      {!form.bare && (
        <g>
          {!bareShin && <path d={`M ${shadeA.x} ${shadeA.y} L ${shadeB.x} ${shadeB.y}`}
            stroke={SHADE} strokeWidth={clothWidth / 2.9} opacity={0.1 * tone.shade} fill="none" />}
          {form.crease && <path d={`M ${creaseA.x} ${creaseA.y} L ${creaseB.x} ${creaseB.y}`}
            stroke={GLINT} strokeWidth="0.8" opacity={(far ? 0.07 : 0.12) * tone.glint} fill="none" />}
          {!form.cleanHem && <path d={`M ${hemA.x} ${hemA.y} L ${hemB.x} ${hemB.y}`}
            stroke={form.turnup || form.cuffBand ? GLINT : "#000"}
            strokeWidth={form.turnup ? 2.1 : 1.8}
            opacity={form.turnup ? 0.16 * tone.glint : form.cuffBand ? 0.13 * tone.glint : 0.1} />}
          {form.stitch && <path d={`M ${hemA.x - ux * 0.6} ${hemA.y - uy * 0.6} L ${hemB.x - ux * 0.6} ${hemB.y - uy * 0.6}`}
            stroke={STITCH} strokeWidth="0.55" strokeDasharray="0.9 0.8" fill="none" opacity={far ? 0.5 : 0.85} />}
          {form.cargo && (
            <g data-cargo-pocket="seated" opacity={far ? 0.55 : 0.9}>
              <rect x={kneeX - side * 1.1 - 2.1} y={kneeY - 5.8} width="4.2" height="3.8" rx="0.6" fill="#000" opacity="0.1" />
            </g>
          )}
        </g>
      )}
      <g transform={`translate(${ankleX}, ${ankleY + 1.1}) rotate(${shoeTurn})`}>
        <FrontShoe cx={0} kind={shoes} color={shoeColor} skin={skin} far={far} />
      </g>
    </g>
  );
}
