import * as THREE from 'three';
import { beam, joint, material, part, revolved } from './geometry.mjs';
import { board } from './storage-parts.mjs';
import { fitOrganic, leaf, oval, pebble, pot } from './organic-parts.mjs';
import { brass, disc, outlineSolid, ring, warmInk } from './object-parts.mjs';
import { bowlVessel, cupVessel } from './kitchen-models.mjs';
import { glowingMaterial, source } from './lighting-parts.mjs';
import { flowerHead } from './botanical-models.mjs';
import { broadTree, crate, garland, pumpkin, wickerBasket } from './outdoor-parts.mjs';
import { profiledSolid, rectangle } from './ground-shapes.mjs';

function finish(s) { return material(s.colorRole, s.defaultColor); }
export function mushrooms(root, paint) {
  const soil = pebble(root, 'moss-bed', [0, .025, 0], [.67, .05, .53], material('moss', '#879373'), 1);
  for (let i = 0; i < 5; i++) { const x = Math.cos(i * 2.4) * .20, z = Math.sin(i * 2.4) * .15, h = .14 + i % 3 * .055;
    beam(root, `mushroom-stem-${i}`, [x, .02, z], [x, h + .015, z], .025, material('mushroom-stem', '#d5c7a7'));
    const cap = revolved(root, `mushroom-cap-${i}`, [[.08, h], [.095, h + .025], [.07, h + .07], [.012, h + .095]], paint); cap.position.set(x, 0, z);
  }
  return soil;
}
const builds = {
  mapletree(root, s) { broadTree(root, 'maple', finish(s)); },
  leafpile(root, s) {
    const paint = finish(s); pebble(root, 'low-grounded-leaf-mound', [0, .018, 0], [.86, .036, .67], paint, 1);
    for (let i = 0; i < 17; i++) { const a = i * 2.4, r = .08 + i % 4 * .07, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = .034 - r * .025;
      leaf(root, `fallen-leaf-${i}`, [x, y, z], [x + Math.cos(a) * .15, y + .006, z + Math.sin(a) * .15], .12, i % 3 ? paint : material('ochre-leaf', '#c4a16a'), { split: true, flat: true }); }
  },
  haybale(root, s) {
    const paint = finish(s), h = s.seat; board(root, 'compressed-hay-bale', [.85, h, .65], [0, h / 2, 0], paint, .035);
    for (const x of [-.23, .23]) { board(root, `bale-top-binding-${x}`, [.020, .008, .61], [x, h - .004, 0], material('twine', '#8f815e'), .002); for (const z of [-.32, .32]) board(root, `bale-face-binding-${x}-${z}`, [.020, h - .02, .014], [x, h / 2, z], material('twine', '#8f815e'), .003); }
    for (let i = 0; i < 6; i++) board(root, `straw-band-${i}`, [.74, .008, .007], [0, .09 + i * (h - .16) / 6, .324], material('straw-shade', '#ac9864'), .002);
  },
  pumpkin(root, s) { pumpkin(root, 'pumpkin', [0, 0, 0], .20, finish(s)); },
  jackolantern(root, s) {
    const paint = finish(s), shape = new THREE.Shape(); const points = [];
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; points.push(new THREE.Vector2(Math.cos(a) * .18 * (1 + .025 * Math.cos(a * 8)), .18 + Math.sin(a) * .17)); }
    shape.setFromPoints(points); shape.closePath();
    for (const sign of [-1, 1]) { const hole = new THREE.Path(), base = sign === -1 ? .198 : .203; hole.moveTo(sign * .045, .26); hole.lineTo(sign * .092, base); hole.lineTo(sign * .018, base + .001); hole.closePath(); shape.holes.push(hole); }
    const mouth = new THREE.Path(); mouth.moveTo(-.10, .14); mouth.lineTo(-.07, .075); mouth.lineTo(.07, .075); mouth.lineTo(.10, .14); mouth.lineTo(.025, .12); mouth.lineTo(0, .145); mouth.lineTo(-.025, .12); mouth.closePath(); shape.holes.push(mouth);
    part(root, 'carved-pumpkin-face', new THREE.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false }), paint, 0, 0, .13);
    const rear = cupVessel(root, 'hollow-pumpkin-shell', .18, .27, paint, [0, .18, -.13]); rear.rotation.x = Math.PI / 2;
    source(root, disc(root, 'recessed-candle-glow', .13, .025, [0, .18, .106], glowingMaterial('pumpkin-light', '#e2b879', .7), 'xy'));
    beam(root, 'pumpkin-stem', [0, .33, 0], [.025, .41, 0], .023, material('stem', '#89805d'));
  },
  rake(root, s) {
    const paint = finish(s), metal = warmInk(); beam(root, 'rake-shaft', [0, .17, .02], [.07, 1.54, -.04], .017, paint);
    beam(root, 'receiving-rake-head', [-.17, .17, .02], [.17, .17, .02], .014, metal);
    for (let i = 0; i < 8; i++) beam(root, `rake-tine-${i}`, [(i - 3.5) * .046, .17, .02], [(i - 3.5) * .046, .015, .07], .007, metal);
  },
  scarecrow(root, s) {
    const wood = material('timber', '#967b54'), paint = finish(s); beam(root, 'planted-support-stake', [0, 0, 0], [0, 1.66, 0], .028, wood); beam(root, 'receiving-crossbar', [-.44, 1.12, 0], [.44, 1.12, 0], .025, wood);
    board(root, 'cloth-shirt', [.36, .45, .14], [0, 1.05, .01], paint, .035);
    for (const sign of [-1, 1]) { beam(root, `shirt-sleeve-${sign}`, [sign * .12, 1.17, .01], [sign * .39, 1.10, .01], .070, paint); beam(root, `trouser-leg-${sign}`, [sign * .09, .88, .01], [sign * .12, .49, .01], .061, material('trousers', '#8c9277')); }
    oval(root, 'straw-head', [0, 1.43, 0], [.30, .32, .24], material('straw', '#bda77a'));
    disc(root, 'hat-brim', .23, .025, [0, 1.59, 0], wood); revolved(root, 'hat-crown', [[.13, 1.59], [.10, 1.78]], wood);
    for (const x of [-.055, .055]) oval(root, `button-eye-${x}`, [x, 1.46, .116], [.018, .025, .012], warmInk());
    board(root, 'neck-scarf', [.31, .06, .15], [0, 1.28, 0], material('scarf', '#c0a179'), .013);
  },
  turkey(root, s) {
    const paint = finish(s), plumage = material('wing-feathers', '#b19674');
    for (const x of [-.07, .07]) { beam(root, `turkey-leg-${x}`, [x, .012, .065], [x, .20, .05], .015, brass()); beam(root, `turkey-foot-${x}`, [x - .04, .015, .07], [x + .04, .015, .07], .009, brass()); }
    oval(root, 'turkey-body', [0, .32, 0], [.40, .36, .46], paint);
    for (let i = 0; i < 7; i++) { const a = (i / 6 - .5) * Math.PI * .86, feather = oval(root, `fan-feather-${i}`, [Math.sin(a) * .22, .40 + Math.cos(a) * .22, -.20], [.105, .36, .045], plumage); feather.rotation.z = -a; }
    for (const sign of [-1, 1]) oval(root, `wing-${sign}`, [sign * .18, .34, .02], [.08, .23, .28], plumage);
    beam(root, 'turkey-neck', [0, .38, .13], [0, .58, .18], .048, paint); oval(root, 'turkey-head', [0, .61, .18], [.15, .15, .15], paint);
    outlineSolid(root, 'beak', [[-.025, .62], [.025, .62], [0, .57]], .07, brass(), [0, 0, .25]);
    for (const x of [-.045, .045]) oval(root, `turkey-eye-${x}`, [x, .64, .237], [.016, .020, .012], warmInk());
  },
  wreath(root, s) { const paint = finish(s); ring(root, 'bound-wreath-ring', .28, .048, [0, .34, 0], material('vine', '#8d805d')); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, from = [Math.cos(a) * .28, .34 + Math.sin(a) * .28, .015]; leaf(root, `wreath-leaf-${i}`, from, [from[0] + Math.cos(a + .7) * .14, from[1] + Math.sin(a + .7) * .14, .02], .09, paint); } },
  cornstalks(root, s) {
    const paint = finish(s); for (let i = 0; i < 5; i++) { const x = (i - 2) * .045, top = 1.18 + i % 3 * .13; beam(root, `corn-stalk-${i}`, [x, 0, 0], [x * 1.3, top, 0], .012, paint); for (let j = 0; j < 4; j++) { const y = .28 + j * .22, sign = j % 2 ? -1 : 1; leaf(root, `corn-leaf-${i}-${j}`, [x, y, 0], [x + sign * .21, y + .14, .03], .07, material('dry-leaves', '#b9aa78')); } oval(root, `corn-tassel-${i}`, [x * 1.3, top, 0], [.045, .18, .045], paint); } ring(root, 'bundle-tie', .115, .010, [0, .28, 0], material('twine', '#8d805a'), 'xz');
  },
  applecrate(root, s) { crate(root, 'apple-crate', .70, .50, .32, finish(s)); board(root, 'receiving-fruit-tray', [.675, .045, .48], [0, .20, 0], finish(s)); for (let i = 0; i < 8; i++) { const x = (i % 4 - 1.5) * .15, z = (Math.floor(i / 4) - .5) * .17; oval(root, `apple-${i}`, [x, .29, z], [.15, .15, .15], material('apple', '#ad8270')); beam(root, `apple-stem-${i}`, [x, .35, z], [x + .006, .38, z], .005, warmInk()); } },
  mushroompatch(root, s) { mushrooms(root, finish(s)); },
  leafgarland(root, s) { garland(root, 'autumn-garland', 1.30, finish(s)); },
  leafbarrow(root, s) {
    const wood = material('timber', '#947b59');
    const tray = profiledSolid(root, 'barrow-tray', rectangle(.72, .54, .045), [[.55, .28], [1, .45], [.97, .47], [.90, .47], [.48, .32]], finish(s)); tray.position.x = -.09;
    const wheel = disc(root, 'barrow-wheel', .16, .055, [-.40, .16, 0], warmInk(), 'xy'); wheel.rotation.y = Math.PI / 2;
    beam(root, 'wheel-axle', [-.40, .16, -.12], [-.40, .16, .12], .020, wood);
    for (const sign of [-1, 1]) { beam(root, `barrow-frame-${sign}`, [-.40, .16, sign * .11], [.56, .37, sign * .20], .022, wood); beam(root, `barrow-leg-${sign}`, [.22, .02, sign * .19], [.15, .35, sign * .18], .018, wood); }
    for (const [i, x] of [-.19, .06].entries()) {
      const crossbar = beam(root, `tray-receiving-crossbar-${i}`, [x, .29, -.19], [x, .29, .19], .016, wood);
      joint(root, crossbar, tray, [x, .295, 0]);
      const t = (x + .40) / .96, y = .16 + .21 * t;
      for (const sign of [-1, 1]) {
        const z = sign * (.11 + .09 * t), strut = beam(root, `tray-receiving-strut-${i}-${sign}`, [x, y - .008, z], [x, .30, z], .014, wood);
        joint(root, strut, root.getObjectByName(`barrow-frame-${sign}`), [x, y, z]);
        joint(root, strut, crossbar, [x, .288, z]);
      }
    }
    pebble(root, 'contained-leaf-fill', [-.09, .37, 0], [.50, .12, .36], material('leaf-fill', '#b69b71'), 1);
    for (let i = 0; i < 10; i++) { const a = i * 2.4, x = -.09 + Math.cos(a) * .14, z = Math.sin(a) * .12; leaf(root, `barrow-leaf-${i}`, [x, .425, z], [x + .12, .46, z + .06], .12, material('leaves', i % 2 ? '#b08c65' : '#bc9d71'), { split: true, flat: true }); }
  },
  mums(root, s) { const soil = pot(root, 'mum-pot', 0, 0, 0, .19, .25, material('pot', '#a58a6a')); for (let i = 0; i < 7; i++) { const a = i * 2.4, x = Math.cos(a) * .15, z = Math.sin(a) * .15, y = .43 + i % 3 * .06; beam(root, `mum-stem-${i}`, [0, soil.y - .014, 0], [x, y, z], .010, material('foliage', '#7e8e67')); flowerHead(root, `mum-${i}`, [x, y, z], .09, finish(s), 8); } },
  harvestbasket(root, s) { wickerBasket(root, 'harvest', .24, .25, finish(s)); for (let i = 0; i < 3; i++) pumpkin(root, `harvest-gourd-${i}`, [(i - 1) * .11, .09, 0], .075, material('gourds', i % 2 ? '#b8a174' : '#b28b66')); },
  acornbowl(root, s) { bowlVessel(root, 'acorn-bowl', .16, .09, finish(s)); for (let i = 0; i < 5; i++) { const a = i * 2.4, x = Math.cos(a) * .075, z = Math.sin(a) * .075; oval(root, `acorn-${i}`, [x, .08, z], [.060, .085, .060], material('acorn', '#ac9169')); oval(root, `acorn-cap-${i}`, [x, .114, z], [.066, .035, .066], material('acorn-cap', '#837457')); } },
  harvestsign(root, s) { const paint = finish(s); beam(root, 'planted-sign-post', [0, 0, 0], [0, 1.10, 0], .035, material('post', '#9c825e')); for (const y of [.75, .96]) board(root, `sign-board-${y}`, [.55, .18, .06], [0, y, .025], paint); pumpkin(root, 'painted-pumpkin', [0, .73, .06], .065, material('emblem', '#c3a071')); },
  ciderset(root, s) { const paint = finish(s); disc(root, 'serving-tray', .25, .020, [0, .01, 0], material('tray', '#ab9271')); cupVessel(root, 'cider-jug', .075, .29, paint, [-.08, .017, -.025]); ring(root, 'jug-handle', .048, .012, [.005, .20, -.025], paint); disc(root, 'jug-lid', .075, .014, [-.08, .314, -.025], paint); for (const z of [-.10, .10]) { cupVessel(root, `cider-cup-${z}`, .055, .11, paint, [.11, .017, z]); ring(root, `cup-handle-${z}`, .032, .009, [.17, .08, z], paint); } },
};
export const AUTUMN_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, s) => { build(root, s); if (key !== 'haybale') fitOrganic(root, s); }]));
