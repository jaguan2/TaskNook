import { project } from '../lib/iso';
import { SoftBox, TintedBox } from './IsoItemPrimitives';
import { Sofa } from './IsoSeatingItems';

/** Graphics-failure artwork follows the saved spans with fixed timber and
 * cushion thickness. No screen scaling of the original drawing is involved. */
export default function IsoResizableFallback({ item, dimensions, decor, rot = 0 }) {
  const { w, d } = dimensions;
  const timber = '#b08a61';
  if (item === 'sofa') return <Sofa dimensions={dimensions} back={rot >= 2} />;
  if (item === 'desk') return <g data-resizable-fallback="desk">
    <TintedBox gx={.05} gy={.1} dx={.13} dy={d - .2} h={28} fallback="#805d46" tint={false} />
    <TintedBox gx={w - .77} gy={.1} dx={.64} dy={d - .22} h={28} fallback={timber} />
    <g transform="translate(0,-18)"><TintedBox gx={.15} gy={.1} dx={w - .85} dy={.06} h={8} fallback="#805d46" tint={false} /></g>
    <g transform="translate(0,-27)"><SoftBox dx={w} dy={d} h={3} radius={.035} fallback={timber} /></g>
  </g>;
  const wall = item === 'wallshelf', height = ({ bookshelf: 86, bookcase: 58, shelf: 54, ladder: 62, plantshelf: 68, wallshelf: 25 })[item];
  const rows = wall ? [7] : Array.from({ length: item === 'bookshelf' ? 4 : 3 }, (_, i) => 5 + i * (height - 15) / (item === 'bookshelf' ? 4 : 3));
  const bays = Math.ceil(w / 2), raised = wall ? 96 - height : 0;
  return <g data-resizable-fallback={item} transform={`translate(0,${-raised})`}>
    {Array.from({ length: bays + 1 }, (_, i) => <TintedBox key={i} gx={i * (w - .07) / bays} gy={.025}
      dx={.07} dy={d - .05} h={wall ? 7 : height} fallback={timber} />)}
    {rows.map((top, row) => <g key={row}>
      <g transform={`translate(0,${-top + 2})`}><TintedBox dx={w} dy={d} h={2} fallback={timber} /></g>
      {decor?.layout !== 'empty' && Array.from({ length: Math.max(1, Math.floor(w / .5)) }, (_, i) => {
        const x = .12 + i * (w - .24) / Math.max(1, Math.floor(w / .5));
        const plant = decor?.layout === 'plants' || item === 'plantshelf' || (decor?.layout === 'mixed' && (row + i) % 2);
        const at = project(x + .10, d / 2);
        return plant ? <g key={i} transform={`translate(${at.x},${at.y - top})`}>
          <path d="M-3 -1 L-2 -7 H3 L2 -1 Z" fill="#b88d6d" />
          <path d="M0 -7 V-14 M0 -10 Q-7 -16 -3 -17 Q1 -16 0 -10 M0 -9 Q6 -15 5 -17 Q1 -17 0 -9"
            fill="#749867" stroke="#749867" strokeWidth="1" />
        </g> : <g key={i} transform={`translate(0,${-top})`}><TintedBox gx={x} gy={Math.max(.06, d / 2 - .1)}
          dx={.10} dy={Math.min(.22, d - .12)} h={9 + i % 3 * 2} fallback={decor?.bookColor || ['#6b986a', '#cf765c', '#598fa4'][i % 3]} tint={false} /></g>;
      })}
    </g>)}
  </g>;
}
