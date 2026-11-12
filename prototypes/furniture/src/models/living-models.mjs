import * as THREE from 'three';
import { beam, cushionGeometry, joint, material, part, revolved } from './geometry.mjs';
import { fitOrganic, oval } from './organic-parts.mjs';
import { warmInk } from './object-parts.mjs';

function pivot(parent, name, at) { const node = new THREE.Group(); node.name = name; node.position.set(...at); parent.add(node); return node; }
function quaternionTrack(node, axis, values, times) {
  const rotations = values.flatMap(angle => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis), angle).toArray());
  return new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, rotations);
}
function makeClips(root, head, arms, legs, tail) {
  const times = [0, .5, 1, 1.5, 2], idle = [quaternionTrack(head, [0, 1, 0], [0, .08, 0, -.08, 0], times)];
  if (tail) idle.push(quaternionTrack(tail, [0, 1, 0], [0, .25, 0, -.25, 0], times));
  for (const [i, arm] of arms.entries()) idle.push(quaternionTrack(arm, [0, 0, 1], [0, .025 * (i ? -1 : 1), 0, -.025 * (i ? -1 : 1), 0], times));
  const walk = [];
  const walkTimes = Array.from({ length: 33 }, (_, i) => i / 16);
  for (const [i, leg] of legs.entries()) {
    const amplitude = root.userData.persona ? .20 : .15, sign = i % 2 ? -1 : 1, angles = walkTimes.map(t => amplitude * sign * Math.sin(t * Math.PI));
    walk.push(quaternionTrack(leg, [1, 0, 0], angles, walkTimes));
    // A rigid-piece rig raises a swinging leg by its actual lowest vertex.
    // This preserves the planted baseline and prevents toe penetration.
    const original = leg.position.clone(), originalQuaternion = leg.quaternion.clone(), positions = [];
    for (const angle of angles) {
      leg.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle); root.updateMatrixWorld(true);
      const world = new THREE.Box3().setFromObject(leg), parentScale = leg.parent.getWorldScale(new THREE.Vector3()).y;
      positions.push(original.x, original.y + Math.max(0, -world.min.y / parentScale) + (Math.abs(angle) > 1e-6 ? .003 : 0), original.z);
    }
    leg.position.copy(original); leg.quaternion.copy(originalQuaternion); walk.push(new THREE.VectorKeyframeTrack(`${leg.name}.position`, walkTimes, positions));
  }
  for (const [i, arm] of arms.entries()) walk.push(quaternionTrack(arm, [1, 0, 0], [0, i % 2 ? .14 : -.14, 0, i % 2 ? -.14 : .14, 0], times));
  if (tail) walk.push(quaternionTrack(tail, [0, 1, 0], [0, .18, 0, -.18, 0], times));
  root.animations = [new THREE.AnimationClip('Idle', 2, idle), new THREE.AnimationClip('Walk', 2, walk)];
  root.userData.rig = { kind: 'articulated-rigid-parts', head: head.name, arms: arms.map(n => n.name), legs: legs.map(n => n.name), ...(tail && { tail: tail.name }), clips: ['Idle', 'Walk'] };
  root.updateMatrixWorld(true);
}
function person(root, s, alternate) {
  const knit = material(s.colorRole, s.defaultColor), skin = material('resident-skin', '#c7ac91'), trousers = material('resident-trousers', '#8e9485'), ink = warmInk();
  const torso = revolved(root, 'continuous-knit-torso', [[.155, .80], [.19, .84], [.205, .98], [.22, 1.19], [.18, 1.28], [.09, 1.32]], knit);
  torso.geometry.scale(1, 1, .62);
  part(root, 'continuous-trouser-hips', cushionGeometry([.34, .19, .24], { longitude: 24 }), trousers, 0, .77, 0);
  const neck = beam(root, 'visible-neck', [0, 1.26, 0], [0, 1.41, 0], .047, skin);
  joint(root, torso, neck, [0, 1.29, 0]);
  const head = pivot(root, 'head-joint', [0, 1.38, 0]); head.scale.setScalar(1.22);
  const skull = oval(head, 'head', [0, .18, 0], [.34, .40, .32], skin, 20);
  joint(root, neck, skull, [0, 1.38, 0]);
  const hair = material('resident-hair', alternate ? '#8c7962' : '#716658');
  revolved(head, 'fitted-hair-crown', [[.165, .26], [.18, .31], [.16, .39], [.08, .435], [.012, .445]], hair);
  oval(head, 'joined-front-fringe', [-.045, .285, .12], [.23, .085, .14], hair);
  if (alternate) oval(head, 'rear-hair-bun', [0, .30, -.17], [.18, .18, .16], material('resident-hair', '#8c7962'));
  for (const sign of [-1, 1]) { oval(head, `ear-${sign}`, [sign * .17, .18, 0], [.055, .085, .07], skin); oval(head, `eye-${sign}`, [sign * .060, .19, .156], [.023, .032, .012], ink); }
  oval(head, 'small-nose', [0, .14, .158], [.027, .035, .028], skin);
  const arms = [], legs = [];
  for (const sign of [-1, 1]) {
    const arm = pivot(root, `shoulder-${sign === -1 ? 'left' : 'right'}`, [sign * .205, 1.23, 0]); arms.push(arm);
    oval(arm, `receiving-shoulder-${sign}`, [0, 0, 0], [.14, .14, .18], knit);
    beam(arm, `knit-upper-arm-${sign}`, [0, 0, 0], [sign * .045, -.26, 0], .063, knit);
    const elbow = pivot(arm, `elbow-${sign}`, [sign * .045, -.25, 0]); oval(elbow, `elbow-cuff-${sign}`, [0, 0, 0], [.12, .10, .12], knit);
    beam(elbow, `forearm-${sign}`, [0, -.012, 0], [0, -.19, .015], .042, skin); oval(elbow, `hand-${sign}`, [0, -.215, .018], [.085, .11, .07], skin);
    const leg = pivot(root, `hip-${sign === -1 ? 'left' : 'right'}`, [sign * .095, .72, 0]); legs.push(leg);
    revolved(leg, `upper-trouser-leg-${sign}`, [[.058, -.31], [.064, -.24], [.074, -.07], [.072, .015]], trousers);
    const knee = pivot(leg, `knee-${sign}`, [0, -.29, 0]); oval(knee, `receiving-knee-${sign}`, [0, 0, 0], [.12, .13, .12], trousers);
    revolved(knee, `lower-trouser-leg-${sign}`, [[.046, -.34], [.05, -.30], [.057, -.06], [.057, -.012]], trousers);
    oval(knee, `shoe-${sign}`, [0, -.385, .045], [.135, .09, .25], material('shoes', '#736c61'));
  }
  fitOrganic(root, s); makeClips(root, head, arms, legs);
}
function animal(root, s, kind) {
  const coat = material(s.colorRole, s.defaultColor), ink = warmInk(), bunny = kind === 'bunny', dog = kind === 'dog';
  oval(root, 'continuous-pet-body', [0, .25, -.055], [bunny ? .38 : .34, bunny ? .38 : .31, bunny ? .40 : .54], coat, 20);
  const head = pivot(root, 'pet-head-joint', [0, .36, .21]); oval(head, 'pet-head', [0, .07, .02], [bunny ? .29 : .30, .28, .28], coat, 20);
  oval(head, 'joined-muzzle', [0, .025, .14], [dog ? .19 : .13, .10, dog ? .18 : .10], material('muzzle', '#d1c4aa'));
  oval(head, 'pet-nose', [0, .047, dog ? .226 : .189], [.037, .026, .023], ink);
  for (const sign of [-1, 1]) {
    oval(head, `pet-eye-${sign}`, [sign * .073, .11, .133], [.025, .032, .015], ink);
    if (bunny) { const ear = oval(head, `long-ear-${sign}`, [sign * .075, .31, .005], [.088, .35, .072], coat); ear.rotation.z = sign * -.09; oval(head, `inner-ear-${sign}`, [sign * .075, .31, .043], [.035, .25, .010], material('ear-lining', '#bba9a0')); }
    else if (dog) oval(head, `floppy-ear-${sign}`, [sign * .15, .07, -.025], [.11, .25, .14], material('ear-coat', '#9a856e'));
    else { const ear = part(head, `pointed-ear-${sign}`, new THREE.ConeGeometry(.070, .16, 4), coat, sign * .105, .24, -.012); ear.rotation.y = Math.PI / 4; }
  }
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const sign = i % 2 ? 1 : -1, rear = i >= 2, x = sign * .12, z = rear ? -.23 : .14, node = pivot(root, `pet-leg-${i}`, [x, .17, z]); legs.push(node);
    oval(node, `pet-upper-leg-${i}`, [0, -.015, 0], [rear && bunny ? .15 : .105, .18, .12], coat);
    const knee = pivot(node, `pet-knee-${i}`, [0, -.07, 0]); oval(knee, `pet-knee-cap-${i}`, [0, 0, 0], [.095, .085, .095], coat); beam(knee, `pet-shin-${i}`, [0, -.01, 0], [0, -.065, .015], .037, coat);
    oval(knee, `pet-paw-${i}`, [0, -.075, .04], [bunny && rear ? .15 : .11, .05, bunny && rear ? .21 : .14], coat);
  }
  const tail = pivot(root, 'pet-tail-joint', [0, .31, bunny ? -.25 : -.28]);
  if (bunny) oval(tail, 'round-rabbit-tail', [0, .01, -.05], [.14, .14, .14], material('tail-cream', '#d6cdb8'));
  else { beam(tail, 'tail-base', [0, 0, 0], [.04, .12, -.12], dog ? .035 : .025, coat); beam(tail, 'tail-tip', [.04, .12, -.12], [.08, dog ? .15 : .36, -.15], dog ? .027 : .022, coat); oval(tail, 'rounded-tail-tip', [.08, dog ? .15 : .36, -.15], [.05, .055, .05], coat); }
  fitOrganic(root, s); makeClips(root, head, [], legs, tail);
}
export const LIVING_BUILDERS = { you: (r, s) => person(r, s, false), resident: (r, s) => person(r, s, true), cat: (r, s) => animal(r, s, 'cat'), dog: (r, s) => animal(r, s, 'dog'), bunny: (r, s) => animal(r, s, 'bunny') };
