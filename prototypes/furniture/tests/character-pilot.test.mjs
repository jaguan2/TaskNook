import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateBytes } from 'gltf-validator';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { characterSourceFingerprint } from '../scripts/character-source.mjs';

const folder = new URL('../assets/character-pilot/', import.meta.url);
async function load() {
  const bytes = await readFile(new URL('resident.glb', folder));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
function evaluate(scene, mixer, clip, time = 0) {
  mixer.stopAllAction(); mixer.clipAction(clip).play(); mixer.setTime(time); scene.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(scene, true);
}

test('pilot GLB validates cleanly and matches its editable source/export manifest', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', folder)));
  for (const [name, expected] of [['resident.blend', manifest.sourceSha256], ['resident.glb', manifest.modelSha256]]) {
    assert.equal(createHash('sha256').update(await readFile(new URL(name, folder))).digest('hex'), expected, `${name}: re-export and update its manifest after editing`);
  }
  const result = await validateBytes(await readFile(new URL('resident.glb', folder)), { maxIssues: 30 });
  assert.equal(result.issues.numErrors, 0, JSON.stringify(result.issues));
  assert.equal(result.issues.numWarnings, 0, JSON.stringify(result.issues));
  assert.equal(manifest.productionEnabled, false);
  const source = JSON.parse(await readFile(new URL('source-art.json', folder)));
  assert.equal(source.sourceFingerprint, await characterSourceFingerprint(), 'Refresh the production comparison frames');
});

test('sweater and trousers are connected surfaces with normalized blended skin weights', async () => {
  const { scene } = await load();
  for (const name of ['Sweater', 'Trousers']) {
    const mesh = scene.getObjectByName(name);
    assert.ok(mesh?.isSkinnedMesh && mesh.skeleton.bones.length >= 20);
    const { position, skinWeight } = mesh.geometry.attributes;
    let blended = 0;
    for (let i = 0; i < position.count; i++) {
      const weights = [skinWeight.getX(i), skinWeight.getY(i), skinWeight.getZ(i), skinWeight.getW(i)];
      assert.ok(weights.every(w => Number.isFinite(w) && w >= 0));
      assert.ok(Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < 1e-5);
      if (weights.filter(w => w > .01).length > 1) blended++;
    }
    assert.ok(blended > 100, `${name}: joints are rigid instead of blended`);
    // Weld exported normal splits by position before checking surface connectivity.
    const canonical = new Map(), ids = [], neighbours = new Map();
    for (let i = 0; i < position.count; i++) {
      const key = [position.getX(i), position.getY(i), position.getZ(i)].map(v => Math.round(v * 1e5)).join(',');
      if (!canonical.has(key)) canonical.set(key, canonical.size);
      ids.push(canonical.get(key)); neighbours.set(ids[i], new Set());
    }
    const index = mesh.geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const triangle = [ids[index.getX(i)], ids[index.getX(i + 1)], ids[index.getX(i + 2)]];
      for (const a of triangle) for (const b of triangle) neighbours.get(a).add(b);
    }
    const seen = new Set(), pending = [0];
    while (pending.length) { const id = pending.pop(); if (seen.has(id)) continue; seen.add(id); pending.push(...[...neighbours.get(id)].filter(n => !seen.has(n))); }
    assert.equal(seen.size, canonical.size, `${name}: disconnected pieces survived the sculpt union`);
  }
});

test('exported poses deform safely, preserve floor clearance and close sleeping eyes', async () => {
  const { scene, animations } = await load(), mixer = new THREE.AnimationMixer(scene);
  assert.deepEqual(animations.map(c => c.name).sort(), ['AnklesCrossed', 'Idle', 'Sit', 'Sleep', 'Type', 'Walk']);
  const sizes = {};
  for (const clip of animations) {
    for (const fraction of [0, .125, .25, .5, .875, .999]) {
      const box = evaluate(scene, mixer, clip, fraction * clip.duration);
      assert.ok([...box.min, ...box.max].every(Number.isFinite), clip.name);
      assert.ok(box.min.y >= -.003, `${clip.name}: floor penetration`);
      assert.ok(box.getSize(new THREE.Vector3()).length() < 3, `${clip.name}: unstable deformation`);
    }
    sizes[clip.name] = evaluate(scene, mixer, clip).getSize(new THREE.Vector3());
  }
  const idle = animations.find(c => c.name === 'Idle');
  evaluate(scene, mixer, idle);
  assert.ok(Math.abs(sizes.Idle.y * 48 / Math.SQRT2 - 58) < 1, 'Pilot no longer matches room height');
  assert.ok(sizes.Sit.y < sizes.Idle.y - .15);
  assert.ok(sizes.Sleep.z > sizes.Sleep.y * 2, 'Sleeping pose is still upright');
  const eyes = scene.getObjectByName('EyeL');
  assert.ok(eyes?.isBone);
  const open = eyes.scale.z;
  evaluate(scene, mixer, animations.find(c => c.name === 'Sleep'));
  assert.ok(eyes.scale.z < open * .2);
  mixer.stopAllAction(); mixer.uncacheRoot(scene);
});

test('body fullness changes the mesh without moving the skeleton or facial identity', async () => {
  const { scene, animations } = await load(), mixer = new THREE.AnimationMixer(scene);
  evaluate(scene, mixer, animations.find(c => c.name === 'Sit'));
  const mesh = scene.getObjectByName('Sweater'), points = mesh.geometry.attributes.position.count;
  const before = Array.from({ length: points }, (_, i) => mesh.getVertexPosition(i, new THREE.Vector3()));
  const bones = mesh.skeleton.bones.map(b => b.matrixWorld.clone());
  mesh.morphTargetInfluences[mesh.morphTargetDictionary.TorsoFullness] = 1;
  let changed = 0;
  for (let i = 0; i < points; i++) if (mesh.getVertexPosition(i, new THREE.Vector3()).distanceTo(before[i]) > .0001) changed++;
  assert.ok(changed > 100, 'Fullness is only changing a label');
  mesh.skeleton.bones.forEach((bone, i) => assert.ok(bone.matrixWorld.equals(bones[i])));
  assert.equal(scene.getObjectByName('ShortHair').morphTargetDictionary, undefined);
});
