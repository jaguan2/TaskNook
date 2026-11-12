import { foot, joint, material } from './geometry.mjs';
import { cabinetCase, drawerFront } from './worktop-cabinets.mjs';
import { board, folio } from './storage-parts.mjs';

function feet(root, w, d, paint, base) {
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const leg = foot(root, `cabinet-foot-${x}-${z}`, x * (w / 2 - .10), z * (d / 2 - .10), .135, paint, .04);
    joint(root, leg, base, [leg.position.x, .12, leg.position.z]);
  }
}

export function wardrobe(root, spec) {
  const timber = material('finish', '#b08a61'), frame = material('frame', '#805d46'), brass = material('hardware', '#baa17b');
  const { width: w, depth: d, height: h } = spec;
  const cabinet = cabinetCase(root, 'wardrobe-case', { width: w - .04, depth: d - .035, bottom: .105, top: h - .055 }, timber);
  feet(root, w - .04, d - .035, frame, cabinet.base);
  const crown = board(root, 'moulded-crown', [w, .09, d], [0, h - .045, 0], timber, .025);
  for (const side of cabinet.sides) joint(root, side, crown, [side.position.x, h - .07, 0]);
  for (const sign of [-1, 1]) {
    const x = sign * (w - .07) / 4, doorW = (w - .07) / 2 - .012;
    const door = board(root, `framed-door-${sign}`, [doorW, h - .27, .055], [x, (h - .27) / 2 + .17, d / 2 - .048], frame, .015);
    joint(root, door, cabinet.sides[sign === -1 ? 0 : 1], [sign * (w / 2 - .062), h / 2, d / 2 - .056]);
    for (const fraction of [.30, .70]) {
      const panel = board(root, `raised-door-panel-${sign}-${fraction}`, [doorW - .09, (h - .40) * .38, .025], [x, .19 + (h - .27) * fraction, d / 2 - .015], timber, .014);
      joint(root, panel, door, [x, panel.position.y, d / 2 - .024]);
    }
    const pull = board(root, `door-pull-${sign}`, [.023, .16, .038], [sign * .05, h * .50, d / 2 - .020], brass, .009);
    joint(root, pull, door, [sign * .05, h * .50, d / 2 - .032]);
  }
}

export function dresser(root, spec) {
  const timber = material('finish', '#b08a61'), frame = material('frame', '#805d46'), brass = material('hardware', '#baa17b');
  const { width: w, depth: d, surface: h } = spec;
  const cabinet = cabinetCase(root, 'dresser-case', { width: w - .055, depth: d - .065, bottom: .105, top: h - .045 }, timber);
  feet(root, w - .055, d - .065, frame, cabinet.base);
  const top = board(root, 'solid-dresser-top', [w, .065, d], [0, h - .0325, 0], timber, .022);
  for (const side of cabinet.sides) joint(root, side, top, [side.position.x, h - .052, 0]);
  const available = h - .20;
  for (let i = 0; i < 3; i++) drawerFront(root, `dresser-drawer-${i}`, { x: 0, y: .145 + (i + .5) * available / 3, width: w - .155, height: available / 3 - .02, z: (d - .065) / 2 - .028 }, timber, brass, cabinet);
}

export function tvCabinet(root, spec) {
  const timber = material('finish', '#b08a61'), frame = material('frame', '#805d46'), trim = material('screen-bezel', '#49434b');
  const { width: w, depth: d, height: h } = spec, topY = .55;
  const cabinet = cabinetCase(root, 'media-case', { width: w - .055, depth: d - .04, bottom: .105, top: topY - .035 }, timber);
  feet(root, w - .055, d - .04, frame, cabinet.base);
  const top = board(root, 'media-cabinet-top', [w, .06, d], [0, topY - .03, 0], timber, .02);
  for (const side of cabinet.sides) joint(root, side, top, [side.position.x, topY - .043, 0]);
  const divider = board(root, 'central-cubby-divider', [.055, topY - .16, d - .075], [0, (topY - .16) / 2 + .13, 0], timber, .01);
  joint(root, divider, cabinet.base, [0, .14, 0]);
  joint(root, divider, top, [0, topY - .043, 0]);
  folio(root, 'media-folio', { x: -.48, top: .16, width: .46, depth: .31, height: .09 }, material('folio-cover', '#849181'), cabinet.base);
  // The cabinet's original catalog identity includes its television. A real
  // stand receives the stem, which enters the complete rear screen housing.
  const stand = board(root, 'television-stand', [.50, .045, .26], [0, topY + .0175, -.035], trim, .02);
  joint(root, stand, top, [0, topY - .002, -.035]);
  const screenH = .72, screenBottom = h - screenH;
  const stem = board(root, 'television-stem', [.085, screenBottom - topY + .12, .075], [0, (screenBottom + .12 + topY) / 2, -.035], trim, .014);
  joint(root, stem, stand, [0, topY + .025, -.035]);
  const casing = board(root, 'complete-television-housing', [1.25, screenH, .075], [0, h - screenH / 2, -.035], trim, .035);
  joint(root, stem, casing, [0, screenBottom + .055, -.035]);
  const display = board(root, 'recessed-display', [1.14, screenH - .10, .013], [0, h - screenH / 2, .001], material('display', '#75828e'), .025);
  joint(root, display, casing, [0, display.position.y, -.002]);
}
