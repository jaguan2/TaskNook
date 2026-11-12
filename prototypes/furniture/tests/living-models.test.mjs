import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFurniture } from '../src/models.mjs';

test('3D residents retain compact head-to-body proportions and a moderate torso width', () => {
  for (const key of ['you', 'resident']) {
    const root = createFurniture(key), whole = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    const head = new THREE.Box3().setFromObject(root.getObjectByName('head')).getSize(new THREE.Vector3());
    const torso = new THREE.Box3().setFromObject(root.getObjectByName('continuous-knit-torso')).getSize(new THREE.Vector3());
    assert.ok(whole.y / head.y >= 3.5 && whole.y / head.y <= 4.1, `${key}: the figure has become lanky or overcompressed`);
    assert.ok(torso.x / head.x >= .9 && torso.x / head.x <= 1.2, `${key}: the torso overwhelms or collapses beneath the face`);
  }
});

for (const key of ['you', 'resident', 'cat', 'dog', 'bunny']) test(`${key}: articulated clips survive export, move joints, preserve ground clearance and restore bind pose`, async () => {
  const bytes = await readFile(new URL(`../assets/${key}.glb`, import.meta.url));
  const { scene, animations } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const expected = createFurniture(key), rig = expected.userData.rig, mixer = new THREE.AnimationMixer(scene);
  assert.deepEqual(animations.map(c => c.name), ['Idle', 'Walk']);
  const initial = new Map(); scene.updateMatrixWorld(true); scene.traverse(n => initial.set(n.name, n.matrixWorld.clone()));
  for (const name of [...rig.legs, rig.head, ...rig.arms, ...(rig.tail ? [rig.tail] : [])]) {
    const node = scene.getObjectByName(name);
    assert.ok(node?.isObject3D && !node.isMesh && node.children.length, `${name} is not an articulated transform node`);
    assert.ok(animations.some(clip => clip.tracks.some(track => track.name.startsWith(`${name}.`))), `${name} has no exported motion channel`);
  }
  for (const clip of animations) {
    assert.ok(clip.tracks.length >= 1); const action = mixer.clipAction(clip).play(); let moved = false;
    for (let i = 1; i < 40; i++) {
      mixer.setTime(i / 40 * clip.duration); scene.updateMatrixWorld(true);
      for (const name of rig.legs) assert.ok(new THREE.Box3().setFromObject(scene.getObjectByName(name)).min.y >= -.002, `${clip.name}: a foot penetrates the floor`);
      scene.traverse(n => { if (!n.matrixWorld.equals(initial.get(n.name))) moved = true; });
    }
    assert.ok(moved, `${clip.name} is static`); action.stop(); scene.updateMatrixWorld(true);
    scene.traverse(n => n.matrixWorld.elements.forEach((value, i) => assert.ok(Math.abs(value - initial.get(n.name).elements[i]) < 1e-6, 'stopping motion did not restore the bind pose')));
  }
  mixer.uncacheRoot(scene);
});
