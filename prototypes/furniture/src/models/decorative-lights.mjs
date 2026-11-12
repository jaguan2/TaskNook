import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { beam, bentTube, joint, material, part, revolved } from './geometry.mjs';
import { bulb, candleOn, glowingMaterial, shell, source, weightedBase } from './lighting-parts.mjs';

function candle(root, spec) {
  const metal = material('candle-dish', '#a58c69'), wax = material('candle-wax', '#d9ccb4');
  const dish = weightedBase(root, 'grounded-candle-dish', .14, metal);
  candleOn(root, 'pillar-candle', 0, 0, .063, spec.height, dish, wax, { radius: .095, flameHeight: .21 });
}

function candelabra(root, spec) {
  const metal = material('candelabra-metal', '#b49a75'), wax = material('candle-wax', '#d9ccb4'), h = spec.height;
  const base = weightedBase(root, 'weighted-candelabra-base', .18, metal);
  const stem = beam(root, 'continuous-candelabra-stem', [0, .06, 0], [0, h - .38, 0], .018, metal);
  joint(root, stem, base, [0, .065, 0]);
  for (const [i, x] of [-.17, 0, .17].entries()) {
    const top = h - (i === 1 ? 0 : .14), bottom = top - .36;
    const arm = bentTube(root, `branched-candle-arm-${i}`, [[0, .32, 0], [x * .65, .40, 0], [x, bottom - .025, 0], [x, bottom + .007, 0]], .014, metal);
    joint(root, arm, stem, [0, .33, 0]);
    const cup = part(root, `receiving-candle-cup-${i}`, new THREE.CylinderGeometry(.055, .035, .035, 20), metal, x, bottom - .005, 0);
    joint(root, cup, arm, [x, bottom - .008, 0]);
    candleOn(root, `branched-candle-${i}`, x, 0, bottom + .008, top, cup, wax);
  }
}

function lightJar(root, spec) {
  const h = spec.height, glass = material('jar-glass', '#b6c5bc');
  glass.transparent = true; glass.opacity = .18; glass.depthWrite = false;
  const jar = revolved(root, 'closed-jar-with-inset-floor', [[.12, 0], [.145, .025], [.145, h - .13], [.125, h - .08], [.123, h - .035], [.108, h - .035], [.108, h - .08], [.13, h - .13], [.13, .025]], glass);
  jar.castShadow = false;
  const lid = part(root, 'fitted-cork-lid', new THREE.CylinderGeometry(.13, .125, .055, 32), material('jar-lid', '#a0805a'), 0, h - .0275, 0);
  joint(root, lid, jar, [.117, h - .04, 0]);
  const points = [[0, .03, 0], [.065, .08, -.04], [-.065, .14, .04], [.065, .20, .04], [-.06, .26, -.04], [.06, .32, 0], [-.045, h - .10, .035], [0, h - .045, 0]];
  const wire = bentTube(root, 'continuous-light-string-wire', points, .0035, material('light-wire', '#9a8665'));
  joint(root, wire, lid, [0, h - .047, .001]);
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  for (let i = 1; i < 8; i++) {
    const at = curve.getPointAt(i / 8), light = source(root, part(root, `enclosed-string-bulb-${i}`, new THREE.SphereGeometry(.013, 12, 8), glowingMaterial('string-bulbs', '#e6c895', .65), ...at.toArray()));
    joint(root, light, wire, at.toArray());
  }
}

function lavaLamp(root, spec) {
  const h = spec.height, metal = material('lava-lamp-metal', '#8b8390');
  const base = revolved(root, 'weighted-rocket-base', [[.13, 0], [.145, .02], [.115, .10], [.104, .18]], metal);
  const glass = material('lava-vessel-glass', '#b6c5bc'); glass.transparent = true; glass.opacity = .19; glass.depthWrite = false;
  const vessel = shell(root, 'closed-waisted-glass-shell', [[.10, .16], [.13, .30], [.115, .46], [.07, h - .11]], glass, .008);
  vessel.castShadow = false;
  joint(root, vessel, base, [.099, .17, 0]);
  const cap = revolved(root, 'tapered-lava-lamp-cap', [[.075, h - .12], [.075, h - .09], [.04, h]], metal);
  joint(root, cap, vessel, [.068, h - .114, 0]);
  const wax = glowingMaterial('lava-wax', '#b98f98', .27, true), blobs = [];
  const pool = source(root, part(root, 'supported-wax-pool', new THREE.SphereGeometry(1, 16, 12), wax, 0, .19, 0));
  pool.scale.set(.08, .035, .08); blobs.push(pool.name);
  joint(root, pool, base, [0, .172, 0]);
  for (const [i, [x, y, r]] of [[-.025, .34, .045], [.022, .51, .032]].entries()) {
    const blob = source(root, part(root, `enclosed-floating-wax-${i}`, new THREE.SphereGeometry(1, 16, 12), wax, x, y, 0));
    blob.scale.set(r, r * 1.35, r); blobs.push(blob.name);
  }
  root.userData.enclosedContents = [{ parts: blobs, vessel: vessel.name, bottom: .16, top: h - .11 }];
}

