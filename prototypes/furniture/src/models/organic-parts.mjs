import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { beam, joint, material, part, revolved } from './geometry.mjs';

export function pebble(root, name, at, size, paint, detail = 0) {
  const geometry = new THREE.IcosahedronGeometry(1, detail); geometry.scale(...size.map(n => n / 2));
  return part(root, name, geometry, paint, ...at);
}

export function oval(root, name, at, size, paint, segments = 12) {
  const geometry = new THREE.SphereGeometry(1, segments, 8); geometry.scale(...size.map(n => n / 2)); geometry.normalizeNormals();
  return part(root, name, geometry, paint, ...at);
}

export function leaf(root, name, from, to, width, paint, { split = false, fleshy = false, flat = false } = {}) {
  const a = new THREE.Vector3(...from), direction = new THREE.Vector3(...to).sub(a), length = direction.length();
  let geometry = new THREE.SphereGeometry(1, 10, 8); const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + 1) / 2;
    const notch = split ? 1 - .28 * Math.max(0, Math.cos(t * Math.PI * 10)) ** 4 : 1;
    p.setXYZ(i, p.getX(i) * width / 2 * notch, t * length,
      p.getZ(i) * (fleshy ? width * .17 : .006) + Math.sin(t * Math.PI) * length * .12);
  }
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv'); geometry = mergeVertices(geometry, 1e-6); geometry.computeVertexNormals();
  const mesh = part(root, name, geometry, paint, ...from);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  if (flat) {
    const xAxis = direction.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), zAxis = xAxis.clone().cross(direction).normalize();
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, direction, zAxis));
  }
  return mesh;
}

export function pot(root, name, x, z, bottom, radius, height, paint, support) {
  const body = revolved(root, `${name}-hollow-vessel`, [[radius * .66, 0], [radius - .012, height - .04], [radius, height - .03], [radius, height], [radius - .014, height], [radius - .026, height - .04], [radius * .62, .025]], paint);
  body.position.set(x, bottom, z);
  const soil = part(root, `${name}-contained-soil`, new THREE.CylinderGeometry(radius - .020, radius - .020, .045, 20), material('soil', '#655341'), x, bottom + height - .0425, z);
  joint(root, soil, body, [x + radius - .023, bottom + height - .04, z]);
  if (support) joint(root, body, support, [x, bottom + .002, z]);
  return { body, soil, y: bottom + height - .02, x, z };
}

export function sprig(root, name, soil, tip, spread, count = 5, split = false) {
  const stemPaint = material('stems', '#73845c'), foliage = material('foliage', '#7c9270');
  const origin = [soil.x, soil.y - .012, soil.z], stem = beam(root, `${name}-rooted-stem`, origin, tip, .009, stemPaint);
  joint(root, stem, soil.soil, [soil.x, soil.y - .009, soil.z]);
  for (let i = 0; i < count; i++) {
    const t = .35 + i / Math.max(1, count - 1) * .60, angle = i * 2.4;
    const start = new THREE.Vector3(...origin).lerp(new THREE.Vector3(...tip), t);
    const end = start.clone().add(new THREE.Vector3(Math.cos(angle) * spread, spread * .7, Math.sin(angle) * spread));
    const stalkEnd = start.clone().lerp(end, .32), stalkStart = start.clone().addScaledVector(end.clone().sub(start).normalize(), -.003);
    const petiole = beam(root, `${name}-petiole-${i}`, stalkStart.toArray(), stalkEnd.toArray(), .005, stemPaint);
    const leafStart = start.clone().lerp(end, .28), blade = leaf(root, `${name}-leaf-${i}`, leafStart.toArray(), end.toArray(), spread * .70, foliage, { split });
    joint(root, petiole, stem, start.toArray());
    const bladeLength = leafStart.distanceTo(end), tLeaf = .04;
    const leafJoint = new THREE.Vector3(0, bladeLength * tLeaf, Math.sin(tLeaf * Math.PI) * bladeLength * .12).applyQuaternion(blade.quaternion).add(leafStart);
    joint(root, blade, petiole, leafJoint.toArray());
  }
}

// Organic assemblies are authored first, then fitted as a whole. Contact
// probes receive the same affine transform; furniture anchors are never fitted.
export function fitOrganic(root, spec) {
  root.updateMatrixWorld(true); const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const horizontal = Math.min(1, (spec.width - .012) / size.x, (spec.depth - .012) / size.z);
  const vertical = spec.height / size.y;
  root.scale.set(horizontal, vertical, horizontal); root.position.set(-center.x * horizontal, -bounds.min.y * vertical, -center.z * horizontal);
  for (const connection of root.userData.joints || []) {
    connection.point = [(connection.point[0] - center.x) * horizontal, (connection.point[1] - bounds.min.y) * vertical, (connection.point[2] - center.z) * horizontal];
  }
  root.updateMatrixWorld(true);
}
