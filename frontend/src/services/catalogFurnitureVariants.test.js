import { expect, it, vi } from 'vitest';
import { createIllustratedPalette } from '../../../prototypes/furniture/src/viewer/illustrated-style.mjs';
import { createFurnitureVariants } from './catalogRenderer';

it('bounds resized source meshes and releases evicted geometry and materials', () => {
  const palette = createIllustratedPalette(), variant = createFurnitureVariants(palette, 2);
  const first = variant('bed', { w: 1, d: 2 }), second = variant('bed', { w: 2, d: 2 });
  // Exercise the app's virtual manifest too: omitting a builder anchor can
  // produce NaN geometry even when the workshop's source model is valid.
  first.traverse(node => {
    if (!node.isMesh) return;
    expect([...node.geometry.attributes.position.array].every(Number.isFinite)).toBe(true);
  });
  const firstDisposed = vi.fn(), secondDisposed = vi.fn();
  first.children[0].geometry.addEventListener('dispose', firstDisposed);
  second.children[0].geometry.addEventListener('dispose', secondDisposed);
  expect(variant('bed', { w: 1, d: 2 })).toBe(first);
  variant('bed', { w: 3, d: 3 });
  expect(firstDisposed).not.toHaveBeenCalled();
  expect(secondDisposed).toHaveBeenCalledOnce();
  expect(palette.materials.size).toBe(16);
  const reloaded = variant('bed', { w: 2, d: 2 });
  expect(reloaded).not.toBe(second);
  expect(firstDisposed).toHaveBeenCalledOnce();
  expect(palette.materials.size).toBe(16);
  palette.disposeTexture();
});
