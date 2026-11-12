import * as THREE from 'three';
import { beam, bentTube, cushionGeometry, joint, material, part } from './geometry.mjs';
import { profiledSolid, ellipse, offsetOutline, scaleOutline, slab } from './ground-shapes.mjs';

function shoreline(width, depth) {
  return ellipse(width * .94, depth * .94, 64, angle => .94 + .035 * Math.sin(angle * 3 + .3) + .02 * Math.cos(angle * 5));
}

function lilyPad(root, name, x, z, radius, waterY, water) {
  const outline = Array.from({ length: 40 }, (_, i) => {
    const angle = .19 + i / 39 * (Math.PI * 2 - .38);
    return [Math.cos(angle) * radius + x, Math.sin(angle) * radius + z];
  });
  outline.push([x + radius * .25, z]);
  const pad = slab(root, name, outline, waterY - .003, waterY + .006, material('lily-leaf', '#6b8b69'));
  joint(root, pad, water, [x, waterY - .001, z]);
  return pad;
}

function reeds(root, name, x, z, bankY, height, bank) {
  const stem = material('reed-stem', '#78865b'), seed = material('reed-seed', '#896d55');
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * .055, pz = z + (i % 2) * .025, top = height - i * .08;
    const stalk = beam(root, `${name}-rooted-stem-${i}`, [px, bankY - .015, pz], [px + .025, top - .045, pz], .009, stem);
    joint(root, stalk, bank, [px, bankY - .009, pz]);
    const pod = part(root, `${name}-seed-head-${i}`, new THREE.SphereGeometry(1, 12, 8), seed, px + .025, top - .045, pz);
    pod.scale.set(.018, .045, .018);
    joint(root, pod, stalk, [px + .024, top - .07, pz]);
    const blade = part(root, `${name}-broad-leaf-${i}`, new THREE.SphereGeometry(1, 12, 8), stem, px - .018, bankY + .10, pz);
    blade.scale.set(.025, .16, .013); blade.rotation.z = -.35;
    joint(root, blade, stalk, [px + .003, bankY + .10, pz]);
  }
}

function pond(root, spec, garden = false) {
  const outline = shoreline(spec.width, spec.depth), bankY = garden ? .15 : spec.height - .055;
  const waterY = bankY * .64, earth = material('pond-bank', '#81856a');
  const bank = profiledSolid(root, 'continuous-recessed-pond-basin', outline,
    [[1, 0], [1, bankY * .32], [.94, bankY * .95], [.90, bankY], [.82, bankY * .5], [.79, .026]], earth);
  const water = slab(root, 'contained-water-volume', scaleOutline(outline, .85), .022, waterY, material('pond-water', '#527c80'));
  joint(root, bank, water, [0, .024, 0]);
  root.userData.water = { bank: bank.name, surface: water.name, level: waterY };
  const stoneColors = ['#999783', '#878974', '#a4a08c'];
  for (let i = 0; i < 7; i++) {
    const index = Math.round(i / 7 * outline.length) % outline.length, [ox, oz] = outline[index];
    const x = ox * .925, z = oz * .925;
    const rock = part(root, `bank-stone-${i}`, cushionGeometry([garden ? .38 : .22, .075, garden ? .28 : .17], { horizontal: 1, vertical: .65, longitude: 24 }), material(`bank-stone-${i % 3}`, stoneColors[i % 3]), x, bankY + .0175, z);
    rock.rotation.y = i * .67;
    joint(root, rock, bank, [x, bankY - .01, z]);
  }
  const pads = [[.15, -.10], [.23, .14], [-.22, .14]].map(([x, z], i) => lilyPad(root, `notched-lily-pad-${i}`, x * spec.width, z * spec.depth, garden ? .25 : .15, waterY, water));
  const flowerX = spec.width * .15, flowerZ = -spec.depth * .10;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, x = flowerX + Math.cos(a) * .026, z = flowerZ + Math.sin(a) * .026;
    const petal = part(root, `lily-flower-petal-${i}`, new THREE.SphereGeometry(1, 12, 8), material('lily-flower', '#c5a0a3'), x, waterY + .013, z);
    petal.scale.set(.03, .018, .03);
    joint(root, petal, pads[0], [x, waterY + .004, z]);
  }
  for (let i = 0; i < 2; i++) {
    const cx = (i - .8) * spec.width * .18, z = (i ? -.13 : -.04) * spec.depth;
    const ripple = bentTube(root, `quiet-water-ripple-${i}`, [[cx - .18, waterY, z], [cx, waterY, z - .025], [cx + .18, waterY, z]], .0025, material('water-ripple', '#aac1b8'));
    joint(root, ripple, water, [cx, waterY - .001, z - .025]);
  }
  if (garden) for (const [i, angle] of [2.7, 4.0, .15].entries()) {
    const index = Math.round(angle / (Math.PI * 2) * outline.length) % outline.length, [x, z] = outline[index];
    reeds(root, `reed-cluster-${i}`, x * .92, z * .92, bankY * .98, spec.height, bank);
  }
}

function gardenTrail(root, spec) {
  const colors = ['#999783', '#878974', '#a4a08c'], stones = [];
  for (let i = 0; i < 7; i++) {
    const x = -1.43 + i * .475, z = [.08, -.13, .11, -.04, .12, .03, -.12][i];
    const outline = offsetOutline(ellipse(.46, .43, 12, angle => .91 + .07 * Math.cos(angle * 3 + i)), x, z);
    const stone = slab(root, `individually-grounded-stone-${i}`, outline, 0, spec.height * (i === 3 ? 1 : .83 + .025 * (i % 3)), material(`trail-stone-${i % 3}`, colors[i % 3]), { bevel: .008 });
    stones.push(stone.name);
  }
  root.userData.groundedParts = stones;
}

export const GROUND_WATER_BUILDERS = { pond: (root, spec) => pond(root, spec), gardenpond: (root, spec) => pond(root, spec, true), gardentrail: gardenTrail };
