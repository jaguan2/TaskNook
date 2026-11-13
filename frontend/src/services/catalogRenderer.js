import { createShelfDecorator } from './catalogShelfDecor';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import models from 'virtual:catalog-models';
import { createIllustratedPalette } from '../../../prototypes/furniture/src/viewer/illustrated-style.mjs';
import { MODEL_PIXELS_PER_UNIT, MODEL_VERTICAL_SCALE, modelOrigin, modelOrientationMatrix } from '../lib/catalogProjection';
import { COMPUTER_KEYBOARD, LAPTOP_KEYBOARD } from '../lib/workstations';
import { modelHitShape } from '../lib/modelHitShape';
import { FURNITURE_COLOR_PARTS } from '../lib/furnitureColors';
import { buildResizableFurniture } from '../../../prototypes/furniture/src/models/resizable-models.mjs';

// Source meshes are used only inside the render queue. Keep a small LRU of
// sizes, and release both GPU geometry and palette entries after eviction.
export function createFurnitureVariants(palette, limit = 8) {
  const variants = new Map();
  return (key, dimensions) => {
    const id = `${key}:${dimensions.w}x${dimensions.d}`;
    let model = variants.get(id);
    if (!model) {
      model = buildResizableFurniture(key, models[key], dimensions);
      palette.apply(model, 'illustrated');
    }
    variants.delete(id);
    variants.set(id, model);
    while (variants.size > limit) {
      const oldest = variants.keys().next().value, discarded = variants.get(oldest);
      variants.delete(oldest);
      palette.release(discarded);
      const geometries = new Set();
      discarded.traverse(node => { if (node.isMesh && !node.userData.sharedCatalogGeometry) geometries.add(node.geometry); });
      geometries.forEach(geometry => geometry.dispose());
    }
    return model;
  };
}

