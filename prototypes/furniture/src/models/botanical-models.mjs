import { stored } from './storage-parts.mjs';
import * as THREE from 'three';
import { beam, bentTube, joint, material, part } from './geometry.mjs';
import { board } from './storage-parts.mjs';
import { fitOrganic, leaf, oval, pebble, pot, sprig } from './organic-parts.mjs';

const green = () => material('foliage', '#7e9270');
function vessel(root, spec, radius = .17, height = .28) { return pot(root, 'planter', 0, 0, 0, radius, height, material(spec.colorRole, spec.defaultColor)); }
export function flowerHead(root, name, at, radius, paint, count = 5) {
  const center = oval(root, `${name}-receptacle`, at, [radius * .6, radius * .38, radius * .6], material('pollen', '#cfb474'));
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2, p = [at[0] + Math.cos(a) * radius * .54, at[1], at[2] + Math.sin(a) * radius * .54];
    const petal = oval(root, `${name}-petal-${i}`, p, [radius * 1.05, radius * .24, radius * .60], paint); petal.rotation.y = -a;
  }
  return center;
}
export function flowerPatch(root, spec, count = 5) {
  const soil = pebble(root, 'grounded-soil-bed', [0, .035, 0], [spec.width * .94, .07, spec.depth * .91], material('soil', '#76664c'), 1);
  const foliage = green(), petals = material(spec.colorRole, spec.defaultColor);
  for (let i = 0; i < count; i++) {
    const x = (i / Math.max(1, count - 1) - .5) * spec.width * .65, z = Math.sin(i * 2.1) * spec.depth * .23, top = .30 + (i % 3) * .07;
    const stem = beam(root, `flower-${i}-stem`, [x, .035, z], [x, top, z], .009, foliage);
    joint(root, stem, soil, [x, .04, z]);
    leaf(root, `flower-${i}-leaf`, [x, .13, z], [x + .08, .20, z + .04], .055, foliage);
    flowerHead(root, `flower-${i}`, [x, top, z], .075, petals);
  }
}
function palmCrown(root, name, origin, spread, leaflets = 5, fronds = 7) {
  const foliage = green();
  for (let i = 0; i < fronds; i++) {
    const a = i / fronds * Math.PI * 2, direction = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const p = new THREE.Vector3(...origin), middle = p.clone().addScaledVector(direction, spread * .5); middle.y += spread * .24;
    const end = p.clone().addScaledVector(direction, spread); end.y -= spread * .17;
    bentTube(root, `${name}-frond-${i}`, [p.toArray(), middle.toArray(), end.toArray()], .009, foliage);
    for (let j = 1; j <= leaflets; j++) for (const sign of [-1, 1]) {
      const t = j / (leaflets + 1);
      // Leaflet bases enter the curved rib, rather than stopping beside it.
      const onRib = new THREE.CatmullRomCurve3([p, middle, end]).getPointAt(t);
      const tip = onRib.clone().add(new THREE.Vector3(-direction.z * sign * spread * .23, -spread * .18, direction.x * sign * spread * .23));
      leaf(root, `${name}-leaflet-${i}-${j}-${sign}`, onRib.toArray(), tip.toArray(), spread * .15, foliage);
    }
  }
}
const builders = {
  plant(root, s) { const soil = vessel(root, s, .17, .27); sprig(root, 'plant', soil, [0, .81, 0], .18, 6); },
  monstera(root, s) {
    const soil = vessel(root, s, .22, .36), foliage = green();
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, tip = [Math.cos(a) * .20, .60 + i * .11, Math.sin(a) * .12];
      const end = [tip[0] + Math.cos(a) * .15, tip[1] - .13, tip[2] + Math.sin(a) * .12 + .10];
      const blade = leaf(root, `split-leaf-${i}`, tip, end, .40, foliage, { split: true, flat: true });
      const length = new THREE.Vector3(...end).distanceTo(new THREE.Vector3(...tip)), t = .04;
      const probe = new THREE.Vector3(0, length * t, Math.sin(t * Math.PI) * length * .12).applyQuaternion(blade.quaternion).add(new THREE.Vector3(...tip));
      const origin = new THREE.Vector3(0, soil.y - .012, 0), receiver = probe.clone().addScaledVector(probe.clone().sub(origin).normalize(), .012);
      const stem = beam(root, `petiole-${i}`, origin.toArray(), receiver.toArray(), .012, foliage);
      joint(root, stem, soil.soil, [0, soil.y - .009, 0]); joint(root, stem, blade, probe.toArray());
    }
  },
  palm(root, s) { const soil = vessel(root, s, .22, .32); for (let i = 0; i < 2; i++) { const x = i * .14 - .07, y = 1.12 + i * .32; beam(root, `rooted-cane-${i}`, [x, soil.y - .015, 0], [x, y, 0], .024, material('cane', '#9d8a62')); palmCrown(root, `palm-${i}`, [x, y - .01, 0], .52, 3, 5); } },
  fern(root, s) { const soil = vessel(root, s, .18, .18); beam(root, 'fern-heart', [0, soil.y - .015, 0], [0, .35, 0], .025, green()); palmCrown(root, 'fern', [0, .34, 0], .36, 5); },
  snakeplant(root, s) {
    const soil = vessel(root, s), foliage = green();
    for (let i = 0; i < 7; i++) { const a = i * 2.4, x = Math.cos(a) * .055, z = Math.sin(a) * .055;
      leaf(root, `upright-blade-${i}`, [x, soil.y - .018, z], [x * 2, .86 + (i % 3) * .22, z * 2], .095, foliage, { fleshy: true }); }
  },
  cactus(root, s) {
    const soil = vessel(root, s, .16, .23), paint = green();
    const trunk = oval(root, 'ribbed-cactus-trunk', [0, .54, 0], [.19, .70, .19], paint, 16);
    for (const side of [-1, 1]) bentTube(root, `upturned-arm-${side}`, [[side * .06, .48, 0], [side * .18, .50, 0], [side * .18, .72 + side * .06, 0]], .044, paint);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; beam(root, `longitudinal-rib-${i}`, [Math.cos(a) * .09, .34, Math.sin(a) * .09], [Math.cos(a) * .09, .73, Math.sin(a) * .09], .009, material('cactus-ribs', '#a3af7b')); }
    joint(root, trunk, soil.soil, [0, soil.y - .009, 0]);
  },
  succulent(root, s) {
    const soil = vessel(root, s, .12, .11), foliage = green();
    for (let i = 0; i < 13; i++) { const a = i * 2.4, r = i < 8 ? .13 : .08; leaf(root, `rosette-${i}`, [0, soil.y - .012, 0], [Math.cos(a) * r, soil.y + (i < 8 ? .065 : .13), Math.sin(a) * r], .075, foliage, { fleshy: true }); }
  },
  orchid(root, s) {
    const soil = vessel(root, s, .12, .20), foliage = green();
    for (let i = 0; i < 4; i++) { const a = i * 1.8; leaf(root, `basal-leaf-${i}`, [0, soil.y - .015, 0], [Math.cos(a) * .20, soil.y + .10, Math.sin(a) * .20], .12, foliage, { fleshy: true }); }
    bentTube(root, 'arching-orchid-stem', [[0, soil.y - .015, 0], [0, .55, 0], [.12, .76, 0], [.22, .73, 0]], .009, foliage);
    for (let i = 0; i < 3; i++) flowerHead(root, `orchid-${i}`, [i * .075 + .07, .73 + Math.sin(i) * .025, 0], .085, material('orchid-petals', '#c9abb2'));
  },
  bonsai(root, s) {
    const soil = vessel(root, s, .19, .14), bark = material('bark', '#80664c'), foliage = green();
    bentTube(root, 'bent-bonsai-trunk', [[0, soil.y - .015, 0], [-.05, .29, 0], [.06, .43, 0], [0, .55, 0]], .035, bark);
    for (let i = 0; i < 3; i++) { const x = (i - 1) * .15, y = .35 + i * .10;
      beam(root, `branch-${i}`, [0, y - .03, 0], [x, y, 0], .019, bark);
      pebble(root, `foliage-pad-${i}`, [x, y + .045, 0], [.28, .15, .24], foliage, 1); }
  },
  flowers(root, s) { flowerPatch(root, s); },
  flowerbed(root, s) { flowerPatch(root, s, 7); },
  terrarium(root, s) {
    const frame = material(s.colorRole, s.defaultColor), soil = pot(root, 'terrarium', 0, 0, 0, .22, .10, frame);
    sprig(root, 'miniature', soil, [0, .40, 0], .11, 4);
    const glass = material('terrarium-glass', '#b6c4ba'); glass.transparent = true; glass.opacity = .15; glass.depthWrite = false;
    const dome = part(root, 'closed-glass-envelope', new THREE.SphereGeometry(.24, 16, 12), glass, 0, .27, 0); dome.scale.y = 1.03; dome.userData.noCastShadow = true;
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; bentTube(root, `glazing-bar-${i}`, [[Math.cos(a) * .21, .09, Math.sin(a) * .21], [Math.cos(a) * .23, .29, Math.sin(a) * .23], [0, .515, 0]], .008, frame); }
  },
  plantshelf(root, s) {
    const finish = material(s.colorRole, s.defaultColor), h = 1.65;
    for (const x of [-.62, .62]) for (const z of [-.21, .21]) board(root, `upright-${x}-${z}`, [.045, h, .045], [x, h / 2, z], finish);
    for (let row = 0; row < 3; row++) {
      const top = .10 + row * .52, tray = board(root, `tray-${row}`, [1.32, .045, .49], [0, top - .0225, 0], finish);
      for (let i = 0; i < 3; i++) {
        const start = root.children.length;
        const colors = ['#d58b63', '#69a5a0', '#d7b65e'];
        const soil = pot(root, `pot-${row}-${i}`, (i - 1) * .43, 0, top - .004, .13, .17, material(`stock-pot-${(row + i) % 3}`, colors[(row + i) % 3]), tray);
        sprig(root, `plant-${row}-${i}`, soil, [soil.x, soil.y + .19, 0], .14, 4, (row + i) % 3 === 0);
        for (const node of root.children.slice(start)) if (node.material?.name === "foliage") node.material.color.set(["#74a45c", "#569780", "#8aaf62"][(row + i) % 3]);
        stored(root, `stock-${row}-${i}`, root.children.slice(start), tray);
      }
    }
  },
};
export const BOTANICAL_BUILDERS = Object.fromEntries(Object.entries(builders).map(([key, build]) => [key, (root, spec) => { build(root, spec); fitOrganic(root, spec); }]));
