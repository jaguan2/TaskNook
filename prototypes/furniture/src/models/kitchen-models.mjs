import * as THREE from 'three';
import { beam, bentTube, joint, material, revolved } from './geometry.mjs';
import { board } from './storage-parts.mjs';
import { fitOrganic, oval } from './organic-parts.mjs';
import { brass, disc, frame, ring, warmInk } from './object-parts.mjs';
import { shell } from './lighting-parts.mjs';
import { rectangle, slab } from './ground-shapes.mjs';

export function bowlVessel(root, name, radius, height, paint, at = [0, 0, 0]) {
  const mesh = revolved(root, name, [[radius * .40, 0], [radius * .65, .02], [radius, height - .01], [radius - .008, height], [radius - .020, height - .012], [radius * .40, .025]], paint); mesh.position.set(...at); return mesh;
}
export function cupVessel(root, name, radius, height, paint, at = [0, 0, 0]) {
  const mesh = revolved(root, name, [[radius * .80, 0], [radius, height - .012], [radius - .004, height], [radius - .016, height], [radius - .018, .020]], paint); mesh.position.set(...at); return mesh;
}
function spout(root, from, to, paint) {
  const direction = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
  const mesh = shell(root, 'open-tapered-spout', [[.043, 0], [.024, direction.length()]], paint, .009, 20);
  mesh.position.set(...from); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return mesh;
}
export function teaVessel(root, s, kettle = false) {
  const paint = material(s.colorRole, s.defaultColor), handlePaint = material('handle', '#8f795e');
  revolved(root, kettle ? 'kettle-body' : 'teapot-body', [[.075, 0], [.105, .025], [.12, .105], [.10, .17], [.07, .19]], paint);
  disc(root, 'fitted-lid', .076, .018, [0, .195, 0], paint); oval(root, 'lid-knob', [0, .218, 0], [.035, .035, .035], handlePaint);
  spout(root, [-.088, .10, 0], [-.20, .21, 0], paint);
  if (kettle) bentTube(root, 'overhead-bail', [[0, .16, -.09], [0, .31, -.08], [0, .35, 0], [0, .31, .08], [0, .16, .09]], .016, handlePaint);
  else ring(root, 'teapot-loop-handle', .070, .014, [.145, .12, 0], paint);
}
const builds = {
  oven(root, s) {
    const paint = material(s.colorRole, s.defaultColor), ink = warmInk(), top = s.surface;
    board(root, 'grounded-oven-plinth', [.79, .055, .60], [0, .0275, 0], ink);
    board(root, 'oven-cabinet', [.83, top - .07, .63], [0, top / 2, 0], paint);
    board(root, 'hob-worktop', [.89, .035, .69], [0, top - .0175, 0], material('hob', '#b8baa9'));
    for (const x of [-.20, .20]) for (const z of [-.15, .15]) { disc(root, `burner-${x}-${z}`, .078, .008, [x, top - .003, z], ink); ring(root, `burner-ring-${x}-${z}`, .050, .004, [x, top - .003, z], brass(), 'xz'); }
    const control = board(root, 'raised-rear-control-strip', [.85, s.height - top + .015, .060], [0, (s.height + top - .015) / 2, -.305], paint);
    frame(root, 'oven-door', .70, top * .60, .12, .321, ink, { backing: material('oven-glass', '#5c6660'), thickness: .035, depth: .035 });
    beam(root, 'oven-door-handle', [-.26, top * .72, .339], [.26, top * .72, .339], .010, brass());
    for (const x of [-.25, .25]) beam(root, `receiving-handle-bracket-${x}`, [x, top * .72, .305], [x, top * .72, .34], .011, brass());
    for (const x of [-.29, -.10, .10, .29]) disc(root, `oven-knob-${x}`, .027, .035, [x, top * .87, .319], ink, 'xy'); void control;
  },
  sink(root, s) {
    const paint = material(s.colorRole, s.defaultColor), metal = material('sink-metal', '#b4b8a8');
    board(root, 'sink-cabinet', [.79, .67, .57], [0, .335, 0], paint);
    slab(root, 'open-sink-counter', rectangle(.87, .63, .025), .66, .70, metal, { holes: [rectangle(.49, .37, .055)] });
    board(root, 'recessed-basin-floor', [.48, .025, .36], [0, .545, 0], metal);
    for (const sign of [-1, 1]) { board(root, `basin-side-${sign}`, [.022, .15, .38], [sign * .24, .615, 0], metal); board(root, `basin-end-${sign}`, [.49, .15, .022], [0, .615, sign * .18], metal); }
    // The cabinet's upper cavity is real, so its solid body ends below the basin.
    const body = root.getObjectByName('sink-cabinet'); body.scale.y = .76; body.position.y = .335 * .76;
    for (const x of [-.37, .37]) board(root, `worktop-receiver-${x}`, [.045, .20, .52], [x, .60, 0], paint);
    bentTube(root, 'gooseneck-faucet', [[0, .68, -.25], [0, .95, -.25], [0, 1.00, -.15], [0, .91, -.10]], .017, brass());
    for (const x of [-.10, .10]) disc(root, `tap-${x}`, .028, .035, [x, .715, -.25], brass());
    frame(root, 'sink-door', .67, .42, .05, .292, paint, { backing: material('door-inset', '#9a8c70'), depth: .025 });
  },
  fridge(root, s) {
    const paint = material(s.colorRole, s.defaultColor); board(root, 'refrigerator-case', [.92, 1.27, .63], [0, .635, 0], paint, .025);
    for (const [name, y, h] of [['freezer', 1.05, .39], ['fridge', .44, .80]]) { const door = board(root, `${name}-door`, [.88, h, .055], [0, y, .33], paint, .018); const pull = beam(root, `${name}-handle`, [-.29, y - h * .20, .36], [-.29, y + h * .20, .36], .014, brass()); joint(root, door, pull, [-.29, y, .35]); }
  },
  microwave(root, s) {
    const paint = material(s.colorRole, s.defaultColor); board(root, 'microwave-case', [.60, .29, .40], [0, .145, 0], paint, .018);
    frame(root, 'microwave-door', .43, .23, .03, .206, warmInk(), { x: -.055, backing: material('microwave-window', '#6d7d71'), depth: .022, thickness: .022 });
    board(root, 'door-handle', [.018, .15, .025], [.13, .15, .224], brass(), .005);
    for (const y of [.10, .20]) disc(root, `dial-${y}`, .024, .018, [.24, y, .207], warmInk(), 'xy');
  },
  toaster(root, s) {
    const paint = material(s.colorRole, s.defaultColor), ink = warmInk(); board(root, 'toaster-shell', [.34, .20, .28], [0, .10, 0], paint, .026);
    for (const z of [-.062, .062]) { board(root, `recessed-slot-${z}`, [.26, .008, .042], [0, .201, z], ink, .007); board(root, `toast-${z}`, [.21, .12, .032], [0, .235, z], material('toast-crust', '#b89967'), .013); board(root, `bread-face-${z}`, [.175, .082, .004], [0, .245, z + .017], material('bread', '#dbc69a'), .010); }
    board(root, 'lever-slot', [.008, .105, .018], [.173, .11, .04], ink, .002); board(root, 'lever', [.035, .018, .035], [.183, .12, .04], ink, .004);
  },
  kettle(root, s) { teaVessel(root, s, true); },
  pot(root, s) {
    const paint = material(s.colorRole, s.defaultColor); cupVessel(root, 'cooking-pot', .12, .17, paint);
    disc(root, 'pot-lid', .125, .016, [0, .176, 0], paint); oval(root, 'lid-knob', [0, .201, 0], [.038, .04, .038], warmInk());
    for (const sign of [-1, 1]) { const loop = ring(root, `pot-handle-${sign}`, .042, .012, [sign * .146, .13, 0], warmInk()); loop.rotation.x = Math.PI / 2; }
  },
};
export const KITCHEN_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, s) => { build(root, s); if (key !== 'oven') fitOrganic(root, s); }]));
