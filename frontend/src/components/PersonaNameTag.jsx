import { useId } from "react";

const HEART_PATH = "M0 4.3C-1.2 3-5 .7-5-2c0-2.5 2.9-3.7 5-1.3C2.1-5.7 5-4.5 5-2c0 2.7-3.8 5-5 6.3Z";

/**
 * One identity treatment for every person in a room. NPCs may carry the
 * existing friendship fraction; the user's own tag and named pets simply omit
 * it. The heart fills bottom-up so zero still reads as an empty relationship,
 * rather than disappearing until the first point is earned.
 */
export default function PersonaNameTag({
  children,
  x = 0,
  y = 0,
  style,
  heartProgress = null,
  heartId,
  heartLabel,
  ...textProps
}) {
  const clipId = useId();
  const label = typeof children === "string" ? children : "";
  const fill = heartProgress == null
    ? null
    : Math.max(0, Math.min(1, Number(heartProgress) || 0));
  const heartX = Number(x) + Math.max(14, label.length * 3.1 + 6);
  const heartY = Number(y) - 4;

  return <g style={style} pointerEvents="none">
    <text
      textAnchor="middle"
      fontSize="11"
      fontWeight="600"
      fill="#f2e9dd"
      stroke="#1d0f1f"
      strokeWidth="2.6"
      paintOrder="stroke"
      opacity="0.92"
      x={x}
      y={y}
      {...textProps}
    >
      {children}
    </text>
    {fill != null && <g transform={`translate(${heartX},${heartY})`}
      data-friendship-heart={heartId} data-heart-fill={fill}
      aria-label={heartLabel}>
      {heartLabel && <title>{heartLabel}</title>}
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect x="-6" y={-5 + 10 * (1 - fill)} width="12" height={10 * fill} />
        </clipPath>
      </defs>
      <path d={HEART_PATH} fill="#24192d" fillOpacity=".76"
        stroke="#f2e9dd" strokeOpacity=".88" strokeWidth="1.15" />
      <path d={HEART_PATH} fill="#e69aa8" clipPath={`url(#${clipId})`} />
    </g>}
  </g>;
}
