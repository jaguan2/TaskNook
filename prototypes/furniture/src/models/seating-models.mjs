import * as THREE from 'three';
import { beam, bentTube, cushionGeometry, foot, joint, material, part, revolved, rounded, splayedLeg } from './geometry.mjs';

function woodenChair(root, spec) {
  const wood = material('frame', '#946b50'), cloth = material('upholstery', '#8baba0');
  const { seat, height } = spec;
  const frame = rounded(root, 'underframe', [.61, .065, .60], [0, seat - .0915, 0], wood);
  const pad = rounded(root, 'seat-cushion-1', [.60, .065, .58], [0, seat - .0325, .015], cloth, .03, true);
  // The soft crown is included in the physical seat anchor.
  pad.geometry.computeBoundingBox(); pad.position.y = seat - pad.geometry.boundingBox.max.y;
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const leg = splayedLeg(root, `chair-leg-${x}-${z}`, [x * .285, z * .275], [x * .235, z * .22], seat - .075, wood);
    joint(root, leg, frame, [x * .236, seat - .085, z * .221]);
  }
  for (const z of [-1, 1]) beam(root, `stretcher-${z}`, [-.27, .18, z * .26], [.27, .18, z * .26], .021, wood);
  for (const x of [-1, 1]) {
    const post = beam(root, `back-post-${x}`, [x * .235, seat - .11, -.22], [x * .235, height - .06, -.28], .032, wood);
    joint(root, post, frame, [x * .235, seat - .09, -.222]);
  }
  const rail = rounded(root, 'framed-back', [.57, .23, .085], [0, height - .115, -.28], wood, .035);
  rounded(root, 'back-pad', [.43, .16, .035], [0, height - .12, -.23], cloth, .016);
  for (const x of [-1, 1]) joint(root, root.getObjectByName(`back-post-${x}`), rail, [x * .235, height - .08, -.279]);
}

function deskChair(root, spec) {
  const cloth = material('upholstery', '#8baba0'), metal = material('metal', '#706878'), rubber = material('rubber', '#393545');
  const { seat, height } = spec;
  const hub = part(root, 'caster-hub', new THREE.CylinderGeometry(.065, .075, .09, 16), metal, 0, .095, 0);
  const stem = part(root, 'adjustable-stem', new THREE.CylinderGeometry(.027, .035, seat - .16, 12), metal, 0, (seat - .16) / 2 + .09, 0);
  joint(root, stem, hub, [0, .115, 0]);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, x = Math.cos(a) * .30, z = Math.sin(a) * .30;
    const spoke = beam(root, `spoke-${i}`, [0, .105, 0], [x, .075, z], .022, metal);
    const wheel = part(root, `caster-${i}`, new THREE.CylinderGeometry(.045, .045, .048, 12), rubber, x, .045, z);
    wheel.rotation.x = Math.PI / 2; wheel.rotation.z = -a;
    joint(root, spoke, hub, [x * .1, .102, z * .1]); joint(root, wheel, spoke, [x * .98, .0756, z * .98]);
  }
  const base = rounded(root, 'seat-shell', [.66, .06, .64], [0, seat - .10, 0], metal, .026);
  joint(root, stem, base, [0, seat - .08, 0]);
  const socket = part(root, 'under-seat-socket', new THREE.CylinderGeometry(.07, .05, .055, 16), metal, 0, seat - .135, 0);
  joint(root, socket, base, [0, seat - .12, 0]); joint(root, socket, stem, [0, seat - .14, 0]);
  const pad = rounded(root, 'seat-cushion-1', [.64, .115, .62], [0, 0, 0], cloth, .05, true);
  pad.geometry.computeBoundingBox(); pad.position.y = seat - pad.geometry.boundingBox.max.y;
  const backSupport = bentTube(root, 'continuous-back-support', [[0, seat - .12, -.12], [0, seat - .06, -.30], [0, seat + .15, -.34], [0, height - .18, -.32]], .027, metal);
  joint(root, backSupport, base, [0, seat - .105, -.15]);
  const back = rounded(root, 'shaped-back', [.62, .53, .095], [0, height - .265, -.315], metal, .043);
  const padding = rounded(root, 'back-pad', [.55, .46, .10], [0, height - .27, -.26], cloth, .045, true);
  joint(root, backSupport, back, [0, height - .20, -.321]);
  joint(root, back, padding, [0, height - .27, -.28]);
}

