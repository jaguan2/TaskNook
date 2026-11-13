import { attachShelfDecor } from './models/shelf-layout.mjs';
import * as THREE from 'three';

import { FURNITURE } from './catalog.mjs';
import { material, part, rounded, foot } from './models/geometry.mjs';
import { buildSeating as seating } from './models/upholstered-models.mjs';
import { buildBed as cottageBed } from './models/bed-models.mjs';
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
  attachShelfDecor(root, key);
  if (spec.seat != null) root.userData.seatAnchor = [spec.contact?.x || 0, spec.seat, 0];
  if (spec.tintable === false) root.traverse(node => { if (node.isMesh) node.material.userData.fixedPalette = true; });
  root.updateMatrixWorld(true);
  return root;
}
