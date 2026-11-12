import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { beam, joint, material, part, revolved } from './geometry.mjs';

export function glowingMaterial(name, color = '#e6c895', intensity = .55, recolorEmission = false) {
  const paint = material(name, color);
  paint.emissive.set(color); paint.emissiveIntensity = intensity;
  paint.userData.lightSource = true; paint.userData.recolorEmission = recolorEmission;
  paint.userData.emissionColor = color; paint.userData.emissionStrength = intensity;
  return paint;
}

export function source(root, mesh) {
  mesh.castShadow = false; mesh.userData.noCastShadow = true;
  (root.userData.lightSources ||= []).push(mesh.name);
  return mesh;
}

// A closed annular cross-section leaves actual openings at both ends.
// LatheGeometry gets an explicit closing edge instead of overlapping discs.
export function shell(root, name, profile, paint, wall = .012, segments = 48) {
  const points = [...profile, ...profile.slice().reverse().map(([r, y]) => [r - wall, y]), profile[0]];
  const geometry = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  geometry.normalizeNormals();
  return part(root, name, geometry, paint);
}

export function shade(root, name, profile, paint, wall = .012, segments = 48) {
  const mesh = shell(root, name, profile, paint, wall, segments);
  (root.userData.shades ||= []).push({ part: mesh.name, bottom: profile[0][1], x: 0, z: 0 });
  return mesh;
}

export function weightedBase(root, name, radius, paint) {
  return revolved(root, name, [[radius * .85, 0], [radius, .015], [radius, .035], [radius * .70, .065], [.035, .075]], paint);
}

export function bulb(root, name, x, bottom, z, radius = .035) {
  const socket = part(root, `${name}-socket`, new THREE.CylinderGeometry(radius * .55, radius * .65, radius, 16), material('socket-metal', '#9b896a'), x, bottom + radius / 2, z);
  const light = source(root, part(root, `${name}-globe`, new THREE.SphereGeometry(radius, 16, 12), glowingMaterial('warm-bulb'), x, bottom + radius * 1.65, z));
  joint(root, socket, light, [x, bottom + radius * .85, z]);
  return { socket, light };
}

export function flame(root, name, x, bottom, z, height, radius = height * .20) {
  let geometry = new THREE.SphereGeometry(1, 16, 12); const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + 1) / 2, taper = 1 - .65 * t * t;
    p.setXYZ(i, p.getX(i) * radius * taper + .08 * height * t ** 3, t * height, p.getZ(i) * radius * taper);
  }
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv');
  geometry = mergeVertices(geometry, 1e-6); geometry.computeVertexNormals();
  return source(root, part(root, name, geometry, glowingMaterial('warm-flame', '#e9ba74', .70), x, bottom, z));
}

export function candleOn(root, name, x, z, bottom, top, support, wax, { radius = .04, flameHeight = .11 } = {}) {
  const flameH = flameHeight, waxTop = top - flameH + .004, waxBottom = bottom - .004;
  const body = revolved(root, `${name}-wax-body`, [[radius * .95, waxBottom], [radius * 1.075, waxBottom + .015], [radius, waxTop - .012], [radius * .85, waxTop], [radius * .60, waxTop - .008]], wax);
  body.position.set(x, 0, z);
  joint(root, body, support, [x, bottom - .002, z]);
  const wick = beam(root, `${name}-wick`, [x, waxTop - .01, z], [x, waxTop + .014, z], .003, material('wick', '#62544a'));
  joint(root, wick, body, [x, waxTop - .009, z]);
  const light = flame(root, `${name}-flame`, x, top - flameH, z, flameH);
  joint(root, light, wick, [x, waxTop + .004, z]);
  return body;
}
