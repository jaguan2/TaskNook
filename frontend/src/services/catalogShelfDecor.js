import * as THREE from 'three';

// Custom contents reuse the closed book and plant meshes from the catalog.
// Each loaded shelf owns a bounded set of layouts. Changing one placement's
// colours cannot recolour another shelf's cached image or source materials.
export function createShelfDecorator(palette, load) {
  const shelves = new WeakMap();
  const boundsOf = node => new THREE.Box3().setFromObject(node);

  function bookTemplate(source) {
    const group = new THREE.Group();
    const content = source.children.find(node => node.userData.contents)?.userData.contents.find(entry => entry.name === 'lower-book-0');
    if (!content) throw new Error('The catalog book template has no authored parts.');
    source.updateMatrixWorld(true);
    for (const name of content.parts) {
      const original = source.getObjectByName(name);
      const mesh = original.clone();
      original.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
      group.add(mesh);
    }
    const box = boundsOf(group);
    group.position.set(-box.min.x, -box.min.y, -box.min.z);
    const wrapper = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const copy = group.clone(true);
      copy.position.x += i * .10;
      copy.scale.y = .85 + i * .075;
      wrapper.add(copy);
    }
    return wrapper;
  }

  function fit(template, slot, index, count, isBook) {
    const object = template.clone(true);
    const box = boundsOf(object), size = box.getSize(new THREE.Vector3());
    const width = slot.width / count * (isBook ? .73 : .88);
    const scale = Math.min(width / size.x, slot.depth / size.z * .85, slot.height / size.y * (isBook ? .86 : .93));
    object.scale.multiplyScalar(scale);
    object.position.set(slot.x - slot.width / 2 + slot.width * (index + .5) / count - (box.min.x + size.x / 2) * scale,
      slot.top - box.min.y * scale - .001, slot.z - (box.min.z + size.z / 2) * scale);
    return object;
  }

  async function prepare(model) {
    if (shelves.has(model)) return shelves.get(model);
    const metadata = model.children.find(node => node.userData.shelfDecor)?.userData.shelfDecor;
    if (!metadata) throw new Error('This shelf has no decoration supports.');
    const [books, plant, succulent] = await Promise.all([load('bookshelf'), load('plant'), load('succulent')]);
    // Source assets may still be attached to the last paint. Work in their own
    // coordinates; the renderer serializes this operation with all other paints.
    for (const source of new Set([model, books, plant, succulent])) {
      source.removeFromParent();
      source.updateMatrixWorld(true);
    }
    const template = bookTemplate(books);
    const boxes = metadata.boards.map(name => boundsOf(model.getObjectByName(name)));
    const top = boundsOf(model).max.y;
    const slots = boxes.map((box, i) => ({ x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2,
      top: box.max.y, width: box.max.x - box.min.x - .12, depth: box.max.z - box.min.z,
      height: Math.max(.10, (boxes[i + 1]?.min.y ?? top) - box.max.y - .025) }));
    const state = { metadata, slots, template, plant, succulent, layouts: new Map() };
    shelves.set(model, state);
    return state;
  }

  return async function decorate(model, decor) {
    const metadata = model.children.find(node => node.userData.shelfDecor)?.userData.shelfDecor;
    if (!metadata) return;
    // Empty original arrangements still allow book recolouring without replacing
    // the authored bins, stacked folios, bowls and plants.
    const layout = decor?.layout;
    const state = layout && layout !== 'empty' ? await prepare(model) : shelves.get(model);
    state?.layouts.forEach(group => { group.visible = false; });
    metadata.parts.forEach(name => { const node = model.getObjectByName(name); if (node) node.visible = !layout; });
    const color = decor?.bookColor;
    for (const [i, hex] of ['#6b986a', '#cf765c', '#d0a34d', '#598fa4'].entries()) palette.recolor(`book-cover-${i}`, color || hex, model);
    if (!layout || layout === 'empty') return;
    if (!state.layouts.has(layout)) {
      const group = new THREE.Group();
      group.name = `shelf-layout-${layout}`;
      state.slots.forEach((slot, row) => {
        const count = slot.width > 1 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const isBook = layout === 'books' || (layout === 'mixed' && (row + i) % 2 === 0);
          const object = fit(isBook ? state.template : (row + i) % 2 ? state.plant : state.succulent, slot, i, count, isBook);
          if (isBook) object.traverse(node => {
            if (node.isMesh && node.material.name.startsWith('book-cover-')) {
              node.material = new THREE.MeshStandardMaterial({ name: 'shelf-book-accent', color: node.material.color.clone(), roughness: .85 });
            }
          });
          group.add(object);
        }
      });
      model.add(group);
      state.layouts.set(layout, group);
      palette.apply(group, 'illustrated');
    }
    const group = state.layouts.get(layout);
    group.visible = true;
    palette.recolor('shelf-book-accent', color || '#598fa4', group);
  };
}
