import * as THREE from 'three';
import { beam, cushionGeometry, joint, material, part } from './geometry.mjs';
import { ellipse, inlay, offsetOutline, profiledSolid, rectangle, scaleOutline, slab } from './ground-shapes.mjs';

function palette(color) {
  return { cloth: material('rug-fabric', color), light: material('rug-pattern', '#d4c4a9'), dark: material('rug-binding', '#756657'), thread: material('rug-thread', '#c7b89e') };
}

function backing(root, outline, h, cloth) {
  return slab(root, 'closed-textile-backing', outline, 0, h - .001, cloth, { bevel: .004 });
}

function fringe(root, width, depth, h, backing, thread, count = 8) {
  for (const sign of [-1, 1]) for (let i = 0; i < count; i++) {
    const z = (i / (count - 1) - .5) * (depth - .18);
    const strand = beam(root, `bound-fringe-${sign}-${i}`, [sign * (width / 2 - .018), .008, z], [sign * (width / 2 + .065), .008, z + .003 * (i % 2)], .006, thread);
    joint(root, strand, backing, [sign * (width / 2 - .014), .008, z]);
  }
}

function borderedRectangle(root, spec, color, { fringeCount = 8, relief = 0 } = {}) {
  const colors = palette(color), w = spec.width - .16, d = spec.depth - .035, h = spec.height - relief;
  const body = backing(root, rectangle(w, d, .045), h, colors.cloth);
  inlay(root, 'woven-border', rectangle(w - .12, d - .12, .035), h, colors.dark, body, [rectangle(w - .24, d - .24, .025)]);
  if (fringeCount) fringe(root, w, d, h, body, colors.thread, fringeCount);
  return { ...colors, body, w, d, h };
}

export function roundRug(root, spec) {
  const colors = palette('#a68d94'), diameter = Math.min(spec.width, spec.depth) - .035, h = spec.height;
  const outline = ellipse(diameter, diameter), body = backing(root, outline, h, colors.cloth);
  inlay(root, 'round-bound-border', scaleOutline(outline, .94), h, colors.dark, body, [scaleOutline(outline, .84)]);
  inlay(root, 'inner-woven-band', scaleOutline(outline, .77), h, colors.light, body, [scaleOutline(outline, .72)]);
  const diamond = [[0, -.20], [.20, 0], [0, .20], [-.20, 0]];
  inlay(root, 'central-woven-medallion', diamond, h, colors.light, body);
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    inlay(root, `woven-petal-${i}`, offsetOutline(ellipse(.13, .13, 16), Math.cos(angle) * .60, Math.sin(angle) * .60), h, colors.light, body);
  }
}

export function squareRug(root, spec) {
  const colors = palette('#9a90a6'), side = Math.min(spec.width, spec.depth) - .035, h = spec.height;
  const outline = rectangle(side, side, .035), body = backing(root, outline, h, colors.cloth);
  for (const [i, factor] of [.90, .66, .39].entries()) inlay(root, `concentric-square-band-${i}`, scaleOutline(outline, factor), h, i === 1 ? colors.light : colors.dark, body, [scaleOutline(outline, factor - .07)]);
  inlay(root, 'central-square', rectangle(.27, .27, .015), h, colors.light, body);
}

export function ovalRug(root, spec) {
  const colors = palette('#a68d94'), outline = ellipse(spec.width - .03, spec.depth - .03), h = spec.height;
  const body = backing(root, outline, h, colors.cloth);
  for (const [i, factor] of [.94, .73, .52].entries()) inlay(root, `braided-oval-band-${i}`, scaleOutline(outline, factor), h, i % 2 ? colors.dark : colors.light, body, [scaleOutline(outline, factor - .08)]);
}

export function runner(root, spec) {
  const { body, w, h, light, dark } = borderedRectangle(root, spec, '#a48279', { fringeCount: 5, relief: .0008 });
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * (w - .60) / 4;
    inlay(root, `runner-lozenge-${i}`, [[x - .18, 0], [x, -.24], [x + .18, 0], [x, .24]], h, light, body);
    inlay(root, `runner-centre-${i}`, [[x - .065, 0], [x, -.09], [x + .065, 0], [x, .09]], h + .0008, dark, body);
  }
}

