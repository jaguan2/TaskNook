import { project } from '../lib/iso';
import { ISO_ITEMS } from '../lib/isoCatalog';
import { SoftBox } from './IsoItemPrimitives';

const TIMBER = '#946b50';

/** Three standalone fallback silhouettes for the corresponding catalog GLBs.
 * Their board/cushion tops use the same physical seat anchors as the actors. */
export function ChairVariant({ kind, back = false }) {
  const { foot: [w, d], seat } = ISO_ITEMS[kind];
  const spindle = kind === 'spindlechair', folding = kind === 'foldingchair';
  const top = folding ? 31 : 34;
  const wood = spindle ? 'var(--tint, #b08a61)' : TIMBER;
  const gy = value => back ? d - value : value;
  const point = ([x, y, z]) => {
    const p = project(x, gy(y)); return `${p.x},${p.y - z}`;
  };
  const rail = (key, from, to, width = 2) => <path key={key}
    d={`M${point(from)} L${point(to)}`} stroke={wood} strokeWidth={width} fill="none" strokeLinecap="butt" />;
  const rest = <g data-furniture-part="backrest">
    {spindle ? <>
      {Array.from({ length: 7 }, (_, i) => {
        const x = .1 + i * (w - .2) / 6;
        return rail(i, [x, .12, seat - 1], [x, .065, top - 2 - Math.abs(i - 3) * .3], i === 0 || i === 6 ? 2 : 1.2);
      })}
      <path d={`M${point([.07, .065, top - 2])} Q${point([w / 2, .065, top + 1])} ${point([w - .07, .065, top - 2])}`}
        fill="none" stroke={wood} strokeWidth="2.3" strokeLinecap="round" />
    </> : <>
      {[.08, w - .08].map(x => rail(`post-${x}`, [x, .14, seat - 3], [x, .07, top - 1], 2.4))}
      <g transform={`translate(0,${-(top - (folding ? 8 : 14))})`}>
        <SoftBox gx={.1} gy={back ? d - .17 : .07} dx={w - .2} dy={.1} h={folding ? 8 : 14}
          fallback={folding ? '#aaa786' : '#8baba0'} radius={.04} dark={.22} mid={.12} />
      </g>
      {rail('crest', [.05, .07, top], [w - .05, .07, top], 2)}
    </>}
  </g>;
  return <g data-furniture-family={kind}>
    {!back && rest}
    {[.08, w - .08].map(x => <g key={x}>
      {folding ? <>
        {rail('cross-a', [x, .06, 0], [x, d - .09, seat - 1], 2.5)}
        {rail('cross-b', [x, d - .06, 0], [x, .09, seat - 1], 2.5)}
        <circle cx={project(x, d / 2).x} cy={project(x, d / 2).y - seat / 2} r="1.5" fill="#bca071" />
      </> : <>
        {rail('front-leg', [x, d - .06, 0], [x + (x < w / 2 ? .03 : -.03), d - .13, seat - 1], 2.5)}
        {rail('rear-leg', [x, .06, 0], [x + (x < w / 2 ? .03 : -.03), .13, seat - 1], 2.5)}
      </>}
    </g>)}
    <g transform={`translate(0,${-(seat - (folding ? 1.5 : spindle ? 2.2 : 3.4))})`} data-furniture-part="seat-pad">
      <SoftBox gx={.05} gy={.055} dx={w - .1} dy={d - .11} h={folding ? 1.5 : spindle ? 2.2 : 3.4}
        fallback={spindle ? '#b08a61' : folding ? '#aaa786' : '#8baba0'} radius={.10} dark={.22} mid={.12} />
    </g>
    {!spindle && !folding && [.06, w - .06].map(x => <g key={x} data-furniture-part="open-arm">
      {rail('front-post', [x, d - .13, seat - 2], [x, d - .13, seat + 5], 2.2)}
      {rail('arm', [x, .11, seat + 5], [x, d - .13, seat + 5], 2.5)}
    </g>)}
    {back && rest}
  </g>;
}

export const SpindleChair = props => <ChairVariant {...props} kind="spindlechair" />;
export const FoldingChair = props => <ChairVariant {...props} kind="foldingchair" />;
export const LoungeChair = props => <ChairVariant {...props} kind="loungechair" />;
