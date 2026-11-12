import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { beam, bentTube, joint, material, part, revolved } from './geometry.mjs';
import { board } from './storage-parts.mjs';
import { leaf } from './organic-parts.mjs';
import { ring } from './object-parts.mjs';

export function canopy(root, name, at, size, paint, lobes = 5) {
  let geometry = new THREE.IcosahedronGeometry(1, 2); const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), factor = 1 + .16 * Math.cos(a * lobes) * (1 - y * y) + .07 * Math.sin(y * 7 + a * 2);
    p.setXYZ(i, x * size[0] / 2 * factor, y * size[1] / 2, z * size[2] / 2 * factor); }
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv'); geometry = mergeVertices(geometry, 1e-6); geometry.computeVertexNormals();
  return part(root, name, geometry, paint, ...at);
}
export function broadTree(root, name, paint, { blossom = false, birch = false } = {}) {
  const bark = material('bark', birch ? '#c9c6af' : '#876d52');
  const trunk = revolved(root, `${name}-rooted-trunk`, [[.14, 0], [.09, .12], [.065, 1.45], [.028, 2.06]], bark);
  for (let i = 0; i < 4; i++) { const a = i * 2.4, tip = [Math.cos(a) * .33, 1.65 + i * .13, Math.sin(a) * .33]; const branch = beam(root, `${name}-receiving-branch-${i}`, [0, 1.18 + i * .12, 0], tip, .035, bark); joint(root, trunk, branch, [0, 1.20 + i * .12, 0]); }
  canopy(root, `${name}-continuous-crown`, [0, 1.52, 0], [1.32, 1.45, 1.24], paint, blossom ? 5 : 3);
  if (birch) for (let i = 0; i < 6; i++) { const mark = board(root, `bark-mark-${i}`, [.085, .020, .018], [i % 2 * .03 - .015, .30 + i * .21, .065 - i * .004], material('birch-marks', '#827c6c'), .003); mark.rotation.z = .10; }
}
export function pineTree(root, name, paint, snowy = false) {
  const bark = material('bark', '#8b7255'); revolved(root, `${name}-trunk`, [[.11, 0], [.075, .08], [.045, 1.45]], bark);
  const profile = [[.08, .20], [.52, .22], [.48, .28], [.26, .80], [.43, .74], [.39, .81], [.16, 1.30], [.31, 1.23], [.27, 1.30], [.015, 2.0]];
  revolved(root, `${name}-continuous-needles`, profile, paint);
  if (snowy) {
    const caps = [[[.49, .28], [.49, .31], [.255, .82]], [[.404, .81], [.404, .84], [.174, 1.33]], [[.282, 1.30], [.282, 1.33], [.014, 2.015]]];
    caps.forEach((profile, i) => revolved(root, `${name}-snow-cap-${i}`, profile, material('snow', '#d7d7c6')));
  }
}
export function pumpkin(root, name, at, radius, paint) {
  let geometry = new THREE.SphereGeometry(1, 24, 12); const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), f = 1 + .075 * Math.cos(a * 10); p.setXYZ(i, p.getX(i) * radius * f, (p.getY(i) + 1) * radius * .77, p.getZ(i) * radius * f); }
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv'); geometry = mergeVertices(geometry, 1e-6); geometry.computeVertexNormals();
  const body = part(root, `${name}-ribbed-body`, geometry, paint, ...at);
  bentTube(root, `${name}-stem`, [[at[0], at[1] + radius * 1.47, at[2]], [at[0] + .012, at[1] + radius * 1.71, at[2]], [at[0] + .035, at[1] + radius * 1.76, at[2]]], radius * .11, material('gourd-stem', '#8b855e'));
  return body;
}
export function crate(root, name, w, d, h, paint, at = [0, 0, 0]) {
  const [x, bottom, z] = at, base = board(root, `${name}-floor`, [w, .035, d], [x, bottom + .0175, z], paint);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) board(root, `${name}-corner-${sx}-${sz}`, [.035, h, .035], [x + sx * (w - .035) / 2, bottom + h / 2, z + sz * (d - .035) / 2], paint);
  for (let i = 0; i < 3; i++) for (const sign of [-1, 1]) { const y = bottom + .08 + i * (h - .09) / 3;
    board(root, `${name}-long-slat-${i}-${sign}`, [w, .055, .025], [x, y, z + sign * (d - .025) / 2], paint);
    board(root, `${name}-end-slat-${i}-${sign}`, [.025, .055, d], [x + sign * (w - .025) / 2, y, z], paint); }
  return base;
}
export function wickerBasket(root, name, radius, height, paint) {
  const body = revolved(root, `${name}-hollow-basket`, [[radius * .70, 0], [radius, height], [radius - .020, height], [radius * .65, .025]], paint);
  ring(root, `${name}-bound-rim`, radius - .009, .013, [0, height - .005, 0], paint, 'xz');
  bentTube(root, `${name}-receiving-handle`, [[-radius + .01, height - .03, 0], [-radius * .7, height + .18, 0], [0, height + .24, 0], [radius * .7, height + .18, 0], [radius - .01, height - .03, 0]], .015, paint);
  for (let i = 0; i < 3; i++) ring(root, `${name}-weave-band-${i}`, radius * (.78 + i * .08), .005, [0, height * (.22 + i * .25), 0], material('wicker-band', '#9a815e'), 'xz');
  return body;
}
export function garland(root, name, width, paint, evergreen = false) {
  const points = [[-width / 2, .25, 0], [0, .10, 0], [width / 2, .25, 0]], curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  bentTube(root, `${name}-bound-vine`, points, .012, material('vine', '#807958'));
  for (let i = 0; i < 15; i++) { const t = (i + .3) / 15, at = curve.getPointAt(t), sign = i % 2 ? -1 : 1;
    leaf(root, `${name}-leaf-${i}`, at.toArray(), [at.x + sign * .08, at.y - .11, at.z + .01], evergreen ? .045 : .09, paint); }
}
