import * as THREE from 'three';
import { beam, bentTube, joint, material, part, rounded, splayedLeg } from './geometry.mjs';

function spindleChair(root, { seat, height }) {
  const wood = material('finish', '#b08a61');
  const board = rounded(root, 'shaped-timber-seat', [.61, .065, .60], [0, seat - .0325, 0], wood, .055);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const leg = splayedLeg(root, `splayed-leg-${x}-${z}`, [x * .29, z * .275], [x * .235, z * .22], seat - .04, wood, .029);
    joint(root, leg, board, [x * .235, seat - .045, z * .22]);
  }
  for (const z of [-1, 1]) beam(root, `cross-stretcher-${z}`, [-.27, .17, z * .255], [.27, .17, z * .255], .018, wood);
  const crest = bentTube(root, 'bowed-crest-rail', [[-.27, height - .055, -.275], [0, height - .028, -.285], [.27, height - .055, -.275]], .028, wood);
  for (const x of [-.24, -.16, -.08, 0, .08, .16, .24]) {
    const top = height - .028 - .027 * (x / .27) ** 2;
    const spindle = beam(root, `back-spindle-${x}`, [x, seat - .035, -.22], [x, top + .008, -.282], Math.abs(x) > .2 ? .026 : .014, wood);
    joint(root, spindle, board, [x, seat - .03, -.22]);
    joint(root, spindle, crest, [x, top - .006, -.282]);
  }
}

function foldingChair(root, { seat, height }) {
  const wood = material('frame', '#946b50'), canvas = material('canvas', '#aaa786'), metal = material('hinge-metal', '#bca071');
  const legTop = seat - .035, hingeY = legTop * .52;
  for (const x of [-1, 1]) {
    const a = splayedLeg(root, `crossed-frame-a-${x}`, [x * .265, .30], [x * .265, -.24], legTop, wood, .028);
    const b = splayedLeg(root, `crossed-frame-b-${x}`, [x * .265, -.30], [x * .265, .25], legTop, wood, .028);
    const pin = part(root, `hinge-pin-${x}`, new THREE.CylinderGeometry(.04, .04, .065, 16).rotateZ(Math.PI / 2), metal, x * .265, hingeY, 0);
    joint(root, pin, a, [x * .265, hingeY, 0]); joint(root, pin, b, [x * .265, hingeY, 0]);
  }
  const cloth = rounded(root, 'taut-canvas-seat', [.60, .04, .59], [0, seat - .02, 0], canvas, .018);
  for (const z of [-1, 1]) {
    const rail = rounded(root, `seat-crossbar-${z}`, [.64, .04, .045], [0, seat - .04, z * .25], wood, .015);
    joint(root, rail, cloth, [0, seat - .035, z * .25]);
  }
  const crest = rounded(root, 'back-top-rail', [.60, .05, .055], [0, height - .025, -.30], wood, .018);
  const back = rounded(root, 'canvas-back-panel', [.51, .20, .04], [0, height - .135, -.285], canvas, .018);
  for (const x of [-1, 1]) {
    const post = beam(root, `back-upright-${x}`, [x * .265, seat - .09, -.22], [x * .265, height - .035, -.30], .025, wood);
    joint(root, post, crest, [x * .265, height - .045, -.30]);
    joint(root, post, back, [x * .25, height - .14, -.283]);
  }
}

function loungeChair(root, { seat, height }) {
  const wood = material('frame', '#946b50'), cloth = material('upholstery', '#8baba0');
  const frame = rounded(root, 'open-seat-frame', [.78, .07, .73], [0, seat - .125, 0], wood, .025);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const leg = splayedLeg(root, `lounge-leg-${x}-${z}`, [x * .34, z * .33], [x * .29, z * .28], seat - .10, wood, .032);
    joint(root, leg, frame, [x * .29, seat - .12, z * .28]);
  }
  const pad = rounded(root, 'seat-cushion-1', [.69, .10, .65], [0, seat - .05, .025], cloth, .04, true);
  joint(root, pad, frame, [0, seat - .095, 0]);
  const crest = rounded(root, 'exposed-back-rail', [.74, .06, .06], [0, height - .03, -.36], wood, .025);
  const back = rounded(root, 'reclined-back-cushion', [.65, .43, .105], [0, height - .25, -.30], cloth, .045, true);
  back.rotation.x = -.12;
  for (const x of [-1, 1]) {
    const post = beam(root, `rear-back-post-${x}`, [x * .32, seat - .14, -.28], [x * .32, height - .045, -.36], .032, wood);
    joint(root, post, frame, [x * .32, seat - .13, -.28]);
    joint(root, post, crest, [x * .32, height - .05, -.36]);
    joint(root, post, back, [x * .31, height - .20, -.33]);
    const arm = beam(root, `open-timber-arm-${x}`, [x * .35, seat + .16, -.34], [x * .35, seat + .16, .28], .027, wood);
    const support = beam(root, `front-arm-post-${x}`, [x * .34, seat - .15, .27], [x * .35, seat + .16, .28], .026, wood);
    joint(root, support, frame, [x * .34, seat - .13, .27]);
    joint(root, support, arm, [x * .35, seat + .145, .265]);
    joint(root, post, arm, [x * .335, seat + .16, -.322]);
  }
}

export const CHAIR_VARIANTS = { spindlechair: spindleChair, foldingchair: foldingChair, loungechair: loungeChair };
