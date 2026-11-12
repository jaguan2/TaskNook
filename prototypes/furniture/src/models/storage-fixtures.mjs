import * as THREE from 'three';
import { beam, bentTube, cushionGeometry, joint, material, part, revolved } from './geometry.mjs';
import { board, book, clothRibbon, folio, stored } from './storage-parts.mjs';
import { PIXELS_PER_UNIT } from '../catalog.mjs';

export function bookTrolley(root, spec) {
  const frame = material('finish', '#8baba0'), timber = material('tray-timber', '#b79872'), rubber = material('rubber', '#484249');
  const { surface, height: h } = spec, lowerTop = 9.5 / PIXELS_PER_UNIT;
  const lower = board(root, 'supported-lower-tray', [1.24, .05, .63], [0, lowerTop - .025, 0], timber, .015);
  const upper = board(root, 'clear-upper-tray', [1.27, .055, .66], [0, surface - .0275, 0], timber, .015);
  const posts = [];
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const px = x * .56, pz = z * .255;
    const wheel = part(root, `cart-caster-${x}-${z}`, new THREE.CylinderGeometry(.045, .045, .045, 16), rubber, px, .045, pz);
    wheel.rotation.x = Math.PI / 2;
    const post = beam(root, `continuous-cart-post-${x}-${z}`, [px, .065, pz], [px, surface + .065, pz], .022, frame); posts.push(post);
    joint(root, post, wheel, [px, .078, pz]);
    joint(root, post, lower, [px, lowerTop - .02, pz]);
    joint(root, post, upper, [px, surface - .02, pz]);
  }
  for (const y of [lowerTop, surface]) for (const z of [-1, 1]) {
    const lip = board(root, `receiving-tray-lip-${y}-${z}`, [1.23, .055, .027], [0, y + .0125, z * .295], frame, .009);
    joint(root, lip, y === surface ? upper : lower, [0, y - .004, z * .295]);
  }
  const handle = bentTube(root, 'continuous-cart-push-handle', [[.56, surface + .04, -.255], [.56, h - .065, -.255], [.56, h - .022, -.19], [.56, h - .022, .19], [.56, h - .065, .255], [.56, surface + .04, .255]], .022, frame);
  handle.geometry.computeBoundingBox();
  const p = handle.geometry.attributes.position, pivot = surface + .04, maximum = handle.geometry.boundingBox.max.y;
  for (let i = 0; i < p.count; i++) p.setY(i, pivot + (p.getY(i) - pivot) * (h - pivot) / (maximum - pivot));
  handle.geometry.computeVertexNormals();
  handle.geometry.computeBoundingBox(); handle.geometry.computeBoundingSphere();
  for (const z of [-1, 1]) joint(root, handle, posts.find(post => post.position.x > 0 && Math.sign(post.position.z) === z), [.56, surface + .046, z * .255]);
  const colors = ['#83937e', '#aa8575', '#7d8b9b', '#aa9776'];
  for (let i = 0; i < 4; i++) book(root, `cart-book-${i}`, { x: -.43 + i * .135, top: lowerTop, height: .40 + (i % 3) * .055, depth: .35 }, material(`book-cover-${i}`, colors[i]), lower);
  folio(root, 'cart-horizontal-folio', { x: .38, top: lowerTop, width: .30, depth: .35 }, material('folio-cover', '#a48673'), lower);
}

