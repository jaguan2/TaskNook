import * as THREE from 'three';

import { FURNITURE, PIXELS_PER_UNIT } from './catalog.mjs';
import { material, part, rounded, foot } from './models/geometry.mjs';
import { SEATING_BUILDERS } from './models/seating-models.mjs';
import { TABLE_BUILDERS } from './models/table-models.mjs';
import { STORAGE_BUILDERS } from './models/storage-models.mjs';
import { RUG_BUILDERS } from './models/rug-models.mjs';
import { GROUND_WATER_BUILDERS } from './models/ground-water-models.mjs';
import { LIGHTING_BUILDERS } from './models/lighting-models.mjs';
import { BOTANICAL_BUILDERS } from './models/botanical-models.mjs';
import { DECORATION_BUILDERS } from './models/decoration-models.mjs';
import { TECH_BUILDERS } from './models/tech-models.mjs';
import { ARCHITECTURE_BUILDERS } from './models/architecture-models.mjs';
import { WALL_BUILDERS } from './models/wall-models.mjs';
import { KITCHEN_BUILDERS } from './models/kitchen-models.mjs';
import { FOOD_BUILDERS } from './models/food-models.mjs';
import { AUTUMN_BUILDERS } from './models/autumn-models.mjs';
import { WINTER_BUILDERS } from './models/winter-models.mjs';
import { GARDEN_BUILDERS } from './models/garden-models.mjs';
import { LIVING_BUILDERS } from './models/living-models.mjs';
export { FURNITURE, PIXELS_PER_UNIT } from './catalog.mjs';

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
    const rise = THREE.MathUtils.smoothstep(-p.y, .02, .26);
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


function seating(root, spec, seats) {
  const cloth = material('upholstery', '#8baba0'), timber = material('frame', '#805334', .68);
  const { width, depth, height, seat } = spec;
  part(root, 'continuous-arm-and-back-shell', upholsteredShell(width, depth, height), cloth);
  rounded(root, 'underframe', [width - .08, .07, depth - .08], [0, .135, 0], timber, .028);
  rounded(root, 'upholstered-seat-deck', [width - .16, .38, depth - .12], [0, .345, .005], cloth, .065);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    foot(root, `foot-${x}-${z}`, x * (width / 2 - .125), z * (depth / 2 - .125), .13, timber);
  }
  const innerWidth = width - .32, gap = .014;
  const cushionWidth = (innerWidth - gap * (seats - 1)) / seats;
  for (let i = 0; i < seats; i++) {
    const x = -innerWidth / 2 + cushionWidth / 2 + i * (cushionWidth + gap);
    const pad = rounded(root, `seat-cushion-${i + 1}`, [cushionWidth, .145, .59], [x, 0, .052], cloth, .065, true);
    pad.geometry.computeBoundingBox();
    pad.position.y = seat - pad.geometry.boundingBox.max.y;
    const backHeight = Math.min(.51, height - seat - .04);
    const back = rounded(root, `back-cushion-${i + 1}`, [cushionWidth + .008, backHeight, .15], [x, seat + backHeight / 2 - .025, -.225], cloth, .065, true);
    back.rotation.x = -.105;
  }
}

function coffeeTable(root, spec) {
  const wood = material('finish', '#b08a61', .62), frame = material('frame', '#805334', .67);
  const { width, depth, surface } = spec, legTop = surface - .045;
  const bevel = .012, halfW = width / 2 - bevel, halfD = depth / 2 - bevel, corner = .14;
  const outline = new THREE.Shape();
  outline.moveTo(-halfW + corner, -halfD);
  outline.lineTo(halfW - corner, -halfD);
  outline.quadraticCurveTo(halfW, -halfD, halfW, -halfD + corner);
  outline.lineTo(halfW, halfD - corner);
  outline.quadraticCurveTo(halfW, halfD, halfW - corner, halfD);
  outline.lineTo(-halfW + corner, halfD);
  outline.quadraticCurveTo(-halfW, halfD, -halfW, halfD - corner);
  outline.lineTo(-halfW, -halfD + corner);
  outline.quadraticCurveTo(-halfW, -halfD, -halfW + corner, -halfD);
  const tabletop = new THREE.ExtrudeGeometry(outline, { depth: .065 - 2 * bevel,
    bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8, steps: 1 });
  tabletop.rotateX(-Math.PI / 2);
  part(root, 'solid-rounded-tabletop', tabletop, wood, 0, surface - .065 + bevel, 0);
  // Four legs enter the underside. Aprons meet each leg; the lower shelf is
  // captured between them instead of floating below an unrelated top slab.
  const legX = width / 2 - .14, legZ = depth / 2 - .13;
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    foot(root, `leg-${x}-${z}`, legX * x, legZ * z, legTop, frame, .045);
  }
  for (const z of [-1, 1]) rounded(root, `long-apron-${z}`, [legX * 2, .085, .045], [0, surface - .095, z * legZ], frame, .012);
  for (const x of [-1, 1]) rounded(root, `end-apron-${x}`, [.045, .085, legZ * 2], [x * legX, surface - .095, 0], frame, .012);
  rounded(root, 'lower-shelf', [legX * 2 + .02, .035, legZ * 2 + .02], [0, .17, 0], wood, .016);
}

