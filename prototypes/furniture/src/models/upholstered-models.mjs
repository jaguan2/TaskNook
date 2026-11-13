import * as THREE from 'three';
import { material, part, rounded, foot } from './geometry.mjs';
const PIXELS_PER_UNIT = 48 / Math.SQRT2;

// A SINGLE closed sweep forms both arms and the back. The rounded cross-section
// follows the U-shaped centerline; its crown rises continuously into the back.
// No intersecting back/arm boxes, hidden corner gaps or view-dependent patches.
function upholsteredShell(width, depth, height) {
  const thickness = .15, side = width / 2 - thickness / 2;
  const rear = -depth / 2 + thickness / 2, front = depth / 2 - .07;
  const corner = .16;
  const path = new THREE.Path();
  path.moveTo(-side, front);
  path.lineTo(-side, rear + corner);
  path.quadraticCurveTo(-side, rear, -side + corner, rear);
  path.lineTo(side - corner, rear);
  path.quadraticCurveTo(side, rear, side, rear + corner);
  path.lineTo(side, front);
  const rings = 96, corners = 4, cornerSteps = 5;
  const ringSize = corners * (cornerSteps + 1);
  const positions = [], indices = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, p = path.getPointAt(t), tangent = path.getTangentAt(t);
    const normal = new THREE.Vector2(tangent.y, -tangent.x).normalize();
    const rise = THREE.MathUtils.smoothstep(-p.y, .02 + (depth - .85) / 2, .26 + (depth - .85) / 2);
    const top = THREE.MathUtils.lerp(27 / PIXELS_PER_UNIT, height, rise);
    const bottom = .155, radius = .047;
    const centers = [
      [thickness / 2 - radius, top - radius, 0],
      [-thickness / 2 + radius, top - radius, Math.PI / 2],
      [-thickness / 2 + radius, bottom + radius, Math.PI],
      [thickness / 2 - radius, bottom + radius, Math.PI * 1.5],
    ];
    for (const [q, y, start] of centers) {
      for (let j = 0; j <= cornerSteps; j++) {
        const angle = start + j / cornerSteps * Math.PI / 2;
        const lateral = q + radius * Math.cos(angle);
        positions.push(p.x + normal.x * lateral, y + radius * Math.sin(angle), p.y + normal.y * lateral);
      }
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < ringSize; j++) {
      const a = i * ringSize + j, b = i * ringSize + (j + 1) % ringSize;
      indices.push(a, b, b + ringSize, a, b + ringSize, a + ringSize);
    }
  }
  for (const end of [0, rings]) {
    const center = new THREE.Vector3();
    for (let j = 0; j < ringSize; j++) center.add(new THREE.Vector3().fromArray(positions, (end * ringSize + j) * 3));
    center.divideScalar(ringSize);
    const hub = positions.length / 3;
    positions.push(...center.toArray());
    for (let j = 0; j < ringSize; j++) {
      const a = end * ringSize + j, b = end * ringSize + (j + 1) % ringSize;
      indices.push(...(end === 0 ? [hub, b, a] : [hub, a, b]));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  // Orient the closed surface outward; use ordinary one-sided materials so
  // a broken or inverted surface cannot be hidden by DoubleSide rendering.
  let volume = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    a.fromArray(positions, indices[i] * 3); b.fromArray(positions, indices[i + 1] * 3); c.fromArray(positions, indices[i + 2] * 3);
    volume += a.dot(b.clone().cross(c)) / 6;
  }
  if (volume < 0) {
    for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    geometry.setIndex(indices);
  }
  geometry.computeVertexNormals();
  return geometry;
}


export function buildSeating(root, spec, seats) {
  const cloth = material('upholstery', '#8baba0'), timber = material('frame', '#805334', .68);
  const { width, depth, height, seat } = spec;
  part(root, 'continuous-arm-and-back-shell', upholsteredShell(width, depth, height), cloth);
  rounded(root, 'underframe', [width - .08, .07, depth - .08], [0, .135, 0], timber, .028);
  rounded(root, 'upholstered-seat-deck', [width - .16, .38, depth - .12], [0, .345, .005], cloth, .065);
  const supports = width > 3 ? [-1, 0, 1] : [-1, 1];
  for (const x of supports) for (const z of [-1, 1]) {
    foot(root, `foot-${x}-${z}`, x * (width / 2 - .125), z * (depth / 2 - .125), .13, timber);
  }
  const innerWidth = width - .32, gap = .014;
  const cushionWidth = (innerWidth - gap * (seats - 1)) / seats;
  for (let i = 0; i < seats; i++) {
    const x = -innerWidth / 2 + cushionWidth / 2 + i * (cushionWidth + gap);
    const pad = rounded(root, `seat-cushion-${i + 1}`, [cushionWidth, .145, depth - .26], [x, 0, .052], cloth, .065, true);
    pad.geometry.computeBoundingBox();
    pad.position.y = seat - pad.geometry.boundingBox.max.y;
    const backHeight = Math.min(.51, height - seat - .04);
    const back = rounded(root, `back-cushion-${i + 1}`, [cushionWidth + .008, backHeight, .15], [x, seat + backHeight / 2 - .025, -.225 - (depth - .85) / 2], cloth, .065, true);
    back.rotation.x = -.105;
  }
}