function ottoman(root, spec) {
  const cloth = material('upholstery', '#8baba0'), h = spec.seat;
  revolved(root, 'single-ottoman-casing', [[.29, 0], [.36, .025], [.395, .10], [.395, h - .10], [.36, h - .025], [.28, h]], cloth);
}

function woodStool(root, spec) {
  const wood = material('finish', '#b08a61'), h = spec.seat;
  const seat = part(root, 'solid-round-seat', new THREE.CylinderGeometry(.34, .32, .085, 40), wood, 0, h - .0425, 0);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const leg = splayedLeg(root, `stool-leg-${x}-${z}`, [x * .235, z * .235], [x * .18, z * .18], h - .045, wood);
    joint(root, leg, seat, [x * .181, h - .055, z * .181]);
  }
  for (const z of [-1, 1]) beam(root, `cross-rail-${z}`, [-.22, .18, z * .217], [.22, .18, z * .217], .022, wood);
  for (const x of [-1, 1]) beam(root, `side-rail-${x}`, [x * .217, .18, -.22], [x * .217, .18, .22], .022, wood);
}

function floorCushion(root, spec) {
  const geometry = cushionGeometry([spec.width - .01, spec.seat, spec.depth - .01], { horizontal: .65 });
  geometry.translate(0, spec.seat / 2, 0);
  part(root, 'single-cushion-casing', geometry, material('upholstery', '#8baba0'));
}

function flowerCushion(root, spec) {
  const cloth = material('upholstery', '#8baba0'), center = material('cotton', '#e7d9bf');
  const geometry = cushionGeometry([.99, spec.seat - .025, .99], { horizontal: 1, vertical: .34, longitude: 96,
    outline: theta => (1 + .14 * Math.cos(theta * 6)) / 1.14 });
  geometry.translate(0, (spec.seat - .025) / 2, 0);
  const casing = part(root, 'continuous-petal-casing', geometry, cloth);
  const tuft = part(root, 'center-tuft', new THREE.CylinderGeometry(.125, .14, .06, 32), center, 0, spec.seat - .03, 0);
  joint(root, casing, tuft, [0, spec.seat - .04, 0]);
}

function beanbag(root, spec) {
  const geometry = cushionGeometry([spec.width - .02, spec.height, spec.depth - .02], { horizontal: 1, vertical: .65 });
  const p = geometry.attributes.position, half = spec.height / 2;
  let maximum = spec.seat;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    let next = y + half;
    if (y >= 0) {
      const radius = Math.min(1, Math.hypot(x, z) / ((spec.width - .02) / 2));
      const rear = Math.max(0, -z / (Math.hypot(x, z) || 1));
      const crown = Math.exp(-(((radius - .64) / .24) ** 2)) * Math.min(1, radius * 8) * (1 - radius ** 12);
      next = spec.seat + (spec.height - spec.seat) * crown * rear - (spec.seat - half) * radius ** 12;
    }
    p.setY(i, next); maximum = Math.max(maximum, next);
  }
  for (let i = 0; i < p.count; i++) if (p.getY(i) > spec.seat) p.setY(i, spec.seat + (p.getY(i) - spec.seat) * (spec.height - spec.seat) / (maximum - spec.seat));
  geometry.computeVertexNormals();
  part(root, 'single-sculpted-beanbag', geometry, material('upholstery', '#8baba0'));
}

function gardenBench(root, spec) {
  const wood = material('finish', '#b08a61'), { seat, height } = spec;
  const frame = rounded(root, 'bench-underframe', [1.46, .07, .48], [0, seat - .08, 0], wood);
  for (const z of [-.18, 0, .18]) rounded(root, `seat-slat-${z}`, [1.55, .065, .15], [0, seat - .0325, z], wood, .018);
  for (const x of [-1, 1]) {
    const front = foot(root, `front-leg-${x}`, x * .63, .20, seat - .045, wood, .036);
    const rear = foot(root, `continuous-rear-post-${x}`, x * .63, -.22, height - .03, wood, .036);
    joint(root, front, frame, [x * .63, seat - .06, .20]); joint(root, rear, frame, [x * .63, seat - .08, -.22]);
  }
  for (const [name, y, h] of [['upper-back-slat', height - .07, .14], ['lower-back-slat', height - .28, .10]]) {
    const slat = rounded(root, name, [1.55, h, .075], [0, y, -.22], wood, .02);
    for (const x of [-1, 1]) joint(root, root.getObjectByName(`continuous-rear-post-${x}`), slat, [x * .63, y, -.22]);
  }
}

