import { describe, expect, it } from 'vitest';
import { bedDimensions, bedPillows, cleanFurnitureDimensions, snapBedDimensions } from './furnitureDimensions';
import { clampIsoPlacement, footOf, footprintsOverlap, replaceFurniturePlacement, resizeIsoPlacements, seatFor, seatedPlacement, spotIsClear, surfaceFor, validateIsoLayout } from './isoRoom';

const room = { w: 8, d: 8 };
const single = { id: 'bed', item: 'bed', gx: 1, gy: 1, dimensions: { w: 1, d: 2 }, tint: '#506b9c', colors: { pillows: '#d891a9' } };

describe('resizable bed dimensions', () => {
  it('keeps the authored size until resizing and bounds half-tile dimensions', () => {
    expect(bedDimensions({ item: 'bed' })).toEqual({ w: 2, d: 2.8 });
    expect(snapBedDimensions(.5, 9)).toEqual({ w: 1, d: 4 });
    expect(snapBedDimensions(2.3, 2.7)).toEqual({ w: 2.5, d: 2.5 });
    for (const value of [null, [], { w: true, d: 2 }, { w: 1.25, d: 2 }, { w: 1, d: 2.8 }, { w: 5, d: 2 }, { w: 1, d: Infinity }]) {
      expect(cleanFurnitureDimensions('bed', value)).toBeUndefined();
    }
    expect(cleanFurnitureDimensions('chair', { w: 1, d: 2 })).toBeUndefined();
  });

  it('uses canonical sizes for every footprint, clamp and collision direction', () => {
    for (const rot of [0, 1, 2, 3]) expect(footOf({ ...single, rot })).toEqual(rot % 2 ? [2, 1] : [1, 2]);
    expect(clampIsoPlacement({ ...single, dimensions: { w: 1, d: 3 }, rot: 1 }, 5, 5, { w: 4, d: 4 })).toEqual({ gx: 1, gy: 3 });
    const large = { ...single, gx: 0, gy: 0, dimensions: { w: 4, d: 4 } };
    const chair = { id: 'chair', item: 'chair', gx: 3, gy: 3 };
    expect(footprintsOverlap(large, chair)).toBe(true);
    expect(spotIsClear(3, 3, 'chair', 0, room, [large])).toBe(false);
  });

  it('resizes one catalog piece while keeping its finish and sleeping occupant', () => {
    const owner = { id: 'you', item: 'you', gx: 1, gy: 1.5 };
    const input = [single, owner], before = JSON.stringify(input);
    const result = resizeIsoPlacements(input, 'bed', { w: 4, d: 4 }, room);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'bed', tint: '#506b9c', colors: single.colors, dimensions: { w: 4, d: 4 } });
    expect(seatFor(result[1], result).placement.id).toBe('bed');
    expect(JSON.stringify(input)).toBe(before);
    const turned = replaceFurniturePlacement(result, result[0], { ...result[0], rot: 1, gx: 2 });
    expect(seatFor(turned[1], turned).placement.id).toBe('bed');
    expect(seatedPlacement(turned[1], seatFor(turned[1], turned))._lie).toBe(true);
  });

  it('refuses added overlap and missing floor but allows shrinking and rugs', () => {
    const obstacle = { id: 'cabinet', item: 'nightstand', gx: 2.5, gy: 1 };
    expect(resizeIsoPlacements([single, obstacle], 'bed', { w: 2, d: 2 }, room)).toBeNull();
    expect(resizeIsoPlacements([single], 'bed', { w: 4, d: 4 }, { w: 4, d: 4 })).toBeNull();
    const mask = Array(8).fill('11011111');
    expect(resizeIsoPlacements([single], 'bed', { w: 3, d: 2 }, { ...room, mask })).toBeNull();
    expect(resizeIsoPlacements([single], 'bed', { w: 3, d: 2 }, { ...room, partitions: ['gx:3:1'] })).toBeNull();
    const rug = { id: 'rug', item: 'squarerug', gx: 1, gy: 1 };
    expect(resizeIsoPlacements([single, rug], 'bed', { w: 2, d: 2 }, room)).toBeTruthy();
    expect(resizeIsoPlacements([{ ...single, dimensions: { w: 2, d: 2 } }, obstacle], 'bed', { w: 1, d: 2 }, room)).toBeTruthy();
  });

  it('round-trips size, direction and colours and can restore the original size', () => {
    const input = { ...room, placements: [{ ...single, rot: 3 }] };
    const saved = validateIsoLayout(JSON.parse(JSON.stringify(input)));
    expect(saved.placements[0]).toMatchObject({ dimensions: single.dimensions, colors: single.colors, rot: 3 });
    const restored = resizeIsoPlacements(saved.placements, 'bed', null, room)[0];
    expect(restored).not.toHaveProperty('dimensions');
    expect(restored.colors).toEqual(single.colors);
    expect(footOf(restored)).toEqual([2.8, 2]);
  });

  it('adds pillows without stretching them as the mattress gets wider', () => {
    expect(bedPillows(1)).toHaveLength(1);
    expect(bedPillows(2)).toHaveLength(2);
    expect(bedPillows(4)).toHaveLength(4);
    expect(bedPillows(4).map(p => p.width)).toEqual([.73, .73, .73, .73]);
  });
});

