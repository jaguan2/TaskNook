import * as THREE from 'three';
import { material, part, rounded, foot } from './geometry.mjs';
import { bedPillows } from '../../../../frontend/src/lib/furnitureDimensions.js';

function duvetGeometry(seat, width, depth) {
  const coreX = width / 2 - .17, coreZ = depth / 2 - .215;
  const back = -depth / 2 + 1.02;
  const halfX = [0, .15, .4, .65, .83, .86, .88, .895, .905, .91, .92, .94, .96, .98];
  const xs = [...halfX.slice(1).reverse().map(x => -x), ...halfX].map(x =>
    Math.abs(x) <= .83 ? x * coreX / .83 : x + Math.sign(x) * (width - 2) / 2);
  const zs = [-.38, -.2, 0, .2, .4, .6, .8, 1, 1.1, 1.185, 1.205, 1.225, 1.245, 1.255, 1.26, 1.265, 1.275, 1.295, 1.32, 1.35]
    .map(z => z < 1.185 ? back + (z + .38) / 1.565 * (coreZ - back) : z + (depth - 2.8) / 2);
  const nx = xs.length - 1, nz = zs.length - 1, positions = [], indices = [];
  const count = (nx + 1) * (nz + 1);
  for (const underside of [false, true]) {
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = xs[i], z = zs[j];
      // Edge radii, cloth thickness and hanging length stay physical. Only
      // the flat interior expands; a larger bed does not inflate its padding.
      const rimDistance = Math.hypot(Math.max(0, Math.abs(x) - coreX), Math.max(0, z - coreZ));
      const rimFall = .08 - Math.sqrt(Math.max(0, .08 ** 2 - Math.min(.08, rimDistance) ** 2));
      const side = THREE.MathUtils.smoothstep(Math.abs(x), width / 2 - .09, width / 2 - .02);
      const front = THREE.MathUtils.smoothstep(z, depth / 2 - .135, depth / 2 - .05);
      const fall = rimFall + .14 * (1 - (1 - side) * (1 - front));
      const fold = .005 * Math.sin(z * 7 + x * 2) * Math.cos(x * 5);
      positions.push(x, seat + .018 - fall + fold - (underside ? .026 : 0), z);
    }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    indices.push(a, c, b, b, c, d, a + count, b + count, c + count, b + count, d + count, c + count);
  }
  const boundary = [];
  for (let i = 0; i <= nx; i++) boundary.push(i);
  for (let j = 1; j <= nz; j++) boundary.push(j * (nx + 1) + nx);
  for (let i = nx - 1; i >= 0; i--) boundary.push(nz * (nx + 1) + i);
  for (let j = nz - 1; j > 0; j--) boundary.push(j * (nx + 1));
  boundary.forEach((a, i) => {
    const b = boundary[(i + 1) % boundary.length];
    indices.push(a, b, b + count, a, b + count, a + count);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Shared standalone construction for the exported bed and in-game sizes. */
export function buildBed(root, spec) {
  const { width, depth } = spec;
  const timber = material('frame', '#946b50'), linen = material('linen', '#8baba0');
  const sheets = material('sheets', '#e7dfd0'), pillows = material('pillows', '#e7dfd0');
  rounded(root, 'bed-frame', [width - .08, .19, depth - .16], [0, .225, .02], timber, .035);
  rounded(root, 'headboard', [width, spec.height - .14, .14], [0, (spec.height + .14) / 2, -depth / 2 + .07], timber, .045);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    foot(root, `foot-${x}-${z}`, x * (width / 2 - .16), z * (depth / 2 - .26), .16, timber, .045);
  }
  rounded(root, 'mattress', [width - .18, .24, depth - .35], [0, spec.seat - .12, .04], sheets, .08);
  for (const pillow of bedPillows(width)) {
    rounded(root, pillow.name, [pillow.width, .15, .45], [pillow.x, spec.seat + .065, -depth / 2 + .58], pillows, .06, true);
  }
  part(root, 'continuous-draped-duvet', duvetGeometry(spec.seat, width, depth), linen);
}
