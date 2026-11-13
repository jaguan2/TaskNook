import { beam, material } from './geometry.mjs';
import { board, stored } from './storage-parts.mjs';
import { pot, sprig, leaf } from './organic-parts.mjs';

export function plantDisplay(root, s) {
    const finish = material(s.colorRole, s.defaultColor), h = 1.65;
    const dw = s.width - 1.5, dd = s.depth - .6;
    for (const x of [-.62 - dw / 2, .62 + dw / 2]) for (const z of [-.21 - dd / 2, .21 + dd / 2]) board(root, `upright-${x}-${z}`, [.045, h, .045], [x, h / 2, z], finish);
    for (let i = 1; i < Math.ceil(s.width / 2); i++) {
      const x = -s.width / 2 + s.width * i / Math.ceil(s.width / 2);
      for (const z of [-.21 - dd / 2, .21 + dd / 2]) board(root, `intermediate-support-${i}-${z}`, [.045, h, .045], [x, h / 2, z], finish);
    }
    for (let row = 0; row < 3; row++) {
      const top = .10 + row * .52, tray = board(root, `tray-${row}`, [1.32 + dw, .045, .49 + dd], [0, top - .0225, 0], finish);
      for (let i = 0; i < 3; i++) {
        const start = root.children.length;
        const colors = ['#d58b63', '#69a5a0', '#d7b65e'];
        const soil = pot(root, `pot-${row}-${i}`, (i - 1) * .43, 0, top - .004, .13, .17, material(`stock-pot-${(row + i) % 3}`, colors[(row + i) % 3]), tray);
        sprig(root, `plant-${row}-${i}`, soil, [soil.x, soil.y + .19, 0], .14, 4, (row + i) % 3 === 0);
        for (const node of root.children.slice(start)) if (node.material?.name === "foliage") node.material.color.set(["#74a45c", "#569780", "#8aaf62"][(row + i) % 3]);
        stored(root, `stock-${row}-${i}`, root.children.slice(start), tray);
      }
    }
  }

export function wallShelf(root, s) {
    const paint = material(s.colorRole, s.defaultColor), dw = s.width - 1.6, dd = s.depth - .3;
    board(root, 'shelf-board', [1.48 + dw, .055, .27 + dd], [0, .21, 0], paint);
    board(root, 'wall-receiving-cleat', [1.43 + dw, .22, .035], [0, .12, -.116 - dd / 2], paint);
    const brackets = s.resized ? Math.max(2, Math.ceil(s.width / 1.5) + 1) : 2;
    for (let i = 0; i < brackets; i++) {
      const x = (-.50 - dw / 2) + (1 + dw) * i / (brackets - 1);
      beam(root, `shelf-bracket-${x}`, [x, .015, -.10 - dd / 2], [x, .205, .11 + dd / 2], .018, paint);
    }
    const contentsStart = root.children.length;
    for (let i = 0; i < 4; i++) board(root, `shelf-book-${i}`, [.075, .27 + i % 2 * .05, .14], [-.39 + i * .08, .371 + i % 2 * .025, -.01], material(`book-cover-${i % 2}`, i % 2 ? '#cf765c' : '#6b986a'), .004);
    const soil = pot(root, 'shelf-pot', .42, 0, .234, .09, .12, material('pot', '#b69e80')); leaf(root, 'shelf-leaf', [.42, soil.y - .01, 0], [.43, soil.y + .20, 0], .12, material('foliage', '#69915c'));
    stored(root, 'wall-shelf-contents', root.children.slice(contentsStart), root.getObjectByName('shelf-board'));
  }

