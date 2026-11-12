import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFurniture, FURNITURE } from '../src/models.mjs';
import { populateRoom, ROOM_LAYOUTS } from '../src/viewer/room-layouts.mjs';
import { ISO_ITEMS } from '../../../frontend/src/lib/isoCatalog.js';

test('textiles have thin backing, connected pile and the named round/square silhouettes', () => {
  for (const key of ['rug', 'squarerug', 'ovalrug', 'runner', 'persianrug', 'stripedrug', 'matrug', 'picnic', 'sheepskin']) {
    const root = createFurniture(key), bounds = new THREE.Box3().setFromObject(root);
    assert.ok(bounds.max.y < .06, 'a ground textile became an inflated cushion');
    assert.equal(root.userData.layer, ISO_ITEMS[key].layer);
    assert.equal(root.userData.softSeat, ISO_ITEMS[key].softSeat);
    for (const inlay of root.userData.inlays || []) {
      const top = new THREE.Box3().setFromObject(root.getObjectByName(inlay.part));
      const base = new THREE.Box3().setFromObject(root.getObjectByName(inlay.backing));
      assert.ok(top.min.y < base.max.y && top.max.y > base.max.y, 'pile does not enter its backing');
      assert.ok(top.max.y - base.max.y <= .002, 'pattern has become a separate raised plate');
    }
    if (key === 'rug' || key === 'squarerug') assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).x - bounds.getSize(new THREE.Vector3()).z) < .001, 'named round/square shape is stretched');
  }
});

function boundaryDistance(mesh, ray) {
  const p = mesh.geometry.attributes.position, indices = mesh.geometry.index.array, hit = new THREE.Vector3();
  let distance = Infinity;
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, indices[i + j]).applyMatrix4(mesh.matrixWorld));
    if (ray.intersectTriangle(...triangle, false, hit)) distance = Math.min(distance, hit.distanceTo(ray.origin));
  }
  return distance;
}

test('pond water reaches its bank inside a recessed, catalog-bounded vessel', () => {
  for (const key of ['pond', 'gardenpond']) {
    const root = createFurniture(key), { bank: bankName, surface, level } = root.userData.water;
    const bank = root.getObjectByName(bankName), water = root.getObjectByName(surface);
    assert.equal(root.userData.tintable, false);
    assert.ok(new THREE.Box3().setFromObject(bank).max.y > level + .025, 'water is painted on top of a flat bank');
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      const ray = new THREE.Ray(new THREE.Vector3(0, level - .0001, 0), new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
      const shoreDistance = boundaryDistance(bank, ray), waterDistance = boundaryDistance(water, ray);
      assert.ok(Number.isFinite(shoreDistance) && Number.isFinite(waterDistance));
      assert.ok(waterDistance >= shoreDistance - .001, 'water ends before reaching the shoreline');
      assert.ok(waterDistance - shoreDistance < .06, 'water extends through the bank');
    }
  }
});

test('the textile lounge lifts furniture onto the rug without unsupported feet', () => {
  const models = new Map(ROOM_LAYOUTS.textiles.map(([key]) => [key, createFurniture(key)])), room = new THREE.Group();
  populateRoom(room, ROOM_LAYOUTS.textiles, models, FURNITURE); room.updateMatrixWorld(true);
  const rug = room.getObjectByName('persianrug'), ray = new THREE.Raycaster();
  for (const key of ['armchair', 'coffeetable']) {
    const furniture = room.getObjectByName(key), feet = [];
    furniture.traverse(node => { if (node.isMesh && /^(foot|leg)-/.test(node.name)) feet.push(node); });
    assert.equal(feet.length, 4);
    for (const foot of feet) {
      const bounds = new THREE.Box3().setFromObject(foot), center = bounds.getCenter(new THREE.Vector3());
      ray.set(new THREE.Vector3(center.x, .20, center.z), new THREE.Vector3(0, -1, 0));
      const [hit] = ray.intersectObject(rug, true);
      assert.ok(hit && Math.abs(bounds.min.y - hit.point.y) < .003, 'furniture foot is off the rug or cuts through it');
    }
  }
});

test('the stepping-stone trail has seven independent ground contacts', () => {
  const trail = createFurniture('gardentrail');
  assert.equal(trail.userData.groundedParts.length, 7);
  assert.equal(trail.userData.tintable, false);
  for (const name of trail.userData.groundedParts) {
    const bounds = new THREE.Box3().setFromObject(trail.getObjectByName(name));
    assert.ok(Math.abs(bounds.min.y) < 1e-6);
    assert.ok(bounds.max.y <= FURNITURE.gardentrail.height + .00001);
  }
});
