// Original review arrangements, not saved rooms or production presets.
export const ROOM_LAYOUTS = {
  lounge: [
    ['sofa', [-.55, 0, -.95], 0],
    ['armchair', [1.23, 0, .05], -Math.PI / 2],
    ['coffeetable', [-.5, 0, .65], 0],
  ],
  study: [
    ['desk', [-.8, 0, -.85], 0],
    ['deskchair', [-.8, 0, .30], Math.PI],
    ['sidetable', [1.25, 0, -1.25], 0],
  ],
  cafe: [
    ['cafetable', [-.5, 0, .35], 0],
    ['chair', [-.5, 0, 1.35], Math.PI],
    ['chair', [-.5, 0, -.65], 0],
    ['coffeecounter', [1.5, 0, -1.1], 0],
    ['barcounter', [-1.55, 0, -1.35], 0],
  ],
  storage: [
    ['bookcase', [.55, 0, -1.34], 0],
    ['shelf', [-1.94, 0, -.50], Math.PI / 2],
    ['armchair', [-.75, 0, .60], 0],
    ['booktrolley', [1.25, 0, .55], 0],
  ],
  textiles: [
    ['persianrug', [-.2, 0, -.10], 0],
    ['armchair', [-.65, 0, -.65], 0, 'persianrug'],
    ['coffeetable', [-.25, 0, .45], 0, 'persianrug'],
    ['petbed', [1.70, 0, .80], 0],
    ['nightstand', [1.60, 0, -1.20], 0],
  ],
  lighting: [
    ['fireplace', [.65, 0, -1.2], 0],
    ['floorlamp', [-1.80, 0, -1.10], 0],
    ['armchair', [-.90, 0, .45], 0],
    ['nightstand', [1.40, 0, .40], 0],
    ['tablelamp', [1.40, 0, .40], 0, 'nightstand'],
  ],
};

export function populateRoom(group, layout, models, metadata = {}) {
  group.clear();
  for (const [key, at, rotation, support] of layout) {
    const copy = models.get(key).clone(true);
    copy.position.set(...at); copy.rotation.y = rotation;
    if (support) {
      if (!metadata[support]) throw new Error(`Unknown room support: ${support}`);
      copy.position.y += metadata[support].height;
    }
    group.add(copy);
  }
}
