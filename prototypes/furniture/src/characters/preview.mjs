import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createIllustratedPalette } from '../viewer/illustrated-style.mjs';

const viewport = document.querySelector('#viewport');
const status = document.querySelector('#status');
const poseControl = document.querySelector('#pose');
const playControl = document.querySelector('#play');
const source = document.querySelector('#source');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = reduced.matches;
const seated = new Set(['Sit', 'Type', 'AnklesCrossed']);
const palette = createIllustratedPalette();
const loader = new GLTFLoader();
const scene = new THREE.Scene();
const stage = new THREE.Group();
scene.add(stage);
scene.add(new THREE.HemisphereLight('#fff3de', '#5e4f67', 2.1));
const light = new THREE.DirectionalLight('#fff2dc', 2.2);
light.position.set(3, 5, 4); scene.add(light);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 40);
let renderer, controls, actor, mixer, action, animations;
let frame = 0, previous = 0, elapsed = 0, playing = false, disposed = false, version = 0;
let view = 'front';
const props = new Map();
const loading = new Map();

function render() {
  if (!renderer || !actor || disposed) return;
  scene.updateMatrixWorld(true);
  // Animated bounds must follow the deformed vertices, not the bind pose.
  actor.traverse(node => { if (node.isSkinnedMesh) { node.computeBoundingBox(); node.computeBoundingSphere(); } });
  renderer.render(scene, camera);
}

function size() {
  if (!renderer || !controls) return;
  const width = viewport.clientWidth, height = viewport.clientHeight;
  const span = 88 / (48 / Math.SQRT2), aspect = width / height;
  camera.left = -span * aspect / 2; camera.right = span * aspect / 2;
  camera.top = span / 2; camera.bottom = -span / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false); render();
}

function setView(value) {
  view = value;
  const directions = { front: [0, 0, 5], side: [5, 0, 0], back: [0, 0, -5], room: [3, 2.4, 4] };
  const target = new THREE.Vector3(0, .59, 0);
  camera.position.copy(target).add(new THREE.Vector3(...directions[value]));
  camera.zoom = 1; camera.lookAt(target); camera.updateProjectionMatrix();
  controls.target.copy(target); controls.update();
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === value)));
  updateSource(); render();
}

function updateSource() {
  const facing = view === 'back' ? 'back' : view === 'side' ? 'side' : 'front';
  const pose = poseControl.value;
  source.src = `/assets/character-pilot/svg-${pose.toLowerCase()}-${facing}.svg`;
}

async function furniture(pose) {
  const request = ++version;
  viewport.dataset.loading = 'true';
  for (const prop of props.values()) prop.visible = false;
  try {
    if (!document.querySelector('#furniture').checked) return;
    const keys = seated.has(pose) ? ['chair', ...(pose === 'Type' ? ['desk', 'laptop'] : [])] : pose === 'Sleep' ? ['bed'] : [];
    for (const key of keys) {
      if (!loading.has(key)) loading.set(key, loader.loadAsync(`/assets/${key}.glb`).then(({ scene: prop }) => {
        if (disposed) { disposeObject(prop); return null; }
        prop.visible = false;
        palette.apply(prop, 'illustrated'); stage.add(prop); props.set(key, prop);
        if (key === 'desk') prop.position.set(0, 0, .8);
        if (key === 'laptop') { prop.rotation.y = Math.PI; prop.position.set(0, 30 / (48 / Math.SQRT2), .5); }
        if (key === 'bed') prop.position.x = .46; // One occupant uses the left pillow bay.
        return prop;
      }).catch(error => { loading.delete(key); throw error; }));
      const prop = await loading.get(key);
      if (request !== version || disposed) return;
      prop.visible = true;
    }
  } catch (error) {
    if (request === version && !disposed) throw error;
  } finally {
    if (request === version && !disposed) { viewport.dataset.loading = 'false'; render(); }
  }
}

function fail(error) {
  status.textContent = `Preview unavailable: ${error.message}. Reload to retry.`;
  viewport.dataset.ready = 'false';
  playControl.disabled = true;
}

