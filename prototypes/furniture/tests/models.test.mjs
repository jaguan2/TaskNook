import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { validateBytes } from 'gltf-validator';
import { createFurniture, FURNITURE, PIXELS_PER_UNIT } from '../src/models.mjs';
import { ISO_ITEMS } from '../../../frontend/src/lib/isoCatalog.js';

// The broad support graph below finds isolated parts. These additional solid
// probes test actual mesh interiors at joints, not overlapping bounding boxes.
function containsPoint(mesh, worldPoint) {
  const point = worldPoint.clone().applyMatrix4(mesh.matrixWorld.clone().invert());
  const ray = new THREE.Ray(point, new THREE.Vector3(.347, .923, .176).normalize());
  const p = mesh.geometry.attributes.position, indices = mesh.geometry.index?.array;
  const hit = new THREE.Vector3(), distances = new Set();
  const count = indices?.length ?? p.count;
  for (let i = 0; i < count; i += 3) {
    const vertices = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, indices ? indices[i + j] : i + j));
    if (ray.intersectTriangle(...vertices, false, hit)) distances.add(Math.round(hit.distanceTo(point) * 1e6));
  }
  return distances.size % 2 === 1;
}

// Weld by position for topology checks: hard-normal seams and GLB's duplicated
// vertices do not turn a closed physical surface into an open boundary.
function auditGeometry(geometry) {
  const p = geometry.attributes.position, edges = new Map(), identities = new Map();
  const ids = [], adjacent = new Map();
  for (let i = 0; i < p.count; i++) {
    const xyz = [p.getX(i), p.getY(i), p.getZ(i)];
    assert.ok(xyz.every(Number.isFinite), 'non-finite vertex');
    const key = xyz.map(n => Math.round(n * 1e6)).join(',');
    if (!identities.has(key)) identities.set(key, identities.size);
    ids.push(identities.get(key));
  }
  const index = geometry.index?.array ?? Uint32Array.from({ length: p.count }, (_, i) => i);
  let volume = 0;
  const v = i => new THREE.Vector3().fromBufferAttribute(p, i);
  for (let i = 0; i < index.length; i += 3) {
    const triangle = Array.from(index.slice(i, i + 3));
    const [a, b, c] = triangle.map(v);
    assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length() > 1e-10, 'degenerate triangle');
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let j = 0; j < 3; j++) {
      const from = ids[triangle[j]], to = ids[triangle[(j + 1) % 3]];
      const key = [from, to].sort((a, b) => a - b).join(':');
      const edge = edges.get(key) || { count: 0, direction: 0 };
      edge.count++; edge.direction += from < to ? 1 : -1;
      edges.set(key, edge);
      if (!adjacent.has(from)) adjacent.set(from, new Set());
      adjacent.get(from).add(to);
    }
  }
  for (const edge of edges.values()) {
    assert.equal(edge.count, 2, 'open or non-manifold edge');
    assert.equal(edge.direction, 0, 'inconsistent face winding');
  }
  const visited = new Set(), pending = [ids[0]];
  while (pending.length) {
    const next = pending.pop(); if (visited.has(next)) continue;
    visited.add(next); pending.push(...adjacent.get(next));
  }
  assert.equal(visited.size, identities.size, 'disconnected islands inside one mesh');
  assert.ok(volume > 0, 'inverted or zero-volume mesh');
  return index.length / 3;
}