export function coatRack(root, spec) {
  const timber = material('finish', '#946b50'), cloth = material('hanging-coat', '#839184'), linen = material('scarf', '#bd9988'), h = spec.height;
  const base = revolved(root, 'grounded-turned-base', [[.17, 0], [.215, .018], [.215, .045], [.15, .08], [.065, .10]], timber);
  const post = beam(root, 'continuous-rack-post', [0, .065, 0], [0, h - .04, 0], .028, timber);
  joint(root, base, post, [0, .085, 0]);
  const knob = part(root, 'rounded-crown', new THREE.SphereGeometry(.04, 16, 12), timber, 0, h - .04, 0);
  joint(root, post, knob, [0, h - .055, 0]);
  for (const sign of [-1, 1]) {
    const hook = bentTube(root, `receiving-coat-hook-${sign}`, [[0, h - .19, 0], [sign * .10, h - .15, .015], [sign * .16, h - .10, .018], [sign * .16, h - .08, .018]], .017, timber);
    joint(root, hook, post, [sign * .009, h - .186, 0]);
  }
  const outline = new THREE.Shape();
  const points = [[-.045, 0], [-.14, -.055], [-.19, -.31], [-.12, -.33], [-.105, -.19], [-.10, -.72], [.10, -.72], [.105, -.19], [.12, -.33], [.19, -.31], [.14, -.055], [.045, 0], [0, -.055]];
  outline.moveTo(...points[0]); for (const point of points.slice(1)) outline.lineTo(...point); outline.closePath();
  const coat = part(root, 'single-hanging-coat', new THREE.ExtrudeGeometry(outline, { depth: .038, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2, steps: 1 }), cloth, 0, h - .145, .035);
  const hanger = beam(root, 'coat-hanger-shoulder-rail', [-.11, h - .195, .035], [.11, h - .195, .035], .015, timber);
  joint(root, hanger, post, [0, h - .195, .023]);
  joint(root, hanger, coat, [-.065, h - .195, .043]);
  const seam = board(root, 'coat-front-opening', [.012, .52, .009], [0, h - .56, .075], material('coat-seam', '#69776c'), .003);
  joint(root, seam, coat, [0, h - .56, .072]);
  const scarf = clothRibbon(root, 'single-draped-scarf', [[.16, h - .12, .018], [.16, h - .11, -.026], [.16, h - .20, -.055], [.16, h - .49, -.06], [.16, h - .65, -.04]], .065, linen);
  joint(root, scarf, root.getObjectByName('receiving-coat-hook-1'), [.16, h - .119, .014]);
}

export function pastryCase(root, spec) {
  const timber = material('finish', '#b08a61'), metal = material('case-frame', '#b8ab92'), glass = material('glass', '#b7c7c5');
  glass.transparent = true; glass.opacity = .20; glass.depthWrite = false;
  const { width: w, depth: d, height: h } = spec;
  const base = board(root, 'display-case-base', [w, .095, d], [0, .0475, 0], timber, .018);
  const tray = board(root, 'supported-display-tray', [w - .07, .024, d - .07], [0, .104, 0], metal, .008);
  joint(root, tray, base, [0, .093, 0]);
  const crown = {};
  for (const sign of [-1, 1]) {
    crown[sign] = board(root, `upper-glazing-front-rear-${sign}`, [w, .035, .025], [0, h - .0175, sign * (d - .025) / 2], metal, .006);
    board(root, `upper-glazing-side-${sign}`, [.025, .035, d - .05], [sign * (w - .025) / 2, h - .0175, 0], metal, .006);
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const post = board(root, `case-corner-post-${x}-${z}`, [.022, h - .09, .022], [x * (w / 2 - .02), (h - .09) / 2 + .08, z * (d / 2 - .02)], metal, .006);
    joint(root, post, base, [post.position.x, .087, post.position.z]);
    joint(root, post, crown[z], [post.position.x, h - .022, post.position.z]);
  }
  const glazing = [];
  for (const sign of [-1, 1]) {
    glazing.push(board(root, `side-glazing-${sign}`, [.009, h - .13, d - .04], [sign * (w / 2 - .02), (h - .13) / 2 + .105, 0], glass, .002));
    glazing.push(board(root, `front-rear-glazing-${sign}`, [w - .04, h - .13, .009], [0, (h - .13) / 2 + .105, sign * (d / 2 - .02)], glass, .002));
  }
  glazing.push(board(root, 'top-glazing', [w - .035, .009, d - .035], [0, h - .018, 0], glass, .002));
  for (const pane of glazing) pane.castShadow = pane.receiveShadow = false;
  for (const [i, color] of ['#c3a078', '#b28b72', '#d1b28b'].entries()) {
    const bun = part(root, `display-pastry-${i}`, cushionGeometry([.18, .105 + i * .01, .20], { horizontal: 1, vertical: .75, longitude: 24 }), material(`pastry-${i}`, color), (i - 1) * .225, .116 + (.105 + i * .01) / 2 - .003, .025);
    joint(root, bun, tray, [bun.position.x, .114, .025]);
    stored(root, `pastry-${i}`, [bun], tray);
  }
}
