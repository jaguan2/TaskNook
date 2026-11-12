import * as THREE from 'three';
import { joint, material, part, revolved } from './geometry.mjs';
import { board, clothRibbon, stored } from './storage-parts.mjs';

export function slattedCrate(root, name, { w, d, h, bottom = 0, lid = false }, paint) {
  const floor = board(root, `${name}-floor`, [w - .015, .035, d - .015], [0, bottom + .0175, 0], paint, .008), posts = [];
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const post = board(root, `${name}-batten-${x}-${z}`, [.05, h, .05], [x * (w - .05) / 2, bottom + h / 2, z * (d - .05) / 2], paint, .008);
    joint(root, post, floor, [post.position.x, bottom + .02, post.position.z]); posts.push(post);
  }
  for (let row = 0; row < 3; row++) {
    const y = bottom + .04 + h * .29 * row, railH = h * .22;
    for (const sign of [-1, 1]) {
      const front = board(root, `${name}-long-slat-${row}-${sign}`, [w - .012, railH, .032], [0, y + railH / 2, sign * ((d - .032) / 2 - .006)], paint, .007);
      const end = board(root, `${name}-end-slat-${row}-${sign}`, [.032, railH, d - .012], [sign * ((w - .032) / 2 - .006), y + railH / 2, 0], paint, .007);
      for (const post of posts.filter(post => Math.sign(post.position.z) === sign)) joint(root, front, post, [post.position.x, front.position.y, post.position.z + sign * .012]);
      for (const post of posts.filter(post => Math.sign(post.position.x) === sign)) joint(root, end, post, [post.position.x + sign * .012, end.position.y, post.position.z]);
    }
  }
  const lids = [];
  if (lid) for (let i = 0; i < 3; i++) {
    const plank = board(root, `${name}-lid-plank-${i}`, [w / 3 - .005, .035, d], [(i - 1) * w / 3, bottom + h - .0125, 0], paint, .008);
    lids.push(plank);
  }
  return { floor, posts, lids };
}

export function crates(root, spec) {
  const timber = material('finish', '#b08a61'), lowerH = .455, topBottom = lowerH + .001;
  const lower = slattedCrate(root, 'lower-crate', { w: spec.width, d: spec.depth, h: lowerH, lid: true }, timber);
  const upper = slattedCrate(root, 'upper-crate', { w: .66, d: .56, h: spec.height - topBottom, bottom: topBottom }, timber);
  joint(root, upper.floor, lower.lids[1], [0, topBottom + .002, 0]);
  for (const post of upper.posts) joint(root, post, lower.lids[post.position.x < 0 ? 0 : 2], [post.position.x, topBottom + .002, post.position.z]);
}

export function vinylCrate(root, spec) {
  const timber = material('finish', '#b08a61');
  const crate = slattedCrate(root, 'record-crate', { w: spec.width, d: spec.depth, h: .43 }, timber);
  const colors = ['#a98277', '#83937e', '#92909e', '#aa9776'];
  for (let i = 0; i < 4; i++) {
    const top = spec.height - [0, .025, .055, .09][i], h = top - .032, z = -.16 + i * .105;
    const sleeve = board(root, `record-sleeve-${i}`, [.48, h, .025], [0, .032 + h / 2, z], material(`record-cover-${i}`, colors[i]), .006);
    joint(root, sleeve, crate.floor, [0, .034, z]);
    stored(root, `record-${i}`, [sleeve], crate.floor);
    const label = part(root, `record-label-${i}`, new THREE.CylinderGeometry(.067, .067, .008, 24), material('record-label', '#d8cbb3'), 0, top - .12, z + .013);
    label.rotation.x = Math.PI / 2;
    joint(root, label, sleeve, [0, label.position.y, z + .011]);
  }
}

export function basket(root, spec) {
  const wicker = material('wicker', '#b79a6c'), linen = material('basket-linen', '#ded2b9');
  const body = revolved(root, 'continuous-hollow-basket', [[.21, 0], [.235, .05], [.265, .27], [.285, .50], [.285, .53], [.25, .53], [.23, .27], [.20, .038]], wicker);
  body.scale.z = .91;
  for (const y of [.13, .28, .43]) {
    const radius = .235 + (y - .05) / .45 * .05;
    const band = part(root, `broad-wicker-band-${y}`, new THREE.TorusGeometry(radius - .002, .006, 6, 48), wicker, 0, y, 0);
    band.rotation.x = Math.PI / 2; band.scale.y = .91;
    joint(root, band, body, [radius - .003, y, 0]);
  }
  const rim = part(root, 'bound-basket-rim', new THREE.TorusGeometry(.268, .019, 8, 48), wicker, 0, .53, 0);
  rim.rotation.x = Math.PI / 2; rim.scale.y = .91;
  joint(root, rim, body, [.275, .525, 0]);
  const cloth = clothRibbon(root, 'one-draped-linen-cloth', [[0, .55, -.08], [0, .70, .01], [0, .66, .13], [0, .57, .22], [0, .554, .244], [0, .547, .259], [0, .53, .266], [0, .49, .272], [0, .31, .272]], .18, linen, .002);
  cloth.geometry.computeBoundingBox();
  const positions = cloth.geometry.attributes.position, oldMax = cloth.geometry.boundingBox.max.y;
  for (let i = 0; i < positions.count; i++) if (positions.getY(i) > .55) positions.setY(i, .55 + (positions.getY(i) - .55) * (spec.height - .55) / (oldMax - .55));
  cloth.geometry.computeVertexNormals();
  cloth.geometry.computeBoundingBox(); cloth.geometry.computeBoundingSphere();
  joint(root, cloth, rim, [0, .5485, .244]);
}
