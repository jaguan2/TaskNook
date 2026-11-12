import * as THREE from 'three';
import { beam, joint, material, part, rounded } from './geometry.mjs';
import { flame } from './lighting-parts.mjs';

export function fireplace(root, spec) {
  const h = spec.height, stone = material('masonry', '#9b8b7e'), slate = material('firebox-slate', '#62564e'), timber = material('mantel-timber', '#8c6c51');
  const hearth = rounded(root, 'grounded-stone-hearth', [1.60, .08, .70], [0, .04, 0], stone, .02);
  const bodyTop = h - .12, outline = new THREE.Shape();
  outline.moveTo(-.74, .08); outline.lineTo(-.74, bodyTop); outline.lineTo(.74, bodyTop); outline.lineTo(.74, .08); outline.closePath();
  const opening = new THREE.Path(); opening.moveTo(-.40, .13); opening.lineTo(.40, .13); opening.lineTo(.40, .88);
  for (let i = 1; i <= 24; i++) { const a = i / 24 * Math.PI; opening.lineTo(Math.cos(a) * .40, .88 + Math.sin(a) * .40); }
  opening.closePath(); outline.holes.push(opening);
  const surround = part(root, 'single-arched-masonry-surround', new THREE.ExtrudeGeometry(outline, { depth: .46, bevelEnabled: true, bevelSize: .01, bevelThickness: .01, bevelSegments: 2, steps: 1 }), stone, 0, 0, -.25);
  joint(root, surround, hearth, [.60, .075, 0]);
  const back = rounded(root, 'complete-fireplace-back', [1.45, bodyTop - .07, .07], [0, (bodyTop - .07) / 2 + .07, -.265], stone, .015);
  joint(root, back, surround, [.65, .50, -.24]);
  const lining = rounded(root, 'recessed-dark-firebox-back', [.79, 1.10, .035], [0, .68, -.23], slate, .015);
  joint(root, lining, back, [0, .68, -.237]);
  const floor = rounded(root, 'supported-firebox-floor', [.83, .05, .47], [0, .10, .015], slate, .012);
  joint(root, floor, hearth, [0, .078, .015]);
  const mantel = rounded(root, 'solid-proud-timber-mantel', [1.60, .12, .70], [0, h - .06, 0], timber, .025);
  joint(root, mantel, surround, [.60, h - .115, 0]);
  const iron = material('hearth-iron', '#554b48');
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const foot = beam(root, `grate-foot-${x}-${z}`, [x * .29, .11, z * .10], [x * .29, .19, z * .10], .014, iron);
    joint(root, foot, floor, [x * .29, .12, z * .10]);
  }
  const crossbars = [];
  for (const z of [-.10, 0, .10]) {
    const rail = beam(root, `grate-crossbar-${z}`, [-.30, .18, z], [.30, .18, z], .015, iron);
    crossbars.push(rail);
    for (const x of [-1, 1]) if (z) joint(root, rail, root.getObjectByName(`grate-foot-${x}-${Math.sign(z)}`), [x * .29, .18, z]);
  }
  for (const x of [-1, 1]) {
    const side = beam(root, `receiving-grate-side-${x}`, [x * .29, .18, -.115], [x * .29, .18, .115], .015, iron);
    for (const rail of crossbars) joint(root, side, rail, [x * .29, .18, rail.position.z]);
  }
  const logs = [];
  for (const sign of [-1, 1]) {
    const log = beam(root, `supported-hearth-log-${sign}`, [-.31, .21, sign * .055], [.31, .225, -sign * .055], .045, material('charred-timber', '#775840'));
    joint(root, log, root.getObjectByName('grate-crossbar-0'), [0, .193, 0]); logs.push(log);
  }
  for (const [i, [x, height]] of [[-.18, .41], [0, .58], [.18, .39]].entries()) {
    const light = flame(root, `contained-hearth-flame-${i}`, x, .215, 0, height, .075);
    joint(root, light, logs[0], [x, .228, 0]);
  }
  root.userData.firebox = { opening: surround.name, width: .80, archTop: 1.28 };
}
