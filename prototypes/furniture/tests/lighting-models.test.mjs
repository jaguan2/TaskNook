import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFurniture, FURNITURE } from '../src/models.mjs';
import { ISO_ITEMS } from '../../../frontend/src/lib/isoCatalog.js';
import { createIllustratedPalette } from '../src/viewer/illustrated-style.mjs';
import { glowingMaterial } from '../src/models/lighting-parts.mjs';

test('lighting retains catalog glow/stacking and real open shades around supported sources', () => {
  for (const [key] of Object.entries(FURNITURE).filter(([, spec]) => spec.section === 'light-warmth')) {
    const root = createFurniture(key), ray = new THREE.Raycaster();
    assert.deepEqual(root.userData.glow, ISO_ITEMS[key].glow);
    assert.equal(root.userData.stacks, ISO_ITEMS[key].stacks);
    assert.ok(root.userData.lightSources.length > 0);
    for (const name of root.userData.lightSources) {
      const light = root.getObjectByName(name);
      assert.ok(light.material.emissiveIntensity > 0 && light.material.userData.lightSource);
      assert.equal(light.castShadow, false);
    }
    for (const cover of root.userData.shades || []) {
      const mesh = root.getObjectByName(cover.part);
      ray.set(new THREE.Vector3(cover.x, cover.bottom - .02, cover.z), new THREE.Vector3(0, 1, 0));
      assert.equal(ray.intersectObject(mesh).length, 0, 'shade has a false solid cap across its opening');
      ray.set(new THREE.Vector3(cover.x, cover.bottom + .025, cover.z), new THREE.Vector3(1, 0, 0));
      assert.ok(ray.intersectObject(mesh).length > 0, 'shade wall is missing');
    }
  }
});

test('glowing finishes preserve radiance, colour and switch state across material variants', () => {
  const palette = createIllustratedPalette(), root = new THREE.Group();
  const paint = glowingMaterial('lava-wax', '#b98f98', .27, true);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), paint); root.add(mesh);
  palette.apply(root, 'illustrated');
  assert.equal(mesh.material.emissiveIntensity, .27);
  palette.setLightEnabled(false); palette.recolor('lava-wax', '#123456');
  palette.apply(root, 'original');
  assert.equal(mesh.material.emissiveIntensity, 0);
  assert.equal(mesh.material.emissive.getHexString(), '123456');
  const later = new THREE.Mesh(new THREE.SphereGeometry(.02, 12, 8), glowingMaterial('late-bulb'));
  root.add(later); palette.apply(root, 'illustrated');
  assert.equal(later.material.emissiveIntensity, 0, 'lazy-loaded light ignores the current off state');
  palette.setLightEnabled(true);
  assert.equal(mesh.material.emissiveIntensity, .27);
  assert.equal(mesh.material.emissive.getHexString(), '123456');
  assert.equal(later.material.emissiveIntensity, .55);
  mesh.geometry.dispose(); later.geometry.dispose(); palette.materials.forEach(material => material.dispose()); palette.disposeTexture();
});

test('illustrated moon keeps its sculpted pigment instead of becoming a plain globe', () => {
  const root = createFurniture('moonlamp'), palette = createIllustratedPalette();
  const moon = root.getObjectByName('single-sculpted-moon-globe');
  const colours = Array.from(moon.geometry.attributes.color.array);
  assert.ok(Math.min(...colours) < .85 && Math.max(...colours) > .99, 'lunar pigment has no visible range');
  for (const style of ['illustrated', 'original']) {
    palette.apply(root, style); assert.equal(moon.material.vertexColors, true);
    assert.deepEqual(Array.from(moon.geometry.attributes.color.array), colours);
  }
  palette.materials.forEach(material => material.dispose()); palette.disposeTexture();
});

test('wax shapes remain inside the lava vessel and the hearth has a physical firebox opening', () => {
  const lava = createFurniture('lavalamp'), box = lava.userData.enclosedContents[0];
  const vessel = new THREE.Box3().setFromObject(lava.getObjectByName(box.vessel));
  for (const name of box.parts) {
    const bounds = new THREE.Box3().setFromObject(lava.getObjectByName(name));
    assert.ok(bounds.min.y >= box.bottom - .01 && bounds.max.y <= box.top);
    assert.ok(bounds.min.x > vessel.min.x && bounds.max.x < vessel.max.x && bounds.min.z > vessel.min.z && bounds.max.z < vessel.max.z);
  }
  const hearth = createFurniture('fireplace'), surround = hearth.getObjectByName(hearth.userData.firebox.opening), ray = new THREE.Raycaster();
  ray.set(new THREE.Vector3(0, .70, 1), new THREE.Vector3(0, 0, -1));
  assert.equal(ray.intersectObject(surround).length, 0, 'firebox is a dark mark on a solid block');
  ray.set(new THREE.Vector3(.60, .70, 1), new THREE.Vector3(0, 0, -1));
  assert.ok(ray.intersectObject(surround).length > 0, 'arched surround has no supporting jamb');
});
