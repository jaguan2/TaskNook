import * as THREE from 'three';
import { beam, bentTube, joint, material } from './geometry.mjs';
import { board, folio } from './storage-parts.mjs';
import { fitOrganic, oval, pebble } from './organic-parts.mjs';
import { brass, disc, frame, outlineSolid, pedestal, ring, warmInk } from './object-parts.mjs';
import { glowingMaterial, source } from './lighting-parts.mjs';

function finish(s) { return material(s.colorRole, s.defaultColor); }
const builds = {
  piano(root, s) {
    const paint = finish(s), ink = warmInk(), cream = material('ivory', '#e5d9c0'), h = s.surface;
    board(root, 'grounded-piano-plinth', [1.90, .09, .67], [0, .045, -.015], ink);
    const body = board(root, 'piano-cabinet', [1.86, h - .11, .48], [0, .08 + (h - .11) / 2, -.12], paint);
    const top = board(root, 'clear-piano-top', [1.96, .06, .76], [0, h - .03, 0], paint);
    joint(root, body, top, [0, h - .045, -.1]);
    for (const x of [-.95, .95]) board(root, `crown-end-${x}`, [.06, s.height - h + .025, .74], [x, (s.height + h - .025) / 2, 0], paint);
    board(root, 'recessed-upper-panel', [1.60, .58, .024], [0, h - .43, .133], ink);
    board(root, 'projecting-keybed', [1.82, .07, .31], [0, .94, .235], paint);
    for (let i = 0; i < 23; i++) board(root, `ivory-key-${i}`, [.073, .036, .25], [-.85 + i * .077, .988, .245], cream, .003);
    for (let i = 0; i < 22; i++) if (![2, 6].includes(i % 7)) board(root, `black-key-${i}`, [.041, .044, .15], [-.811 + i * .077, 1.017, .19], ink, .003);
    for (const x of [-.12, 0, .12]) board(root, `pedal-${x}`, [.058, .035, .18], [x, .105, .30], brass());
  },
  easel(root, s) {
    const wood = finish(s);
    for (const sign of [-1, 1]) beam(root, `front-leg-${sign}`, [sign * .34, .014, .20], [sign * .06, 1.45, -.12], .028, wood);
    beam(root, 'rear-strut', [0, .014, -.29], [0, 1.28, -.09], .028, wood);
    board(root, 'receiving-canvas-ledge', [.70, .045, .17], [0, .55, .02], wood);
    frame(root, 'canvas-stretcher', .56, .67, .56, -.02, wood, { backing: material('canvas', '#d4c7aa') });
    pebble(root, 'painted-hills', [0, .75, .003], [.42, .20, .010], material('artwork', '#8c9c80'), 1);
    disc(root, 'painted-sun', .07, .012, [.12, 1.09, .002], material('artwork-sun', '#c6ad7e'), 'xy');
  },
  screen(root, s) {
    const wood = finish(s), cloth = material('screen-cloth', '#c8bba0');
    for (let i = 0; i < 3; i++) {
      const panel = new THREE.Group(); panel.name = `hinged-panel-${i}`; root.add(panel);
      panel.position.set((i - 1) * .47, 0, i === 1 ? -.055 : .04); panel.rotation.y = (i - 1) * .25;
      frame(panel, `panel-${i}`, .49, 1.35, 0, 0, wood, { backing: cloth });
      for (let j = 1; j < 4; j++) board(panel, `lattice-${i}-${j}`, [.46, .014, .016], [0, j * .31, .018], wood, .003);
    }
  },
  birdcage(root, s) {
    const metal = finish(s); pedestal(root, 'weighted-stand', .78, .19, metal);
    disc(root, 'cage-floor', .23, .04, [0, .78, 0], metal);
    for (const y of [.81, 1.20]) ring(root, `cage-hoop-${y}`, .22, .012, [0, y, 0], metal, 'xz');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; bentTube(root, `dome-bar-${i}`, [[Math.cos(a) * .22, .79, Math.sin(a) * .22], [Math.cos(a) * .22, 1.18, Math.sin(a) * .22], [0, 1.42, 0]], .006, metal); }
    beam(root, 'supported-perch', [-.21, 1.02, 0], [.21, 1.02, 0], .015, material('perch', '#9a7b55'));
    oval(root, 'little-bird-body', [0, 1.08, 0], [.16, .17, .10], material('bird', '#b6ad7e'));
    oval(root, 'little-bird-head', [.055, 1.17, 0], [.10, .10, .10], material('bird', '#b6ad7e'));
    source(root, oval(root, 'warm-cage-bead', [0, 1.38, 0], [.025, .04, .025], glowingMaterial('warm-bulb')));
  },
  standmirror(root, s) {
    const paint = finish(s);
    for (const sign of [-1, 1]) { board(root, `grounded-foot-${sign}`, [.055, .035, .30], [sign * .20, .0175, 0], paint);
      board(root, `swivel-upright-${sign}`, [.035, 1.17, .04], [sign * .20, .59, 0], paint); }
    frame(root, 'mirror', .37, 1.25, .17, 0, paint, { backing: material('mirror-glass', '#afc2bc') });
  },
  aquarium(root, s) {
    const wood = finish(s), glass = material('aquarium-glass', '#a8c5bd'); glass.transparent = true; glass.opacity = .16; glass.depthWrite = false;
    board(root, 'cabinet-plinth', [1.30, .10, .62], [0, .05, 0], wood);
    board(root, 'aquarium-cabinet', [1.25, .76, .58], [0, .45, 0], wood);
    for (const x of [-.31, .31]) frame(root, `door-${x}`, .59, .67, .11, .301, wood, { x, backing: material('recessed-panels', '#8a755e') });
    board(root, 'tank-base', [1.36, .06, .66], [0, .85, 0], wood);
    board(root, 'contained-water', [1.23, .66, .53], [0, 1.20, 0], sourceMaterial());
    for (const sign of [-1, 1]) { board(root, `front-back-glass-${sign}`, [1.30, .73, .014], [0, 1.22, sign * .30], glass); board(root, `end-glass-${sign}`, [.014, .73, .60], [sign * .65, 1.22, 0], glass); }
    board(root, 'supported-tank-lid', [1.36, .055, .66], [0, 1.60, 0], wood);
    board(root, 'tank-gravel', [1.25, .055, .55], [0, .91, 0], material('gravel', '#b4a481'));
    for (let i = 0; i < 3; i++) { const x = (i - 1) * .30; oval(root, `fish-${i}`, [x, 1.16 + i * .10, .07], [.19, .08, .06], material('fish', '#c8aa7d')); outlineSolid(root, `fish-tail-${i}`, [[-.03, -.04], [.05, 0], [-.03, .04]], .03, material('fish', '#c8aa7d'), [x - .11, 1.16 + i * .10, .07]); }
    source(root, board(root, 'enclosed-tank-light', [1.15, .022, .035], [0, 1.555, .292], glowingMaterial('tank-light', '#abcac3', .3)));
  },
  globe(root, s) {
    const paint = finish(s); pedestal(root, 'globe-pedestal', .16, .14, paint);
    const sphere = oval(root, 'earth', [0, .35, 0], [.34, .34, .34], material('ocean', '#91aaa2'), 20);
    const geometry = sphere.geometry, p = geometry.attributes.position, colors = [];
    const land = new THREE.Color('#b6b18a'), sea = new THREE.Color('#91aaa2');
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), b = p.getY(i) / .17; const c = Math.sin(a * 3 + b * 2) + Math.cos(b * 7 - a) > .50 ? land : sea; colors.push(...c.toArray()); }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); sphere.material.color.set('#ffffff'); sphere.material.vertexColors = true;
    ring(root, 'meridian-ring', .19, .009, [0, .35, 0], paint);
    beam(root, 'tilted-axis', [-.05, .16, 0], [.05, .54, 0], .009, paint);
  },
  chess(root, s) {
    const wood = finish(s), ivory = material('ivory', '#d7c9aa'), dark = warmInk();
    board(root, 'board-backing', [.55, .025, .45], [0, .0125, 0], wood);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) board(root, `square-${i}-${j}`, [.062, .006, .050], [(i - 3.5) * .062, .026, (j - 3.5) * .050], (i + j) % 2 ? dark : ivory, .001);
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) { const x = (i - 2.5) * .067, z = side * .14, paint = side === -1 ? dark : ivory;
      pedestalPiece(root, `piece-${side}-${i}`, [x, .03, z], i === 3 ? .15 : .10, paint); }
  },
  guitar(root, s) {
    const paint = finish(s), ink = warmInk();
    const points = [];
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, y = Math.sin(a), w = .21 * (1 - .34 * Math.exp(-y * y * 10)); points.push([Math.cos(a) * w, .30 + y * .26]); }
    outlineSolid(root, 'waisted-guitar-body', points, .095, paint);
    board(root, 'joined-neck', [.055, .55, .055], [0, .825, -.006], material('neck', '#8e6d50'));
    board(root, 'headstock', [.09, .18, .055], [0, 1.17, -.006], paint);
    disc(root, 'sound-hole', .070, .006, [0, .44, .049], ink, 'xy');
    board(root, 'bridge', [.12, .024, .025], [0, .24, .05], ink, .003);
    for (let i = 0; i < 4; i++) beam(root, `string-${i}`, [(i - 1.5) * .009, .24, .065], [(i - 1.5) * .009, 1.17, .028], .0015, brass());
    for (let i = 0; i < 5; i++) board(root, `fret-${i}`, [.054, .005, .008], [0, .72 + i * .085, .024], brass(), .001);
  },
  bookstack(root, s) {
    let top = .012; const paints = ['#9b806c', '#8a9b8b', '#b2a084'];
    let support = board(root, 'bottom-cover', [.43, .012, .32], [0, .006, 0], finish(s));
    for (let i = 0; i < 3; i++) { const volume = folio(root, `stacked-book-${i}`, { x: i % 2 * .018, z: 0, top, width: .43 - i * .025, depth: .32, height: .075 }, material('book-cloth', paints[i]), support); support = volume.top; top += .072; }
  },
  openjournal(root, s) {
    const paint = finish(s), paper = material('paper', '#dfd2b7');
    board(root, 'open-book-cover', [.80, .018, .52], [0, .009, 0], paint);
    for (const sign of [-1, 1]) { const page = board(root, `open-page-block-${sign}`, [.37, .045, .48], [sign * .19, .039, 0], paper, .008); page.rotation.z = sign * .04;
      for (let i = 0; i < 5; i++) board(root, `written-line-${sign}-${i}`, [.25, .002, .005], [sign * .19, .066, -.15 + i * .065], material('writing', '#b0a58c'), .0005); }
    board(root, 'bound-gutter', [.024, .055, .50], [0, .035, 0], paint, .007);
    board(root, 'ribbon-bookmark', [.023, .006, .34], [.08, .067, .12], material('bookmark', '#b3887e'), .002);
  },
  foldedblanket(root, s) {
    const cloth = finish(s);
    for (let i = 0; i < 3; i++) board(root, `folded-cloth-layer-${i}`, [.77 - i * .025, .055, .55], [i * .012, .0275 + i * .05, 0], cloth, .025);
    for (const x of [-.28, .28]) board(root, `woven-band-${x}`, [.035, .006, .51], [x, .156, 0], material('blanket-trim', '#d1c2a4'), .002);
  },
  till(root, s) {
    const paint = finish(s), ink = warmInk(); board(root, 'cash-drawer', [.43, .09, .34], [0, .045, 0], paint);
    board(root, 'register-body', [.36, .18, .27], [0, .17, -.015], paint);
    board(root, 'display-housing', [.28, .16, .055], [0, .32, -.08], ink);
    board(root, 'readout', [.23, .09, .008], [0, .33, -.049], material('readout', '#b5c4aa'), .003);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) board(root, `key-${i}-${j}`, [.055, .017, .037], [(i - 1) * .07, .264, .02 + j * .045], material('keys', '#d9cfb7'), .003);
  },
};
function sourceMaterial() { const paint = material('water', '#83aaa2'); paint.transparent = true; paint.opacity = .28; paint.depthWrite = false; return paint; }
function pedestalPiece(root, name, at, height, paint) { disc(root, `${name}-base`, .021, .012, [at[0], at[1] + .006, at[2]], paint); beam(root, `${name}-stem`, [at[0], at[1], at[2]], [at[0], at[1] + height - .025, at[2]], .010, paint); oval(root, `${name}-crown`, [at[0], at[1] + height - .02, at[2]], [.036, .04, .036], paint); }
export const DECORATION_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, spec) => { build(root, spec); if (key !== 'piano') fitOrganic(root, spec); }]));
