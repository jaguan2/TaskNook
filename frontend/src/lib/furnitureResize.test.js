import { expect, it } from 'vitest';
import { FURNITURE_RESIZE_CORNERS, resizeFurnitureAtCorner, resizeFurnitureFromCorner } from './furnitureResize';
import { footOf, resizeIsoPlacements, seatFor, validateIsoLayout } from './isoRoom';

it('keeps the opposite floor corner fixed through all handles and four facings', () => {
  for (const rot of [0, 1, 2, 3]) for (const [corner, edge] of Object.entries(FURNITURE_RESIZE_CORNERS)) {
    const piece = { id: 'bed', item: 'bed', gx: 3, gy: 3, rot, dimensions: { w: 1, d: 2 } };
    const before = footOf(piece);
    const target = resizeFurnitureFromCorner(piece, edge.x ? 1 : -1, edge.y ? 1 : -1, corner);
    const resized = { ...piece, ...target.origin, dimensions: target.dimensions }, after = footOf(resized);
    expect(target.dimensions).toEqual({ w: 2, d: 3 });
    expect(resized.gx + (edge.x ? 0 : after[0])).toBe(piece.gx + (edge.x ? 0 : before[0]));
    expect(resized.gy + (edge.y ? 0 : after[1])).toBe(piece.gy + (edge.y ? 0 : before[1]));
  }
});

it('normalizes an authored span once onto the saved grid, then keeps its anchor through reload', () => {
  const piece = { id: 'desk', item: 'desk', gx: 3, gy: 3 };
  const target = resizeFurnitureAtCorner(piece, 3, 1.5, 'back');
  expect(target.origin).toEqual({ gx: 2, gy: 2.5 });
  const result = resizeIsoPlacements([piece], piece.id, target.dimensions, { w: 8, d: 8 }, target.origin);
  const saved = validateIsoLayout({ w: 8, d: 8, placements: result }).placements.find(p => p.id === piece.id);
  expect(saved).toMatchObject(result[0]);
  const next = resizeFurnitureAtCorner(saved, 4, 2, 'back');
  expect(next.origin.gx + next.dimensions.w).toBe(saved.gx + saved.dimensions.w);
  expect(next.origin.gy + next.dimensions.d).toBe(saved.gy + saved.dimensions.d);
});

it('validates size and position together and retains the supported occupant and finish', () => {
  const bed = { id: 'bed', item: 'bed', gx: 3, gy: 3, dimensions: { w: 1, d: 2 }, tint: '#7799aa' };
  const sleeper = { id: 'sleeper', item: 'resident', gx: 3, gy: 3.5 };
  const target = resizeFurnitureAtCorner(bed, 2, 3, 'back'), room = { w: 8, d: 8 };
  const result = resizeIsoPlacements([bed, sleeper], bed.id, target.dimensions, room, target.origin);
  expect(result[0]).toMatchObject({ ...target.origin, dimensions: target.dimensions, tint: bed.tint });
  expect(seatFor(result[1], result).placement.id).toBe(bed.id);
  const blocker = { id: 'block', item: 'nightstand', gx: 2, gy: 2 };
  expect(resizeIsoPlacements([bed, sleeper, blocker], bed.id, target.dimensions, room, target.origin)).toBeNull();
  expect(resizeIsoPlacements([bed], bed.id, target.dimensions, room, { gx: -1, gy: 2 })).toBeNull();
  expect(resizeIsoPlacements([bed], bed.id, target.dimensions, room, { gx: NaN, gy: 2 })).toBeNull();
  expect(bed.gx).toBe(3);
});