for (const [key, spec] of Object.entries(FURNITURE)) {
  test(`${key}: physical joints and existing catalog anchors`, () => {
    const root = createFurniture(key), catalog = ISO_ITEMS[key];
    assert.deepEqual([spec.width, spec.depth], catalog.foot);
    if (catalog.seat != null || catalog.surface != null) assert.ok(Math.abs((spec.seat ?? spec.surface) * PIXELS_PER_UNIT - (catalog.seat ?? catalog.surface)) < 1e-9);
    for (const connection of root.userData.joints || []) {
      const [a, b] = connection.parts.map(name => root.getObjectByName(name));
      assert.ok(a && b, 'a declared joint references a missing part');
      const point = new THREE.Vector3(...connection.point);
      assert.ok(containsPoint(a, point) && containsPoint(b, point), `disconnected joint: ${connection.parts.join(' / ')}`);
    }
    if (spec.seat != null) assert.equal(root.userData.seatAnchor[1], spec.seat);
    if (['bookshelf', 'bookcase', 'shelf'].includes(key)) {
      const back = new THREE.Box3().setFromObject(root.getObjectByName('continuous-recessed-back'));
      for (const sign of [-1, 1]) {
        const side = new THREE.Box3().setFromObject(root.getObjectByName(`case-side-${sign}`));
        assert.ok(back.min.z > side.min.z + .005, 'case back must be recessed to avoid coplanar rear surfaces');
      }
    }
    if (key === 'basket') {
      const cloth = root.getObjectByName('one-draped-linen-cloth').geometry;
      const basket = root.getObjectByName('continuous-hollow-basket'), rim = root.getObjectByName('bound-basket-rim');
      const p = cloth.attributes.position, faceCount = p.count / 2;
      const checkOuterFace = point => assert.ok(!containsPoint(basket, point) && !containsPoint(rim, point), 'wicker cuts through the visible cloth face');
      for (let i = 0; i < faceCount; i++) checkOuterFace(new THREE.Vector3().fromBufferAttribute(p, i));
      const indices = cloth.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const triangle = indices.slice(i, i + 3); if (triangle.some(index => index >= faceCount)) continue;
        const center = new THREE.Vector3(); triangle.forEach(index => center.add(new THREE.Vector3().fromBufferAttribute(p, index)));
        checkOuterFace(center.divideScalar(3));
      }
    }
    for (const item of root.userData.contents || []) {
      const support = root.getObjectByName(item.support), contents = new THREE.Box3();
      assert.ok(support, 'stored contents reference a missing support');
      for (const name of item.parts) contents.union(new THREE.Box3().setFromObject(root.getObjectByName(name)));
      const supportBox = new THREE.Box3().setFromObject(support);
      assert.ok(Math.abs(contents.min.y - supportBox.max.y) < .01, `${item.name} floats above or sinks through its shelf`);
      root.traverse(node => {
        if (!node.isMesh || !/supported-shelf|tapered-depth-shelf|proud-crown-cap|clear-upper-tray/.test(node.name) || node === support) return;
        const nextShelf = new THREE.Box3().setFromObject(node);
        if (nextShelf.min.y > supportBox.max.y + .01 && contents.max.x > nextShelf.min.x && contents.min.x < nextShelf.max.x && contents.max.z > nextShelf.min.z && contents.min.z < nextShelf.max.z) {
          assert.ok(contents.max.y <= nextShelf.min.y + .002, `${item.name} cuts into the shelf above it`);
        }
      });
    }
    if (spec.surface != null) {
      const ray = new THREE.Raycaster();
      for (const x of [-.25, 0, .25]) for (const z of [-.2, 0, .2]) {
        ray.set(new THREE.Vector3(x * spec.width, spec.height + 1, z * spec.depth), new THREE.Vector3(0, -1, 0));
        const [hit] = ray.intersectObject(root, true);
        assert.ok(hit && Math.abs(hit.point.y - spec.surface) < .002, 'a stacked item would float above or sink into its worktop');
      }
    }
    for (const x of ['armchair', 'sofa', 'coffeetable', 'bed'].includes(key) ? [-1, 1] : []) for (const z of [-1, 1]) {
      const leg = root.getObjectByName(`${key === 'coffeetable' ? 'leg' : 'foot'}-${x}-${z}`);
      const top = new THREE.Box3().setFromObject(leg).max.y;
      const joint = new THREE.Vector3(leg.position.x, top - .005, leg.position.z);
      const support = root.getObjectByName(key === 'coffeetable' ? 'solid-rounded-tabletop' : key === 'bed' ? 'bed-frame' : 'underframe');
      assert.ok(containsPoint(leg, joint) && containsPoint(support, joint), 'leg must enter its supporting frame/top');
      if (key === 'coffeetable') {
        const shelfJoint = new THREE.Vector3(leg.position.x, .17, leg.position.z);
        assert.ok(containsPoint(leg, shelfJoint) && containsPoint(root.getObjectByName('lower-shelf'), shelfJoint), 'shelf must enter each leg');
        const apronJoint = new THREE.Vector3(leg.position.x * .99, spec.surface - .095, leg.position.z);
        assert.ok(containsPoint(leg, apronJoint) && containsPoint(root.getObjectByName(`long-apron-${z}`), apronJoint), 'aprons must enter the legs');
      }
    }
    if (key === 'bed') {
      const frame = root.getObjectByName('bed-frame'), mattress = root.getObjectByName('mattress');
      const joint = new THREE.Vector3(0, .31, 0);
      assert.ok(containsPoint(frame, joint) && containsPoint(mattress, joint), 'mattress must rest on the bed frame');
      const pillow = root.getObjectByName('pillow-1');
      const pillowJoint = new THREE.Vector3(pillow.position.x, spec.seat - .005, pillow.position.z);
      assert.ok(containsPoint(mattress, pillowJoint) && containsPoint(pillow, pillowJoint), 'pillows must rest on the mattress');
      const clothJoint = new THREE.Vector3(0, spec.seat - .005, .45);
      assert.ok(containsPoint(mattress, clothJoint) && containsPoint(root.getObjectByName('continuous-draped-duvet'), clothJoint), 'duvet must rest on the mattress');
      const clothGeometry = root.getObjectByName('continuous-draped-duvet').geometry;
      const cloth = clothGeometry.attributes.position;
      const ray = new THREE.Raycaster();
      const checkClearance = point => {
        ray.set(new THREE.Vector3(point.x, 2, point.z), new THREE.Vector3(0, -1, 0));
        const [hit] = ray.intersectObject(mattress);
        if (hit) assert.ok(point.y >= hit.point.y + .002, `blanket top cuts through the mattress at ${point.toArray()}`);
      };
      for (let i = 0; i < cloth.count / 2; i++) checkClearance(new THREE.Vector3().fromBufferAttribute(cloth, i));
      // Triangle interiors matter too: the original coarse corner grid passed
      // a vertex-only check while exposing the mattress through the cover.
      const indices = clothGeometry.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const triangle = [indices[i], indices[i + 1], indices[i + 2]];
        if (triangle.some(index => index >= cloth.count / 2)) continue;
        const center = new THREE.Vector3();
        triangle.forEach(index => center.add(new THREE.Vector3().fromBufferAttribute(cloth, index)));
        checkClearance(center.divideScalar(3));
      }
    }
    if (['armchair', 'sofa'].includes(key)) {
      const deck = root.getObjectByName('upholstered-seat-deck');
      for (const side of [-1, 1]) {
        const joint = new THREE.Vector3(side * (spec.width / 2 - .12), .3, 0);
        assert.ok(containsPoint(deck, joint) && containsPoint(root.getObjectByName('continuous-arm-and-back-shell'), joint), 'deck must meet both arms');
      }
      for (let i = 1; i <= (key === 'sofa' ? 2 : 1); i++) {
        const pad = root.getObjectByName(`seat-cushion-${i}`);
        const joint = new THREE.Vector3(pad.position.x, spec.seat - .145 + .005, pad.position.z);
        assert.ok(containsPoint(pad, joint) && containsPoint(deck, joint), 'cushion must rest on the deck');
      }
    }
  });

  test(`${key}: closed, connected, outward-facing geometry and compatible bounds`, () => {
    const root = createFurniture(key), bounds = new THREE.Box3().setFromObject(root), meshes = [];
    assert.ok(Math.abs(bounds.min.y) < 1e-6, 'feet must meet the floor');
    assert.ok(bounds.min.x >= -spec.width / 2 - 1e-6 && bounds.max.x <= spec.width / 2 + 1e-6, 'width exceeds footprint');
    assert.ok(bounds.min.z >= -spec.depth / 2 - 1e-6 && bounds.max.z <= spec.depth / 2 + 1e-6, 'depth exceeds footprint');
    assert.ok(Math.abs(bounds.max.y - spec.height) < .002, 'wrong overall height');
    let triangles = 0;
    root.traverse(node => {
      if (!node.isMesh) return;
      meshes.push(node);
      triangles += auditGeometry(node.geometry);
      assert.equal(node.material.side, THREE.FrontSide, 'double-sided material conceals broken faces');
    });
    assert.ok(triangles < 16000, 'prototype triangle budget exceeded');
    // Reject floating parts. This broad-phase support graph is supplemented
    // by actual front/rear/underside renders; boxes alone cannot approve joins.
    const grounded = (root.userData.groundedParts || []).map(name => {
      const mesh = root.getObjectByName(name);
      assert.ok(mesh?.isMesh, 'a grounded component is missing');
      assert.ok(Math.abs(new THREE.Box3().setFromObject(mesh).min.y) < 1e-6, 'a separate ground component is floating');
      return mesh;
    });
    const joined = new Set([meshes[0], ...grounded]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const mesh of meshes) {
        if (joined.has(mesh)) continue;
        const box = new THREE.Box3().setFromObject(mesh).expandByScalar(.002);
        if ([...joined].some(other => box.intersectsBox(new THREE.Box3().setFromObject(other)))) {
          joined.add(mesh); changed = true;
        }
      }
    }
    assert.equal(joined.size, meshes.length, 'floating furniture part');
    if (['armchair', 'sofa'].includes(key)) {
      const shell = root.getObjectByName('continuous-arm-and-back-shell');
      assert.ok(shell?.isMesh, 'arms and back must be a single closed mesh');
      for (let i = 1; i <= (key === 'sofa' ? 2 : 1); i++) {
        const seat = new THREE.Box3().setFromObject(root.getObjectByName(`seat-cushion-${i}`));
        assert.ok(Math.abs(seat.max.y - spec.seat) < .002, 'cushion must retain the catalog seat height');
      }
    }
  });

  test(`${key}: standalone GLB validates, reloads, and matches the authoring source`, async () => {
    const manifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url)));
    const bytes = await readFile(new URL(`../assets/${key}.glb`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.models[key].sha256);
    const report = await validateBytes(bytes, { uri: `${key}.glb` });
    assert.equal(report.issues.numErrors, 0, JSON.stringify(report.issues));
    assert.equal(report.issues.numWarnings, 0, JSON.stringify(report.issues));
    const jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
    assert.ok(gltf.buffers.every(buffer => !buffer.uri), 'GLB must embed all buffers');
    assert.ok(!gltf.images?.length, 'prototype must not require external textures');
    const parsed = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    parsed.scene.updateMatrixWorld(true);
    const expected = createFurniture(key), expectedMeshes = [];
    expected.traverse(node => { if (node.isMesh) expectedMeshes.push(node); });
    let count = 0;
    parsed.scene.traverse(node => {
      if (!node.isMesh) return;
      count++;
      const original = expected.getObjectByName(node.name);
      assert.ok(original, `unexpected exported part ${node.name}`);
      assert.deepEqual(Array.from(node.geometry.attributes.position.array), Array.from(original.geometry.attributes.position.array), 'stale exported vertices');
      if (original.geometry.attributes.color) assert.deepEqual(Array.from(node.geometry.attributes.color.array), Array.from(original.geometry.attributes.color.array), 'export changed vertex pigment');
      assert.equal(node.material.name, original.material.name);
      assert.equal(node.material.userData.fixedPalette, original.material.userData.fixedPalette, 'export lost fixed-palette ownership');
      assert.equal(node.material.transparent, original.material.transparent, 'export changed glass transparency');
      assert.ok(Math.abs(node.material.opacity - original.material.opacity) < 1e-6, 'export changed glass opacity');
      const actualEmission = node.material.emissive.clone().multiplyScalar(node.material.emissiveIntensity);
      const expectedEmission = original.material.emissive.clone().multiplyScalar(original.material.emissiveIntensity);
      assert.ok(actualEmission.toArray().every((value, i) => Math.abs(value - expectedEmission.toArray()[i]) < 1e-6), 'export changed emitted radiance');
      assert.equal(node.userData.noCastShadow, original.userData.noCastShadow, 'export lost the source shadow hint');
      node.matrixWorld.elements.forEach((value, i) => assert.ok(Math.abs(value - original.matrixWorld.elements[i]) < 1e-6, 'stale exported transform'));
      auditGeometry(node.geometry);
    });
    assert.equal(count, expectedMeshes.length, 'export lost a furniture part');
  });
}

test('workstation knee space and espresso brewing bay remain physically open', () => {
  const desk = createFurniture('desk'), machine = createFurniture('coffeecounter');
  const surfaces = [];
  desk.traverse(node => { if (node.isMesh) surfaces.push(node); });
  for (const x of [-.65, -.3, .1]) for (const y of [.25, .45]) {
    assert.ok(!surfaces.some(mesh => containsPoint(mesh, new THREE.Vector3(x, y, .2))), 'desk blocks the seated resident’s knee space');
  }
  const components = [];
  machine.traverse(node => { if (node.isMesh) components.push(node); });
  const height = 29.5 / PIXELS_PER_UNIT;
  for (const x of [-.15, .1]) assert.ok(!components.some(mesh => containsPoint(mesh, new THREE.Vector3(x, height + .20, .10))), 'espresso brewing bay is a solid block');
});
