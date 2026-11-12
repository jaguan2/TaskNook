import { project } from "./iso";

// Fixed routes relative to Willow's pond origin. Wildlife never enters the
// editable-home/pet wandering engine. The southwest bank has a clear landing
// between the flower bank, foreground rock and bench.
export const WILLOW_DUCKS = [
  { id: "willow-mallard", color: "mallard", duration: 96_000, phase: 0, route: [
    { at: 0, gx: 1.05, gy: 1.02, water: true },
    { at: .2, gx: 1.6, gy: .75, water: true },
    { at: .4, gx: 2.12, gy: 1.05, water: true },
    { at: .6, gx: 1.82, gy: 1.18, water: true },
    { at: .8, gx: 1.2, gy: 1.15, water: true },
    { at: 1, gx: 1.05, gy: 1.02, water: true },
  ] },
  { id: "willow-cream-duck", color: "cream", duration: 128_000, phase: 0, route: [
    { at: 0, gx: 1.85, gy: 1.65, water: true },
    { at: .16, gx: 1.28, gy: 1.7, water: true },
    { at: .26, gx: .95, gy: 1.65, water: true },
    { at: .3, gx: .82, gy: 1.86, water: false },
    { at: .32, gx: .69, gy: 2.04, water: false },
    { at: .38, gx: .35, gy: 2.5, water: false },
    { at: .42, gx: -.05, gy: 2.25, water: false },
    { at: .48, gx: -.9, gy: 2.3, water: false },
    { at: .54, gx: -1.35, gy: 2.85, water: false },
    { at: .6, gx: -.9, gy: 2.3, water: false },
    { at: .66, gx: -.05, gy: 2.25, water: false },
    { at: .7, gx: .35, gy: 2.5, water: false },
    { at: .74, gx: .69, gy: 2.04, water: false },
    { at: .77, gx: .82, gy: 1.86, water: false },
    { at: .8, gx: .95, gy: 1.65, water: true },
    { at: .9, gx: 1.28, gy: 1.7, water: true },
    { at: 1, gx: 1.85, gy: 1.65, water: true },
  ] },
];

/** Continuous location and discrete pose at an elapsed visit time. Pure so
 * route containment, shore transitions and wraparound can be checked. */
export function wildlifeAt(duck, elapsedMs) {
  const cycle = ((elapsedMs / duck.duration + duck.phase) % 1 + 1) % 1;
  const index = duck.route.findLastIndex(point => point.at <= cycle);
  const a = duck.route[index];
  const b = duck.route[index + 1];
  const t = (cycle - a.at) / (b.at - a.at);
  const next = project(b.gx, b.gy);
  const from = project(a.gx, a.gy);
  return { gx: a.gx + (b.gx - a.gx) * t, gy: a.gy + (b.gy - a.gy) * t,
    water: a.water, facing: next.x < from.x ? -1 : 1 };
}

/** All layers share duration/phase. Facing and water/land switch at authored
 * waypoints; positions interpolate linearly instead of sampling random goals. */
export function wildlifeKeyframes(duck) {
  return duck.route.map((point, index) => {
    const p = project(point.gx, point.gy);
    const next = duck.route[index + 1] || duck.route[1];
    const q = project(next.gx, next.gy);
    return { offset: point.at, x: p.x, y: p.y,
      facing: q.x < p.x ? -1 : 1, water: point.water };
  });
}
