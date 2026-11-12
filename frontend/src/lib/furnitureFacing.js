import { ISO_ITEMS } from './isoCatalog';

// Compass names follow the room grid: +gx is east and +gy is south.
// Saved rot values retain their original transpose/rear meaning.
export const FURNITURE_FACINGS = [
  { key: 'south', label: 'South', short: 'S', gx: 0, gy: 1 },
  { key: 'east', label: 'East', short: 'E', gx: 1, gy: 0 },
  { key: 'north', label: 'North', short: 'N', gx: 0, gy: -1 },
  { key: 'west', label: 'West', short: 'W', gx: -1, gy: 0 },
];

export function furnitureFacingRotation(item, rot = 0) {
  const rotation = Number.isInteger(rot) ? ((rot % 4) + 4) % 4 : 0;
  // Loungers are authored lengthwise along X; most catalog fronts face +Z.
  return ISO_ITEMS[item]?.forward === '+X' ? rotation ^ 1 : rotation;
}

export function furnitureFacing({ item, rot = 0 }) {
  return FURNITURE_FACINGS[furnitureFacingRotation(item, rot)];
}

export function furnitureFacingLabel(placement) {
  if (ISO_ITEMS[placement.item]?.wall) return placement.rot % 2 ? 'West wall' : 'North wall';
  return furnitureFacing(placement).label;
}
