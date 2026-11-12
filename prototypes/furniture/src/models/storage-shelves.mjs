import { beam, joint, material, splayedLeg } from './geometry.mjs';
import { board, book, bowl, folio, linenBin } from './storage-parts.mjs';

const bookColors = ['#83937e', '#b08070', '#a79572', '#7c8997'];
const cover = index => material(`book-cover-${index % 4}`, bookColors[index % 4]);

function shelfCase(root, spec, levels) {
  const { width: w, depth: d, height: h } = spec, timber = material('finish', '#b08a61');
  const plinth = board(root, 'grounded-recessed-plinth', [w - .06, .09, d - .08], [0, .045, 0], timber, .02);
  const sides = [-1, 1].map(sign => board(root, `case-side-${sign}`, [.065, h - .06, d - .025], [sign * (w / 2 - .05), (h - .06) / 2 + .06, 0], timber, .016));
  const back = board(root, 'continuous-recessed-back', [w - .11, h - .07, .035], [0, (h - .07) / 2 + .06, -d / 2 + .04], material('recess', '#745943'), .008);
  const crown = board(root, 'proud-crown-cap', [w, .075, d], [0, h - .0375, 0], timber, .022);
  const shelves = levels.map((top, i) => board(root, `supported-shelf-${i}`, [w - .055, .055, d - .055], [0, top - .0275, .002], timber, .012));
  for (const side of sides) {
    joint(root, side, plinth, [side.position.x, .075, 0]);
    joint(root, side, crown, [side.position.x, h - .05, 0]);
    joint(root, side, back, [side.position.x - Math.sign(side.position.x) * .015, h / 2, -d / 2 + .04]);
    for (const shelf of shelves) joint(root, side, shelf, [side.position.x, shelf.position.y, .002]);
  }
  return shelves;
}

export function bookshelf(root, spec) {
  const levels = [.17, .75, 1.34, 1.93], shelves = shelfCase(root, spec, levels);
  linenBin(root, 'lower-linen-bin', { x: -.23, top: levels[0], width: .66, height: .41, depth: .40 }, shelves[0]);
  for (let i = 0; i < 2; i++) book(root, `lower-book-${i}`, { x: .28 + i * .13, top: levels[0], height: .39 + .10 * i, depth: .35 }, cover(i), shelves[0]);
  for (let row = 1; row <= 3; row++) {
    const count = row === 3 ? 5 : 3;
    for (let i = 0; i < count; i++) book(root, `shelf-${row}-book-${i}`, { x: -.48 + i * .13, top: levels[row], height: .34 + (i % 3) * .07, depth: .31 }, cover(i + row), shelves[row]);
    if (row === 1) bowl(root, 'shelf-ceramic-bowl', { x: .35, top: levels[row], radius: .15 }, shelves[row]);
    if (row === 2) {
      const first = folio(root, 'horizontal-folio-1', { x: .30, top: levels[row], width: .38, depth: .31 }, cover(1), shelves[row]);
      folio(root, 'horizontal-folio-2', { x: .32, top: levels[row] + .054, width: .34, depth: .29 }, cover(2), first.top);
    }
  }
}

export function bookcase(root, spec) {
  const levels = [.16, .65, 1.16], shelves = shelfCase(root, spec, levels);
  linenBin(root, 'linen-bin', { x: -.40, top: levels[0], width: .68, depth: .35, height: .34 }, shelves[0]);
  for (let row = 0; row < 3; row++) for (let i = 0; i < (row === 1 ? 3 : 4); i++) book(root, `bay-${row}-book-${i}`, { x: (row === 0 ? .20 : -.72) + i * .13, top: levels[row], height: .29 + (i % 3) * .06, depth: .28 }, cover(row + i), shelves[row]);
  bowl(root, 'wide-ceramic-bowl', { x: .40, top: levels[1], radius: .18 }, shelves[1]);
  const folios = folio(root, 'top-folio-1', { x: .40, top: levels[2], width: .48, depth: .30 }, cover(1), shelves[2]);
  folio(root, 'top-folio-2', { x: .38, top: levels[2] + .054, width: .43, depth: .28 }, cover(2), folios.top);
}

export function openShelf(root, spec) {
  const levels = [.14, .58, 1.02], shelves = shelfCase(root, spec, levels);
  linenBin(root, 'lower-bin', { x: -.07, top: levels[0], width: .55, depth: .28, height: .28 }, shelves[0]);
  for (let i = 0; i < 3; i++) book(root, `shelf-book-${i}`, { x: -.28 + i * .12, top: levels[2], height: .28 + (i % 2) * .06, depth: .22 }, cover(i), shelves[2]);
  book(root, 'middle-book', { x: -.28, top: levels[1], height: .29, depth: .22 }, cover(2), shelves[1]);
  bowl(root, 'middle-bowl', { x: .17, top: levels[1], radius: .12 }, shelves[1]);
}

export function ladderShelf(root, spec) {
  const timber = material('finish', '#b08a61'), { height: h } = spec, railX = .40;
  const rails = [-1, 1].map(sign => splayedLeg(root, `continuous-leaning-rail-${sign}`, [sign * railX, .205], [sign * railX, -.205], h, timber, .027));
  // Rear uprights make this a stable standalone rack instead of requiring an
  // invisible wall to keep two forward feet from tipping over.
  const rearHeight = h - .09, rearTop = .205 - .41 * (rearHeight / h);
  const rearSupports = [-1, 1].map(sign => {
    const leg = splayedLeg(root, `grounded-rear-support-${sign}`, [sign * railX, -.205], [sign * railX, rearTop], rearHeight, timber, .023);
    joint(root, leg, rails[sign === -1 ? 0 : 1], [sign * railX, rearHeight - .01, rearTop]);
    return leg;
  });
  const levels = [.37, .85, 1.33];
  const shelves = levels.map((top, i) => {
    const front = .205 - .41 * (top / h), rear = -.215, depth = front - rear + .034;
    const shelf = board(root, `tapered-depth-shelf-${i}`, [.82, .05, depth], [0, top - .025, (front + rear) / 2], timber, .01);
    for (const [index, rail] of rails.entries()) joint(root, shelf, rail, [index === 0 ? -railX : railX, top - .025, .205 - .41 * ((top - .025) / h)]);
    for (const [index, leg] of rearSupports.entries()) joint(root, shelf, leg, [index === 0 ? -railX : railX, top - .025, -.205 + (rearTop + .205) * ((top - .025) / rearHeight)]);
    return shelf;
  });
  const crossbar = beam(root, 'upper-receiving-rail', [-railX, h - .035, -.197], [railX, h - .035, -.197], .022, timber);
  for (const sign of [-1, 1]) joint(root, crossbar, rails[sign === -1 ? 0 : 1], [sign * (railX - .005), h - .035, -.197]);
  const first = folio(root, 'folded-bottom-folio', { x: 0, z: -.02, top: levels[0], width: .44, depth: .22 }, cover(0), shelves[0]);
  folio(root, 'upper-bottom-folio', { x: .01, z: -.02, top: levels[0] + .054, width: .40, depth: .21 }, cover(1), first.top);
  bowl(root, 'ladder-bowl', { x: .05, z: -.08, top: levels[1], radius: .10 }, shelves[1]);
  for (let i = 0; i < 3; i++) book(root, `ladder-book-${i}`, { x: -.20 + i * .13, top: levels[2], z: -.145, height: .23 + i * .025, depth: .12 }, cover(i), shelves[2]);
}
