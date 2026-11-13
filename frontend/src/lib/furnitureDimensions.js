// Dimensions are canonical (before rotation), in tiles. Existing pieces keep
// their authored footprint; only an explicit resize opts into the half grid.
export const DEFAULT_BED_DIMENSIONS = { w: 2, d: 2.8 };
export const RESIZABLE_FURNITURE = {
  bed: { defaults: DEFAULT_BED_DIMENSIONS, minW: 1, maxW: 4, minD: 2, maxD: 4 },
  sofa: { defaults: { w: 2, d: .85 }, minW: 1.5, maxW: 5, minD: 1, maxD: 1.5 },
  desk: { defaults: { w: 2.2, d: 1.2 }, minW: 2, maxW: 5, minD: 1, maxD: 2 },
  bookshelf: { defaults: { w: 1.5, d: .7 }, minW: 1, maxW: 5, minD: .5, maxD: 1.5 },
  bookcase: { defaults: { w: 2, d: .6 }, minW: 1, maxW: 5, minD: .5, maxD: 1.5 },
  shelf: { defaults: { w: 1, d: .5 }, minW: 1, maxW: 5, minD: .5, maxD: 1.5 },
  ladder: { defaults: { w: .9, d: .5 }, minW: 1, maxW: 5, minD: .5, maxD: 1.5 },
  plantshelf: { defaults: { w: 1.5, d: .6 }, minW: 1, maxW: 5, minD: .5, maxD: 1.5 },
  wallshelf: { defaults: { w: 1.6, d: .3 }, minW: 1, maxW: 5, minD: .5, maxD: 1 },
};

export function cleanFurnitureDimensions(item, value) {
  const limits = RESIZABLE_FURNITURE[item];
  if (!limits || !value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { w, d } = value;
  if (!Number.isFinite(w) || !Number.isFinite(d)) return undefined;
  if (w < limits.minW || w > limits.maxW || d < limits.minD || d > limits.maxD || !Number.isInteger(w * 2) || !Number.isInteger(d * 2)) return undefined;
  return { w, d };
}

export function bedDimensions(placement) {
  return cleanFurnitureDimensions(placement.item, placement.dimensions) || DEFAULT_BED_DIMENSIONS;
}

export function furnitureDimensions(placement) {
  return cleanFurnitureDimensions(placement.item, placement.dimensions) || RESIZABLE_FURNITURE[placement.item]?.defaults;
}

export function snapFurnitureDimensions(item, w, d) {
  const limits = RESIZABLE_FURNITURE[item];
  if (!limits) return undefined;
  return { w: Math.max(limits.minW, Math.min(limits.maxW, Math.round(w * 2) / 2)),
    d: Math.max(limits.minD, Math.min(limits.maxD, Math.round(d * 2) / 2)) };
}
export const snapBedDimensions = (w, d) => snapFurnitureDimensions('bed', w, d);

// Pillow widths and gaps stay physical as the bed grows; they are not scaled
// with the entire bed. Both the mesh builder and SVG fallback use this layout.
export function bedPillows(width) {
  const count = Math.max(1, Math.round(width));
  const spacing = width / count - .14;
  return Array.from({ length: count }, (_, i) => ({
    x: (i - (count - 1) / 2) * spacing,
    width: Math.min(.73, spacing - .13),
    name: `pillow-${count === 2 ? (i === 0 ? -1 : 1) : i}`,
  }));
}
