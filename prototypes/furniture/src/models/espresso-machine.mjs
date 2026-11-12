import * as THREE from 'three';
import { beam, bentTube, joint, material, part, revolved, rounded } from './geometry.mjs';

export function espressoMachine(root, surface, height) {
  const metal = material('machine-metal', '#b4ac9a'), dark = material('machine-trim', '#51494a');
  const ceramic = material('ceramic', '#e7d9bf'), coffee = material('coffee', '#69503d');
  const h = height - surface, z = -.025;
  const tray = rounded(root, 'machine-base-and-drip-tray', [.68, .045, .37], [0, surface + .0225, z], metal, .018);
  joint(root, tray, root.getObjectByName('stone-worktop'), [0, surface - .003, z]);
  // Sink the machine slightly into the worktop to express actual contact.
  tray.position.y -= .006;
  const back = rounded(root, 'brewing-bay-back', [.64, h - .055, .07], [0, surface + (h - .055) / 2 + .025, -.155], dark, .025);
  joint(root, tray, back, [0, surface + .032, -.155]);
  const roof = rounded(root, 'rounded-machine-crown', [.68, .07, .35], [0, height - .035, -.025], metal, .025);
  for (const sign of [-1, 1]) {
    const side = rounded(root, `machine-side-${sign}`, [.055, h - .035, .30], [sign * .31, surface + (h - .035) / 2 + .012, -.025], metal, .023);
    joint(root, side, tray, [sign * .31, surface + .032, -.025]);
    joint(root, side, roof, [sign * .31, height - .05, -.025]);
  }
  const fascia = rounded(root, 'front-control-fascia', [.62, .10, .065], [0, height - .10, .105], dark, .018);
  joint(root, fascia, roof, [0, height - .065, .105]);
  const gauge = part(root, 'pressure-gauge', new THREE.CylinderGeometry(.032, .032, .012, 24), ceramic, -.17, height - .10, .141);
  gauge.rotation.x = Math.PI / 2;
  joint(root, gauge, fascia, [-.17, height - .10, .136]);
  beam(root, 'gauge-needle', [-.17, height - .10, .148], [-.157, height - .082, .148], .004, dark);
  for (const [i, color] of ['#bbaa82', '#8baba0'].entries()) {
    const button = part(root, `brew-button-${i}`, new THREE.CylinderGeometry(.015, .015, .015, 12), material(`button-${i}`, color), .05 + i * .09, height - .10, .144);
    button.rotation.x = Math.PI / 2;
    joint(root, button, fascia, [button.position.x, button.position.y, .137]);
  }
  const grouphead = part(root, 'connected-grouphead', new THREE.CylinderGeometry(.053, .046, .065, 20), metal, -.075, height - .175, .055);
  joint(root, grouphead, fascia, [-.075, height - .148, .09]);
  const handle = beam(root, 'portafilter-handle', [-.065, height - .20, .065], [.095, height - .20, .12], .014, dark);
  joint(root, handle, grouphead, [-.055, height - .20, .068]);
  const wand = bentTube(root, 'connected-steam-wand', [[.225, height - .13, .09], [.225, height - .22, .12], [.24, surface + .16, .12], [.215, surface + .13, .135]], .009, metal);
  joint(root, wand, fascia, [.225, height - .134, .092]);
  // Closed cross-section follows the outer wall, rounded rim and inner cup
  // floor. Its cavity is geometry; the coffee sits inside the rim.
  const cup = revolved(root, 'hollow-espresso-cup', [[.036, 0], [.045, .008], [.056, .105], [.055, .112], [.045, .112], [.033, .016]], ceramic);
  cup.position.set(-.075, surface + .033, .07);
  joint(root, cup, tray, [-.075, surface + .036, .07]);
  const drink = part(root, 'coffee-inside-cup', new THREE.CylinderGeometry(.045, .045, .009, 24), coffee, -.075, surface + .131, .07);
  joint(root, drink, cup, [-.0305, surface + .131, .07]);
  const ear = part(root, 'cup-handle', new THREE.TorusGeometry(.029, .007, 8, 24), ceramic, -.018, surface + .093, .07);
  joint(root, ear, cup, [-.030, surface + .116, .07]);
}
