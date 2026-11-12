import * as THREE from 'three';
import { beam, joint, material, part, revolved } from './geometry.mjs';
import { board } from './storage-parts.mjs';
import { fitOrganic } from './organic-parts.mjs';
import { brass, disc, frame } from './object-parts.mjs';

function arch(root, name, width, height, bottom, thickness, depth, z, paint) {
  const shape = new THREE.Shape(), radius = width / 2, crown = height - radius;
  shape.moveTo(-radius, bottom); shape.lineTo(radius, bottom); shape.lineTo(radius, bottom + crown);
  shape.absarc(0, bottom + crown, radius, 0, Math.PI, false); shape.lineTo(-radius, bottom);
  const hole = new THREE.Path(), inner = radius - thickness;
  hole.moveTo(-inner, bottom + .018); hole.lineTo(-inner, bottom + crown);
  hole.absarc(0, bottom + crown, inner, Math.PI, 0, true); hole.lineTo(inner, bottom + .018); hole.closePath(); shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 20 }); geometry.translate(0, 0, -depth / 2);
  return part(root, name, geometry, paint, 0, 0, z);
}
const builds = {
  archway(root, s) {
    const paint = material(s.colorRole, s.defaultColor);
    arch(root, 'outer-arched-moulding', 1.88, 2.80, 0, .13, .13, .025, paint);
    arch(root, 'stepped-inner-reveal', 1.65, 2.65, .012, .065, .13, -.045, material('reveal-stone', '#8d7d69'));
    board(root, 'dark-recess-back', [1.62, 2.53, .020], [0, 1.28, -.115], material('opening-shadow', '#514c4b'));
    board(root, 'threshold', [1.75, .035, .25], [0, .0175, 0], paint);
    board(root, 'crown-keystone', [.16, .23, .14], [0, 2.72, .045], material('keystone', '#b6a58b'));
  },
  doorway(root, s) {
    const paint = material(s.colorRole, s.defaultColor), recess = material('reveal', '#84765f');
    frame(root, 'door-architrave', 1.13, 2.65, 0, .01, paint, { thickness: .095, depth: .12 });
    frame(root, 'stepped-reveal', .98, 2.55, .02, -.055, recess, { thickness: .04, depth: .09 });
    board(root, 'solid-door', [.92, 2.47, .055], [0, 1.26, -.08], paint);
    for (const y of [.61, 1.72]) frame(root, `door-panel-${y}`, .71, .83, y - .40, -.042, recess, { thickness: .028, depth: .026, backing: paint });
    disc(root, 'door-knob', .027, .046, [.34, 1.25, .005], brass(), 'xy');
    beam(root, 'door-knob-spindle', [.34, 1.25, -.065], [.34, 1.25, .01], .012, brass());
  },
  bigwindow(root, s) {
    const paint = material(s.colorRole, s.defaultColor);
    frame(root, 'outer-window-moulding', 1.71, 2.55, 0, 0, paint, { thickness: .095, depth: .16 });
    frame(root, 'inner-window-reveal', 1.54, 2.36, .09, -.045, material('reveal', '#8e806b'), { thickness: .045, depth: .08, backing: material('window-sky', '#afc4bf') });
    for (const x of [-.25, .25]) board(root, `mullion-${x}`, [.027, 2.25, .045], [x, 1.28, -.013], paint);
    board(root, 'transom', [1.47, .045, .055], [0, 1.70, -.007], paint);
    board(root, 'window-sill', [1.78, .075, .29], [0, .038, 0], paint);
  },
  stairs(root, s) {
    const paint = material(s.colorRole, s.defaultColor), riser = material('riser', '#9d8b71');
    for (let i = 0; i < 6; i++) { const h = (i + 1) * .27, z = .99 - i * .40;
      const mass = board(root, `solid-step-${i}`, [.94, h, .43], [0, h / 2, z], riser, .008);
      const tread = board(root, `tread-${i}`, [.97, .035, .43], [0, h - .012, z], paint, .008); joint(root, mass, tread, [0, h - .02, z]); }
  },
  railing(root, s) {
    const paint = material(s.colorRole, s.defaultColor);
    for (const x of [-.90, .90]) board(root, `grounded-post-${x}`, [.075, .90, .075], [x, .45, 0], paint);
    const lower = board(root, 'receiving-lower-rail', [1.85, .055, .055], [0, .15, 0], paint);
    const upper = board(root, 'continuous-handrail', [1.96, .065, .12], [0, .90, 0], paint);
    for (let i = 0; i < 9; i++) { const x = (i - 4) * .18, spindle = beam(root, `baluster-${i}`, [x, .14, 0], [x, .90, 0], .014, paint); joint(root, spindle, lower, [x, .15, 0]); joint(root, spindle, upper, [x, .89, 0]); }
  },
  pillar(root, s) { const paint = material(s.colorRole, s.defaultColor); revolved(root, 'turned-pillar', [[.25, 0], [.25, .12], [.20, .16], [.16, .23], [.14, 2.50], [.20, 2.58], [.25, 2.61], [.25, 2.73]], paint); },
};
export const ARCHITECTURE_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, s) => { build(root, s); fitOrganic(root, s); if (s.wall) root.userData.mount = { plane: 'XY', backZ: new THREE.Box3().setFromObject(root).min.z }; }]));
export { arch };
