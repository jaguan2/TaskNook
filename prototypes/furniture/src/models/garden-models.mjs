import * as THREE from 'three';
import { beam, bentTube, cushionGeometry, material, part, revolved, splayedLeg } from './geometry.mjs';
import { board } from './storage-parts.mjs';
import { fitOrganic, leaf, oval, pot } from './organic-parts.mjs';
import { disc, outlineSolid, pedestal, warmInk } from './object-parts.mjs';
import { bowlVessel, cupVessel } from './kitchen-models.mjs';
import { ellipse, profiledSolid, rectangle, scaleOutline, slab } from './ground-shapes.mjs';
import { broadTree, canopy, crate, pineTree } from './outdoor-parts.mjs';

function finish(s) { return material(s.colorRole, s.defaultColor); }
function pool(root, s) {
  const w = s.width - .015, d = s.depth - .015, h = s.height, rim = .12;
  const outer = rectangle(w, d, .20), inner = rectangle(w - rim * 2, d - rim * 2, .16);
  slab(root, 'grounded-pool-floor', outer, 0, .045, material('basin', '#9fafaa'));
  slab(root, 'closed-pool-walls-and-coping', outer, .03, h, material('coping', '#c3bba3'), { holes: [inner] });
  const water = finish(s); water.transparent = true; water.opacity = .65; water.depthWrite = false;
  const liquid = slab(root, 'contained-pool-water', scaleOutline(inner, 1.004), .044, h * .72, water); liquid.userData.noCastShadow = true;
  for (let i = 0; i < 2; i++) board(root, `submerged-entry-step-${i}`, [.25 + i * .25, h * (.50 - i * .17), d * .50], [-w / 2 + rim + (.25 + i * .25) / 2, h * (.50 - i * .17) / 2 + .04, 0], material('steps', '#b8bbaa'));
}
const builds = {
  blossomtree(root, s) { broadTree(root, 'blossom-tree', finish(s), { blossom: true }); },
  tulips(root, s) {
    const soil = pot(root, 'tulip-planter', 0, 0, 0, .19, .14, material('pot', '#ad9274')), green = material('foliage', '#8d9a72');
    for (let i = 0; i < 5; i++) { const a = i * 2.4, x = Math.cos(a) * .11, z = Math.sin(a) * .11, h = .37 + i % 3 * .06; beam(root, `tulip-stem-${i}`, [x, soil.y - .012, z], [x, h, z], .008, green); leaf(root, `tulip-leaf-${i}`, [x, .17, z], [x + .09, .35, z + .02], .055, green);
      for (let j = 0; j < 3; j++) { const b = j / 3 * Math.PI * 2; oval(root, `tulip-petal-${i}-${j}`, [x + Math.cos(b) * .022, h + .035, z + Math.sin(b) * .022], [.059, .11, .059], finish(s)); }
    }
  },
  wateringcan(root, s) {
    const paint = finish(s); cupVessel(root, 'open-watering-vessel', .13, .23, paint); bentTube(root, 'receiving-loop-handle', [[.10, .19, 0], [.22, .22, 0], [.25, .12, 0], [.11, .07, 0]], .014, paint);
    const direction = new THREE.Vector3(-.19, .16, 0), mesh = part(root, 'tapered-watering-spout', new THREE.CylinderGeometry(.021, .043, direction.length(), 16), paint, -.17, .16, 0); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    const rose = disc(root, 'watering-rose', .052, .018, [-.265, .24, 0], material('rose-metal', '#b1b6a2')); rose.quaternion.copy(mesh.quaternion);
    for (let i = 0; i < 5; i++) oval(root, `rose-hole-${i}`, [-.273, .246 + (i % 3 - 1) * .014, (Math.floor(i / 3) - .5) * .025], [.007, .007, .007], warmInk());
  },
  birdbath(root, s) {
    const paint = finish(s); pedestal(root, 'birdbath-pedestal', .48, .22, paint); bowlVessel(root, 'open-birdbath-bowl', .34, .13, paint, [0, .46, 0]);
    disc(root, 'recessed-birdbath-water', .28, .012, [0, .555, 0], material('water', '#95b2ab'));
  },
  seedtray(root, s) {
    const paint = finish(s); crate(root, 'seed-tray', .61, .42, .12, paint); board(root, 'contained-seed-soil', [.56, .055, .37], [0, .065, 0], material('soil', '#76654b'));
    const green = material('seedlings', '#8c9c72'); for (let i = 0; i < 6; i++) { const x = (i % 3 - 1) * .16, z = (Math.floor(i / 3) - .5) * .15; beam(root, `sprout-stem-${i}`, [x, .085, z], [x, .18, z], .006, green); for (const sign of [-1, 1]) leaf(root, `sprout-leaf-${i}-${sign}`, [x, .15, z], [x + sign * .055, .20, z], .036, green); }
  },
  bunting(root, s) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.65, .30, 0), new THREE.Vector3(0, .17, 0), new THREE.Vector3(.65, .30, 0)]); bentTube(root, 'continuous-bunting-cord', [[-.65, .30, 0], [0, .17, 0], [.65, .30, 0]], .007, material('cord', '#9b8d70'));
    for (let i = 0; i < 7; i++) { const p = curve.getPointAt((i + .5) / 7); outlineSolid(root, `bound-flag-${i}`, [[p.x - .067, p.y + .002], [p.x + .067, p.y + .002], [p.x, p.y - .17]], .012, i % 2 ? material('alternate-flag', '#b5ad8e') : finish(s)); }
  },
  pool(root, s) { pool(root, s); },
  longpool(root, s) { pool(root, s); },
  coconutpalm(root, s) {
    const bark = material('palm-trunk', '#a38d64'), foliage = finish(s); bentTube(root, 'curved-rooted-palm-trunk', [[0, .04, 0], [-.09, .80, 0], [.06, 1.70, 0], [.16, 2.10, 0]], .065, bark);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, end = [.16 + Math.cos(a) * .62, 1.98 + Math.sin(i) * .10, Math.sin(a) * .62]; leaf(root, `split-palm-frond-${i}`, [.15, 2.08, 0], end, .21, foliage, { split: true }); }
    for (let i = 0; i < 3; i++) oval(root, `coconut-${i}`, [.14 + Math.cos(i * 2.1) * .075, 2.0, Math.sin(i * 2.1) * .075], [.13, .15, .13], material('coconut', '#9a8561'));
  },
  poolumbrella(root, s) {
    const paint = finish(s), pole = material('umbrella-frame', '#a28a62'); pedestal(root, 'umbrella-weighted-base', .09, .20, pole); beam(root, 'continuous-umbrella-pole', [0, .06, 0], [0, 2.04, 0], .025, pole);
    revolved(root, 'continuous-umbrella-canopy', [[.69, 1.70], [.69, 1.72], [.04, 2.06]], paint);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; beam(root, `receiving-canopy-rib-${i}`, [0, 1.99, 0], [Math.cos(a) * .67, 1.71, Math.sin(a) * .67], .006, pole); }
  },
  beachball(root, s) {
    const diameter = Math.min(s.height, s.width - .015, s.depth - .015);
    const ball = oval(root, 'closed-beach-ball', [0, diameter / 2, 0], [diameter, diameter, diameter], material(s.colorRole, '#ffffff'), 24), p = ball.geometry.attributes.position, colors = [], palette = ['#c2b18b', '#a6b8ac', '#bb9d9c', '#d7cdb3'].map(c => new THREE.Color(c));
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)) + Math.PI, c = palette[Math.floor(a / (Math.PI * 2) * 8) % 4]; colors.push(...c.toArray()); } ball.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); ball.material.vertexColors = true;
  },
  sunlounger(root, s) {
    const paint = finish(s), timber = material('lounger-frame', '#ab9069'), h = s.seat;
    for (const z of [-.32, .32]) { splayedLeg(root, `lounger-rear-leg-${z}`, [-.61, z], [-.10, z], h - .015, timber, .025); splayedLeg(root, `lounger-front-leg-${z}`, [.65, z], [.59, z], h - .015, timber, .025); }
    for (const z of [-.34, .34]) { beam(root, `lounger-seat-rail-${z}`, [-.15, h - .04, z], [.73, h - .04, z], .027, timber); beam(root, `lounger-back-rail-${z}`, [-.15, h - .04, z], [-.73, s.height - .035, z], .025, timber); }
    board(root, 'clear-lounger-seat', [.88, .055, .72], [.29, h - .0275, 0], paint, .018);
    const from = new THREE.Vector3(-.15, h - .01, 0), to = new THREE.Vector3(-.73, s.height - .035, 0), length = to.distanceTo(from);
    const back = board(root, 'reclined-lounger-back', [.72, length, .055], from.clone().add(to).multiplyScalar(.5).toArray(), paint, .018); back.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize()); back.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    // The upper edge is finished by a horizontal receiving head rail.
    beam(root, 'lounger-head-rail', [-.73, s.height - .025, -.36], [-.73, s.height - .025, .36], .025, timber);
    root.userData.lieAxis = '+X';
  },
  tree(root, s) { broadTree(root, 'oak', finish(s)); },
  pine(root, s) { pineTree(root, 'pine', finish(s)); },
  birch(root, s) { broadTree(root, 'birch', finish(s), { birch: true }); },
  bush(root, s) { canopy(root, 'continuous-bush', [0, .30, 0], [.91, .60, .87], finish(s)); },
  hedge(root, s) { part(root, 'continuous-hedge', cushionGeometry([1.53, .71, .54], { horizontal: .38, vertical: .42, longitude: 32 }), finish(s), 0, .355, 0); },
  rock(root, s) { profiledSolid(root, 'single-flat-based-rock', ellipse(.80, .70, 12, a => 1 + .07 * Math.cos(a * 5)), [[.71, 0], [1, .12], [.83, .36], [.30, .49]], finish(s)); },
};
export const GARDEN_BUILDERS = Object.fromEntries(Object.entries(builds).map(([key, build]) => [key, (root, s) => { build(root, s); if (!['pool', 'longpool', 'sunlounger'].includes(key)) fitOrganic(root, s); }]));
