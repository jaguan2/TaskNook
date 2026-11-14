import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createIllustratedPalette } from '../viewer/illustrated-style.mjs';
import { createPetAppearance } from './appearance.mjs';

const $ = selector => document.querySelector(selector);
const viewport = $('#viewport'), status = $('#status'), play = $('#play');
const preferences = matchMedia('(prefers-reduced-motion: reduce)');
const palette = createIllustratedPalette(), loader = new GLTFLoader(), cache = new Map();
const defaults = { cat: '#4b3e50', dog: '#c98a4b', bunny: '#d9d2e4' };
const appearances = new WeakMap();
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#fff3de', '#5e4f67', 2.1));
const light = new THREE.DirectionalLight('#fff2dc', 2.2); light.position.set(3, 5, 4); scene.add(light);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 30);
let renderer, controls, contract, actor, mixer;
let requested = 0, disposed = false, playing = false, reduced = preferences.matches, failed = false;
let elapsed = 0, previous = 0, frame = 0, view = 'front';

function render() {
  if (!actor || disposed) return;
  mixer.setTime(elapsed);
  appearances.get(actor)(contract.stages.find(stage => stage.key === $('#age').value), $('#form').value, $('#pose').value, elapsed);
  scene.updateMatrixWorld(true);
  actor.traverse(node => { if (node.isSkinnedMesh) { node.computeBoundingBox(); node.computeBoundingSphere(); } });
  renderer.render(scene, camera);
}
function resize() {
  if (!renderer) return;
  const span = 50 / (48 / Math.SQRT2), aspect = viewport.clientWidth / viewport.clientHeight;
  camera.left = -span * aspect / 2; camera.right = span * aspect / 2;
  camera.top = span / 2; camera.bottom = -span / 2; camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight, false); render();
}
function setView(value) {
  view = value;
  const target = new THREE.Vector3(0, 17 / (48 / Math.SQRT2), 0);
  camera.position.copy(target).add(new THREE.Vector3(...({ front: [0, 0, 5], side: [5, 0, 0], back: [0, 0, -5], room: [3, 2.4, 4] }[value])));
  camera.zoom = 1; camera.lookAt(target); camera.updateProjectionMatrix();
  controls.target.copy(target); controls.update();
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === value)));
  updateSource(); render();
}
function updateSource() {
  if (!contract) return;
  const key = [$('#species').value, $('#age').value, $('#form').value, $('#pose').value === 'Rest' ? 'Rest' : 'Idle', view === 'back' ? 'back' : view === 'side' ? 'side' : 'front'].join('-');
  $('#source').src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(contract.fixtures[key])}`;
}
function setPose() {
  if (!mixer) return;
  elapsed = 0; mixer.stopAllAction();
  mixer.clipAction(actor.animations.find(clip => clip.name === $('#pose').value)).play();
  updateSource(); render();
}
function fail(error) { status.textContent = `Preview unavailable: ${error.message}. Reload to retry.`; viewport.dataset.ready = 'false'; failed = true; playing = false; syncMotion(); }
function disposeModel(model) {
  palette.release(model);
  const skeletons = new Set();
  model.traverse(node => { if (node.isMesh) { node.geometry.dispose(); [].concat(node.material).forEach(material => material.dispose()); if (node.isSkinnedMesh) skeletons.add(node.skeleton); } });
  skeletons.forEach(skeleton => skeleton.dispose());
}
async function selectSpecies() {
  const version = ++requested, species = $('#species').value;
  viewport.dataset.loading = 'true';
  if (!cache.has(species)) cache.set(species, loader.loadAsync(`/assets/pet-pilot/${species}.glb`).then(result => {
    result.scene.animations = result.animations;
    if (disposed) { disposeModel(result.scene); return null; }
    palette.apply(result.scene, 'illustrated');
    appearances.set(result.scene, createPetAppearance(result.scene, result.animations));
    result.scene.rotation.y = -Math.PI / 2; // Pet assets face +X along their long footprint axis.
    return result.scene;
  }).catch(error => { cache.delete(species); throw error; }));
  try {
    const next = await cache.get(species);
    if (disposed || version !== requested) return;
    if (actor) { mixer.stopAllAction(); mixer.uncacheRoot(actor); scene.remove(actor); }
    actor = next; scene.add(actor); mixer = new THREE.AnimationMixer(actor);
    $('#coat').value = defaults[species]; palette.recolor('coat', defaults[species], actor);
    $('#blend').href = `/assets/pet-pilot/${species}.blend`; $('#glb').href = `/assets/pet-pilot/${species}.glb`;
    setPose(); failed = false; viewport.dataset.ready = 'true'; syncMotion();
  } catch (error) { if (!disposed && version === requested) fail(error); }
  finally { if (!disposed && version === requested) viewport.dataset.loading = 'false'; }
}
function tick(now) {
  frame = 0;
  if (!playing || reduced || failed || document.hidden || disposed) return;
  elapsed += previous ? Math.min(.05, (now - previous) / 1000) : 0; previous = now;
  render(); frame = requestAnimationFrame(tick);
}
function syncMotion() {
  cancelAnimationFrame(frame); frame = 0; previous = 0;
  if (reduced || failed) playing = false;
  play.disabled = reduced || failed; play.textContent = playing ? 'Pause motion' : 'Play motion'; play.setAttribute('aria-pressed', String(playing));
  if (playing && !document.hidden && !disposed) frame = requestAnimationFrame(tick);
}
function preferenceChanged(event) { reduced = event.matches; syncMotion(); }
const observer = new ResizeObserver(resize);
function dispose() {
  if (disposed) return;
  disposed = true; requested++; cancelAnimationFrame(frame); observer.disconnect(); controls?.dispose();
  preferences.removeEventListener('change', preferenceChanged); document.removeEventListener('visibilitychange', syncMotion);
  mixer?.stopAllAction(); if (actor) mixer?.uncacheRoot(actor);
  for (const pending of cache.values()) pending.then(model => { if (model) disposeModel(model); }, () => {});
  palette.disposeTexture(); renderer?.dispose();
}
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.append(renderer.domElement); controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.minZoom = .5; controls.maxZoom = 3; controls.addEventListener('change', render);
  preferences.addEventListener('change', preferenceChanged); window.addEventListener('pagehide', dispose, { once: true });
  const response = await fetch('/assets/pet-pilot/source-art.json'); if (!response.ok) throw new Error('Pet comparison data did not load');
  contract = await response.json();
  for (const stage of contract.stages) $('#age').add(new Option(stage.key === 'teen' ? 'Medium' : stage.label, stage.key, false, stage.key === 'adult'));
  for (const form of contract.forms) $('#form').add(new Option(form.label, form.key));
  observer.observe(viewport); resize(); setView('front'); await selectSpecies(); syncMotion();
  $('#species').addEventListener('change', selectSpecies);
  for (const id of ['age', 'form']) $('#' + id).addEventListener('change', () => { updateSource(); render(); });
  $('#pose').addEventListener('change', setPose); play.addEventListener('click', () => { playing = !playing; syncMotion(); });
  $('#coat').addEventListener('input', event => { palette.recolor('coat', event.target.value, actor); render(); });
  $('#native-scale').addEventListener('change', event => { document.body.dataset.native = String(event.target.checked); resize(); });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#reset').addEventListener('click', () => setView('front'));
  document.addEventListener('visibilitychange', syncMotion);
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(new Error('Graphics context lost')); });
  window.petPilot = { sample() { return { species: $('#species').value, loadedSpecies: actor.getObjectByName('PetRig').userData.species, age: $('#age').value, form: $('#form').value, pose: $('#pose').value, time: mixer.time, playing, draws: renderer.info.render.calls, triangles: renderer.info.render.triangles }; } };
} catch (error) { fail(error); }
