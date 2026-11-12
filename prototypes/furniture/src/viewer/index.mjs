import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createIllustratedPalette } from './illustrated-style.mjs';
import { createSeatContact } from './seat-contact.mjs';
import { previewBounds } from './preview-bounds.mjs';
import { populateRoom, ROOM_LAYOUTS } from './room-layouts.mjs';

const viewport = document.querySelector('#viewport');
const status = document.querySelector('#status');
const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const press = (selector, active) => all(selector).forEach(button => button.setAttribute('aria-pressed', String(active(button))));

async function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.setAttribute('aria-label', '3D furniture model. Drag to rotate, scroll to zoom, or use the camera buttons.');
  viewport.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a242b');
  const objectGroup = new THREE.Group(), roomGroup = new THREE.Group();
  scene.add(objectGroup, roomGroup);
  let displayGroup = objectGroup;
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, .01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minZoom = .45; controls.maxZoom = 4;
  controls.enablePan = false;
  controls.minPolarAngle = .1;
  controls.maxPolarAngle = Math.PI * .8;
  const hemi = new THREE.HemisphereLight('#e6ecff', '#44302e', 1.65);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffe5c3', 3.2);
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 18 });
  key.shadow.bias = -.00015; key.shadow.normalBias = .015;
  key.shadow.radius = 4; key.shadow.intensity = .65;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#c9d6f0', .6);
  fill.position.set(3, 2, -4); scene.add(fill);

  let frame = 0, renderedFrames = 0, disposed = false;
  let motionMixer = null, motionTime = 0;
  function stopMotion() {
    if (motionMixer) { motionMixer.stopAllAction(); motionMixer.uncacheRoot(motionMixer.getRoot()); motionMixer = null; }
    $('#motion-state').setAttribute('aria-pressed', 'false'); $('#motion-state').textContent = 'Play motion';
    viewport.dataset.motion = 'stopped'; render();
  }
  function render() {
    if (disposed || frame) return;
    frame = requestAnimationFrame(now => {
      frame = 0;
      if (motionMixer) { motionMixer.update(Math.min(.05, Math.max(0, (now - motionTime) / 1000))); motionTime = now; }
      renderer.render(scene, camera);
      viewport.dataset.rendered = 'true';
      viewport.dataset.frames = String(++renderedFrames);
      viewport.dataset.drawCalls = String(renderer.info.render.calls);
      if (motionMixer) render();
    });
  }
  controls.addEventListener('change', render);
  const resize = () => {
    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    let halfHeight = 1.25;
    const bounds = previewBounds(displayGroup);
    if (!bounds.isEmpty()) {
      camera.updateMatrixWorld(true);
      let maxX = 0, maxY = 0;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        maxX = Math.max(maxX, Math.abs(point.x)); maxY = Math.max(maxY, Math.abs(point.y));
      }
      halfHeight = Math.max(maxY, maxX / (width / height)) * 1.22;
    }
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.left = -halfHeight * width / height; camera.right = -camera.left;
    camera.updateProjectionMatrix(); render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#2a242b', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.012; ground.receiveShadow = true;
  scene.add(ground);
  const loader = new GLTFLoader();
  const manifestResponse = await fetch('/assets/manifest.json');
  if (!manifestResponse.ok) throw new Error('Model manifest is unavailable. Run npm run models.');
  const manifest = await manifestResponse.json();
  const palette = createIllustratedPalette();
  const models = new Map(), modelLoads = new Map(), colors = {};
  let activeStyle = 'illustrated';
  let lightEnabled = true;
  for (const [key, spec] of Object.entries(manifest.models)) colors[key] = spec.defaultColor;
  async function loadModel(key) {
    if (models.has(key)) return models.get(key);
    if (!modelLoads.has(key)) modelLoads.set(key, loader.loadAsync(`/assets/${key}.glb`).then(({ scene: model, animations }) => {
      if (disposed) {
        model.traverse(node => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } });
        return null;
      }
      model.traverse(node => {
        if (!node.isMesh) return;
        node.receiveShadow = !node.material.transparent;
        node.castShadow = !node.material.transparent && node.userData.noCastShadow !== true;
      });
      model.animations = animations;
      palette.apply(model, activeStyle);
      const spec = manifest.models[key];
      if (spec.tintable !== false) palette.recolor(spec.colorRole, colors[key], model);
      models.set(key, model); return model;
    }).finally(() => modelLoads.delete(key)));
    return modelLoads.get(key);
  }
  // The room needs only these three. Other assets load on selection instead
  // of making each new catalog section expand startup GPU memory and parsing.
  await Promise.all(['sofa', 'armchair', 'coffeetable'].map(loadModel));
  const wood = new THREE.MeshStandardMaterial({ name: 'room-timber', color: '#765841', roughness: .85 });
  const wall = new THREE.MeshStandardMaterial({ name: 'room-wall', color: '#afa292', roughness: 1 });
  function roomBox(size, at, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...at); mesh.receiveShadow = mesh.castShadow = true; roomGroup.add(mesh);
  }
  for (let i = 0; i < 15; i++) roomBox([4.5, .08, .235], [0, -.04, -1.68 + i * .24], wood);
  roomBox([4.5, 1.6, .09], [0, .75, -1.82], wall);
  roomBox([.09, 1.6, 3.7], [-2.29, .75, -.01], wall);
  roomBox([4.5, .08, .04], [0, .03, -1.75], wood);
  roomBox([.04, .08, 3.6], [-2.23, .03, 0], wood);
  const roomProps = new THREE.Group(); roomGroup.add(roomProps);
  populateRoom(roomProps, ROOM_LAYOUTS.lounge, models, manifest.models);
  viewport.dataset.room = 'lounge';
  let roomVersion = 0;
  async function setRoom(name) {
    const version = ++roomVersion, layout = ROOM_LAYOUTS[name];
    viewport.dataset.roomLoading = 'true';
    try {
      await Promise.all([...new Set(layout.map(([key]) => key))].map(loadModel));
      if (disposed || version !== roomVersion) return;
      populateRoom(roomProps, layout, models, manifest.models);
      viewport.dataset.room = name;
      updateLightControl();
      if (viewport.dataset.mode === 'room') {
        if (viewport.dataset.loading !== 'true') status.textContent = '';
        view('iso');
      }
    } catch (error) {
      if (!disposed && version === roomVersion) {
        $('#room-layout').value = viewport.dataset.room;
        status.textContent = `Unable to open this room: ${error.message}`;
      }
    } finally {
      if (version === roomVersion) viewport.dataset.roomLoading = 'false';
    }
  }
  const contactResponse = await fetch('/assets/characters/manifest.json');
  if (!contactResponse.ok) throw new Error('Character comparison fixtures are missing. Run npm run characters.');
  const contactManifest = await contactResponse.json();
  const contact = createSeatContact(contactManifest, manifest.pixelsPerUnit, render,
    () => { status.textContent = 'The character preview could not load. Choose another look or reload.'; });
  for (const [id, entries] of [['resident-look', contactManifest.looks], ['resident-body', contactManifest.bodies]]) {
    for (const entry of entries) {
      const option = document.createElement('option'); option.value = entry.key; option.textContent = entry.label;
      $(`#${id}`).append(option);
    }
  }
  let selected = 'armchair';
  let selectionVersion = 0;
  const colorRole = () => manifest.models[selected].colorRole;
  const supportsContact = () => !!manifest.models[selected].contact;
  function updateLightControl() {
    const enabled = viewport.dataset.mode === 'room'
      ? ROOM_LAYOUTS[viewport.dataset.room].some(([key]) => manifest.models[key].lightSources?.length)
      : manifest.models[selected].lightSources?.length;
    $('#light-state').disabled = !enabled;
  }
  function toggleLight() {
    lightEnabled = !lightEnabled; palette.setLightEnabled(lightEnabled);
    viewport.dataset.lightEnabled = String(lightEnabled);
    $('#light-state').textContent = lightEnabled ? 'Light on' : 'Light off';
    $('#light-state').setAttribute('aria-pressed', String(lightEnabled)); render();
  }
  function renderChoices(sectionId) {
    const section = manifest.sections.find(section => section.id === sectionId);
    const choices = $('.choices'); choices.replaceChildren();
    section.exported.forEach((key, index) => {
      const spec = manifest.models[key], button = document.createElement('button');
      button.dataset.model = key; button.setAttribute('aria-pressed', String(selected === key));
      const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
      const details = document.createElement('small'); details.textContent = `${spec.width} × ${spec.depth} tiles`;
      button.append(number, document.createTextNode(spec.label), details); choices.append(button);
    });
  }
  for (const section of manifest.sections) {
    const option = document.createElement('option'); option.value = section.id;
    option.textContent = `${section.order}. ${section.label} · ${section.exported.length}/${section.total}`;
    option.disabled = !section.exported.length; $('#catalog-section').append(option);
    const row = document.createElement('tr');
    for (const text of [section.label, `${section.exported.length}/${section.total}`, section.complete ? 'Exported' : section.exported.length ? 'In progress' : 'Pending']) {
      const cell = document.createElement('td'); cell.textContent = text; row.append(cell);
    }
    $('#migration-progress tbody').append(row);
  }
  $('#catalog-section').value = manifest.models[selected].section;
  renderChoices($('#catalog-section').value);
  function setStyle(name) {
    activeStyle = name;
    renderer.toneMapping = name === 'illustrated' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = name === 'illustrated' ? 1 : 1.25;
    hemi.intensity = name === 'illustrated' ? 1.55 : 1.65;
    key.intensity = name === 'illustrated' ? 2.1 : 3.2;
    fill.intensity = name === 'illustrated' ? .15 : .6;
    key.shadow.intensity = name === 'illustrated' ? .3 : .65;
    wood.color.set(name === 'illustrated' ? '#66504f' : '#765841');
    wall.color.set(name === 'illustrated' ? '#85738b' : '#afa292');
    // Both variants keep their material role and color. The room's palette is
    // intentionally quieter than the original showroom illumination.
    palette.recolor(wood.name, wood.color.getHex());
    palette.recolor(wall.name, wall.color.getHex());
    palette.apply(scene, name);
    for (const model of models.values()) palette.apply(model, name);
    viewport.dataset.style = name;
    press('button[data-style]', button => button.dataset.style === name);
    render();
  }
  async function refreshContact() {
    viewport.dataset.contactReady = 'false';
    status.textContent = '';
    const calibration = manifest.models[selected].contact;
    const fixture = `${$('#resident-look').value}-${$('#resident-body').value}-${calibration?.seatHeight}`;
    await contact.update(models.get(selected), fixture, calibration);
    if (viewport.dataset.mode === 'contact' && contact.group.visible && contact.group.userData.fixture === fixture) {
      viewport.dataset.contactReady = 'true'; render();
    }
  }
  function setColor(color) {
    if (manifest.models[selected].tintable === false) return;
    const role = colorRole();
    colors[selected] = color;
    palette.recolor(role, color, models.get(selected));
    $('#color').value = color;
    press('button[data-color]', button => button.dataset.color.toLowerCase() === color.toLowerCase());
    render();
  }
  function view(name) {
    const target = previewBounds(displayGroup).getCenter(new THREE.Vector3());
    const offsets = { front: [0, 1.4, 7], rear: [0, 1.4, -7], under: [4, -3, 5], iso: [5, Math.sqrt(50 / 3), 5] };
    if (displayGroup === objectGroup && manifest.models[selected].section === 'rugs-floor') {
      offsets.front = [0, 4, 7]; offsets.rear = [0, 4, -7];
    }
    if (displayGroup === objectGroup && (manifest.models[selected].section === 'light-warmth' || manifest.models[selected].shadeOpenings?.length)) offsets.under = [1, -7, 1];
    controls.target.copy(target);
    camera.position.copy(target).add(new THREE.Vector3(...(viewport.dataset.mode === 'contact' ? [0, 0, 7] : offsets[name])));
    camera.zoom = 1; controls.update(); resize();
  }
  function mode(name) {
    stopMotion();
    if (name === 'contact' && !supportsContact()) name = 'object';
    viewport.dataset.mode = name;
    $('#motion-controls').hidden = name !== 'object' || !models.get(selected)?.animations.length;
    updateLightControl();
    displayGroup = name === 'room' ? roomGroup : objectGroup;
    objectGroup.visible = name !== 'room'; roomGroup.visible = name === 'room';
    controls.enableRotate = name !== 'contact';
    $('#contact-controls').hidden = name !== 'contact';
    $('#room-controls').hidden = name !== 'room';
    $('.views').hidden = name === 'contact';
    $('#camera-hint').textContent = name === 'contact' ? 'Fixed front view · Actual game character · Scroll to zoom' : 'Drag to orbit · Scroll to zoom';
    if (name === 'contact') refreshContact().then(() => { if (viewport.dataset.mode === 'contact') view('front'); });
    else contact.cancel();
    press('button[data-mode]', button => button.dataset.mode === name);
    view('iso');
  }
  async function select(key) {
    const version = ++selectionVersion;
    viewport.dataset.loading = 'true';
    status.textContent = `Loading ${manifest.models[key].label}…`;
    let model;
    try { model = await loadModel(key); }
    catch (error) { if (!disposed && version === selectionVersion) showSelectionError(error); return; }
    if (disposed || version !== selectionVersion) return;
    stopMotion();
    selected = key;
    objectGroup.clear(); objectGroup.add(model, contact.group);
    viewport.dataset.model = key;
    $('#model-title').textContent = manifest.models[key].label;
    const fixedPalette = manifest.models[key].tintable === false;
    $('#finish-label').textContent = fixedPalette ? 'FIXED PALETTE' : colorRole().toUpperCase();
    all('button[data-color], #color').forEach(input => { input.disabled = fixedPalette; });
    $('#construction').textContent = manifest.models[key].description;
    $('#download').href = `/assets/${key}.glb`;
    const spec = manifest.models[key];
    $('#asset-info').textContent = `${spec.width} × ${spec.depth} tiles · ${spec.triangles.toLocaleString()} triangles · ${(spec.bytes / 1024).toFixed(0)} KB GLB`;
    press('button[data-model]', button => button.dataset.model === key);
    $('button[data-mode="contact"]').disabled = !supportsContact();
    if (fixedPalette) {
      $('#color').value = manifest.models[key].defaultColor;
      press('button[data-color]', () => false);
    } else setColor(colors[key]);
    mode(viewport.dataset.mode || 'object');
    view('iso');
    status.textContent = ''; viewport.dataset.loading = 'false';
  }
  const showSelectionError = error => { viewport.dataset.loading = 'false'; status.textContent = `Unable to load this furniture: ${error.message}`; };
  $('.choices').addEventListener('click', event => {
    const button = event.target.closest('button[data-model]');
    if (button) select(button.dataset.model).catch(showSelectionError);
  });
  $('#catalog-section').addEventListener('change', () => {
    renderChoices($('#catalog-section').value);
    const first = manifest.sections.find(section => section.id === $('#catalog-section').value).exported[0];
    select(first).catch(showSelectionError);
  });
  all('button[data-mode]').forEach(button => button.addEventListener('click', () => mode(button.dataset.mode)));
  $('#room-layout').addEventListener('change', () => setRoom($('#room-layout').value));
  all('button[data-view]').forEach(button => button.addEventListener('click', () => view(button.dataset.view)));
  all('button[data-color]').forEach(button => button.addEventListener('click', () => setColor(button.dataset.color)));
  all('button[data-style]').forEach(button => button.addEventListener('click', () => setStyle(button.dataset.style)));
  $('#light-state').addEventListener('click', toggleLight);
  $('#motion-state').addEventListener('click', () => {
    if (motionMixer) { stopMotion(); return; }
    const model = models.get(selected), clip = model?.animations.find(clip => clip.name === $('#motion-clip').value);
    if (!clip || viewport.dataset.mode !== 'object') return;
    motionMixer = new THREE.AnimationMixer(model); motionMixer.clipAction(clip).play(); motionTime = performance.now();
    $('#motion-state').setAttribute('aria-pressed', 'true'); $('#motion-state').textContent = 'Stop motion'; viewport.dataset.motion = clip.name; render();
  });
  $('#motion-clip').addEventListener('change', stopMotion);
  for (const id of ['resident-look', 'resident-body']) $(`#${id}`).addEventListener('change', refreshContact);
  $('#color').addEventListener('input', event => setColor(event.target.value));
  renderer.domElement.addEventListener('webglcontextlost', () => { status.textContent = 'The 3D view was interrupted. Reload to try again.'; });
  renderer.domElement.addEventListener('webglcontextrestored', () => { status.textContent = ''; render(); });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true; stopMotion(); cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
    const geometries = new Set(), materials = new Set();
    const collect = node => { if (node.isMesh) { geometries.add(node.geometry); materials.add(node.material); } };
    scene.traverse(collect); for (const model of models.values()) model.traverse(collect);
    palette.materials.forEach(material => materials.add(material));
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    palette.disposeTexture(); contact.dispose();
    renderer.dispose(); renderer.forceContextLoss();
  });
  mode('object'); await select('armchair'); setStyle('illustrated'); status.textContent = '';
  viewport.dataset.ready = 'true';
}

start().catch(error => {
  status.textContent = `Unable to open the 3D preview: ${error.message}`;
  viewport.dataset.error = 'true';
  console.error(error);
});
