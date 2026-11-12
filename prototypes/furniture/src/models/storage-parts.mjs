import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { joint, material, part, revolved } from './geometry.mjs';

// Small timber/book details need a bevel, not the cushion's denser sampling.
export function board(root, name, size, at, paint, radius = .012) {
  return part(root, name, new RoundedBoxGeometry(...size, 1, Math.min(radius, ...size.map(n => n / 2 - .0005))), paint, ...at);
}

export function stored(root, name, meshes, support) {
  (root.userData.contents ||= []).push({ name, parts: meshes.map(mesh => mesh.name), support: support.name });
}

export function book(root, name, { x, top, z = 0, width: w = .09, height: h = .40, depth: d = .24 }, paint, support) {
  const bottom = top - .004, pages = material('paper', '#d8cbb3'), parts = [];
  for (const sign of [-1, 1]) {
    const cover = board(root, `${name}-cover-${sign}`, [.012, h, d], [x + sign * (w - .012) / 2, bottom + h / 2, z], paint, .003);
    parts.push(cover);
    joint(root, cover, support, [cover.position.x, top - .002, z]);
  }
  const block = board(root, `${name}-page-block`, [w - .018, h - .018, d - .02], [x, bottom + h / 2, z - .003], pages, .003);
  const spine = board(root, `${name}-bound-spine`, [w, h, .025], [x, bottom + h / 2, z + d / 2 - .0125], paint, .006);
  parts.push(block, spine);
  for (const cover of parts.slice(0, 2)) joint(root, cover, block, [cover.position.x - Math.sign(cover.position.x - x) * .004, bottom + h / 2, z]);
  joint(root, spine, block, [x, bottom + h / 2, z + d / 2 - .015]);
  for (const fraction of [.17, .82]) parts.push(board(root, `${name}-spine-band-${fraction}`, [w * .66, .015, .007], [x, bottom + h * fraction, z + d / 2], pages, .002));
  stored(root, name, parts, support);
  return parts;
}

export function folio(root, name, { x, top, z = 0, width: w = .34, depth: d = .23, height: h = .06 }, paint, support) {
  const bottom = top - .003, paper = material('paper', '#d8cbb3'), parts = [];
  for (const y of [bottom + .006, bottom + h - .006]) parts.push(board(root, `${name}-cover-${y}`, [w, .012, d], [x, y, z], paint, .004));
  const pages = board(root, `${name}-pages`, [w - .015, h - .018, d - .02], [x, bottom + h / 2, z], paper, .004);
  const spine = board(root, `${name}-spine`, [w, h, .018], [x, bottom + h / 2, z + d / 2 - .009], paint, .006);
  parts.push(pages, spine);
  joint(root, parts[0], support, [x, top - .001, z]);
  stored(root, name, parts, support);
  return { parts, top: parts[1] };
}

export function linenBin(root, name, { x, top, z = 0, width: w = .43, depth: d = .26, height: h = .27 }, support) {
  const linen = material('linen-bin', '#bca684'), edge = material('linen-edge', '#d5c5a7'), bottom = top - .004, parts = [];
  const floor = board(root, `${name}-floor`, [w, .025, d], [x, bottom + .0125, z], linen, .008); parts.push(floor);
  joint(root, floor, support, [x, top - .002, z]);
  for (const sign of [-1, 1]) {
    parts.push(board(root, `${name}-side-${sign}`, [.028, h, d], [x + sign * (w - .028) / 2, bottom + h / 2, z], linen, .009));
    parts.push(board(root, `${name}-face-${sign}`, [w, h, .028], [x, bottom + h / 2, z + sign * (d - .028) / 2], linen, .009));
    parts.push(board(root, `${name}-bound-rim-${sign}`, [w, .035, .033], [x, bottom + h - .015, z + sign * (d - .028) / 2], edge, .01));
  }
  parts.push(board(root, `${name}-label-pocket`, [w * .25, .042, .01], [x, bottom + h * .63, z + d / 2], material('label-pocket', '#897661'), .005));
  stored(root, name, parts, support);
  return parts;
}

export function bowl(root, name, { x, top, z = 0, radius = .12 }, support) {
  const vessel = revolved(root, name, [[.045, 0], [radius * .75, .035], [radius, .14], [radius - .014, .15], [radius - .027, .14], [.04, .027]], material('ceramic', '#b7b5a0'));
  vessel.position.set(x, top - .003, z);
  joint(root, vessel, support, [x, top - .001, z]);
  stored(root, name, [vessel], support);
}

// A thin closed cloth ribbon follows a curved Y/Z profile. Both faces and all
// hems are real geometry; positive volume fixes winding without DoubleSide.
export function clothRibbon(root, name, points, width, paint, fold = .005) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), rows = 40, columns = 8;
  const positions = [], indices = [], count = (rows + 1) * (columns + 1), thickness = .012;
  for (const side of [-1, 1]) for (let row = 0; row <= rows; row++) {
    const p = curve.getPointAt(row / rows), tangent = curve.getTangentAt(row / rows);
    const normal = new THREE.Vector3(0, -tangent.z, tangent.y).normalize();
    for (let column = 0; column <= columns; column++) {
      const x = (column / columns - .5) * width;
      const wave = Math.sin(column / columns * Math.PI * 4) * Math.sin(row / rows * Math.PI) * fold;
      positions.push(p.x + x, p.y + normal.y * (wave + side * thickness / 2), p.z + normal.z * (wave + side * thickness / 2));
    }
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1;
    indices.push(a, b, c, b, d, c, a + count, c + count, b + count, b + count, c + count, d + count);
  }
  const rim = [];
  for (let column = 0; column <= columns; column++) rim.push(column);
  for (let row = 1; row <= rows; row++) rim.push(row * (columns + 1) + columns);
  for (let column = columns - 1; column >= 0; column--) rim.push(rows * (columns + 1) + column);
  for (let row = rows - 1; row > 0; row--) rim.push(row * (columns + 1));
  rim.forEach((a, i) => { const b = rim[(i + 1) % rim.length]; indices.push(a, b + count, b, a, a + count, b + count); });
  let volume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = indices.slice(i, i + 3).map(index => new THREE.Vector3().fromArray(positions, index * 3));
    volume += a.dot(b.cross(c)) / 6;
  }
  if (volume < 0) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return part(root, name, geometry, paint);
}
