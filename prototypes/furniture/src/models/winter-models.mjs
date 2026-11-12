import * as THREE from 'three';
import { beam, bentTube, material, part, revolved } from './geometry.mjs';
import { board, clothRibbon } from './storage-parts.mjs';
import { fitOrganic, oval } from './organic-parts.mjs';
import { brass, disc, outlineSolid, ring, warmInk } from './object-parts.mjs';
import { candleOn, glowingMaterial, source } from './lighting-parts.mjs';
import { ellipse, inlay, rectangle, slab } from './ground-shapes.mjs';
import { garland, pineTree, wickerBasket } from './outdoor-parts.mjs';
import { lightString } from './wall-models.mjs';
import { cupVessel } from './kitchen-models.mjs';

const snow = () => material('snow', '#d7d8c9');
function finish(s) { return material(s.colorRole, s.defaultColor); }
const builds = {
  snowpine(root, s) { pineTree(root, 'snow-pine', finish(s), true); },
  snowman(root, s) {
    const paint = finish(s); oval(root, 'grounded-snow-body', [0, .23, 0], [.46, .46, .44], paint, 20); oval(root, 'snowman-chest', [0, .51, 0], [.34, .34, .32], paint, 20); oval(root, 'snowman-head', [0, .76, 0], [.26, .27, .25], paint, 20);
    for (const sign of [-1, 1]) { bentTube(root, `twig-arm-${sign}`, [[sign * .12, .52, 0], [sign * .32, .57, 0], [sign * .38, .69, 0]], .012, material('twigs', '#8e785c')); oval(root, `coal-eye-${sign}`, [sign * .045, .80, .118], [.022, .026, .016], warmInk()); }
    beam(root, 'carrot-nose', [0, .75, .11], [0, .73, .23], .022, material('carrot', '#b89a6a'));
    for (const y of [.41, .52]) oval(root, `coat-button-${y}`, [0, y, .15], [.024, .024, .016], warmInk());
    ring(root, 'scarf-collar', .13, .025, [0, .65, 0], material('scarf', '#a29091'), 'xz'); board(root, 'scarf-tail', [.07, .23, .025], [.09, .52, .15], material('scarf', '#a29091'), .015);
    disc(root, 'hat-brim', .19, .025, [0, .89, 0], warmInk()); disc(root, 'hat-crown', .125, .18, [0, .98, 0], warmInk());
  },
  snowdrift(root, s) { oval(root, 'continuous-snow-drift', [0, .07, 0], [1.10, .14, .78], finish(s), 24); },
  snowballs(root, s) { const paint = finish(s); const a = oval(root, 'snowball-left', [-.15, .15, 0], [.30, .30, .30], paint, 16); const b = oval(root, 'snowball-right', [.13, .14, 0], [.28, .28, .28], paint, 16); oval(root, 'snowball-top', [0, .34, 0], [.25, .25, .25], paint, 16); root.userData.groundedParts = [a.name, b.name]; },
  christmastree(root, s) {
    pineTree(root, 'holiday-pine', finish(s));
    for (let row = 0; row < 3; row++) { const y = .45 + row * .5, r = [.408, .324, .215][row]; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + row * .4; source(root, oval(root, `tree-light-${row}-${i}`, [Math.cos(a) * r, y, Math.sin(a) * r], [.045, .045, .045], glowingMaterial('tree-bulb', '#d5bd8b', .55))); } }
    const star = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .055 : .12; star.push([Math.cos(a) * r, 2.08 + Math.sin(a) * r]); } outlineSolid(root, 'fitted-tree-star', star, .025, brass());
  },
  snowangel(root, s) {
    const outline = [[-.10, -.30], [-.28, -.22], [-.85, -.40], [-1, -.10], [-.93, .12], [-.30, .18], [-.40, .50], [-.23, .65], [0, .36], [.23, .65], [.40, .50], [.30, .18], [.93, .12], [1, -.10], [.85, -.40], [.28, -.22], [.10, -.30]];
    for (let i = 0; i <= 20; i++) { const a = Math.PI / 4 - i / 20 * Math.PI * 1.5; outline.push([Math.cos(a) * .14, -.42 + Math.sin(a) * .14]); }
    const base = slab(root, 'angel-snow-bed', ellipse(2.30, 1.50, 48), 0, .024, finish(s)); inlay(root, 'pressed-angel-impression', outline, .025, material('pressed-snow', '#b6c2b9'), base);
  },
  logstack(root, s) {
    const bark = finish(s), end = material('cut-wood', '#bda47b'), radius = s.seat / 4;
    for (const [i, x, y] of [[0, -radius, radius], [1, radius, radius], [2, 0, radius * 3]]) {
      const log = part(root, `stacked-log-${i}`, new THREE.CylinderGeometry(radius, radius, .54, 16), bark, x, y, 0); log.rotation.x = Math.PI / 2;
      for (const z of [-.269, .269]) disc(root, `cut-end-${i}-${z}`, radius * .87, .009, [x, y, z], end, 'xy');
    }
  },
  icelantern(root, s) {
    const glass = finish(s); glass.transparent = true; glass.opacity = .35; glass.depthWrite = false;
    const body = cupVessel(root, 'hollow-ice-shell', .16, .29, glass); body.userData.noCastShadow = true;
    const base = disc(root, 'ice-floor', .12, .025, [0, .024, 0], material('ice-base', '#bccdc7'));
    candleOn(root, 'ice-candle', 0, 0, .035, .26, base, material('wax', '#d9ccaa'), { radius: .045, flameHeight: .08 });
  },
  chimney(root, s) {
    const paint = finish(s), mortar = material('mortar', '#b3a18a'); board(root, 'chimney-masonry', [.72, 2.40, .56], [0, 1.20, 0], paint, .012);
    for (let i = 0; i < 10; i++) { const y = .12 + i * .22; board(root, `front-mortar-${i}`, [.70, .014, .006], [0, y, .282], mortar, .002); for (const sign of [-1, 1]) board(root, `side-mortar-${i}-${sign}`, [.006, .014, .54], [sign * .362, y, 0], mortar, .002); }
    for (const sign of [-1, 1]) { board(root, `flue-side-${sign}`, [.065, .32, .59], [sign * .325, 2.48, 0], paint); board(root, `flue-front-back-${sign}`, [.72, .32, .065], [0, 2.48, sign * .265], paint); }
    slab(root, 'open-flue-cap', rectangle(.90, .69, .02), 2.61, 2.69, snow(), { holes: [rectangle(.48, .36, .025)] });
    board(root, 'recessed-flue-darkness', [.54, .012, .40], [0, 2.398, 0], warmInk());
  },
  christmaslights(root) { lightString(root, 'christmas', 1.30, glowingMaterial('winter-bulb'), 9, true); },
  icicles(root, s) { const paint = finish(s); board(root, 'continuous-ice-ridge', [.93, .045, .08], [0, .38, 0], paint); for (let i = 0; i < 9; i++) { const h = .14 + i % 3 * .07; const ice = part(root, `hanging-icicle-${i}`, new THREE.ConeGeometry(.024 + i % 2 * .006, h, 6), paint, (i - 4) * .102, .39 - h / 2, 0); ice.rotation.z = Math.PI; } },
  sled(root, s) {
    const paint = finish(s), metal = material('runner-metal', '#817967');
    for (const sign of [-1, 1]) { bentTube(root, `continuous-runner-${sign}`, [[-.56, .08, sign * .23], [.50, .08, sign * .23], [.64, .18, sign * .23], [.58, .26, sign * .23]], .019, metal); for (const x of [-.38, .30]) beam(root, `runner-support-${sign}-${x}`, [x, .08, sign * .23], [x, .30, sign * .23], .022, paint); }
    for (const x of [-.38, .30]) beam(root, `seat-crossbar-${x}`, [x, .29, -.25], [x, .29, .25], .024, paint);
    for (let i = 0; i < 5; i++) board(root, `sled-slat-${i}`, [1.02, .045, .082], [-.02, .32, (i - 2) * .092], paint, .009);
    bentTube(root, 'pull-rope', [[.56, .22, -.22], [.68, .15, 0], [.56, .22, .22]], .006, material('rope', '#b8a281'));
  },
  giftstack(root, s) {
    const paint = finish(s); for (const [i, x, y, w, h, d] of [[0, 0, 0, .62, .22, .48], [1, -.08, .215, .38, .22, .34], [2, .04, .43, .25, .17, .25]]) { board(root, `wrapped-gift-${i}`, [w, h, d], [x, y + h / 2, 0], paint, .012); board(root, `gift-ribbon-top-${i}`, [.035, .008, d], [x, y + h - .002, 0], material('ribbon', '#cabc9b'), .002); for (const z of [-1, 1]) board(root, `gift-ribbon-side-${i}-${z}`, [.035, h, .008], [x, y + h / 2, z * (d / 2 - .002)], material('ribbon', '#cabc9b'), .002); }
    for (const sign of [-1, 1]) { const bow = ring(root, `bow-loop-${sign}`, .045, .009, [.04 + sign * .035, .62, 0], material('ribbon', '#cabc9b')); bow.scale.y = .60; }
  },
  snowglobe(root, s) {
    const paint = finish(s); disc(root, 'snowglobe-base', .15, .055, [0, .0275, 0], paint); disc(root, 'contained-snow-floor', .126, .025, [0, .065, 0], snow());
    const glass = material('globe-glass', '#c1d0c9'); glass.transparent = true; glass.opacity = .15; glass.depthWrite = false; const dome = oval(root, 'closed-globe', [0, .19, 0], [.30, .30, .30], glass, 24); dome.userData.noCastShadow = true;
    revolved(root, 'miniature-pine', [[.065, .077], [.055, .12], [.040, .18], [.004, .28]], material('miniature-green', '#8f9c7e'));
    for (let i = 0; i < 5; i++) oval(root, `contained-snowflake-${i}`, [Math.cos(i * 2.4) * .07, .15 + i * .018, Math.sin(i * 2.4) * .07], [.012, .012, .012], snow());
  },
  evergreengarland(root, s) { garland(root, 'evergreen', 1.30, finish(s), true); },
  stocking(root, s) { outlineSolid(root, 'closed-stocking-cloth', [[-.15, .62], [.15, .62], [.13, .20], [.31, .13], [.34, .02], [.27, -.04], [-.10, -.04], [-.17, .06]], .045, finish(s)); board(root, 'folded-stocking-cuff', [.34, .12, .065], [0, .60, .004], material('cuff', '#d2c9af'), .022); ring(root, 'stocking-hanging-loop', .055, .009, [-.11, .70, 0], finish(s)); },
  blanketbasket(root, s) { wickerBasket(root, 'blanket', .27, .33, material('wicker', '#af9975')); clothRibbon(root, 'one-draped-blanket', [[0, .10, -.08], [0, .31, .04], [0, .35, .25], [0, .08, .29]], .35, finish(s), .014); },
};
export const WINTER_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, s) => { build(root, s); if (key !== 'logstack') fitOrganic(root, s); }]));
