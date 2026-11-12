import * as THREE from 'three';
import { part, material, revolved } from './geometry.mjs';
import { board } from './storage-parts.mjs';

export function ring(root, name, radius, tube, at, paint, plane = 'xy') {
  const mesh = part(root, name, new THREE.TorusGeometry(radius, tube, 8, 24), paint, ...at);
  if (plane === 'xz') mesh.rotation.x = Math.PI / 2;
  return mesh;
}
export function disc(root, name, radius, thickness, at, paint, plane = 'xz') {
  const mesh = part(root, name, new THREE.CylinderGeometry(radius, radius, thickness, 24), paint, ...at);
  if (plane === 'xy') mesh.rotation.x = Math.PI / 2;
  return mesh;
}
export function outlineSolid(root, name, points, thickness, paint, at = [0, 0, 0]) {
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(...p)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, steps: 1, curveSegments: 12 });
  geometry.translate(0, 0, -thickness / 2);
  return part(root, name, geometry, paint, ...at);
}
export function frame(root, name, width, height, bottom, z, paint, { thickness = .035, depth = .04, x = 0, backing = null } = {}) {
  const pieces = [];
  for (const side of [-1, 1]) {
    pieces.push(board(root, `${name}-stile-${side}`, [thickness, height, depth], [x + side * (width - thickness) / 2, bottom + height / 2, z], paint, .005));
    pieces.push(board(root, `${name}-rail-${side}`, [width, thickness, depth], [x, bottom + (side + 1) / 2 * (height - thickness) + thickness / 2, z], paint, .005));
  }
  if (backing) pieces.push(board(root, `${name}-inset`, [width - thickness, height - thickness, depth * .8], [x, bottom + height / 2, z - depth * .05], backing, .003));
  return pieces;
}
export function pedestal(root, name, height, radius, paint) {
  return revolved(root, name, [[radius, 0], [radius, .035], [radius * .55, .07], [.025, .10], [.025, height - .035], [.06, height]], paint);
}
export const warmInk = () => material('ink', '#524a49');
export const brass = () => material('brass', '#b49a72');
