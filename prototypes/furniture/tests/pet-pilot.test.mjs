import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateBytes } from 'gltf-validator';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { createPetAppearance } from '../src/pets/appearance.mjs';
import { petSourceFingerprint } from '../scripts/pet-source.mjs';

const output = new URL('../assets/pet-pilot/', import.meta.url);
const contract = JSON.parse(await readFile(new URL('source-art.json', output)));
const catalog = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url))).models;
async function load(kind) {
  const bytes = await readFile(new URL(`${kind}.glb`, output));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

test('pet comparison frames preserve the current growth/form source contract', async () => {
  assert.equal(contract.sourceFingerprint, await petSourceFingerprint());
  assert.equal(Object.keys(contract.fixtures).length, 162);
  assert.deepEqual(contract.stages.map(({ key, scale, head }) => [key, scale, head]), [['baby', .58, 1.22], ['teen', .82, 1.08], ['adult', 1, 1]]);
  assert.deepEqual(contract.forms.map(form => form.key), ['natural', 'slender', 'round']);
});

for (const kind of ['cat', 'dog', 'bunny']) {
  test(`${kind}: portable pet validates and matches its saved Blender source`, async () => {
    const manifest = JSON.parse(await readFile(new URL(`${kind}.json`, output)));
    for (const [file, hash] of [[`${kind}.blend`, manifest.sourceSha256], [`${kind}.glb`, manifest.modelSha256]]) {
      assert.equal(createHash('sha256').update(await readFile(new URL(file, output))).digest('hex'), hash);
    }
    const validation = await validateBytes(await readFile(new URL(`${kind}.glb`, output)), { maxIssues: 20 });
    assert.equal(validation.issues.numErrors, 0, JSON.stringify(validation.issues));
    assert.equal(validation.issues.numWarnings, 0, JSON.stringify(validation.issues));
    assert.equal(manifest.productionEnabled, false);
  });

  test(`${kind}: the painted body is connected and its joints blend normalized weights`, async () => {
    const { scene } = await load(kind);
    const body = scene.getObjectByName('PetBody');
    assert.ok(body);
    assert.equal(scene.getObjectsByProperty('isBone', true).length, 21);
    const welded = new Map(), edges = new Map(); let blended = 0;
    body.traverse(mesh => {
      if (!mesh.isSkinnedMesh) return;
      const { position, skinWeight } = mesh.geometry.attributes, ids = [];
      assert.ok(mesh.morphTargetDictionary.Slender !== undefined && mesh.morphTargetDictionary.Round !== undefined);
      for (let i = 0; i < position.count; i++) {
        const weights = [skinWeight.getX(i), skinWeight.getY(i), skinWeight.getZ(i), skinWeight.getW(i)];
        assert.ok(weights.every(w => Number.isFinite(w) && w >= 0));
        assert.ok(Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < 1e-5);
        if (weights.filter(w => w > .01).length > 1) blended++;
        const key = [position.getX(i), position.getY(i), position.getZ(i)].map(v => Math.round(v * 1e5)).join(',');
        if (!welded.has(key)) { welded.set(key, welded.size); edges.set(welded.get(key), new Set()); }
        ids.push(welded.get(key));
      }
      const index = mesh.geometry.index;
      for (let i = 0; i < index.count; i += 3) {
        const tri = [ids[index.getX(i)], ids[index.getX(i + 1)], ids[index.getX(i + 2)]];
        for (const a of tri) for (const b of tri) edges.get(a).add(b);
      }
    });
    assert.ok(blended > 100);
    const seen = new Set(), pending = [0];
    while (pending.length) { const next = pending.pop(); if (seen.has(next)) continue; seen.add(next); pending.push(...[...edges.get(next)].filter(i => !seen.has(i))); }
    assert.equal(seen.size, welded.size, 'Detached anatomy survived the sculpt union');
  });

  test(`${kind}: all ages/forms remain grounded through the exported poses`, async () => {
    const { scene, animations } = await load(kind), mixer = new THREE.AnimationMixer(scene);
    const apply = createPetAppearance(scene, animations);
    assert.deepEqual(animations.map(clip => clip.name).sort(), ['Idle', 'Rest', 'Walk']);
    mixer.clipAction(animations.find(clip => clip.name === 'Idle')).play(); mixer.setTime(0);
    apply(contract.stages[2], 'natural', 'Idle', 0); scene.updateMatrixWorld(true);
    const height = new THREE.Box3().setFromObject(scene, true).getSize(new THREE.Vector3()).y * 48 / Math.SQRT2;
    assert.ok(Math.abs(height - contract.referenceBounds[kind].height) < .3, 'Mesh height drifts from the actual production drawing');
    for (const clip of animations) {
      mixer.stopAllAction(); mixer.clipAction(clip).play();
      for (const stage of contract.stages) for (const form of contract.forms) for (const fraction of [0, .125, .5, .875]) {
        const time = clip.duration * fraction;
        mixer.setTime(time); apply(stage, form.key, clip.name, time); scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(scene, true);
        assert.ok([...box.min, ...box.max].every(Number.isFinite));
        assert.ok(box.min.y >= -.003, `${clip.name}/${stage.key}/${form.key}: ${box.min.y} floor penetration`);
        assert.ok(box.max.x <= catalog[kind].width / 2 + .035 && -box.min.x <= catalog[kind].width / 2 + .035, 'Pet exceeds its width');
        assert.ok(box.max.z <= catalog[kind].depth / 2 + .035 && -box.min.z <= catalog[kind].depth / 2 + .035, 'Pet exceeds its depth');
      }
    }
  });

  test(`${kind}: growth does not accumulate on repaint or distort the face when changing body form`, async () => {
    const { scene, animations } = await load(kind), mixer = new THREE.AnimationMixer(scene);
    const apply = createPetAppearance(scene, animations), head = scene.getObjectByName('Head');
    const stage = contract.stages[0];
    mixer.clipAction(animations.find(clip => clip.name === 'Rest')).play();
    mixer.setTime(.3); apply(stage, 'natural', 'Rest', .3); scene.updateMatrixWorld(true);
    const scale = head.scale.clone(), eye = scene.getObjectByName('EyeL').getWorldPosition(new THREE.Vector3());
    for (let i = 0; i < 20; i++) { mixer.setTime(.3); apply(stage, 'natural', 'Rest', .3); }
    scene.updateMatrixWorld(true); assert.ok(head.scale.distanceTo(scale) < 1e-6);
    apply(stage, 'round', 'Rest', .3); scene.updateMatrixWorld(true);
    assert.ok(scene.getObjectByName('EyeL').getWorldPosition(new THREE.Vector3()).distanceTo(eye) < 1e-6);
    mixer.stopAllAction(); mixer.uncacheRoot(scene);
  });
}
