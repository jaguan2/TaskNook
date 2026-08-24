import { WALL_H, project } from "../lib/iso";

// Interior architecture meets the same roof line as the exterior shell.
// Keeping this tied to the projection constant prevents the two wall systems
// from drifting apart when the room scale changes.
export const PARTITION_WALL_H = WALL_H;

const pointOn = (a, b, t, lift = 0) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t - lift,
});

const coords = (point) => `${point.x},${point.y}`;

/**
 * A finished interior divider shared by the live scene and preset previews.
 * Walls use a darker wainscot, chair rail, baseboard and crown so they read as
 * architecture instead of one flat SVG slab. Arch pieces cut a real curved
 * opening out of that same wall face and remain open at floor level.
 */
export default function PartitionWall({
  run,
  height = PARTITION_WALL_H,
  fill,
  compact = false,
  lift,
  liftOpacity = 0,
}) {
  const a = run.plane === "gy" ? project(run.from, run.at) : project(run.at, run.from);
  const b = run.plane === "gy" ? project(run.to, run.at) : project(run.at, run.to);
  const faceFill = fill || (run.plane === "gy" ? "url(#isoWallR)" : "url(#isoWallL)");
  const topA = pointOn(a, b, 0, height);
  const topB = pointOn(a, b, 1, height);

  if (run.arch) {
    // VC2's arch is a piece of architecture, not a glowing line around a
    // hole: broad plaster piers rise into a smooth elliptical crown, with a
    // dark reveal behind the inner edge. Adjacent units still merge into one
    // generous opening, and the opening stays human-sized beneath the full
    // roof-height wall.
    const openingH = Math.min(height * 0.9, 72);
    const runLength = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    const inset = Math.min(0.14, 4 / runLength);
    const springH = openingH * 0.58;
    // Cubic approximation of two quarter ellipses. Defining the controls in
    // wall coordinates (distance along the run + vertical lift) keeps both
    // isometric wall planes equally round; fixed screen-x handles made one
    // side look pinched and the other flat.
    const KAPPA = 0.5522848;
    const leftFloor = pointOn(a, b, inset);
    const rightFloor = pointOn(a, b, 1 - inset);
    const leftSpring = pointOn(a, b, inset, springH);
    const rightSpring = pointOn(a, b, 1 - inset, springH);
    const crown = pointOn(a, b, 0.5, openingH);
    const leftControl1 = pointOn(a, b, inset, springH + (openingH - springH) * KAPPA);
    const leftControl2 = pointOn(
      a,
      b,
      0.5 - (0.5 - inset) * KAPPA,
      openingH,
    );
    const rightControl1 = pointOn(
      a,
      b,
      0.5 + (0.5 - inset) * KAPPA,
      openingH,
    );
    const rightControl2 = pointOn(
      a,
      b,
      1 - inset,
      springH + (openingH - springH) * KAPPA,
    );
    const opening = [
      `M ${coords(leftFloor)}`,
      `L ${coords(leftSpring)}`,
      `C ${coords(leftControl1)} ${coords(leftControl2)} ${coords(crown)}`,
      `C ${coords(rightControl1)} ${coords(rightControl2)} ${coords(rightSpring)}`,
      `L ${coords(rightFloor)}`,
    ].join(" ");
    const face = [
      `M ${coords(topA)} L ${coords(topB)} L ${coords(b)} L ${coords(a)} Z`,
      `${opening} L ${coords(leftFloor)} Z`,
    ].join(" ");
    // A one-edge arch is still a legal, passable doorway. Fixed wide strokes
    // reduced that opening to a keyhole, so trim grows with the opening and
    // caps at the richer width used by long merged arches.
    const revealWidth = Math.min(compact ? 8 : 16, runLength * 0.26);
    const plasterWidth = Math.min(compact ? 5.5 : 11, runLength * 0.16);

    return (
      <g
        data-partition-style="arch"
        data-arch-model="plaster-surround"
        data-wall-height={height}
        data-opening-height={openingH}
        data-reveal-width={revealWidth}
        data-plaster-width={plasterWidth}
      >
        <path d={face} fill={faceFill} fillRule="evenodd" clipRule="evenodd" />
        <path
          d={face}
          fill="rgb(var(--color-petal))"
          fillRule="evenodd"
          clipRule="evenodd"
          opacity="0.08"
        />
        {lift && (
          <path
            data-partition-lift="true"
            d={face}
            fill={lift}
            fillRule="evenodd"
            clipRule="evenodd"
            opacity={liftOpacity * (run.plane === "gy" ? 0.75 : 1)}
          />
        )}
        <path
          data-arch-layer="reveal"
          d={opening}
          fill="none"
          stroke="rgb(var(--color-void))"
          strokeWidth={revealWidth}
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity="0.34"
        />
        <path
          data-arch-layer="plaster"
          d={opening}
          fill="none"
          stroke="rgb(var(--color-petal))"
          strokeWidth={plasterWidth}
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity="0.88"
        />
        <path
          data-arch-layer="inner-bevel"
          d={opening}
          fill="none"
          stroke="rgb(var(--color-void))"
          strokeWidth={compact ? 1 : 1.5}
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity="0.28"
        />
        <polyline
          points={`${coords(topA)} ${coords(topB)}`}
          fill="none"
          stroke="rgb(var(--color-void))"
          strokeWidth={compact ? 4 : 6}
          opacity="0.62"
        />
        <polyline
          points={`${coords(pointOn(a, b, 0, height - 2))} ${coords(pointOn(a, b, 1, height - 2))}`}
          fill="none"
          stroke="rgb(var(--color-petal))"
          strokeWidth="1.5"
          opacity="0.4"
        />
      </g>
    );
  }

  const railLift = height * 0.34;
  const lowerA = pointOn(a, b, 0, railLift);
  const lowerB = pointOn(a, b, 1, railLift);
  const baseA = pointOn(a, b, 0, 7);
  const baseB = pointOn(a, b, 1, 7);

  return (
    <g data-partition-style="wall" data-wall-height={height}>
      <polygon
        points={`${coords(topA)} ${coords(topB)} ${coords(b)} ${coords(a)}`}
        fill={faceFill}
      />
      {lift && (
        <polygon
          data-partition-lift="true"
          points={`${coords(topA)} ${coords(topB)} ${coords(b)} ${coords(a)}`}
          fill={lift}
          opacity={liftOpacity * (run.plane === "gy" ? 0.75 : 1)}
        />
      )}
      <polygon
        points={`${coords(lowerA)} ${coords(lowerB)} ${coords(b)} ${coords(a)}`}
        fill="rgb(var(--color-petal))"
        opacity="0.11"
      />
      <polyline
        points={`${coords(lowerA)} ${coords(lowerB)}`}
        fill="none"
        stroke="rgb(var(--color-void))"
        strokeWidth={compact ? 4 : 6}
        opacity="0.38"
      />
      <polyline
        points={`${coords(lowerA)} ${coords(lowerB)}`}
        fill="none"
        stroke="rgb(var(--color-petal))"
        strokeWidth={compact ? 1.5 : 2.5}
        opacity="0.55"
      />
      <polyline
        points={`${coords(baseA)} ${coords(baseB)}`}
        fill="none"
        stroke="rgb(var(--color-void))"
        strokeWidth={compact ? 4 : 6}
        opacity="0.52"
      />
      <polyline
        points={`${coords(topA)} ${coords(topB)}`}
        fill="none"
        stroke="rgb(var(--color-void))"
        strokeWidth={compact ? 5 : 7}
        opacity="0.62"
      />
      <polyline
        points={`${coords(pointOn(a, b, 0, height - 2))} ${coords(pointOn(a, b, 1, height - 2))}`}
        fill="none"
        stroke="rgb(var(--color-petal))"
        strokeWidth="1.5"
        opacity="0.42"
      />
      {[
        run.segmentStart !== false && ["start", a],
        run.segmentEnd !== false && ["end", b],
      ].filter(Boolean).map(([key, point]) => (
        <line
          key={key}
          x1={point.x}
          y1={point.y - height}
          x2={point.x}
          y2={point.y}
          stroke="rgb(var(--color-void))"
          strokeWidth={compact ? 1.5 : 2.5}
          opacity="0.35"
        />
      ))}
    </g>
  );
}
