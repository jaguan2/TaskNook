import { wallShelf } from './display-shelf-models.mjs';
import * as THREE from 'three';
import { beam, bentTube, material } from './geometry.mjs';
import { board, clothRibbon } from './storage-parts.mjs';
import { fitOrganic, leaf, oval, pot } from './organic-parts.mjs';
import { brass, disc, frame, outlineSolid, ring, warmInk } from './object-parts.mjs';
import { candleOn, glowingMaterial, shade, source } from './lighting-parts.mjs';

function picture(root, s, name, w, h, backing) { return frame(root, name, w, h, 0, 0, material(s.colorRole, s.defaultColor), { backing, thickness: .035, depth: .055 }); }
export function lightString(root, name, width, paint, bulbs = 9, winter = false) {
  const pts = [], wire = material('wire', '#716e59');
  for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([(t - .5) * width, .25 - Math.sin(t * Math.PI) * .17, 0]); }
  bentTube(root, `${name}-continuous-cable`, pts, .006, wire);
  for (let i = 0; i < bulbs; i++) { const t = (i + .4) / bulbs, x = (t - .5) * width, y = .25 - Math.sin(t * Math.PI) * .17;
    beam(root, `${name}-socket-${i}`, [x, y + .003, 0], [x, y - .025, 0], .008, wire);
    source(root, oval(root, `${name}-bulb-${i}`, [x, y - .034, 0], [.032, .049, .032], winter ? glowingMaterial('winter-bulb', i % 2 ? '#bda184' : '#e4cca5', .6) : paint)); }
}
const builds = {
  frame(root, s) { picture(root, s, 'picture-frame', 1.24, .82, material('canvas', '#c8c4a8')); disc(root, 'painted-sun', .12, .008, [.28, .60, .018], material('sun', '#c8af7a'), 'xy'); outlineSolid(root, 'painted-hills', [[-.56, .06], [-.56, .29], [-.16, .50], [.14, .24], [.55, .44], [.55, .06]], .008, material('hills', '#839782'), [0, 0, .022]); },
  poster(root, s) { picture(root, s, 'poster', .81, 1.10, material(s.colorRole, s.defaultColor)); disc(root, 'poster-moon', .19, .007, [0, .72, .019], material('poster-cream', '#d9caae'), 'xy'); outlineSolid(root, 'poster-mountains', [[-.35, .12], [-.12, .49], [.04, .31], [.19, .51], [.35, .12]], .008, material('poster-ink', '#65766b'), [0, 0, .023]); },
  wallshelf: wallShelf,
  mirror(root, s) { const radius = s.height / 2; ring(root, 'round-mirror-frame', radius - .018, .018, [0, radius, 0], material(s.colorRole, s.defaultColor)); disc(root, 'round-reflective-panel', radius - .028, .025, [0, radius, 0], material('mirror-glass', '#b1c6be'), 'xy'); },
  wallclock(root, s) {
    const paint = material(s.colorRole, s.defaultColor); disc(root, 'clock-case', .35, .075, [0, .35, 0], paint, 'xy'); disc(root, 'inset-clock-face', .30, .012, [0, .35, .043], material('clock-face', '#dccfb3'), 'xy');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const mark = board(root, `hour-${i}`, [.014, .038, .007], [Math.sin(a) * .257, .35 + Math.cos(a) * .257, .052], warmInk(), .002); mark.rotation.z = -a; }
    beam(root, 'hour-hand', [0, .35, .058], [-.10, .41, .058], .008, warmInk()); beam(root, 'minute-hand', [0, .35, .059], [.07, .54, .059], .006, warmInk());
  },
  menuboard(root, s) { picture(root, s, 'menu-board', 1.63, 1.02, material('chalkboard', '#56645b')); const chalk = material('chalk', '#cdc6ac'); board(root, 'menu-heading', [.58, .045, .006], [0, .82, .02], chalk, .003); for (let i = 0; i < 4; i++) { board(root, `menu-line-${i}`, [.76 - i * .08, .020, .006], [-.20, .64 - i * .12, .02], chalk, .002); disc(root, `price-${i}`, .018, .006, [.57, .64 - i * .12, .021], chalk, 'xy'); } },
  corkboard(root, s) { picture(root, s, 'cork-board', 1.10, .80, material('cork', '#b29972')); for (let i = 0; i < 3; i++) { board(root, `pinned-note-${i}`, [.24, .32, .009], [(i - 1) * .29, .42 + i % 2 * .07, .022], material('paper', i % 2 ? '#c9c6aa' : '#ded1b4'), .003); disc(root, `pin-${i}`, .015, .012, [(i - 1) * .29, .55 + i % 2 * .07, .031], brass(), 'xy'); } },
  pennant(root, s) { const paint = material(s.colorRole, s.defaultColor); outlineSolid(root, 'closed-fabric-pennant', [[-.36, .80], [.36, .80], [.34, .22], [0, 0], [-.34, .22]], .016, paint); beam(root, 'receiving-banner-rod', [-.39, .81, 0], [.39, .81, 0], .018, brass()); ring(root, 'hanging-loop', .12, .008, [0, .91, 0], brass()); outlineSolid(root, 'stitched-emblem', [[0, .64], [.13, .43], [0, .33], [-.13, .43]], .006, material('banner-emblem', '#d4c4a2'), [0, 0, .012]); },
  neon(root, s) { board(root, 'neon-backing', [1.20, .51, .060], [0, .255, -.015], warmInk()); const neon = glowingMaterial(s.colorRole, s.defaultColor, .65, true); source(root, bentTube(root, 'continuous-neon-moon', [[.14, .42, .025], [-.04, .45, .025], [-.19, .30, .025], [-.10, .12, .025], [.10, .10, .025], [.23, .23, .025], [.09, .18, .025], [-.02, .25, .025], [.02, .37, .025], [.14, .42, .025]], .014, neon)); for (const x of [-.41, .41]) source(root, disc(root, `neon-star-${x}`, .035, .024, [x, .31, .025], neon, 'xy')); },
  fairylights(root) { lightString(root, 'fairy', 1.88, glowingMaterial('warm-bulb')); },
  sconce(root, s) {
    const paint = material(s.colorRole, s.defaultColor); disc(root, 'sconce-wall-plate', .105, .025, [0, .19, -.045], paint, 'xy');
    bentTube(root, 'receiving-sconce-arm', [[0, .15, -.04], [0, .09, .045], [0, .14, .07]], .015, paint);
    const cup = disc(root, 'candle-cup', .09, .025, [0, .15, .07], paint); candleOn(root, 'sconce-candle', 0, .07, .16, .47, cup, material('wax', '#d7c7a5'), { radius: .043, flameHeight: .085 });
  },
  pendant(root, s) {
    const paint = material(s.colorRole, s.defaultColor); disc(root, 'ceiling-rose', .085, .035, [0, 1.20, 0], brass()); beam(root, 'suspension-cord', [0, .27, 0], [0, 1.20, 0], .008, warmInk());
    const canopy = shade(root, 'open-pendant-shade', [[.24, 0], [.20, .05], [.10, .22], [.045, .27]], paint, .014, 24); canopy.geometry.scale(1.5, 1, .60);
    source(root, oval(root, 'recessed-pendant-bulb', [0, .14, 0], [.065, .08, .065], glowingMaterial('warm-bulb')));
  },
  curtain(root, s) {
    const paint = material(s.colorRole, s.defaultColor); beam(root, 'curtain-rod', [-.73, 1.43, 0], [.73, 1.43, 0], .020, brass());
    for (const sign of [-1, 1]) { const x = sign * .46; clothRibbon(root, `draped-curtain-${sign}`, [[x, 1.41, 0], [x, .85, .018], [x + sign * .03, .05, .01]], .48, paint, .025); for (let i = 0; i < 4; i++) ring(root, `curtain-ring-${sign}-${i}`, .025, .005, [x - .18 + i * .12, 1.425, 0], brass()); }
  },
  hangplant(root, s) {
    const paint = material(s.colorRole, s.defaultColor), foliage = material('foliage', '#849774'); const soil = pot(root, 'hanging-vessel', 0, 0, .10, .20, .23, paint);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; beam(root, `suspension-rope-${i}`, [Math.cos(a) * .17, .22, Math.sin(a) * .17], [0, 1.05, 0], .007, material('rope', '#bca783')); }
    ring(root, 'mount-hook', .037, .008, [0, 1.08, 0], brass());
    for (let i = 0; i < 6; i++) { const x = Math.cos(i * 2.4) * .12; const end = [x * 1.6, .02 + i % 3 * .05, .06]; bentTube(root, `trailing-stem-${i}`, [[0, soil.y - .014, 0], [x, .36, .04], end], .007, foliage); for (let j = 0; j < 3; j++) leaf(root, `trailing-leaf-${i}-${j}`, [x, .28 - j * .07, .05], [x + (j % 2 ? -.10 : .10), .22 - j * .07, .06], .07, foliage); }
  },
};
export const WALL_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, s) => { build(root, s); fitOrganic(root, s); root.userData.mount = { plane: 'XY', backZ: new THREE.Box3().setFromObject(root).min.z }; }]));
