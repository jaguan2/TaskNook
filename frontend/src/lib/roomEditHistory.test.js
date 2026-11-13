import { expect, it } from 'vitest';
import { applyRoomEditChanges, mergeRoomEditChanges, roomEditChanges } from './roomEditHistory';

const original = { w: 8, d: 8, placements: [
  { id: 'bed', item: 'bed', gx: 1, gy: 1 },
  { id: 'pet', item: 'cat', gx: 5, gy: 5, ageMs: 10 },
] };

it('undoes and redoes geometry and colours without reverting unrelated pet progress', () => {
  const edited = { ...original, placements: [{ ...original.placements[0], gx: 2, tint: '#7799aa', dimensions: { w: 2, d: 2 } }, original.placements[1]] };
  const changes = roomEditChanges(original, edited);
  const current = { ...edited, placements: [edited.placements[0], { ...edited.placements[1], ageMs: 20, name: 'Pebble' }] };
  const undo = applyRoomEditChanges(current, changes, 'before');
  expect(undo.placements[0]).toEqual(original.placements[0]);
  expect(undo.placements[1]).toMatchObject({ ageMs: 20, name: 'Pebble' });
  expect(applyRoomEditChanges(undo, changes, 'after').placements[0]).toEqual(edited.placements[0]);
  expect(current.placements[0].gx).toBe(2);
});

it('restores removed pieces and their order, including room shape changes', () => {
  const edited = { ...original, w: 9, mask: Array(8).fill('111111111'), placements: [original.placements[1]] };
  const patch = roomEditChanges(original, edited);
  expect(applyRoomEditChanges(edited, patch, 'before')).toEqual(original);
  expect(applyRoomEditChanges(original, patch, 'after')).toEqual(edited);
});

it('coalesces a colour gesture while keeping its original reset value', () => {
  const one = { ...original, placements: [{ ...original.placements[0], tint: '#112233' }, original.placements[1]] };
  const two = { ...one, placements: [{ ...one.placements[0], tint: '#7799aa' }, one.placements[1]] };
  const patch = mergeRoomEditChanges(roomEditChanges(original, one), roomEditChanges(one, two));
  expect(patch).toHaveLength(1);
  expect(applyRoomEditChanges(two, patch, 'before')).toEqual(original);
  expect(applyRoomEditChanges(original, patch, 'after')).toEqual(two);
});