export function patternedRug(root, spec) {
  const { body, w, d, h, light, dark } = borderedRectangle(root, spec, '#9f786d', { relief: .0008 });
  inlay(root, 'central-diamond-medallion', [[-.53, 0], [0, -.61], [.53, 0], [0, .61]], h, light, body);
  inlay(root, 'medallion-inner-band', [[-.34, 0], [0, -.40], [.34, 0], [0, .40]], h + .0008, dark, body, [[[-.25, 0], [0, -.30], [.25, 0], [0, .30]]]);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const cx = x * (w / 2 - .38), cz = z * (d / 2 - .34);
    inlay(root, `corner-lozenge-${x}-${z}`, [[cx - .13, cz], [cx, cz - .17], [cx + .13, cz], [cx, cz + .17]], h, light, body);
  }
}

export function stripedRug(root, spec) {
  const { body, w, h, light } = borderedRectangle(root, spec, '#7e8d9c');
  for (const [i, z] of [-.64, -.42, -.08, .18, .49, .69].entries()) inlay(root, `woven-stripe-${i}`, offsetOutline(rectangle(w - .34, i % 2 ? .07 : .13, .01), 0, z), h, light, body);
}

export function doorMat(root, spec) {
  const { body, w, d, h, light, dark } = borderedRectangle(root, spec, '#b09a72', { fringeCount: 0 });
  for (let row = 0; row < 4; row++) for (let column = 0; column < 5; column++) {
    const x = (column - 2) * (w - .38) / 4, z = (row - 1.5) * (d - .34) / 3;
    inlay(root, `coir-tuft-${row}-${column}`, offsetOutline(rectangle(.11, .025, .005), x, z), h, row % 2 ? dark : light, body);
  }
}

export function picnicBlanket(root, spec) {
  const { body, w, d, h, light, dark } = borderedRectangle(root, spec, '#b18479');
  const cellW = (w - .30) / 8, cellD = (d - .30) / 6;
  for (let row = 0; row < 6; row++) for (let column = 0; column < 8; column++) {
    if ((row + column) % 2) continue;
    const x = (column - 3.5) * cellW, z = (row - 2.5) * cellD;
    inlay(root, `woven-check-${row}-${column}`, offsetOutline(rectangle(cellW - .002, cellD - .002, .003), x, z), h, row % 2 ? light : dark, body);
  }
}

export function sheepskin(root, spec) {
  const wool = material('rug-fabric', '#d8cbb6'), h = spec.height;
  const outline = ellipse(spec.width - .02, spec.depth - .02, 96, angle => .88 + .075 * Math.cos(angle * 7) + .025 * Math.sin(angle * 11));
  profiledSolid(root, 'continuous-soft-wool-casing', outline, [[.98, 0], [1, h * .30], [.97, h * .72], [.80, h * .94], [.30, h]], wool);
}

export function petBed(root, spec) {
  const cloth = material('pet-fabric', '#9d9d87'), cotton = material('pet-cushion', '#d8cbb6'), h = spec.height;
  const base = profiledSolid(root, 'soft-grounded-pet-bed-base', ellipse(1, .80), [[.91, 0], [.99, .02], [1, .055], [.96, .09], [.85, .105], [.2, .105]], cloth);
  const geometry = new THREE.TorusGeometry(.39, .092, 16, 64); geometry.rotateX(-Math.PI / 2); geometry.scale(1, 1, .79);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const front = Math.max(0, p.getZ(i) / .38);
    p.setY(i, p.getY(i) + h - .092 - .055 * front ** 6);
  }
  geometry.computeVertexNormals();
  const rim = part(root, 'continuous-dipped-bolster', geometry, cloth);
  joint(root, rim, base, [.39, .087, 0]);
  const cushion = part(root, 'inset-pet-mattress', cushionGeometry([.68, .10, .53], { horizontal: .6 }), cotton, 0, .135, 0);
  joint(root, cushion, base, [0, .095, 0]);
  joint(root, cushion, rim, [.329, .134, 0]);
}

export const RUG_BUILDERS = { rug: roundRug, squarerug: squareRug, ovalrug: ovalRug, runner,
  persianrug: patternedRug, stripedrug: stripedRug, matrug: doorMat, picnic: picnicBlanket, sheepskin, petbed: petBed };
