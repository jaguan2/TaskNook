import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { project } from './iso';
import { ISO_ITEMS } from './isoCatalog';
import { CATALOG_MODELS } from '../services/catalogModels';
import { MODEL_PIXELS_PER_UNIT, MODEL_VERTICAL_SCALE, projectModelPoint, modelOrigin } from './catalogProjection';

describe('GLB room projection', () => {
  it('matches the saved grid at every turn, including asymmetric footprints', () => {
    for (const rotation of [0, 1, 2, 3]) for (const point of [{ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: -2.1, y: 0, z: .7 }]) {
      const sign = rotation >= 2 ? -1 : 1;
      const expected = rotation % 2 ? project(point.z * sign, point.x * sign) : project(point.x * sign, point.z * sign);
      expect(projectModelPoint(point, rotation)).toEqual(expected);
    }
  });
  it('keeps screen-pixel seat and surface heights when viewed through the actual camera', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(10, Math.sqrt(200 / 3), 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    for (const item of Object.values(ISO_ITEMS)) for (const height of [item.seat, item.surface].filter(Number.isFinite)) {
      const vertex = new THREE.Vector3(0, height / MODEL_PIXELS_PER_UNIT * MODEL_VERTICAL_SCALE, 0).applyMatrix4(camera.matrixWorldInverse);
      expect(vertex.y * MODEL_PIXELS_PER_UNIT).toBeCloseTo(height, 8);
    }
  });
  it('covers every production prop while retaining customized actors', () => {
    expect(Object.keys(CATALOG_MODELS)).toHaveLength(179);
    for (const [key, item] of Object.entries(ISO_ITEMS)) {
      expect(!!CATALOG_MODELS[key]).toBe(!item.persona && !item.roamer);
    }
    expect(modelOrigin(CATALOG_MODELS.desk, 0)).toEqual(project(1.1, .6));
    expect(modelOrigin(CATALOG_MODELS.desk, 1)).toEqual(project(.6, 1.1));
    expect(modelOrigin(CATALOG_MODELS.frame).y).toBeLessThan(-50);
  });
});