// One demand-rendered offscreen context for the whole app. Its transparent
// images fit the existing depth/interaction layers. Default furniture loads
// GLBs; resized furniture uses the same authored builders with new dimensions.
export function createCatalogRenderer() {
  if (typeof WebGL2RenderingContext !== 'function') throw new Error('3D room rendering is unavailable in this browser.');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0, 0); renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const palette = createIllustratedPalette();
  const furnitureVariant = createFurnitureVariants(palette);
  scene.add(new THREE.HemisphereLight('#e6ecff', '#44302e', 1.55));
  for (const [color, intensity, at] of [['#ffe5c3', 2.1, [-3, 6, 4]], ['#c9d6f0', .15, [3, 2, -4]]]) {
    const light = new THREE.DirectionalLight(color, intensity); light.position.set(...at); scene.add(light);
  }
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .01, 100);
  camera.position.set(10, Math.sqrt(200 / 3), 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const orientation = new THREE.Group(), elevation = new THREE.Group();
  orientation.matrixAutoUpdate = false; elevation.scale.y = MODEL_VERTICAL_SCALE;
  orientation.add(elevation); scene.add(orientation);
  const loader = new GLTFLoader(), loaded = new Map();
  const hitCanvas = document.createElement('canvas'), hitContext = hitCanvas.getContext('2d', { willReadFrequently: true });
  // Loads may overlap; all camera, source-model and GPU mutation uses this queue.
  let queue = Promise.resolve();
  // Failed loads leave no poisoned promise, allowing the global Retry action.
  async function load(key) {
    if (!loaded.has(key)) loaded.set(key, loader.loadAsync(models[key].url).then(({ scene: model }) => {
      palette.apply(model, 'illustrated');
      // Align keyboard decks to the existing shared hand-contact contract.
      const keyboard = model.getObjectByName(key === 'computer' ? 'keyboard' : key === 'laptop' ? 'keyboard-recess' : '');
      if (keyboard) {
        model.updateMatrixWorld(true);
        const centre = new THREE.Box3().setFromObject(keyboard).getCenter(new THREE.Vector3());
        const deck = key === 'computer' ? COMPUTER_KEYBOARD : LAPTOP_KEYBOARD, spec = models[key];
        model.position.x += deck.gx + deck.dx / 2 - spec.width / 2 - centre.x;
        model.position.z += deck.gy + deck.dy / 2 - spec.depth / 2 - centre.z;
      }
      return model;
    }).catch(error => { loaded.delete(key); throw error; }));
    return loaded.get(key);
  }
  const decorateShelf = createShelfDecorator(palette, load);

  async function paint(options, model) {
    if (renderer.getContext().isContextLost()) throw new Error('The room graphics context was interrupted. Reload the app.');
    const { key, color, rotation = 0, lit = true, part = 'whole', dimensions } = options;
    const spec = dimensions ? { ...models[key], width: dimensions.w, depth: dimensions.d } : models[key];
    if (dimensions) model = furnitureVariant(key, dimensions);
    // Reset the shared source before applying this placement's contents. The
    // queue below owns all scene mutation, including template preparation.
    model.traverse(node => { if (node.isMesh) node.visible = true; });
    await decorateShelf(model, options.decor);
    elevation.clear(); elevation.add(model);
    orientation.matrix.set(...modelOrientationMatrix(rotation));
    orientation.matrixWorldNeedsUpdate = true;
    palette.recolor(spec.colorRole, color || spec.defaultColor, model);
    // Every render starts from authored defaults for secondary materials.
    // Source meshes are shared; a previous placement must not tint the next.
    for (const [part, material] of Object.entries(FURNITURE_COLOR_PARTS[key] || {})) {
      if (part === 'main') continue;
      palette.recolor(material.role, options.colors?.[part] || material.defaultColor, model);
    }
    palette.setLightEnabled(lit);
    if (key === 'desk' && options.showLaptop) {
      const laptop = await load('laptop');
      palette.recolor(models.laptop.colorRole, models.laptop.defaultColor, laptop);
      const accessory = laptop.clone(true);
      accessory.position.x += models.laptop.width / 2 - spec.width / 2;
      accessory.position.z += models.laptop.depth / 2 - spec.depth / 2;
      accessory.position.y += spec.surface;
      elevation.add(accessory);
    }
    scene.updateMatrixWorld(true);
    // Camera bounds use tile units; the returned image rectangle uses logical
    // SVG pixels. Supersampling improves edges without changing hit geometry.
    const bounds = new THREE.Box3().setFromObject(orientation);
    const projected = [];
    // Bounds must include the orientation group (including transpose/rear).
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      projected.push(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
    }
    const ppu = MODEL_PIXELS_PER_UNIT;
    const left = Math.floor(Math.min(...projected.map(p => p.x)) * ppu) - 2;
    const right = Math.ceil(Math.max(...projected.map(p => p.x)) * ppu) + 2;
    const top = Math.floor(-Math.max(...projected.map(p => p.y)) * ppu) - 2;
    const bottom = Math.ceil(-Math.min(...projected.map(p => p.y)) * ppu) + 2;
    camera.left = left / ppu; camera.right = right / ppu; camera.top = -top / ppu; camera.bottom = -bottom / ppu; camera.updateProjectionMatrix();
    const scale = Math.min(4, 2048 / Math.max(right - left, bottom - top));
    renderer.setSize(Math.ceil((right - left) * scale), Math.ceil((bottom - top) * scale), false);
    if (part === 'duvet') model.traverse(node => { if (node.isMesh) node.visible = node.name === 'continuous-draped-duvet' || (rotation >= 2 && node.name === 'headboard'); });
    renderer.render(scene, camera);
    hitCanvas.width = right - left; hitCanvas.height = bottom - top;
    hitContext.drawImage(renderer.domElement, 0, 0, hitCanvas.width, hitCanvas.height);
    const hitPath = modelHitShape(hitContext.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data, hitCanvas.width, hitCanvas.height);
    if (!hitPath) throw new Error(`${key}: the model render is empty.`);
    // The image cache owns this URL and revokes it when its final lease expires.
    const blob = await new Promise((resolve, reject) => renderer.domElement.toBlob(value => value ? resolve(value) : reject(new Error('Could not render this room model.')), 'image/png'));
    const href = URL.createObjectURL(blob), origin = modelOrigin(spec, rotation);
    return { href, x: left + origin.x, y: top + origin.y, width: right - left, height: bottom - top, hitPath,
      source: dimensions ? 'parametric' : 'glb', dispose: () => URL.revokeObjectURL(href) };
  }
  return {
    async render(options, isNeeded = () => true) {
      const model = options.dimensions ? null : await load(options.key);
      const task = queue.then(() => isNeeded() ? paint(options, model) : null);
      queue = task.catch(() => {});
      return task;
    },
  };
}
