import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIllustratedPalette } from '../../../prototypes/furniture/src/viewer/illustrated-style.mjs';
import { createShelfDecorator } from './catalogShelfDecor';
import { cleanShelfDecor, SHELF_ITEMS } from '../lib/shelfDecor';
import { catalogModelRequest } from './catalogModels';
import { validateIsoLayout } from '../lib/isoRoom';

describe('per-placement shelf decorations', () => {
  it('keeps valid decor through layout validation and separates image variants', () => {
    const placement = { id: 'shelf', item: 'bookshelf', gx: 1, gy: 1, decor: { layout: 'mixed', bookColor: '#598FA4' } };
    const [saved] = validateIsoLayout({ w: 8, d: 7, placements: [placement] }).placements;
    expect(saved.decor).toEqual({ layout: 'mixed', bookColor: '#598fa4' });
    expect(catalogModelRequest(saved).id).not.toBe(catalogModelRequest({ ...saved, decor: { layout: 'plants' } }).id);
    expect(cleanShelfDecor('desk', placement.decor)).toBeUndefined();
    expect(cleanShelfDecor('shelf', { layout: 'unknown', bookColor: 'red' })).toBeUndefined();
    expect(cleanShelfDecor('shelf', [])).toBeUndefined();
  });

  it.each(SHELF_ITEMS)('stocks %s on real boards and restores its original contents', async key => {
    const palette = createIllustratedPalette(), loaded = new Map();
    const load = async name => {
      if (!loaded.has(name)) {
        const bytes = readFileSync(new URL(`../../../prototypes/furniture/assets/${name}.glb`, import.meta.url));
        const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        palette.apply(scene, 'illustrated'); loaded.set(name, scene);
      }
      return loaded.get(name);
    };
    const model = await load(key), decorate = createShelfDecorator(palette, load);
    const metadata = model.children[0].userData.shelfDecor;
    expect(metadata.parts.length).toBeGreaterThan(0);
    for (const layout of ['books', 'plants', 'mixed']) {
      await decorate(model, { layout, bookColor: '#8a79b5' });
      model.updateMatrixWorld(true);
      const group = model.getObjectByName(`shelf-layout-${layout}`);
      expect(group.visible).toBe(true);
      expect(metadata.parts.every(name => !model.getObjectByName(name).visible)).toBe(true);
      const boards = metadata.boards.map(name => new THREE.Box3().setFromObject(model.getObjectByName(name)));
      for (const object of group.children) {
        const box = new THREE.Box3().setFromObject(object);
        const support = boards.find(board => Math.abs(box.min.y - board.max.y) < .003);
        expect(support, `${key}/${layout}: floating contents`).toBeDefined();
        expect(box.min.x).toBeGreaterThanOrEqual(support.min.x);
        expect(box.max.x).toBeLessThanOrEqual(support.max.x);
        expect(box.min.z).toBeGreaterThanOrEqual(support.min.z);
        expect(box.max.z).toBeLessThanOrEqual(support.max.z);
        const next = boards[boards.indexOf(support) + 1];
        if (next) expect(box.max.y).toBeLessThan(next.min.y);
      }
      const covers = [];
      group.traverse(node => { if (node.material?.name === 'shelf-book-accent') covers.push(node.material.color.getHexString()); });
      if (layout !== 'plants') expect(new Set(covers)).toEqual(new Set(['8a79b5']));
    }
    await decorate(model, { layout: 'empty' });
    expect(model.children.filter(node => node.name.startsWith('shelf-layout-')).every(node => !node.visible)).toBe(true);
    await decorate(model);
    expect(metadata.parts.every(name => model.getObjectByName(name).visible)).toBe(true);
  });
});
