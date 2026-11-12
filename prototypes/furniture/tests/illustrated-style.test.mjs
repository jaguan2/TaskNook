import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createIllustratedPalette } from '../src/viewer/illustrated-style.mjs';
import { characterSourceFingerprint } from '../scripts/character-source.mjs';
import { FURNITURE, migrationSections } from '../src/catalog.mjs';
import { createFurniture } from '../src/models.mjs';
import { previewBounds } from '../src/viewer/preview-bounds.mjs';

test('hidden character calibration cannot alter the standalone furniture framing', () => {
  const group = new THREE.Group();
  const chair = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  const calibration = new THREE.Group();
  calibration.add(new THREE.Mesh(new THREE.PlaneGeometry(20, 20)));
  calibration.visible = false; group.add(chair, calibration);
  assert.deepEqual(previewBounds(group).getSize(new THREE.Vector3()).toArray(), [1, 1, 1]);
  calibration.visible = true;
  assert.equal(previewBounds(group).getSize(new THREE.Vector3()).x, 20);
});

test('illustrated materials preserve role/recolor across shading switches and shared meshes', () => {
  const palette = createIllustratedPalette(), root = new THREE.Group();
  const original = new THREE.MeshStandardMaterial({ name: 'upholstery', color: '#8baba0' });
  const one = new THREE.Mesh(new THREE.BoxGeometry(), original), two = one.clone();
  root.add(one, two);
  palette.apply(root, 'illustrated');
  assert.ok(one.material.isMeshToonMaterial);
  assert.equal(one.material, two.material, 'shared furniture material must stay shared');
  assert.equal(one.material.name, 'upholstery');
  assert.equal(one.material.gradientMap.minFilter, THREE.NearestFilter);
  assert.equal(one.material.gradientMap.colorSpace, THREE.NoColorSpace);
  assert.equal(one.material.gradientMap.image.width, 4);
  palette.recolor('upholstery', '#123456');
  palette.apply(root, 'original');
  assert.equal(one.material, original);
  assert.equal(one.material.color.getHexString(), '123456');
  palette.apply(root, 'illustrated');
  assert.equal(one.material.color.getHexString(), '123456');
  assert.equal(palette.materials.size, 2, 'switches must reuse their material variants');
  one.geometry.dispose(); palette.materials.forEach(material => material.dispose()); palette.disposeTexture();
});

test('contact figures come from the current rig, with complete look/body coverage', async () => {
  const root = new URL('../assets/characters/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.sourceFingerprint, await characterSourceFingerprint(), 'comparison art is stale; run npm run characters');
  const heights = [...new Set(Object.values(FURNITURE).filter(item => item.contact).map(item => item.contact.seatHeight))].sort((a, b) => a - b);
  assert.deepEqual(manifest.seatHeights, heights);
  assert.equal(manifest.looks.length, 4); assert.equal(manifest.bodies.length, 3);
  assert.equal(Object.keys(manifest.fixtures).length, 12 * heights.length);
  for (const look of manifest.looks) for (const body of manifest.bodies) for (const height of heights) {
    const svg = await readFile(new URL(manifest.fixtures[`${look.key}-${body.key}-${height}`], root), 'utf8');
    assert.match(svg, /data-seat-pose=/);
    assert.match(svg, /viewBox="-24 -52 48 78"/);
    assert.ok(!svg.includes('<script') && !svg.includes('href="http'), 'comparison figures must remain self-contained');
  }
});

test('illustrated glass keeps the display case transparent across shading switches', () => {
  const palette = createIllustratedPalette(), root = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ name: 'glass', color: '#b7c7c5', transparent: true, opacity: .20, depthWrite: false });
  const pane = new THREE.Mesh(new THREE.BoxGeometry(.01, .4, .5), glass); root.add(pane);
  for (const style of ['illustrated', 'original', 'illustrated']) {
    palette.apply(root, style);
    assert.equal(pane.material.transparent, true); assert.equal(pane.material.opacity, .20);
    assert.equal(pane.material.depthWrite, false); assert.equal(pane.material.side, THREE.FrontSide);
  }
  pane.geometry.dispose(); palette.materials.forEach(material => material.dispose()); palette.disposeTexture();
});

test('section coverage follows the actual catalog and completed families have no omitted entries', async () => {
  const manifest = JSON.parse(await readFile(new URL('../assets/manifest.json', import.meta.url), 'utf8'));
  const sections = migrationSections();
  assert.equal(sections.length, 18);
  assert.ok(sections.every(section => section.complete && !section.pending.length), 'the complete source catalog must be authored');
  assert.deepEqual(manifest.sections, sections);
  assert.equal(sections[0].label, 'Seating & beds');
  assert.equal(sections[0].complete, true);
  assert.equal(sections[0].exported.length, 13);
  assert.equal(sections[1].label, 'Tables & desks');
  assert.equal(sections[1].complete, true);
  assert.equal(sections[1].exported.length, 9);
  assert.equal(sections[2].label, 'Storage');
  assert.equal(sections[2].complete, true);
  assert.equal(sections[2].exported.length, 13);
  assert.equal(sections[3].label, 'Rugs & floor');
  assert.equal(sections[3].complete, true);
  assert.equal(sections[3].exported.length, 13);
  assert.equal(sections[4].label, 'Light & warmth');
  assert.equal(sections[4].complete, true);
  assert.equal(sections[4].exported.length, 12);
  assert.deepEqual(Object.keys(manifest.models).sort(), Object.keys(FURNITURE).sort());
  for (const section of sections) for (const key of section.exported) assert.equal(manifest.models[key].section, section.id);
});

test('a selected finish stays scoped to its model and fixed palettes reject recoloring', () => {
  const palette = createIllustratedPalette(), first = createFurniture('snowdrift'), second = createFurniture('snowpine'), fixed = createFurniture('snowballs');
  for (const root of [first, second, fixed]) palette.apply(root, 'illustrated');
  const snowCap = second.getObjectByName('snow-pine-snow-cap-0'), original = snowCap.material.color.getHex();
  palette.recolor('snow', '#393545', first);
  assert.equal(snowCap.material.color.getHex(), original, 'recoloring a drift changed a different model’s snow cap');
  const ball = fixed.getObjectByName('snowball-left'), fixedColor = ball.material.color.getHex();
  palette.recolor('snow', '#393545'); assert.equal(ball.material.color.getHex(), fixedColor);
  palette.materials.forEach(m => m.dispose()); palette.disposeTexture();
});
