import { beam, foot, joint, material, revolved, rounded, splayedLeg } from './geometry.mjs';
import { PIXELS_PER_UNIT } from '../catalog.mjs';
import { cabinetCase, drawerFront, kitchenCounter } from './worktop-cabinets.mjs';
import { espressoMachine } from './espresso-machine.mjs';

function diningTable(root, spec) {
  const wood = material('finish', '#b08a61'), timber = material('frame', '#805d46');
  const { width: w, depth: d, surface: h } = spec;
  const top = rounded(root, 'solid-rounded-tabletop', [w, .09, d], [0, h - .045, 0], wood, .04);
  const lx = w / 2 - .17, lz = d / 2 - .15, railY = h - .125;
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const leg = splayedLeg(root, `dining-leg-${x}-${z}`, [x * (lx + .035), z * (lz + .035)], [x * lx, z * lz], h - .06, timber, .048);
    joint(root, leg, top, [x * lx, h - .075, z * lz]);
  }
  for (const z of [-1, 1]) {
    const rail = rounded(root, `long-apron-${z}`, [lx * 2, .13, .06], [0, railY, z * lz], timber, .015);
    for (const x of [-1, 1]) joint(root, rail, root.getObjectByName(`dining-leg-${x}-${z}`), [x * (lx - .005), railY, z * (lz + .004)]);
  }
  for (const x of [-1, 1]) {
    const rail = rounded(root, `end-apron-${x}`, [.06, .13, lz * 2], [x * lx, railY, 0], timber, .015);
    for (const z of [-1, 1]) joint(root, rail, root.getObjectByName(`dining-leg-${x}-${z}`), [x * (lx + .004), railY, z * (lz - .005)]);
  }
}

function cafeTable(root, spec) {
  const wood = material('finish', '#b08a61'), timber = material('frame', '#805d46'), h = spec.surface;
  // Both pieces have complete radial profiles: broad bevels and a base that
  // flares all the way into the column instead of a pole touching a plate.
  const pedestal = revolved(root, 'continuous-turned-pedestal', [[.29, 0], [.36, .018], [.36, .04], [.31, .065], [.15, .095], [.075, .15], [.064, h - .12], [.14, h - .075], [.19, h - .06]], timber);
  const top = revolved(root, 'solid-round-tabletop', [[.52, h - .085], [.585, h - .065], [.599, h - .045], [.599, h - .025], [.575, h], [.18, h]], wood);
  joint(root, pedestal, top, [0, h - .07, 0]);
}

function desk(root, spec) {
  const wood = material('finish', '#b08a61'), dark = material('frame', '#805d46'), brass = material('hardware', '#baa17b');
  const { width: w, depth: d, surface: h } = spec;
  const top = rounded(root, 'solid-rounded-worktop', [w, .09, d], [0, h - .045, 0], wood, .035);
  const panelX = -w / 2 + .12;
  const side = rounded(root, 'left-support-panel', [.13, h - .055, d - .20], [panelX, (h - .055) / 2, 0], dark, .022);
  joint(root, side, top, [panelX, h - .07, 0]);
  const pedestalX = .65, cabinetTop = h - .065;
  const cabinet = cabinetCase(root, 'drawer-pedestal', { x: pedestalX, width: .64, depth: d - .22, bottom: 0, top: cabinetTop }, wood);
  joint(root, cabinet.sides[0], top, [pedestalX - .2925, h - .08, 0]);
  for (let i = 0; i < 3; i++) {
    const bottom = .045 + i * (cabinetTop - .08) / 3, height = (cabinetTop - .08) / 3 - .014;
    drawerFront(root, `desk-drawer-${i}`, { x: pedestalX, y: bottom + height / 2, width: .53, height, z: (d - .22) / 2 - .024 }, wood, brass, cabinet);
  }
  const modesty = rounded(root, 'rear-modesty-and-support-rail', [1.45, .22, .055], [-.25, h - .20, -d / 2 + .16], dark, .014);
  joint(root, modesty, side, [panelX + .025, h - .20, -d / 2 + .16]);
  joint(root, modesty, cabinet.sides[0], [pedestalX - .30, h - .20, -d / 2 + .16]);
}

function drawerCabinet(root, spec) {
  const wood = material('finish', '#b08a61'), dark = material('frame', '#805d46'), brass = material('hardware', '#baa17b');
  const { width: w, depth: d, surface: h } = spec, bottom = .105, innerW = w - .07, innerD = d - .055;
  const top = rounded(root, 'solid-rounded-worktop', [w, .07, d], [0, h - .035, 0], wood, .027);
  const cabinet = cabinetCase(root, 'joined-cabinet', { width: innerW, depth: innerD, bottom, top: h - .05 }, wood);
  for (const side of cabinet.sides) joint(root, side, top, [side.position.x, h - .06, 0]);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const leg = foot(root, `cabinet-foot-${x}-${z}`, x * (innerW / 2 - .065), z * (innerD / 2 - .065), bottom + .025, dark, .035);
    joint(root, leg, cabinet.base, [leg.position.x, bottom + .015, leg.position.z]);
  }
  const usable = h - .085 - bottom;
  for (let i = 0; i < 2; i++) drawerFront(root, `drawer-${i}`, { x: 0, y: bottom + .025 + (i + .5) * usable / 2, width: innerW - .10, height: usable / 2 - .023, z: innerD / 2 - .027 }, wood, brass, cabinet);
}

function barCounter(root, spec) {
  const wood = material('finish', '#a0866b'), dark = material('frame', '#765744'), brass = material('hardware', '#baa17b');
  const { width: w, depth: d, surface: h } = spec, z = -.075, caseD = d - .19;
  const top = rounded(root, 'overhanging-serving-top', [w, .08, d], [0, h - .04, 0], dark, .025);
  const cabinet = cabinetCase(root, 'bar-carcass', { width: w - .10, depth: caseD, z, bottom: .045, top: h - .065 }, wood);
  const plinth = rounded(root, 'recessed-grounded-plinth', [w - .18, .065, caseD - .04], [0, .0325, z], dark, .015);
  joint(root, cabinet.base, plinth, [0, .055, z]);
  for (const side of cabinet.sides) joint(root, side, top, [side.position.x, h - .072, z]);
  const frontZ = z + caseD / 2 - .022;
  const face = rounded(root, 'framed-bar-front', [w - .14, h - .16, .055], [0, (h - .16) / 2 + .065, frontZ], dark, .014);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * .198;
    const panel = rounded(root, `raised-timber-panel-${i}`, [.175, h - .25, .026], [x, (h - .25) / 2 + .11, frontZ + .033], wood, .012);
    joint(root, face, panel, [x, h / 2, frontZ + .023]);
  }
  const railZ = d / 2 - .025, rail = beam(root, 'brass-footrail', [-.40, .15, railZ], [.40, .15, railZ], .017, brass);
  for (const x of [-.32, .32]) {
    const bracket = beam(root, `footrail-bracket-${x}`, [x, .15, frontZ], [x, .15, railZ], .018, brass);
    joint(root, bracket, face, [x, .15, frontZ + .01]);
    joint(root, bracket, rail, [x, .15, railZ - .006]);
  }
}

function coffeeCounter(root, spec) {
  const surface = 29.5 / PIXELS_PER_UNIT;
  kitchenCounter(root, { ...spec, surface });
  espressoMachine(root, surface, spec.height);
}

export const TABLE_BUILDERS = {
  desk, diningtable: diningTable, cafetable: cafeTable,
  sidetable: drawerCabinet, nightstand: drawerCabinet,
  counter: kitchenCounter, barcounter: barCounter, coffeecounter: coffeeCounter,
};
