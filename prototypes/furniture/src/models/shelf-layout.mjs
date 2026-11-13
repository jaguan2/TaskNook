import * as THREE from 'three';

const BOARDS = {
  bookshelf: ['supported-shelf-0', 'supported-shelf-1', 'supported-shelf-2', 'supported-shelf-3'],
  bookcase: ['supported-shelf-0', 'supported-shelf-1', 'supported-shelf-2'],
  shelf: ['supported-shelf-0', 'supported-shelf-1', 'supported-shelf-2'],
  ladder: ['tapered-depth-shelf-0', 'tapered-depth-shelf-1', 'tapered-depth-shelf-2'],
  wallshelf: ['shelf-board'], plantshelf: ['tray-0', 'tray-1', 'tray-2'],
};

export function shelfMetadata(root) {
  return root.userData.shelfDecor || root.children.find(node => node.userData.shelfDecor)?.userData.shelfDecor;
}

export function attachShelfDecor(root, key) {
  const boards = BOARDS[key];
  if (!boards) return;
  const dividers = root.children.filter(node => /^(case-divider|intermediate-support)/.test(node.name)).map(node => node.name);
  root.userData.shelfDecor = { boards, parts: (root.userData.contents || []).flatMap(content => content.parts),
    ...(dividers.length && { dividers }) };
}

/** Real receiving surfaces, split into usable bays around intermediate posts. */
export function shelfSlots(root) {
  root.updateMatrixWorld(true);
  const metadata = shelfMetadata(root), box = node => new THREE.Box3().setFromObject(node);
  const boards = metadata.boards.map(name => box(root.getObjectByName(name)));
  const dividers = (metadata.dividers || []).map(name => box(root.getObjectByName(name)));
  const top = box(root).max.y;
  return boards.flatMap((board, i) => {
    const cuts = dividers.map(divider => (divider.min.x + divider.max.x) / 2)
      .filter(x => x > board.min.x + .1 && x < board.max.x - .1)
      .sort((a, b) => a - b).filter((x, j, xs) => !j || x - xs[j - 1] > .01);
    const edges = [board.min.x, ...cuts, board.max.x];
    return edges.slice(1).map((right, bay) => ({
      board: metadata.boards[i], x: (edges[bay] + right) / 2, z: (board.min.z + board.max.z) / 2,
      top: board.max.y, width: right - edges[bay] - .12, depth: board.max.z - board.min.z,
      height: Math.max(.10, (boards[i + 1]?.min.y ?? top) - board.max.y - .025),
    }));
  });
}

/** Refit complete authored objects and stacks, never stretch books or pots.
 * Called only on new identity-transform source roots, before palette registration. */
export function reflowShelfContents(root) {
  const contents = root.userData.contents || [], owner = new Map();
  contents.forEach(content => content.parts.forEach(name => owner.set(name, content)));
  const groups = new Map(), meshGroup = new Map();
  for (const content of contents) {
    let base = content;
    while (owner.has(base.support)) base = owner.get(base.support);
    if (!groups.has(base)) {
      const group = new THREE.Group(); group.name = `original-${base.name}`; root.add(group); groups.set(base, group);
    }
    const group = groups.get(base);
    for (const name of content.parts) {
      const mesh = root.getObjectByName(name);
      if (mesh) { group.add(mesh); meshGroup.set(name, group); }
    }
  }
  const slots = shelfSlots(root);
  for (const board of new Set(slots.map(slot => slot.board))) {
    const bays = slots.filter(slot => slot.board === board);
    const objects = [...groups].filter(([content]) => content.support === board).map(([, group]) => group);
    const bounds = group => new THREE.Box3().setFromObject(group);
    objects.sort((a, b) => bounds(a).min.x - bounds(b).min.x);
    bays.forEach((slot, bay) => {
      const items = objects.filter((_, i) => Math.floor(i * bays.length / objects.length) === bay);
      items.forEach((group, i) => {
        const box = bounds(group), size = box.getSize(new THREE.Vector3());
        const scale = Math.min(1, (slot.width / items.length - .025) / size.x,
          (slot.depth - .035) / size.z, slot.height * .94 / size.y);
        group.scale.setScalar(scale);
        group.position.set(slot.x - slot.width / 2 + slot.width * (i + .5) / items.length - (box.min.x + size.x / 2) * scale,
          slot.top - box.min.y * scale - .004, slot.z - (box.min.z + size.z / 2) * scale);
      });
    });
  }
  // Keep explicit contact probes in the same coordinates as moved contents.
  for (const joint of root.userData.joints || []) {
    const group = joint.parts.map(name => meshGroup.get(name)).find(Boolean);
    if (group) joint.point = joint.point.map((value, axis) => value * group.scale.x + group.position.getComponent(axis));
  }
  root.updateMatrixWorld(true);
}
