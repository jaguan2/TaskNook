import { expect, it } from 'vitest';
import { duplicateIsoPlacement, moveIsoPlacements, seatFor, surfaceFor } from './isoRoom';
const size = { w: 8, d: 8 };
it('allows supported and layered moves while refusing new solid intersections', () => {
  const desk = { id: 'desk', item: 'desk', gx: 1, gy: 1 };
  const mug = { id: 'mug', item: 'mug', gx: 5, gy: 5 };
  const chair = { id: 'chair', item: 'chair', gx: 5, gy: 3 };
  const placements = [desk, mug, chair];
  expect(moveIsoPlacements(placements, chair.id, 1, 1, size)).toBeNull();
  const onDesk = moveIsoPlacements(placements, mug.id, 1.5, 1.5, size);
  expect(surfaceFor(onDesk[1], onDesk).placement.id).toBe(desk.id);
  const rug = { id: 'rug', item: 'squarerug', gx: 4, gy: 4 };
  expect(moveIsoPlacements([...placements, rug], rug.id, 1, 1, size)).toBeTruthy();
  const sitter = { id: 'sitter', item: 'resident', gx: 5, gy: 3 };
  const seated = moveIsoPlacements([...placements, sitter], chair.id, 6, 3, size);
  expect(seatFor(seated.at(-1), seated).placement.id).toBe(chair.id);
});
it('copies size, facing, colours and decorations with a new clear identity', () => {
  const source = { id: 'shelf', item: 'bookcase', gx: 1, gy: 1, rot: 2, tint: '#7799aa', dimensions: { w: 3, d: 1 }, decor: { layout: 'plants' } };
  const copy = duplicateIsoPlacement({ ...size, placements: [source] }, source.id);
  expect(copy.id).not.toBe(source.id);
  expect(copy).toMatchObject({ item: source.item, rot: source.rot, tint: source.tint, dimensions: source.dimensions, decor: source.decor });
  expect(copy.gx !== source.gx || copy.gy !== source.gy).toBe(true);
  expect(duplicateIsoPlacement({ ...size, placements: [{ id: 'pet', item: 'cat', gx: 0, gy: 0 }] }, 'pet')).toBeNull();
  const full = { id: 'bed', item: 'bed', gx: 0, gy: 0, dimensions: { w: 4, d: 4 } };
  expect(duplicateIsoPlacement({ w: 4, d: 4, placements: [full] }, full.id)).toBeNull();
});
