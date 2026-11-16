import { wallPoints, wallSection } from '../lib/wallSection';

// Shared by editable rooms, preset previews and the authored indoor common
// places. The inner face remains the caller's existing decorated wall plane.
export default function WallSection({ run, height, runs, fill, compact = false }) {
  const section = wallSection(run, height, runs);
  return <g data-wall-section={run.plane} pointerEvents="none">
    {section.end && <g data-wall-end="true">
      <polygon points={wallPoints(section.end)} fill={fill} />
      <polygon points={wallPoints(section.end)} style={{ fill: 'rgb(var(--color-void))' }} opacity={run.plane === 'gy' ? .28 : .38} />
    </g>}
    <g data-wall-cap="true">
      <polygon points={wallPoints(section.cap)} fill={fill} />
      <polygon points={wallPoints(section.cap)} style={{ fill: 'rgb(var(--color-night))' }} opacity={run.plane === 'gy' ? .4 : .5} />
    </g>
    <polyline points={wallPoints(section.innerEdge)} fill="none" style={{ stroke: 'rgb(var(--color-petal))' }} opacity=".24" strokeWidth={compact ? .6 : .9} />
  </g>;
}