function moonLamp(root, spec) {
  const h = spec.height, timber = material('moon-cradle', '#927a5d'), radius = .145;
  const base = weightedBase(root, 'weighted-moon-cradle-base', .125, timber);
  let geometry = new THREE.SphereGeometry(radius, 32, 24); const p = geometry.attributes.position, colours = [];
  const craters = [new THREE.Vector3(-.45, .25, .86).normalize(), new THREE.Vector3(.35, -.10, .93).normalize(), new THREE.Vector3(.22, .63, .74).normalize()];
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i), direction = v.clone().normalize();
    const depression = craters.reduce((sum, center, index) => sum + .012 * Math.exp(-((Math.acos(THREE.MathUtils.clamp(direction.dot(center), -1, 1)) / [.30, .24, .18][index]) ** 2)), 0);
    const tone = 1 - craters.reduce((sum, center, index) => {
      const distance = Math.acos(THREE.MathUtils.clamp(direction.dot(center), -1, 1)) / [.30, .24, .18][index];
      return sum + .24 * (1 - THREE.MathUtils.smoothstep(distance, .60, 1.15));
    }, 0);
    colours.push(tone, tone, tone);
    v.multiplyScalar(1 - depression / radius); p.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv');
  geometry = mergeVertices(geometry, 1e-6); geometry.computeVertexNormals();
  const chalk = glowingMaterial('moon-chalk', '#d8d0b7', .18); chalk.vertexColors = true;
  const globe = source(root, part(root, 'single-sculpted-moon-globe', geometry, chalk, 0, h - radius, 0));
  for (let i = 0; i < 3; i++) {
    const angle = i / 3 * Math.PI * 2, x = Math.cos(angle), z = Math.sin(angle);
    const prong = beam(root, `receiving-moon-cradle-${i}`, [x * .09, .04, z * .09], [x * .07, .208, z * .07], .012, timber);
    joint(root, prong, base, [x * .088, .055, z * .088]);
    joint(root, prong, globe, [x * .071, .202, z * .071]);
  }
}

function gardenLantern(root, spec) {
  const h = spec.height, metal = material('lantern-finish', '#776b59'), base = weightedBase(root, 'planted-lantern-base', .18, metal);
  const bottom = h - .57, top = h - .17;
  const pole = beam(root, 'continuous-lantern-post', [0, .05, 0], [0, bottom + .035, 0], .027, metal);
  joint(root, pole, base, [0, .065, 0]);
  const floorGeometry = new THREE.CylinderGeometry(.19, .19, .045, 4); floorGeometry.rotateY(Math.PI / 4);
  const floor = part(root, 'receiving-lantern-floor', floorGeometry, metal, 0, bottom, 0);
  joint(root, floor, pole, [0, bottom - .01, 0]);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const post = beam(root, `lantern-corner-${x}-${z}`, [x * .13, bottom, z * .13], [x * .10, top, z * .10], .012, metal);
    joint(root, post, floor, [x * .129, bottom + .005, z * .129]);
  }
  const glass = material('lantern-glass', '#c6c5ac'); glass.transparent = true; glass.opacity = .20; glass.depthWrite = false;
  const vessel = shell(root, 'four-sided-lantern-glass', [[.183, bottom + .01], [.141, top]], glass, .007, 4); vessel.geometry.rotateY(Math.PI / 4);
  joint(root, vessel, floor, [.127, bottom + .012, 0]);
  const roofGeometry = new THREE.ConeGeometry(.22, .16, 4); roofGeometry.rotateY(Math.PI / 4);
  const roof = part(root, 'pitched-lantern-roof', roofGeometry, metal, 0, top + .065, 0);
  joint(root, roof, root.getObjectByName('lantern-corner-1-1'), [.102, top - .005, .102]);
  const knob = part(root, 'lantern-roof-finial', new THREE.SphereGeometry(.025, 12, 8), metal, 0, h - .025, 0);
  joint(root, knob, roof, [0, h - .045, 0]);
  const light = bulb(root, 'protected-lantern-bulb', 0, bottom + .015, 0, .045);
  joint(root, light.socket, floor, [0, bottom + .02, 0]);
}

export const DECORATIVE_LIGHT_BUILDERS = { candle, candelabra, lightjar: lightJar, lavalamp: lavaLamp, moonlamp: moonLamp, lantern: gardenLantern };
