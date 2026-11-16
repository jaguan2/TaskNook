import { useId } from 'react';

// These cuts used to share a circular rear cap. Keep their outlines distinct
// and describe clumps with a few broad flow marks, rather than noisy strands.
const cuts = {
  curtains: {
    outline: 'M-7.4 .1 Q-9.3 -3 -6.3 -6.8 L-6.8 -8.3 L-4.5 -7.9 Q-1.4 -11.1 2.6 -9.1 L4.1 -9.7 Q7.7 -7.8 8.1 -3.6 L8.8 -.7 L7.3 -.9 Q8.1 3.3 5.6 4.6 L4.4 3.9 Q3.1 6.2 .7 5.4 L-.4 6.7 L-1.5 5.4 Q-4 6.2 -5 4.4 L-6.1 4.9 Q-7.7 3.4 -7.4 .1Z',
    flow: ['M-.8 -8.2 Q-4.5 -6.7 -5.5 -2.8', 'M1.3 -7.5 Q5.4 -5.6 5.8 -1.6', 'M-3.8 1 Q-2.1 3.3 1.2 2.9', 'M3.2 -.4 Q5.7 .7 5 3.9'],
    shade: 'M-7.2 -.2 Q-4.8 2 -3.8 4.3 Q-1.9 5.3 -.4 4.3 Q-.1 3.6 -.4 2.5 Q2.7 5.6 5.7 2.8 L5 6.8 H-6.5Z',
    clumps: ['M-4.6 -7.7 Q-6.8 -4.1 -5.4 -.8 Q-4.6 -3.8 -2.9 -5.8Z', 'M1.8 -7.8 Q6.4 -6.4 6.9 -1.4 Q5.3 -3.8 3.4 -4.3Z'],
    light: 'M-5.5 -4.5 Q-4.3 -6.6 -2.2 -7.1 M1.3 -7.2 Q3.9 -6.5 4.8 -4.6',
  },
  messy: {
    outline: 'M-8 2 L-8.6 -1.3 L-7.4 -1.5 Q-9.2 -5.4 -5.7 -7.2 L-6.4 -9.3 L-3 -8.8 L-1.3 -11.1 L.2 -9.4 Q4.5 -11 6.2 -7.7 L8.4 -8.2 L7.8 -5.8 Q9.5 -2.8 8 1.6 L6.7 1 L5.8 5.3 L3.9 4.6 Q.8 7.6 -2.5 5.6 L-3.7 6.2 L-5.1 4.6 L-7 5Z',
    flow: ['M-1.4 -8.6 Q-4.7 -5.7 -5.5 -1.3', 'M1 -8.6 Q5.2 -5.9 5.7 -.4', 'M-.8 -3.8 Q1 0 -.7 4.2'],
    light: 'M-5.8 -4.7 L-3.6 -6.8 L-2.5 -6.3 M1.3 -7.4 Q4.4 -6.6 5.4 -4.4',
  },
  ponytail: {
    outline: 'M-7.7 -.6 Q-8.8 -7.8 -1.4 -9.9 Q5.9 -11.2 8.1 -4 Q9 1.8 5.4 5 L2.7 4.3 Q-.9 6.8 -5.5 4.7Z',
    flow: ['M-4.9 -6.4 Q-1 -4.2 3.2 1.9', 'M-.9 -8 Q3.2 -4.3 4 1.4', 'M5.9 -4.8 Q6.7 -1.6 4.8 1.8'],
    light: 'M-5.8 -4.6 Q-4.6 -7 -2.4 -7.8 M.2 -8.1 Q3.1 -7.5 4.5 -5.8',
  },
  braids: {
    outline: 'M-7.6 1.3 Q-9 -5.3 -4.5 -8.5 Q-.1 -11.3 4.7 -8.5 Q9 -5.3 7.6 1.3 L6.1 5.7 L3.6 4.8 Q0 6.7 -3.6 4.8 L-6.1 5.7Z',
    flow: ['M0 -8.3 V3.6', 'M-1.3 -7.6 Q-5.4 -3.9 -5.2 3.2', 'M1.4 -7.5 Q5.5 -3.4 5.2 3.5'],
    light: 'M-5.8 -4.2 Q-4.8 -6.7 -2.5 -7.4 M2 -7.5 Q4.8 -6.6 5.7 -4.1',
  },
  pigtails: {
    outline: 'M-7.6 1.1 Q-9 -5.8 -4.5 -8.8 Q-.2 -11 4.6 -8.7 Q9 -5.4 7.6 1.2 L8.3 3.3 L5.3 5.2 Q1.2 7 -3.9 5.7 L-8.3 3.3Z',
    flow: ['M0 -8.2 Q-.5 -3.5 0 4.6', 'M-1.4 -7.4 Q-5.7 -4 -6.2 2.9', 'M1.3 -7.6 Q5.4 -4.3 6.2 2.9'],
    light: 'M-5.7 -4.9 Q-4.2 -6.8 -2.5 -7.3 M2.1 -7.4 Q4.8 -6.4 5.7 -4.8',
  },
  wolf: {
    outline: 'M-8.1 1.8 L-8.5 -1.2 Q-9.2 -5.5 -5.4 -8 L-5.7 -10 L-2.6 -9.1 Q1.5 -11.1 5 -8.4 L7.5 -8.8 L7.1 -6.5 Q9.4 -3.2 8.1 1.8 L6.5 1.1 L7.8 5.8 L5.2 4.4 L4.4 8.5 L1.8 6.6 L-.4 9 L-2.6 6.5 L-5.8 8 L-5.2 4.7 L-8.3 5.3Z',
    flow: ['M-.8 -8.3 Q-5.1 -4.3 -5.1 1.4', 'M1 -8 Q5.7 -4.9 5.5 1.4', 'M-1.1 -1.9 Q-1 2.9 -.4 6.4'],
    light: 'M-6 -4.2 Q-4.8 -6.7 -2.7 -7.4 M.6 -7.7 Q3.2 -7 4.7 -5.4',
  },
  mullet: {
    outline: 'M-7.4 .9 Q-9.1 -4.8 -5.4 -8.1 Q-.6 -11.6 4.9 -8.6 Q9.2 -5.4 7.6 .9 L6.2 2 L6.6 7.8 L3.4 8.2 L2.9 7.3 L-.4 8.7 L-3.4 7.7 L-6.5 8.3 L-6.1 2Z',
    flow: ['M-1 -8.1 Q-4.9 -5.6 -5.1 -.3', 'M1.2 -7.9 Q5.5 -4.6 5.2 .4', 'M-2.5 1.6 L-2.7 6.3', 'M2.7 1.4 L3 6.4'],
    light: 'M-5.8 -4.8 Q-4 -7.4 -1.5 -7.9 M.9 -7.8 Q3.6 -7 5.2 -4.8',
  },
  locs: {
    outline: 'M-8.2 .4 Q-9.7 -3.3 -6.8 -6.8 Q-5.6 -10 -2.2 -9.4 Q.5 -11 3.1 -9.3 Q6.9 -9.5 8 -5.9 Q10 -2.4 7.7 1.3 L7.3 5.3 L5.5 6.8 L3.6 5.7 L1.6 7.2 L-.5 6 L-2.8 7 L-4.6 5.5 L-6.9 6.1Z',
    flow: ['M-4.3 -6.7 Q-6.2 -2.7 -5 3.5', 'M-.9 -8.1 Q-2.7 -3.7 -1.2 4.4', 'M2.4 -7.7 Q.8 -3.2 2.6 4.5', 'M5.5 -5.2 Q4.2 -.9 5.5 3.4'],
    light: 'M-5.4 -4.7 L-4.8 -6 M-1.6 -6.3 L-1.3 -7.3 M2 -6.3 L2.4 -7 M5 -3.7 L5.5 -4.8',
  },
};

function RearCap({ style, headY, color }) {
  const id = useId(), cut = cuts[style];
  return <g data-hair-back={style} data-hair-texture="clump-flow" transform={`translate(0 ${headY})`}>
    <defs><clipPath id={`${id}-rear-hair`}><path d={cut.outline} /></clipPath></defs>
    <path d={cut.outline} fill={color} />
    <g clipPath={`url(#${id}-rear-hair)`}>
      <path d={cut.shade || 'M-6.8 -.3 Q-5.6 4.5 -1.4 5.1 Q3.2 5.9 6.5 1.7 L8 9 H-8Z'} fill="#241d29" opacity=".16" />
      {cut.clumps?.map(d => <path key={d} d={d} fill="#241d29" opacity=".1" />)}
      {cut.flow.map(d => <path key={d} d={d} fill="none" stroke="#241d29" strokeWidth=".6" opacity=".15" strokeLinecap="round" />)}
      <path d={cut.light} fill="none" stroke="#fff0d7" strokeWidth=".95" opacity=".17" strokeLinecap="round" />
    </g>
  </g>;
}

export const rearHair = Object.fromEntries(Object.keys(cuts).map(style =>
  [style, props => <RearCap {...props} style={style} />]));
