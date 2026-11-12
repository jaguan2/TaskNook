import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFurniture, FURNITURE, PIXELS_PER_UNIT } from '../src/models.mjs';
import { ISO_ITEMS } from '../../../frontend/src/lib/isoCatalog.js';

test('all standalone entries preserve production placement and interaction metadata', () => {
  assert.deepEqual(Object.keys(FURNITURE).sort(), Object.keys(ISO_ITEMS).sort());
  for (const [key, item] of Object.entries(ISO_ITEMS)) {
    const spec = FURNITURE[key]; assert.ok(spec.description?.length > 30);
    assert.equal(spec.controlHeight, item.hitH);
    for (const flag of ['wall', 'persona', 'self', 'unique', 'roamer', 'backView', 'lie', 'toggleable', 'stacks', 'flicker', 'softSeat']) assert.equal(!!spec[flag], !!item[flag], `${key}: ${flag}`);
    assert.deepEqual(spec.glow, item.glow); assert.equal(spec.tintable === false, item.tintable === false);
    for (const anchor of ['seat', 'surface']) if (item[anchor] != null) assert.ok(Math.abs(spec[anchor] * PIXELS_PER_UNIT - item[anchor]) < 1e-9);
  }
});

test('the sink counter and jack-o-lantern face contain actual openings', () => {
  const sink = createFurniture('sink'), counter = sink.getObjectByName('open-sink-counter');
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 3, 0), new THREE.Vector3(0, -1, 0));
  assert.equal(ray.intersectObject(counter).length, 0, 'sink opening was filled');
  const [basin] = ray.intersectObject(sink.getObjectByName('recessed-basin-floor'));
  assert.ok(basin && basin.point.y < new THREE.Box3().setFromObject(counter).max.y - .05);
  const pumpkin = createFurniture('jackolantern'), face = pumpkin.getObjectByName('carved-pumpkin-face');
  for (const [x, y] of [[-.046, .224], [.046, .226], [0, .098]]) {
    const origin = face.localToWorld(new THREE.Vector3(x, y, 1));
    ray.set(origin, new THREE.Vector3(0, 0, -1)); assert.equal(ray.intersectObject(face).length, 0, 'a carved opening is a painted solid');
  }
  ray.set(face.localToWorld(new THREE.Vector3(0, .29, 1)), new THREE.Vector3(0, 0, -1));
  assert.ok(ray.intersectObject(face).length, 'carving removed the receiving brow');
});

test('mug and kettle spout have real receiving inner walls and open centres', () => {
  const mug = createFurniture('mug'), vessel = mug.getObjectByName('hollow-mug');
  const ray = new THREE.Raycaster(vessel.localToWorld(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0));
  const [hit] = ray.intersectObject(vessel);
  assert.ok(hit && vessel.worldToLocal(hit.point.clone()).y < .03, 'mug opening is capped at its rim');
  const kettle = createFurniture('kettle'), spout = kettle.getObjectByName('open-tapered-spout');
  const origin = spout.localToWorld(new THREE.Vector3(0, 1, 0)), target = spout.localToWorld(new THREE.Vector3(0, 0, 0));
  ray.set(origin, target.sub(origin).normalize()); assert.equal(ray.intersectObject(spout).length, 0, 'spout is a capped cone');
});

test('the mirror and beach ball retain circular and spherical proportions', () => {
  const mirror = createFurniture('mirror'), bounds = new THREE.Box3().setFromObject(mirror).getSize(new THREE.Vector3());
  assert.ok(Math.abs(bounds.x - bounds.y) < .003, 'round mirror is oval or rectangular');
  const ball = createFurniture('beachball'), size = new THREE.Box3().setFromObject(ball).getSize(new THREE.Vector3());
  assert.ok(Math.max(size.x, size.y, size.z) - Math.min(size.x, size.y, size.z) < .003, 'beach ball is stretched');
});

test('seasonal seating retains a real support at its existing seat anchor', () => {
  for (const key of ['haybale', 'logstack', 'sunlounger']) {
    const root = createFurniture(key), spec = FURNITURE[key];
    const ray = new THREE.Raycaster(new THREE.Vector3(0, spec.seat + .05, 0), new THREE.Vector3(0, -1, 0));
    const [hit] = ray.intersectObject(root, true); assert.ok(hit && Math.abs(hit.point.y - spec.seat) < .002, `${key}: unsupported seat anchor`);
  }
});

test('seasonal silhouettes keep fallen leaves low, wheels round, snow exposed and the lounger reclined', () => {
  const leaves = createFurniture('leafpile');
  leaves.traverse(mesh => {
    if (!mesh.isMesh || !mesh.name.startsWith('fallen-leaf-')) return;
    const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    assert.ok(size.y < Math.max(size.x, size.z) * .45, 'a fallen leaf stands on its edge');
  });
  const barrow = createFurniture('leafbarrow'), wheel = new THREE.Box3().setFromObject(barrow.getObjectByName('barrow-wheel')).getSize(new THREE.Vector3());
  assert.ok(Math.abs(wheel.y / wheel.x - 1) < .10, 'wheelbarrow wheel is stretched into an ellipse');
  const pine = createFurniture('snowpine'), cap = pine.getObjectByName('snow-pine-snow-cap-0');
  const sample = cap.localToWorld(new THREE.Vector3(0, .45, 0));
  const ray = new THREE.Raycaster(new THREE.Vector3(5, sample.y, sample.z), new THREE.Vector3(-1, 0, 0));
  assert.match(ray.intersectObject(pine, true)[0]?.object.name || '', /snow-cap/, 'green needles hide the snow cap');
  const spec = FURNITURE.sunlounger, angle = Math.atan2(spec.height - .025 - spec.seat, .58);
  assert.ok(angle > Math.PI / 8 && angle < Math.PI / 3, 'lounger back is upright or flat');
});