// A thin closed cloth volume with two side falls and a front hem. Broad folds
// are geometric; the blanket remains one surface around every corner.
function duvetGeometry(seat) {
  // Concentrate samples at the rolled rim: uniform large cells chord through
  // the mattress at corners, even when their individual vertices clear it.
  const halfX = [0, .15, .4, .65, .83, .86, .88, .895, .905, .91, .92, .94, .96, .98];
  const xs = [...halfX.slice(1).reverse().map(x => -x), ...halfX];
  const zs = [-.38, -.2, 0, .2, .4, .6, .8, 1, 1.1, 1.185, 1.205, 1.225, 1.245, 1.255, 1.26, 1.265, 1.275, 1.295, 1.32, 1.35];
  const nx = xs.length - 1, nz = zs.length - 1, positions = [], indices = [];
  const count = (nx + 1) * (nz + 1);
  for (const underside of [false, true]) {
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = xs[i], z = zs[j];
      // Follow the mattress's rounded top rim before descending OUTSIDE it.
      // A height ramp starting inside the edge cuts diagonally through the
      // mattress and exposes it through the blanket in the room view.
      const rimDistance = Math.hypot(Math.max(0, Math.abs(x) - .83), Math.max(0, z - 1.185));
      const rimFall = .08 - Math.sqrt(Math.max(0, .08 ** 2 - Math.min(.08, rimDistance) ** 2));
      const side = THREE.MathUtils.smoothstep(Math.abs(x), .91, .98);
      const front = THREE.MathUtils.smoothstep(z, 1.265, 1.35);
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
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function cottageBed(root, spec) {
  const timber = material('frame', '#946b50'), linen = material('linen', '#8baba0');
  const cotton = material('cotton', '#e7dfd0');
  rounded(root, 'bed-frame', [1.92, .19, 2.64], [0, .225, .02], timber, .035);
  rounded(root, 'headboard', [2, spec.height - .14, .14], [0, (spec.height + .14) / 2, -1.33], timber, .045);
  for (const x of [-1, 1]) for (const z of [-1, 1]) foot(root, `foot-${x}-${z}`, x * .84, z * 1.14, .16, timber, .045);
  rounded(root, 'mattress', [1.82, .24, 2.45], [0, spec.seat - .12, .04], cotton, .08);
  for (const x of [-1, 1]) rounded(root, `pillow-${x}`, [.73, .15, .45], [x * .43, spec.seat + .065, -.82], cotton, .06, true);
  part(root, 'continuous-draped-duvet', duvetGeometry(spec.seat), linen);
}

export function createFurniture(key) {
  const spec = FURNITURE[key];
  if (!spec) throw new Error(`Unknown furniture: ${key}`);
  const root = new THREE.Group();
  root.name = key;
  root.userData = { catalogKey: key, units: 'tile', forward: '+Z', renderStyle: 'illustrated', ...spec };
  if (key === 'coffeetable') coffeeTable(root, spec);
  else if (key === 'bed') cottageBed(root, spec);
  else if (TABLE_BUILDERS[key]) TABLE_BUILDERS[key](root, spec);
  else if (STORAGE_BUILDERS[key]) STORAGE_BUILDERS[key](root, spec);
  else if (RUG_BUILDERS[key]) RUG_BUILDERS[key](root, spec);
  else if (GROUND_WATER_BUILDERS[key]) GROUND_WATER_BUILDERS[key](root, spec);
  else if (LIGHTING_BUILDERS[key]) LIGHTING_BUILDERS[key](root, spec);
  else if (BOTANICAL_BUILDERS[key]) BOTANICAL_BUILDERS[key](root, spec);
  else if (DECORATION_BUILDERS[key]) DECORATION_BUILDERS[key](root, spec);
  else if (TECH_BUILDERS[key]) TECH_BUILDERS[key](root, spec);
  else if (ARCHITECTURE_BUILDERS[key]) ARCHITECTURE_BUILDERS[key](root, spec);
  else if (WALL_BUILDERS[key]) WALL_BUILDERS[key](root, spec);
  else if (KITCHEN_BUILDERS[key]) KITCHEN_BUILDERS[key](root, spec);
  else if (FOOD_BUILDERS[key]) FOOD_BUILDERS[key](root, spec);
  else if (AUTUMN_BUILDERS[key]) AUTUMN_BUILDERS[key](root, spec);
  else if (WINTER_BUILDERS[key]) WINTER_BUILDERS[key](root, spec);
  else if (GARDEN_BUILDERS[key]) GARDEN_BUILDERS[key](root, spec);
  else if (LIVING_BUILDERS[key]) LIVING_BUILDERS[key](root, spec);
  else if (SEATING_BUILDERS[key]) SEATING_BUILDERS[key](root, spec);
  else if (key === 'sofa' || key === 'armchair') seating(root, spec, key === 'sofa' ? 2 : 1);
  else throw new Error(`No authored model for ${key}`);
  // Boards and removable contents are named in the exported GLB. The game
  // uses their real bounds to stock each shelf without floating decorations.
  const shelfBoards = {
    bookshelf: ['supported-shelf-0', 'supported-shelf-1', 'supported-shelf-2', 'supported-shelf-3'],
    bookcase: ['supported-shelf-0', 'supported-shelf-1', 'supported-shelf-2'],
    shelf: ['supported-shelf-0', 'supported-shelf-1', 'supported-shelf-2'],
    ladder: ['tapered-depth-shelf-0', 'tapered-depth-shelf-1', 'tapered-depth-shelf-2'],
    wallshelf: ['shelf-board'], plantshelf: ['tray-0', 'tray-1', 'tray-2'],
  }[key];
  if (shelfBoards) root.userData.shelfDecor = { boards: shelfBoards, parts: (root.userData.contents || []).flatMap(content => content.parts) };
  if (spec.seat != null) root.userData.seatAnchor = [spec.contact?.x || 0, spec.seat, 0];
  if (spec.tintable === false) root.traverse(node => { if (node.isMesh) node.material.userData.fixedPalette = true; });
  root.updateMatrixWorld(true);
  return root;
}