async function setPose(name) {
  mixer.stopAllAction();
  elapsed = 0;
  action = mixer.clipAction(animations.find(clip => clip.name === name));
  action.play(); mixer.setTime(0); render();
  viewport.dataset.pose = name;
  updateSource();
  try { await furniture(name); } catch (error) { fail(error); }
}

function tick(now) {
  frame = 0;
  if (!playing || document.hidden || reduceMotion || disposed) return;
  elapsed += previous ? Math.min(.05, (now - previous) / 1000) : 0;
  previous = now;
  mixer.setTime(elapsed); render();
  frame = requestAnimationFrame(tick);
}

function syncMotion() {
  cancelAnimationFrame(frame); frame = 0; previous = 0;
  if (reduceMotion) playing = false;
  playControl.disabled = reduceMotion;
  playControl.textContent = playing ? 'Pause motion' : 'Play motion';
  playControl.setAttribute('aria-pressed', String(playing));
  if (playing && !document.hidden && !disposed) frame = requestAnimationFrame(tick);
}

function motionPreferenceChanged(event) {
  // Resolve preference changes once; animation frames consume this state.
  reduceMotion = event.matches;
  syncMotion();
}

function disposeObject(object) {
  object.traverse(node => {
    if (!node.isMesh) return;
    node.geometry.dispose();
    for (const paint of [].concat(node.material)) paint.dispose();
    if (node.isSkinnedMesh) node.skeleton.dispose();
  });
}

function dispose() {
  if (disposed) return;
  disposed = true; version++; cancelAnimationFrame(frame);
  resize.disconnect(); controls?.dispose();
  reduced.removeEventListener('change', motionPreferenceChanged);
  document.removeEventListener('visibilitychange', syncMotion);
  mixer?.stopAllAction(); if (actor) mixer?.uncacheRoot(actor);
  stage.traverse(node => { if (node.isMesh) palette.release(node); });
  disposeObject(stage); palette.disposeTexture(); renderer?.dispose();
}

const resize = new ResizeObserver(size);
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.append(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.minZoom = .5; controls.maxZoom = 3;
  controls.addEventListener('change', render);
  reduced.addEventListener('change', motionPreferenceChanged);
  window.addEventListener('pagehide', dispose, { once: true });
  const loaded = await loader.loadAsync('/assets/character-pilot/resident.glb');
  actor = loaded.scene; animations = loaded.animations;
  palette.apply(actor, 'illustrated'); stage.add(actor);
  mixer = new THREE.AnimationMixer(actor);
  resize.observe(viewport); size(); setView('front');
  await setPose('Idle');
  viewport.dataset.ready = 'true';
  syncMotion();
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); playing = false; syncMotion(); fail(new Error('Graphics context lost')); });
  poseControl.addEventListener('change', () => setPose(poseControl.value));
  playControl.addEventListener('click', () => { playing = !playing; syncMotion(); });
  document.querySelector('#furniture').addEventListener('change', () => furniture(poseControl.value).then(render).catch(fail));
  document.querySelector('#native-scale').addEventListener('change', event => { document.body.dataset.native = String(event.target.checked); size(); });
  document.querySelector('#reset').addEventListener('click', () => setView('front'));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelectorAll('[data-material]').forEach(input => input.addEventListener('input', () => { palette.recolor(input.dataset.material, input.value, actor); render(); }));
  document.querySelector('#fullness').addEventListener('input', event => { actor.traverse(node => { const index = node.morphTargetDictionary?.TorsoFullness; if (index !== undefined) node.morphTargetInfluences[index] = Number(event.target.value); }); render(); });
  document.addEventListener('visibilitychange', syncMotion);
  // Read-only observations support repeatable workshop checks.
  window.characterPilot = { sample() { return { pose: poseControl.value, time: mixer.time, playing, triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls, skins: actor.getObjectsByProperty('isSkinnedMesh', true).length, visibleProps: [...props].filter(([, prop]) => prop.visible).map(([key]) => key).sort(), view }; } };
} catch (error) { fail(error); }
