import { tinted } from "../lib/tint";
import { LeafCluster } from "./IsoItemPrimitives";

/** One canonical conifer frame. Species can substitute their own tier data,
 * palettes and surface details, but snowy and decorated trees should not drift
 * into two almost-identical copies of the same crown geometry. */
export const EVERGREEN_TIERS = Object.freeze([
  Object.freeze({ y: 17, left: 33, right: 29, lift: 29 }),
  Object.freeze({ y: 33, left: 29, right: 33, lift: 28 }),
  Object.freeze({ y: 49, left: 26, right: 23, lift: 26 }),
  Object.freeze({ y: 65, left: 20, right: 23, lift: 23 }),
  Object.freeze({ y: 80, left: 14, right: 16, lift: 20 }),
]);

function evergreenPath(c, { y, left, right, lift }) {
  return `M${c.x} ${c.y - y - lift}
    C${c.x - left * 0.18} ${c.y - y - lift * 0.62} ${c.x - left * 0.46} ${c.y - y - 10} ${c.x - left} ${c.y - y}
    Q${c.x - left * 0.72} ${c.y - y + 5} ${c.x - left * 0.42} ${c.y - y + 3}
    Q${c.x - left * 0.2} ${c.y - y + 10} ${c.x - 2} ${c.y - y + 5}
    Q${c.x + right * 0.22} ${c.y - y + 11} ${c.x + right * 0.44} ${c.y - y + 3}
    Q${c.x + right * 0.72} ${c.y - y + 6} ${c.x + right} ${c.y - y - 1}
    C${c.x + right * 0.5} ${c.y - y - 11} ${c.x + right * 0.17} ${c.y - y - lift * 0.62}
    ${c.x} ${c.y - y - lift} Z`;
}

function EvergreenBough({ center: c, tier, fallback, rear = false }) {
  const path = evergreenPath(c, tier);
  return (
    <g>
      <path d={path} style={tinted(fallback)} />
      <path d={path} fill="#142d23" opacity={rear ? 0.34 : 0.15} />
      {!rear && <path d={`M${c.x - tier.left * 0.72} ${c.y - tier.y + 1}
        Q${c.x - tier.left * 0.25} ${c.y - tier.y + 10} ${c.x - 2} ${c.y - tier.y + 5}
        Q${c.x + tier.right * 0.24} ${c.y - tier.y + 11} ${c.x + tier.right * 0.72} ${c.y - tier.y}
        Q${c.x + tier.right * 0.35} ${c.y - tier.y + 4} ${c.x} ${c.y - tier.y + 1}
        Q${c.x - tier.left * 0.34} ${c.y - tier.y + 4} ${c.x - tier.left * 0.72} ${c.y - tier.y + 1} Z`}
        fill="#142d23" opacity="0.18" />}
    </g>
  );
}

/** Shared depth ordering for evergreen crowns. Snow shelves and decorations
 * remain caller-owned through `renderTierDetail` and `children`, so sharing the
 * branch structure never turns species-specific materials into flags here. */
export function EvergreenCrown({
  center: c,
  tiers = EVERGREEN_TIERS,
  rearPalette = ["#2f5845", "#365f4b"],
  frontPalette = ["#3f6b52", "#365f4b"],
  renderTierDetail = null,
  children = null,
}) {
  return (
    <g className="room-sway" data-evergreen-crown="true">
      {tiers.slice(0, -1).map((tier, index) => {
        const rearTier = {
          ...tier,
          y: tier.y + 7,
          left: tier.left * 0.92,
          right: tier.right * 0.92,
        };
        return (
          <EvergreenBough key={`rear-${tier.y}`} center={c} tier={rearTier}
            fallback={rearPalette[index % rearPalette.length]} rear />
        );
      })}
      {tiers.map((tier, index) => (
        <g key={tier.y}>
          <EvergreenBough center={c} tier={tier}
            fallback={frontPalette[index % frontPalette.length]} />
          {renderTierDetail?.(tier, index, c)}
        </g>
      ))}
      {children}
    </g>
  );
}

/** Shared broadleaf construction. Species provide their crown palette and
 * accents; this component keeps the trunk, branch occlusion and broad canopy
 * lighting consistent without duplicating the same SVG across seasonal files.
 */
