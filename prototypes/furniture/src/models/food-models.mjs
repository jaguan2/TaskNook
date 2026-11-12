import { beam, bentTube, material } from './geometry.mjs';
import { board } from './storage-parts.mjs';
import { fitOrganic, leaf, oval } from './organic-parts.mjs';
import { disc, ring, warmInk } from './object-parts.mjs';
import { bowlVessel, cupVessel, teaVessel } from './kitchen-models.mjs';

const builds = {
  teapot(root, s) { teaVessel(root, s); },
  mug(root, s) {
    const paint = material(s.colorRole, s.defaultColor); cupVessel(root, 'hollow-mug', .095, .24, paint);
    ring(root, 'joined-loop-handle', .061, .015, [.125, .145, 0], paint);
    disc(root, 'contained-tea', .079, .009, [0, .206, 0], material('tea', '#806b4e'));
  },
  fruitbowl(root, s) {
    bowlVessel(root, 'fruit-bowl', .17, .105, material(s.colorRole, s.defaultColor));
    for (let i = 0; i < 4; i++) { const a = i * 2.4, x = Math.cos(a) * .065, z = Math.sin(a) * .065; oval(root, `fruit-${i}`, [x, .108 + (i % 2) * .018, z], [.11, .11, .11], material('fruit', i % 2 ? '#b6ac70' : '#ad8270')); beam(root, `fruit-stem-${i}`, [x, .15, z], [x + .006, .17, z], .005, warmInk()); }
  },
  bread(root, s) {
    const paint = material(s.colorRole, s.defaultColor); oval(root, 'grounded-loaf', [0, .075, 0], [.35, .15, .23], paint, 20);
    for (let i = 0; i < 3; i++) { const x = (i - 1) * .085; bentTube(root, `baked-score-${i}`, [[x - .015, .118, -.072], [x, .149, 0], [x + .015, .118, .072]], .006, material('bread-scores', '#dbc29a')); }
  },
  cake(root, s) {
    disc(root, 'cake-board', .175, .012, [0, .006, 0], material('cake-board', '#b5a382'));
    disc(root, 'sponge-cake', .155, .17, [0, .093, 0], material('sponge', '#bba17d'));
    disc(root, 'frosting-top', .158, .024, [0, .184, 0], material(s.colorRole, s.defaultColor));
    ring(root, 'piped-frosting-rim', .14, .013, [0, .198, 0], material(s.colorRole, s.defaultColor), 'xz');
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; oval(root, `berry-${i}`, [Math.cos(a) * .104, .217, Math.sin(a) * .104], [.040, .045, .040], material('berries', '#ae7e79')); }
  },
  pie(root, s) {
    const paint = material(s.colorRole, s.defaultColor); bowlVessel(root, 'pie-dish', .17, .055, material('ceramic', '#a9b3a1'));
    disc(root, 'contained-pie-filling', .145, .038, [0, .05, 0], material('pie-filling', '#a68b6b'));
    for (const offset of [-.075, 0, .075]) { const length = Math.sqrt(.14 ** 2 - offset ** 2) * 2; board(root, `lattice-x-${offset}`, [length, .012, .025], [0, .074, offset], paint, .003); board(root, `lattice-z-${offset}`, [.025, .012, length], [offset, .081, 0], paint, .003); }
    ring(root, 'crimped-crust', .145, .016, [0, .073, 0], paint, 'xz');
  },
  ramen(root, s) {
    bowlVessel(root, 'ramen-bowl', .15, .11, material(s.colorRole, s.defaultColor)); disc(root, 'contained-broth', .126, .016, [0, .083, 0], material('broth', '#b2a074'));
    for (let i = 0; i < 4; i++) bentTube(root, `noodle-${i}`, [[-.08, .097, -.05 + i * .03], [0, .101, -.07 + i * .03], [.075, .097, -.04 + i * .03]], .006, material('noodles', '#d0c39a'));
    const egg = oval(root, 'egg-white', [.04, .102, .04], [.105, .025, .073], material('egg-white', '#ded3b6')); disc(root, 'egg-yolk', .023, .013, [.04, .117, .04], material('egg-yolk', '#c8ad70'));
    leaf(root, 'greens', [-.055, .09, .03], [-.10, .15, .07], .05, material('greens', '#8d9b70'));
    for (const z of [-.025, .025]) beam(root, `chopstick-${z}`, [-.17, .12, z], [.16, .14, z + .035], .005, material('chopstick', '#b49c70')); void egg;
  },
};
export const FOOD_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, s) => { build(root, s); fitOrganic(root, s); }]));
