import { joint, material, rounded } from './geometry.mjs';

// A real joined case, shared by drawer/cupboard designs. Panels overlap only
// at their actual joints; the interior remains open rather than a solid cube.
export function cabinetCase(root, name, { width: w, depth: d, bottom, top, x = 0, z = 0 }, paint) {
  const thickness = .055, h = top - bottom;
  const base = rounded(root, `${name}-base`, [w - .03, thickness, d - .02], [x, bottom + thickness / 2, z], paint, .013);
  const sides = [-1, 1].map(sign => rounded(root, `${name}-side-${sign}`, [thickness, h, d], [x + sign * (w - thickness) / 2, bottom + h / 2, z], paint, .016));
  const back = rounded(root, `${name}-back`, [w - .035, h - .012, thickness], [x, bottom + (h + .012) / 2, z - (d - thickness) / 2 + .012], paint, .014);
  for (const side of sides) {
    joint(root, side, base, [side.position.x, bottom + .035, z]);
    joint(root, side, back, [side.position.x, bottom + h / 2, back.position.z]);
  }
  return { base, sides, back };
}

export function drawerFront(root, name, { x, y, z, width: w, height: h }, paint, hardware, cabinet) {
  const front = rounded(root, `${name}-front`, [w, h, .055], [x, y, z], paint, .014);
  // A visible reveal is backed by an actual drawer floor and short box sides.
  const floor = rounded(root, `${name}-floor`, [w, .025, .18], [x, y - h / 2 + .02, z - .075], paint, .008);
  joint(root, front, floor, [x, y - h / 2 + .023, z - .01]);
  for (const sign of [-1, 1]) {
    const runner = rounded(root, `${name}-side-${sign}`, [.035, h - .025, .22], [x + sign * (w / 2 - .01), y, z - .09], paint, .008);
    joint(root, front, runner, [runner.position.x, y, z - .016]);
    joint(root, runner, cabinet.sides[sign === -1 ? 0 : 1], [runner.position.x + sign * .012, y, z - .09]);
  }
  const pull = rounded(root, `${name}-pull`, [Math.min(.18, w * .38), .025, .035], [x, y + h * .12, z + .035], hardware, .011);
  joint(root, front, pull, [x, y + h * .12, z + .022]);
  return front;
}

export function kitchenCounter(root, spec) {
  const paint = material('finish', '#a0866b'), dark = material('frame', '#765744');
  const stone = material('stone', '#d2c6af'), hardware = material('hardware', '#baa17b');
  const { width: w, depth: d, surface: h } = spec;
  const top = rounded(root, 'stone-worktop', [w, .065, d], [0, h - .0325, 0], stone, .022);
  const cabinet = cabinetCase(root, 'cupboard-case', { width: w - .06, depth: d - .05, bottom: .05, top: h - .05 }, paint);
  const plinth = rounded(root, 'recessed-grounded-plinth', [w - .13, .075, d - .12], [0, .0375, -.014], dark, .015);
  joint(root, cabinet.base, plinth, [0, .065, 0]);
  for (const side of cabinet.sides) joint(root, side, top, [side.position.x, h - .057, 0]);
  const door = rounded(root, 'recessed-cupboard-door', [w - .17, h - .17, .055], [0, (h - .17) / 2 + .085, d / 2 - .046], paint, .018);
  // Side stiles receive the hinges and the door: no unsupported decorative face.
  for (const side of [-1, 1]) {
    const stile = rounded(root, `front-stile-${side}`, [.055, h - .14, .055], [side * (w / 2 - .08), (h - .14) / 2 + .065, d / 2 - .046], paint, .012);
    joint(root, stile, cabinet.sides[side === -1 ? 0 : 1], [stile.position.x + side * .02, h / 2, stile.position.z]);
    joint(root, stile, door, [side * (w / 2 - .095), h / 2, stile.position.z]);
  }
  const pull = rounded(root, 'cupboard-pull', [.18, .025, .035], [0, h - .22, d / 2 - .020], hardware, .01);
  joint(root, pull, door, [0, h - .22, d / 2 - .028]);
  return top;
}