export function BroadleafTree({ center: c, kind, trunkColor, rearColor, clusters,
  shadowOpacity = 0.2, canopyDetails = null }) {
  const split = Math.min(3, clusters.length);
  const drawClusters = (items) => items.map((cluster) => (
    <LeafCluster key={`${cluster.dx}-${cluster.dy}`}
      x={c.x + cluster.dx} y={c.y + cluster.dy}
      width={cluster.width} height={cluster.height}
      fallback={cluster.color} dark={cluster.dark}
      tilt={cluster.tilt} variant={cluster.variant} />
  ));

  return (
    <g data-tree={kind}>
      <path
        d={`M${c.x - 7} ${c.y} Q${c.x - 5} ${c.y - 28} ${c.x - 6} ${c.y - 51}
          Q${c.x - 5} ${c.y - 60} ${c.x - 2} ${c.y - 67}
          Q${c.x + 2} ${c.y - 58} ${c.x + 5} ${c.y - 49}
          Q${c.x + 3} ${c.y - 25} ${c.x + 7} ${c.y} Z`}
        fill={trunkColor}
      />
      <path d={`M${c.x - 1} ${c.y - 12} Q${c.x - 4} ${c.y - 37} ${c.x + 2} ${c.y - 57}`}
        fill="none" stroke="#d1a27a" strokeWidth="1.4" opacity="0.34" />
      <g className="room-sway">
        <path d={`M${c.x - 41} ${c.y - 66} Q${c.x - 45} ${c.y - 82} ${c.x - 31} ${c.y - 91}
          Q${c.x - 27} ${c.y - 108} ${c.x - 12} ${c.y - 109}
          Q${c.x - 1} ${c.y - 125} ${c.x + 14} ${c.y - 113}
          Q${c.x + 31} ${c.y - 116} ${c.x + 35} ${c.y - 99}
          Q${c.x + 47} ${c.y - 88} ${c.x + 39} ${c.y - 71}
          Q${c.x + 29} ${c.y - 58} ${c.x + 12} ${c.y - 61}
          Q${c.x - 2} ${c.y - 51} ${c.x - 16} ${c.y - 60}
          Q${c.x - 31} ${c.y - 54} ${c.x - 41} ${c.y - 66} Z`}
          style={tinted(rearColor)} />
        <path d={`M${c.x - 41} ${c.y - 66} Q${c.x - 31} ${c.y - 54} ${c.x - 16} ${c.y - 60}
          Q${c.x - 2} ${c.y - 51} ${c.x + 12} ${c.y - 61}
          Q${c.x + 29} ${c.y - 58} ${c.x + 39} ${c.y - 71}
          Q${c.x + 25} ${c.y - 66} ${c.x + 14} ${c.y - 70}
          Q${c.x + 2} ${c.y - 60} ${c.x - 11} ${c.y - 68}
          Q${c.x - 27} ${c.y - 61} ${c.x - 41} ${c.y - 66} Z`}
          fill="#321d24" opacity={shadowOpacity} />
        {drawClusters(clusters.slice(0, split))}
        <g fill="none" stroke={trunkColor} strokeLinecap="round" opacity="0.76">
          <path d={`M${c.x - 2} ${c.y - 55} Q${c.x - 18} ${c.y - 72} ${c.x - 27} ${c.y - 82}`} strokeWidth="4" />
          <path d={`M${c.x} ${c.y - 58} Q${c.x + 12} ${c.y - 79} ${c.x + 25} ${c.y - 91}`} strokeWidth="4.4" />
          <path d={`M${c.x + 2} ${c.y - 68} Q${c.x + 1} ${c.y - 93} ${c.x - 7} ${c.y - 105}`} strokeWidth="3.4" />
        </g>
        {drawClusters(clusters.slice(split))}
        <path d={`M${c.x - 29} ${c.y - 96} Q${c.x - 8} ${c.y - 116} ${c.x + 9} ${c.y - 107}
          Q${c.x + 25} ${c.y - 110} ${c.x + 34} ${c.y - 94}
          Q${c.x + 13} ${c.y - 103} ${c.x - 7} ${c.y - 96}
          Q${c.x - 18} ${c.y - 91} ${c.x - 29} ${c.y - 96} Z`}
          fill="#fff7df" opacity="0.08" />
        {canopyDetails}
      </g>
    </g>
  );
}
