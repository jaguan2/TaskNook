import { expect, it } from 'vitest';
import { modelHitShape } from './modelHitShape';

it('keeps holes and transparent corners out of the furniture grab region', () => {
  const pixels = new Uint8Array(5 * 4 * 4);
  for (const [x, y] of [[1, 0], [3, 0], [1, 1], [3, 1], [1, 2], [2, 2], [3, 2]]) pixels[(y * 5 + x) * 4 + 3] = 255;
  expect(modelHitShape(pixels, 5, 4)).toBe('M1 0h1v2h-1zM3 0h1v2h-1zM1 2h3v1h-3z');
  expect(modelHitShape(new Uint8Array(16), 2, 2)).toBe('');
});
