import * as THREE from 'three';
import { buildBed } from './bed-models.mjs';
import { buildSeating } from './upholstered-models.mjs';
import { buildDesk } from './desk-models.mjs';
import { bookshelf, bookcase, openShelf, ladderShelf } from './storage-shelves.mjs';
import { plantDisplay, wallShelf } from './display-shelf-models.mjs';
import { attachShelfDecor, reflowShelfContents } from './shelf-layout.mjs';

const SHELVES = { bookshelf, bookcase, shelf: openShelf, ladder: ladderShelf, plantshelf: plantDisplay, wallshelf: wallShelf };

/** Standalone source construction. Height/edge thickness stay physical while
 * spans, supports, cushion count and contents adapt to canonical tile sizes. */
export function buildResizableFurniture(key, spec, dimensions) {
  const root = new THREE.Group(); root.name = key;
  const sized = { ...spec, width: dimensions.w, depth: dimensions.d, resized: true };
  if (key === 'bed') buildBed(root, sized);
  else if (key === 'sofa') buildSeating(root, sized, Math.max(1, Math.round(dimensions.w)));
  else if (key === 'desk') buildDesk(root, sized);
  else if (SHELVES[key]) {
    SHELVES[key](root, sized);
    if (key === 'plantshelf' || key === 'wallshelf') {
      // These two original models use vertical fitting. Bake that transform
      // into each mesh once so content/decorator slots stay in tile units.
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root), factor = spec.height / (box.max.y - box.min.y);
      const fit = new THREE.Matrix4().makeScale(1, factor, 1);
      fit.setPosition(0, -box.min.y * factor, 0);
      root.traverse(node => { if (node.isMesh) {
        node.geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(fit, node.matrixWorld));
        node.position.set(0, 0, 0); node.quaternion.identity(); node.scale.set(1, 1, 1);
      } });
      for (const joint of root.userData.joints || []) joint.point = new THREE.Vector3(...joint.point).applyMatrix4(fit).toArray();
    }
    attachShelfDecor(root, key);
    root.userData.shelfDecor.resized = true;
    reflowShelfContents(root);
  } else throw new Error(`No size builder for ${key}`);
  root.updateMatrixWorld(true);
  return root;
}