it('keeps a sofa occupant and desk equipment supported through sizing and every turn', () => {
  const sofa = { id: 'sofa', item: 'sofa', gx: 1, gy: 1, tint: '#7799aa' };
  const sitter = { id: 'sitter', item: 'resident', gx: 1.5, gy: 1 };
  const seats = resizeIsoPlacements([sofa, sitter], sofa.id, { w: 4, d: 1.5 }, room);
  expect(seatFor(seats[1], seats).placement.id).toBe('sofa');
  expect(seats[0].tint).toBe('#7799aa');
  const desk = { id: 'desk', item: 'desk', gx: 1, gy: 1, dimensions: { w: 4, d: 2 } };
  const computer = { id: 'computer', item: 'computer', gx: 3, gy: 2 };
  let input = resizeIsoPlacements([desk, computer], desk.id, { w: 2, d: 1 }, room);
  expect(surfaceFor(input[1], input).placement.id).toBe('desk');
  for (const rot of [1, 2, 3, 0]) {
    input = replaceFurniturePlacement(input, input[0], { ...input[0], rot, gx: 2, gy: 2 });
    expect(surfaceFor(input[1], input).placement.id).toBe('desk');
    expect(input[1].rot || 0).toBe(rot);
  }
  expect(computer.gx).toBe(3);
});

it('fits a resized wall shelf on its wall without colliding with floor furniture', () => {
  const wall = { id: 'wall', item: 'wallshelf', gx: 1, gy: 0 };
  const desk = { id: 'desk', item: 'desk', gx: 1, gy: 0 };
  expect(resizeIsoPlacements([wall, desk], wall.id, { w: 4, d: .5 }, room)).toBeTruthy();
  expect(resizeIsoPlacements([{ ...wall, gx: 6 }], wall.id, { w: 4, d: .5 }, room)).toBeNull();
});

it('refuses a desktop made too shallow for its rotated monitor', () => {
  const desk = { id: 'desk', item: 'desk', gx: 1, gy: 1, dimensions: { w: 2, d: 2 } };
  const computer = { id: 'computer', item: 'computer', gx: 1.5, gy: 1, rot: 1 };
  expect(surfaceFor(computer, [desk, computer]).placement.id).toBe('desk');
  expect(resizeIsoPlacements([desk, computer], desk.id, { w: 2, d: 1 }, room)).toBeNull();
  expect(resizeIsoPlacements([desk, computer], desk.id, { w: 2, d: 1.5 }, room)).toBeTruthy();
});
