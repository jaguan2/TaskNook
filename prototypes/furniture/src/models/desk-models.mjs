import { material, rounded, joint } from './geometry.mjs';
import { cabinetCase, drawerFront } from './worktop-cabinets.mjs';

export function buildDesk(root, spec) {
  const wood = material('finish', '#b08a61'), dark = material('frame', '#805d46'), brass = material('hardware', '#baa17b');
  const { width: w, depth: d, surface: h } = spec;
  const top = rounded(root, 'solid-rounded-worktop', [w, .09, d], [0, h - .045, 0], wood, .035);
  const panelX = -w / 2 + .12;
  const side = rounded(root, 'left-support-panel', [.13, h - .055, d - .20], [panelX, (h - .055) / 2, 0], dark, .022);
  joint(root, side, top, [panelX, h - .07, 0]);
  const pedestalX = .65 + (w - 2.2) / 2, cabinetTop = h - .065;
  const cabinet = cabinetCase(root, 'drawer-pedestal', { x: pedestalX, width: .64, depth: d - .22, bottom: 0, top: cabinetTop }, wood);
  joint(root, cabinet.sides[0], top, [pedestalX - .2925, h - .08, 0]);
  for (let i = 0; i < 3; i++) {
    const bottom = .045 + i * (cabinetTop - .08) / 3, height = (cabinetTop - .08) / 3 - .014;
    drawerFront(root, `desk-drawer-${i}`, { x: pedestalX, y: bottom + height / 2, width: .53, height, z: (d - .22) / 2 - .024 }, wood, brass, cabinet);
  }
  const modesty = rounded(root, 'rear-modesty-and-support-rail', [1.45 + w - 2.2, .22, .055], [-.25, h - .20, -d / 2 + .16], dark, .014);
  joint(root, modesty, side, [panelX + .025, h - .20, -d / 2 + .16]);
  joint(root, modesty, cabinet.sides[0], [pedestalX - .30, h - .20, -d / 2 + .16]);
  if (w > 3) {
    const support = rounded(root, 'centre-rear-support', [.10, h - .055, .10], [0, (h - .055) / 2, -d / 2 + .16], dark, .018);
    joint(root, support, top, [0, h - .07, -d / 2 + .16]);
    joint(root, support, modesty, [0, h - .20, -d / 2 + .16]);
  }
}

