import * as THREE from 'three';
import { beam, bentTube, joint, material, part, revolved } from './geometry.mjs';
import { bulb, glowingMaterial, shade, source, weightedBase } from './lighting-parts.mjs';

function standingShadeLamp(root, spec, table = false) {
  const h = spec.height, radius = table ? .195 : .36, bottom = h - (table ? .35 : .60), top = h - .035;
  const metal = material('lamp-frame', '#8c7357'), fabric = glowingMaterial(table ? 'shade-glass' : 'shade-fabric', table ? '#b6a16d' : '#d8cbb4', table ? .12 : .08, true);
  const base = weightedBase(root, 'grounded-weighted-base', table ? .17 : .24, metal);
  const stem = beam(root, 'continuous-lamp-stem', [0, .055, 0], [0, h - .025, 0], table ? .013 : .023, metal);
  joint(root, stem, base, [0, .065, 0]);
  const profile = table ? [[radius, bottom], [.17, bottom + .12], [.09, top - .02], [.045, top]] : [[radius, bottom], [.22, top]];
  const cover = source(root, shade(root, 'hollow-supported-shade', profile, fabric, .012, table ? 16 : 48));
  const supportY = bottom + .025, supportR = table ? .183 : radius - .014;
  for (const [i, angle] of [0, Math.PI / 2, Math.PI, Math.PI * 1.5].entries()) {
    const x = Math.cos(angle), z = Math.sin(angle);
    const spoke = beam(root, `shade-receiving-spoke-${i}`, [0, supportY, 0], [x * supportR, supportY, z * supportR], .008, metal);
    joint(root, spoke, stem, [x * .005, supportY, z * .005]);
    joint(root, spoke, cover, [x * (supportR - .002), supportY, z * (supportR - .002)]);
  }
  const light = bulb(root, 'recessed-lamp-bulb', 0, bottom + .045, 0, table ? .030 : .045);
  joint(root, light.socket, stem, [0, bottom + .055, 0]);
  const finial = part(root, 'supported-finial', new THREE.SphereGeometry(.02, 12, 8), metal, 0, h - .02, 0);
  joint(root, finial, stem, [0, h - .03, 0]);
  const hem = part(root, 'bound-shade-hem', new THREE.TorusGeometry(radius - .006, .007, 8, table ? 32 : 48), metal, 0, bottom + .005, 0);
  hem.rotation.x = Math.PI / 2;
  joint(root, hem, cover, [radius - .007, bottom + .007, 0]);
  if (table) for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2, x = Math.cos(angle), z = Math.sin(angle);
    bentTube(root, `bronze-pane-leading-${i}`, [[x * .19, bottom + .004, z * .19], [x * .166, bottom + .12, z * .166], [x * .085, top - .02, z * .085], [x * .041, top, z * .041]], .004, metal);
  }
}

function deskLamp(root, spec) {
  const h = spec.height, metal = material('lamp-metal', '#817986'), bronze = material('pivot-metal', '#b49a75');
  const base = weightedBase(root, 'weighted-desk-base', .155, metal);
  const pivot = part(root, 'readable-elbow-pivot', new THREE.SphereGeometry(.029, 12, 8), bronze, -.065, .53, -.025);
  const lower = beam(root, 'lower-hinged-arm', [0, .055, 0], [-.065, .53, -.025], .022, metal);
  joint(root, lower, base, [0, .065, 0]); joint(root, lower, pivot, [-.065, .52, -.025]);
  const x = .065, z = .015;
  const upper = beam(root, 'upper-hinged-arm', [-.065, .53, -.025], [x, h - .025, z], .022, metal);
  joint(root, upper, pivot, [-.061, .54, -.024]);
  const cover = shade(root, 'open-desk-shade', [[.12, h - .24], [.055, h - .03]], metal);
  cover.position.set(x, 0, z); Object.assign(root.userData.shades[0], { x, z });
  const cap = part(root, 'receiving-shade-cap', new THREE.CylinderGeometry(.055, .055, .035, 24), metal, x, h - .0175, z);
  joint(root, cap, upper, [x - .002, h - .03, z]);
  joint(root, cap, cover, [x + .05, h - .032, z]);
  const socketSupport = beam(root, 'internal-bulb-support', [x, h - .19, z], [x, h - .022, z], .012, bronze);
  joint(root, socketSupport, cap, [x, h - .028, z]);
  const light = bulb(root, 'desk-bulb', x, h - .19, z, .030);
  joint(root, light.socket, socketSupport, [x, h - .18, z]);
}

