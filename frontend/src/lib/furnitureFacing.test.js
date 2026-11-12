import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CATALOG_MODELS } from '../services/catalogModels';
import { ISO_ITEMS, nextRot, validateIsoLayout } from './isoRoom';
import { furnitureFacing, furnitureFacingLabel } from './furnitureFacing';
import { modelOrientationMatrix } from './catalogProjection';

describe('saved furniture compass directions', () => {
  it('maps the real GLB matrix to the same facing used by occupants and controls', () => {
    for (const [item, spec] of Object.entries(CATALOG_MODELS)) {
      if (ISO_ITEMS[item].wall) continue;
      for (const rot of [0, 1, 2, 3]) {
        const forward = spec.forward === '+X' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
        forward.applyMatrix4(new THREE.Matrix4().set(...modelOrientationMatrix(rot)));
        const facing = furnitureFacing({ item, rot });
        expect(forward.x, `${item}/${rot}`).toBe(facing.gx);
        expect(forward.z, `${item}/${rot}`).toBe(facing.gy);
      }
    }
  });

  it('keeps all four values through saved-room validation, including non-seating furniture', () => {
    for (const item of ['sofa', 'armchair', 'bookshelf', 'wardrobe', 'bookcase', 'bed', 'sunlounger']) {
      for (const rot of [0, 1, 2, 3]) {
        const saved = validateIsoLayout({ version: 2, w: 8, d: 8, placements: [{ id: 'piece', item, gx: 2, gy: 2, rot }] });
        expect(saved.placements[0].rot || 0, `${item}/${rot}`).toBe(rot);
        expect(nextRot(item, rot)).toBe((rot + 1) % 4);
      }
    }
  });

  it('names each grid direction and respects a lounger’s native X axis', () => {
    expect([0, 1, 2, 3].map(rot => furnitureFacing({ item: 'sofa', rot }).key)).toEqual(['south', 'east', 'north', 'west']);
    expect([0, 1, 2, 3].map(rot => furnitureFacing({ item: 'sunlounger', rot }).key)).toEqual(['east', 'south', 'west', 'north']);
    expect(furnitureFacingLabel({ item: 'wallshelf', rot: 0 })).toBe('North wall');
    expect(furnitureFacingLabel({ item: 'wallshelf', rot: 1 })).toBe('West wall');
  });
});
