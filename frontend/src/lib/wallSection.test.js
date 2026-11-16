import { describe, expect, it } from 'vitest';
import { project } from './iso';
import { wallSection, WALL_THICKNESS } from './wallSection';

const right = { plane: 'gy', at: 0, from: 0, to: 8 };
const left = { plane: 'gx', at: 0, from: 0, to: 6 };

describe('solid isometric wall sections', () => {
  it.each([right, left])('extrudes a $plane wall outward without moving the interior plane', run => {
    const section = wallSection(run, 118);
    const [a, b] = section.corners;
    expect(a.inner).toEqual(project(0, 0));
    expect(b.inner).toEqual(run.plane === 'gy' ? project(8, 0) : project(0, 6));
    const dx = a.outer.x - a.inner.x, dy = a.outer.y - a.inner.y;
    expect(Math.abs(dx)).toBeCloseTo(WALL_THICKNESS * 24);
    expect(dy).toBeCloseTo(-WALL_THICKNESS * 12);
    expect(dx > 0).toBe(run.plane === 'gy');
    expect(section.end).toHaveLength(4);
  });

  it('joins both top caps at one mitered back corner', () => {
    const runs = [right, left];
    const r = wallSection(right, 118, runs), l = wallSection(left, 118, runs);
    expect(r.corners[0].outerTop).toEqual(l.corners[0].outerTop);
    expect(r.corners[0].outerTop.x).toBe(0);
    expect(r.corners[0].outerTop.y).toBeCloseTo(-118 - WALL_THICKNESS * 24);
    expect(r.corners[0].end).toBeNull();
    expect(l.corners[0].end).toBeNull();
  });

  it('finishes a height step only above its lower neighbour', () => {
    const tall = { plane: 'gx', at: 3, from: 0, to: 4, height: 118 };
    const low = { plane: 'gy', at: 4, from: 3, to: 7, height: 30 };
    const section = wallSection(tall, 118, [tall, low]);
    const end = section.corners[1];
    expect(end.end[0].y).toBe(end.inner.y - 30);
    expect(end.end[3].y).toBe(end.inner.y - 118);
    expect(end.outer).toEqual(wallSection(low, 30, [tall, low]).corners[0].outer);
  });

  it('does not extend a cap across a gap to an unrelated wall', () => {
    const separated = { ...left, at: 2 };
    const section = wallSection(right, 118, [right, separated]);
    expect(section.corners[0].outer).toEqual(project(0, -WALL_THICKNESS));
    expect(section.corners[0].end).not.toBeNull();
  });
});
