import { expect, it } from 'vitest';
import { duplicateIsoPlacement, footOf, footprintFree, footprintsOverlap, moveIsoPlacements, resizeIsoPlacements, rotateIsoPlacements, seatFor, surfaceFor } from './isoRoom';
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

it('refuses turns into solid furniture while retaining rugs and seated occupants', () => {
  const sofa = { id: 'sofa', item: 'sofa', gx: 1, gy: 1 };
  const chair = { id: 'chair', item: 'chair', gx: 1, gy: 2.5 };
  expect(footprintsOverlap(sofa, chair)).toBe(false);
  expect(rotateIsoPlacements([sofa, chair], sofa.id, 1, size)).toBeNull();
  expect(rotateIsoPlacements([sofa, chair], sofa.id, -1, size)).toBeNull();
  const sitter = { id: 'sitter', item: 'resident', gx: 1.5, gy: 1 };
  const rug = { id: 'rug', item: 'squarerug', gx: 1, gy: 1 };
  const turned = rotateIsoPlacements([sofa, sitter, rug], sofa.id, 1, size);
  expect(turned[0].rot).toBe(1);
  expect(seatFor(turned[1], turned).placement.id).toBe(sofa.id);
  expect(sofa).not.toHaveProperty('rot');
});

it('keeps the irregular-floor relocation path and carries its occupant safely', () => {
  const room = { w: 6, d: 6, mask: ['111111', '111111', '111111', '111000', '111000', '111000'] };
  const bed = { id: 'bed', item: 'bed', gx: 2, gy: 3, dimensions: { w: 1, d: 2 } };
  const sitter = { id: 'sitter', item: 'resident', gx: 2, gy: 3.5 };
  const turned = rotateIsoPlacements([bed, sitter], bed.id, 1, room);
  expect(turned[0].rot).toBe(1);
  expect(footprintFree(turned[0].gx, turned[0].gy, footOf(turned[0]), room)).toBe(true);
  expect(seatFor(turned[1], turned).placement.id).toBe(bed.id);
});

it('refuses a shrink that merges tabletop props and accepts one that keeps them separate', () => {
  const desk = { id: 'desk', item: 'desk', gx: 1, gy: 1, dimensions: { w: 4, d: 2 } };
  const mugs = [{ id: 'one', item: 'mug', gx: 3.5, gy: 1.5 }, { id: 'two', item: 'mug', gx: 4.5, gy: 1.5 }];
  const original = [desk, ...mugs];
  expect(footprintsOverlap(...mugs)).toBe(false);
  expect(resizeIsoPlacements(original, desk.id, { w: 2, d: 2 }, size)).toBeNull();
  const resized = resizeIsoPlacements(original, desk.id, { w: 3.5, d: 2 }, size);
  expect(resized).not.toBeNull();
  expect(footprintsOverlap(resized[1], resized[2])).toBe(false);
  for (const p of resized.slice(1)) expect(surfaceFor(p, resized).placement.id).toBe(desk.id);
  expect(original[0].dimensions).toEqual({ w: 4, d: 2 });
});
