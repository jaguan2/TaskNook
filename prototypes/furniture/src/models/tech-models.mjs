import * as THREE from 'three';
import { beam, joint, material } from './geometry.mjs';
import { board } from './storage-parts.mjs';
import { fitOrganic } from './organic-parts.mjs';
import { brass, disc, frame, warmInk } from './object-parts.mjs';
import { glowingMaterial, source } from './lighting-parts.mjs';

function monitor(root, name, w, h, bottom, z, paint) {
  const housing = board(root, `${name}-complete-housing`, [w, h, .07], [0, bottom + h / 2, z], paint);
  const screen = source(root, board(root, `${name}-screen`, [w - .055, h - .065, .009], [0, bottom + h / 2, z + .038], glowingMaterial('screen-glow', '#a2bcb1', .22)));
  joint(root, housing, screen, [0, bottom + h / 2, z + .034]);
  board(root, `${name}-picture-hills`, [w * .65, h * .24, .003], [-w * .07, bottom + h * .30, z + .044], material('screen-picture', '#7e9b94'), .001);
  return housing;
}
const builds = {
  computer(root, s) {
    const paint = material(s.colorRole, s.defaultColor), ink = warmInk();
    board(root, 'monitor-foot', [.43, .035, .25], [0, .0175, -.12], paint);
    board(root, 'monitor-stem', [.065, .22, .065], [0, .13, -.19], paint);
    monitor(root, 'desktop', 1.06, .66, .20, -.19, paint);
    const keyboard = board(root, 'keyboard', [.73, .035, .23], [-.06, .0175, .23], ink);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 10; col++) board(root, `key-${row}-${col}`, [.048, .009, .037], [-.36 + col * .067, .038, .155 + row * .063], material('keys', '#c5c1ac'), .002);
    board(root, 'mouse', [.105, .045, .15], [.48, .0225, .23], paint);
    root.userData.groundedParts = [keyboard.name, root.getObjectByName('mouse').name];
  },
  laptop(root, s) {
    const paint = material(s.colorRole, s.defaultColor), ink = warmInk();
    board(root, 'laptop-base', [.64, .035, .45], [0, .0175, 0], paint);
    const hinge = beam(root, 'continuous-hinge', [-.30, .04, -.20], [.30, .04, -.20], .020, ink);
    const panel = new THREE.Group(); panel.name = 'open-display'; panel.position.set(0, .04, -.20); panel.rotation.x = -.13; root.add(panel);
    monitor(panel, 'laptop', .64, .42, -.008, 0, paint);
    board(root, 'keyboard-recess', [.55, .007, .17], [0, .037, -.06], ink, .003);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) board(root, `laptop-key-${row}-${col}`, [.043, .006, .034], [-.24 + col * .06, .043, -.12 + row * .053], material('keys', '#c8c2ad'), .002);
    board(root, 'trackpad', [.17, .004, .095], [0, .037, .13], material('trackpad', '#a9ada0'), .003); void hinge;
  },
  tv(root, s) {
    const paint = material(s.colorRole, s.defaultColor);
    for (const sign of [-1, 1]) { board(root, `tv-foot-${sign}`, [.23, .025, .36], [sign * .36, .0125, 0], paint); beam(root, `tv-leg-${sign}`, [sign * .36, .025, 0], [sign * .32, .20, -.04], .025, paint); }
    monitor(root, 'television', 1.20, .75, .17, -.035, paint);
  },
  radio(root, s) {
    const paint = material(s.colorRole, s.defaultColor), ink = warmInk();
    const body = board(root, 'radio-cabinet', [.64, .36, .21], [0, .18, 0], paint, .025);
    disc(root, 'speaker-cloth', .115, .014, [-.13, .19, .109], ink, 'xy');
    for (let i = 0; i < 5; i++) board(root, `speaker-grille-${i}`, [.19, .009, .008], [-.13, .11 + i * .04, .12], material('grille', '#a69273'), .002);
    frame(root, 'tuner', .19, .075, .24, .110, brass(), { x: .18, depth: .015, thickness: .012, backing: material('dial', '#d8c9a7') });
    for (const x of [.115, .24]) disc(root, `tuning-knob-${x}`, .032, .024, [x, .13, .118], ink, 'xy');
    beam(root, 'aerial', [.22, .35, -.06], [.30, .74, -.06], .006, brass());
    for (const x of [-.22, .22]) beam(root, `handle-post-${x}`, [x, .34, 0], [x, .43, 0], .012, ink);
    beam(root, 'carry-handle', [-.22, .43, 0], [.22, .43, 0], .016, ink); void body;
  },
  recordplayer(root, s) {
    const paint = material(s.colorRole, s.defaultColor), ink = warmInk();
    board(root, 'turntable-case', [1.10, .20, .61], [0, .10, 0], paint, .018);
    disc(root, 'receiving-platter', .24, .025, [-.14, .211, 0], brass());
    disc(root, 'vinyl-record', .22, .009, [-.14, .229, 0], ink);
    disc(root, 'record-label', .055, .010, [-.14, .234, 0], material('label', '#bba17e'));
    beam(root, 'tonearm-pivot', [.37, .18, -.16], [.37, .28, -.16], .025, ink);
    beam(root, 'tonearm', [.37, .28, -.16], [.12, .24, .10], .010, brass());
    board(root, 'pickup-head', [.055, .035, .08], [.12, .244, .10], ink, .004);
    board(root, 'lid-hinge', [.90, .05, .045], [0, .21, -.28], ink);
    const lid = board(root, 'open-dust-lid', [1.10, .62, .045], [0, .51, -.265], paint, .012); lid.rotation.x = -.12;
    board(root, 'lid-inset', [.95, .48, .012], [0, .51, -.22], material('lid-lining', '#b7a887'));
  },
};
export const TECH_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, s) => { build(root, s); fitOrganic(root, s); }]));
