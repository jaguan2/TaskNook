import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export function material(name, color, roughness = .9) {
  const result = new THREE.MeshStandardMaterial({ name, color, roughness, metalness: 0 });
  result.userData.role = name;
  return result;
}

export function part(root, name, geometry, paint, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry.index ? geometry : mergeVertices(geometry, 1e-6), paint);
  mesh.name = name.replace(/[^a-zA-Z0-9_-]/g, '-');
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

export function rounded(root, name, size, at, paint, radius = .025, pillow = false) {
  const geometry = pillow ? cushionGeometry(size)
    : new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(v => v / 2 - .001)));
  return part(root, name, geometry, paint, ...at);
}

// A closed superellipsoid gives cloth broad, slightly crowned faces and
// continuous curvature. It has no box-face normal seams or intersecting caps.
export function cushionGeometry([width, height, depth], { horizontal = .34, vertical = .34, outline = () => 1, longitude = 48 } = {}) {
  const latitude = 20, points = [0, -height / 2, 0], indices = [];
  const power = (n, exponent) => Math.sign(n) * Math.abs(n) ** exponent;
  for (let i = 1; i < latitude; i++) {
    const phi = -Math.PI / 2 + Math.PI * i / latitude;
    for (let j = 0; j < longitude; j++) {
      const theta = Math.PI * 2 * j / longitude;
      points.push(width / 2 * power(Math.cos(phi), horizontal) * power(Math.cos(theta), horizontal) * outline(theta),
        height / 2 * power(Math.sin(phi), vertical), depth / 2 * power(Math.cos(phi), horizontal) * power(Math.sin(theta), horizontal) * outline(theta));
    }
  }
  const top = points.length / 3;
  points.push(0, height / 2, 0);
  for (let j = 0; j < longitude; j++) {
    const next = (j + 1) % longitude;
    indices.push(0, 1 + j, 1 + next);
    const last = 1 + (latitude - 2) * longitude;
    indices.push(top, last + next, last + j);
    for (let i = 0; i < latitude - 2; i++) {
      const a = 1 + i * longitude + j, b = 1 + i * longitude + next;
      indices.push(a, b + longitude, b, a, a + longitude, b + longitude);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function foot(root, name, x, z, top, paint, radius = .038) {
  return part(root, name, new THREE.CylinderGeometry(radius, radius * .76, top, 12), paint, x, top / 2, z);
}

export function beam(root, name, from, to, radius, paint) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const mesh = part(root, name, new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 12), paint);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return mesh;
}

// Splayed legs retain HORIZONTAL end cuts, so a rotated cylinder cannot put
// its lowest rim under the floor or meet a horizontal seat on just one edge.
export function splayedLeg(root, name, bottom, top, height, paint, radius = .035) {
  const geometry = new THREE.CylinderGeometry(radius, radius * .8, height, 12);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i) + height / 2, t = y / height;
    positions.setXYZ(i, positions.getX(i) + THREE.MathUtils.lerp(bottom[0], top[0], t), y,
      positions.getZ(i) + THREE.MathUtils.lerp(bottom[1], top[1], t));
  }
  geometry.computeVertexNormals();
  return part(root, name, geometry, paint);
}

export function joint(root, a, b, point) {
  (root.userData.joints ||= []).push({ parts: [a.name, b.name], point });
}

// Closed tube with explicit cap fans. TubeGeometry by itself has open ends.
export function bentTube(root, name, points, radius, paint) {
  if (new THREE.Vector3(...points[0]).distanceTo(new THREE.Vector3(...points.at(-1))) < 1e-6) {
    const loop = new THREE.CatmullRomCurve3(points.slice(0, -1).map(p => new THREE.Vector3(...p)), true);
    return part(root, name, new THREE.TubeGeometry(loop, 48, radius, 10, true), paint);
  }
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const tube = new THREE.TubeGeometry(curve, 24, radius, 10, false);
  const positions = Array.from(tube.attributes.position.array), indices = Array.from(tube.index.array);
  for (const end of [0, 24]) {
    const point = curve.getPointAt(end / 24), hub = positions.length / 3;
    positions.push(...point.toArray());
    const tangent = curve.getTangentAt(end / 24).multiplyScalar(end ? 1 : -1);
    for (let j = 0; j < 10; j++) {
      const a = end * 11 + j, b = a + 1;
      const va = new THREE.Vector3().fromArray(positions, a * 3).sub(point);
      const vb = new THREE.Vector3().fromArray(positions, b * 3).sub(point);
      indices.push(...(va.cross(vb).dot(tangent) > 0 ? [hub, a, b] : [hub, b, a]));
    }
  }
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  geometry = mergeVertices(geometry, 1e-6); geometry.computeVertexNormals();
  return part(root, name, geometry, paint);
}

export function revolved(root, name, profile, paint) {
  const segments = 48, positions = [0, profile[0][1], 0], indices = [];
  for (const [radius, height] of profile) for (let j = 0; j < segments; j++) {
    const theta = j / segments * Math.PI * 2;
    positions.push(radius * Math.cos(theta), height, radius * Math.sin(theta));
  }
  const hub = positions.length / 3; positions.push(0, profile.at(-1)[1], 0);
  for (let j = 0; j < segments; j++) {
    const next = (j + 1) % segments, last = 1 + (profile.length - 1) * segments;
    indices.push(0, 1 + j, 1 + next, hub, last + next, last + j);
    for (let i = 0; i < profile.length - 1; i++) {
      const a = 1 + i * segments + j, b = 1 + i * segments + next;
      indices.push(a, b + segments, b, a, a + segments, b + segments);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return part(root, name, geometry, paint);
}