function paperLamp(root, spec) {
  const h = spec.height, metal = material('paper-lamp-frame', '#776651'), paper = glowingMaterial('paper-shade', '#d8cdb6', .12, true);
  const base = weightedBase(root, 'weighted-paper-lamp-base', .22, metal);
  const pole = beam(root, 'continuous-paper-lamp-spine', [0, .06, 0], [0, h - .03, 0], .018, metal);
  joint(root, pole, base, [0, .065, 0]);
  const bottom = .43, top = h - .04;
  const profile = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12; return [.15 + .17 * Math.sin(t * Math.PI) ** .65, bottom + (top - bottom) * t];
  });
  const cover = source(root, shade(root, 'closed-paper-barrel-shell', profile, paper, .009));
  for (const [i, [r, y]] of profile.entries()) {
    const rib = part(root, `broad-paper-rib-${i}`, new THREE.TorusGeometry(r - .004, .005, 6, 48), metal, 0, y, 0);
    rib.rotation.x = Math.PI / 2;
    joint(root, rib, cover, [r - .005, y + (i === 0 ? .002 : i === 12 ? -.002 : 0), 0]);
  }
  for (const y of [bottom + .008, top - .008]) for (const sign of [-1, 1]) {
    const index = profile.findIndex(([, at]) => at >= y), [r0, y0] = profile[index - 1], [r1, y1] = profile[index];
    const end = THREE.MathUtils.lerp(r0, r1, (y - y0) / (y1 - y0)) - .002;
    const strut = beam(root, `paper-cap-spoke-${y}-${sign}`, [0, y, 0], [sign * end, y, 0], .008, metal);
    joint(root, strut, pole, [sign * .005, y, 0]); joint(root, strut, cover, [sign * (end - .003), y, 0]);
  }
  const cap = part(root, 'paper-lamp-top-cap', new THREE.CylinderGeometry(.165, .165, .06, 32), metal, 0, h - .03, 0);
  joint(root, cap, pole, [0, h - .04, 0]); joint(root, cap, cover, [.150, h - .045, 0]);
  const light = bulb(root, 'paper-lamp-bulb', 0, bottom + .12, 0, .045);
  joint(root, light.socket, pole, [0, bottom + .135, 0]);
}

function mushroomLamp(root, spec) {
  const h = spec.height, bottom = h - .20, cream = material('mushroom-stem', '#d6c9b1'), red = material('mushroom-cap', '#ae8075');
  const stem = revolved(root, 'grounded-mushroom-stem', [[.080, 0], [.09, .02], [.060, .10], [.055, bottom + .04], [.04, bottom + .07]], cream);
  const cover = shade(root, 'hollow-overhanging-cap', [[.20, bottom], [.215, bottom + .045], [.18, bottom + .14], [.10, h - .025], [.025, h - .008]], red, .01);
  for (const sign of [-1, 1]) {
    const spoke = beam(root, `cap-receiving-spoke-${sign}`, [0, bottom + .035, 0], [sign * .208, bottom + .035, 0], .008, cream);
    joint(root, spoke, stem, [sign * .005, bottom + .035, 0]); joint(root, spoke, cover, [sign * .205, bottom + .035, 0]);
  }
  const cap = part(root, 'rounded-mushroom-crown', new THREE.SphereGeometry(.05, 16, 12), red, 0, h - .05, 0);
  joint(root, cap, cover, [.027, h - .01, 0]);
  const light = bulb(root, 'mushroom-bulb', 0, bottom + .045, 0, .030);
  joint(root, light.socket, stem, [0, bottom + .055, 0]);
}

export const LAMP_BUILDERS = { floorlamp: (root, spec) => standingShadeLamp(root, spec), tablelamp: (root, spec) => standingShadeLamp(root, spec, true), desklamp: deskLamp, paperlantern: paperLamp, mushroomlamp: mushroomLamp };