function fallenLog(root, spec) {
  const bark = material('bark', '#805a42'), grain = material('end-grain', '#c39b69'), rings = material('growth-ring', '#967046');
  const geometry = new THREE.CylinderGeometry(1, 1, spec.width - .04, 32, 4).rotateZ(Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const irregular = 1 + .025 * Math.sin(x * 7 + Math.atan2(z, y) * 3);
    positions.setXYZ(i, x, y * irregular, z * irregular);
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  geometry.scale(1, spec.seat / (bounds.max.y - bounds.min.y), (spec.depth - .04) / (bounds.max.z - bounds.min.z));
  geometry.computeBoundingBox(); geometry.translate(0, -geometry.boundingBox.min.y, -(geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2);
  geometry.computeVertexNormals();
  const trunk = part(root, 'continuous-bark-trunk', geometry, bark);
  for (const side of [-1, 1]) {
    const end = part(root, `inset-end-${side}`, new THREE.CylinderGeometry(1, 1, .01, 32).rotateZ(Math.PI / 2)
      .scale(1, spec.seat * .42, spec.depth * .40), grain, side * .681, spec.seat / 2, 0);
    joint(root, trunk, end, [side * .679, spec.seat / 2, 0]);
    for (const radius of [.55, .82]) part(root, `end-ring-${side}-${radius}`, new THREE.TorusGeometry(radius, .035, 6, 32).rotateY(Math.PI / 2)
      .scale(.03, spec.seat * .39, spec.depth * .37), rings, side * .686, spec.seat / 2, 0);
  }
}

function hammock(root, spec) {
  const wood = material('frame', '#946b50'), rope = material('rope', '#d4c7a6'), cloth = material('canvas', '#b8a48a');
  for (const side of [-1, 1]) {
    const base = rounded(root, `grounded-foot-${side}`, [.23, .10, .84], [side * .94, .05, 0], wood);
    const post = part(root, `support-post-${side}`, new THREE.CylinderGeometry(.045, .055, spec.height - .06, 16), wood, side * .94, (spec.height + .06) / 2, 0);
    joint(root, base, post, [side * .94, .08, 0]);
  }
  const stretcher = beam(root, 'joined-base-stretcher', [-.94, .18, 0], [.94, .18, 0], .035, wood);
  for (const side of [-1, 1]) joint(root, stretcher, root.getObjectByName(`support-post-${side}`), [side * .92, .18, 0]);
  const nx = 32, nz = 12, count = (nx + 1) * (nz + 1), positions = [], indices = [];
  const surface = (u, v) => [.76 * u, spec.seat + .45 * u * u + .10 * v * v * (1 - .3 * u * u), .33 * v * (1 - .45 * u * u)];
  for (const under of [false, true]) for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const [x, y, z] = surface(-1 + i / nx * 2, -1 + j / nz * 2);
    positions.push(x, y - (under ? .025 : 0), z);
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
  boundary.forEach((a, i) => { const b = boundary[(i + 1) % boundary.length]; indices.push(a, b, b + count, a, b + count, a + count); });
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const sling = part(root, 'single-sagging-cloth-sling', geometry, cloth);
  for (const side of [-1, 1]) for (const edge of [-1, 1]) {
    const end = surface(side, edge);
    const binding = part(root, `bound-corner-${side}-${edge}`, new THREE.SphereGeometry(.025, 12, 8), rope, ...end);
    const cord = beam(root, `tension-rope-${side}-${edge}`, [side * .94, spec.height - .06, 0], end, .012, rope);
    joint(root, cord, root.getObjectByName(`support-post-${side}`), [side * .936, spec.height - .061, edge * .004]);
    joint(root, cord, binding, end.map((v, i) => i === 0 ? v + side * .005 : v));
    const probe = surface(side * .995, edge * .98); probe[1] -= .008;
    joint(root, binding, sling, probe);
  }
}

export const SEATING_BUILDERS = { chair: woodenChair, deskchair: deskChair, stool: ottoman, woodstool: woodStool,
  cushion: floorCushion, flowercushion: flowerCushion, beanbag, bench: gardenBench, log: fallenLog, hammock };
