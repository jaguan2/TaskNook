import * as THREE from 'three';
import { joint, part } from './geometry.mjs';

export function ellipse(width, depth, count = 64, outline = () => 1) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i / count * Math.PI * 2, radius = outline(angle);
    return [Math.cos(angle) * width / 2 * radius, Math.sin(angle) * depth / 2 * radius];
  });
}

export function rectangle(width, depth, radius = .03) {
  const points = [], x = width / 2 - radius, z = depth / 2 - radius;
  for (let corner = 0; corner < 4; corner++) {
    const start = corner * Math.PI / 2, cx = corner === 0 || corner === 3 ? x : -x, cz = corner < 2 ? z : -z;
    for (let i = 0; i <= 6; i++) {
      const angle = start + i / 6 * Math.PI / 2;
      points.push([cx + radius * Math.cos(angle), cz + radius * Math.sin(angle)]);
    }
  }
  return points;
}

export function scaleOutline(points, x, z = x) { return points.map(([px, pz]) => [px * x, pz * z]); }
export function offsetOutline(points, x, z) { return points.map(([px, pz]) => [px + x, pz + z]); }

export function slab(root, name, outline, bottom, top, paint, { holes = [], bevel = 0 } = {}) {
  const contour = (points, clockwise) => {
    const result = points.map(([x, z]) => new THREE.Vector2(x, -z));
    if (THREE.ShapeUtils.isClockWise(result) !== clockwise) result.reverse();
    return result;
  };
  const shape = new THREE.Shape(contour(outline, true)); shape.closePath();
  shape.holes = holes.map(points => { const path = new THREE.Path(contour(points, false)); path.closePath(); return path; });
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: top - bottom - 2 * bevel,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1 });
  geometry.rotateX(-Math.PI / 2);
  return part(root, name, geometry, paint, 0, bottom + bevel, 0);
}

// Colour changes are shallow pile inlays: closed volumes enter the backing,
// with only 0.001 tile exposed. They cannot hover or fight a coplanar face.
export function inlay(root, name, outline, height, paint, backing, holes = []) {
  const mesh = slab(root, name, outline, height - .003, height, paint, { holes });
  mesh.castShadow = false; mesh.userData.noCastShadow = true;
  const contour = outline.map(([x, z]) => new THREE.Vector2(x, z)), interiors = holes.map(points => points.map(([x, z]) => new THREE.Vector2(x, z)));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, interiors);
  // A triangle centroid provides an interior probe even for an annular band.
  const vertices = [...contour, ...interiors.flat()];
  const triangle = triangles.find(indices => {
    const center = indices.reduce((p, i) => p.add(vertices[i]), new THREE.Vector2()).divideScalar(3);
    return center.length() > .0001;
  });
  const center = triangle.reduce((p, i) => p.add(vertices[i]), new THREE.Vector2()).divideScalar(3);
  joint(root, mesh, backing, [center.x, height - .0025, center.y]);
  (root.userData.inlays ||= []).push({ part: mesh.name, backing: backing.name });
  return mesh;
}

// A closed volume follows one outline at each cross-section. The two centre
// fans can enclose a soft crown or the underside and recessed basin floor.
export function profiledSolid(root, name, outline, profile, paint) {
  const count = outline.length, positions = [0, profile[0][1], 0], indices = [];
  for (const [factor, y] of profile) for (const [x, z] of outline) positions.push(x * factor, y, z * factor);
  const hub = positions.length / 3; positions.push(0, profile.at(-1)[1], 0);
  for (let j = 0; j < count; j++) {
    const next = (j + 1) % count, last = 1 + (profile.length - 1) * count;
    indices.push(0, 1 + j, 1 + next, hub, last + next, last + j);
    for (let i = 0; i < profile.length - 1; i++) {
      const a = 1 + i * count + j, b = 1 + i * count + next;
      indices.push(a, b + count, b, a, a + count, b + count);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return part(root, name, geometry, paint);
}
