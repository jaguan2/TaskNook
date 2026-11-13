// The primary material keeps the existing `tint` field. Optional secondary
// colours belong to a placement, so one catalog item can have many finishes.
export const FURNITURE_COLOR_PARTS = {
  bed: {
    main: { label: 'Blanket', role: 'linen', defaultColor: '#8baba0' },
    frame: { label: 'Frame', role: 'frame', defaultColor: '#946b50' },
    sheets: { label: 'Sheets', role: 'sheets', defaultColor: '#e7dfd0' },
    pillows: { label: 'Pillows', role: 'pillows', defaultColor: '#e7dfd0' },
  },
};

const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function cleanFurnitureColors(item, value) {
  const parts = FURNITURE_COLOR_PARTS[item];
  if (!parts || !value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const colors = {};
  for (const part of Object.keys(parts).filter(key => key !== 'main')) {
    if (validHex(value[part])) colors[part] = value[part].toLowerCase();
  }
  return Object.keys(colors).length ? colors : undefined;
}

/** Update one colour or reset it without changing other materials or decor. */
export function withFurnitureColor(placement, value, part = 'main') {
  if (part !== 'main' && !Object.hasOwn(FURNITURE_COLOR_PARTS[placement.item] || {}, part)) return placement;
  if (value != null && !validHex(value)) return placement;
  if (part === 'main') {
    const { tint: _previous, ...rest } = placement;
    return value ? { ...rest, tint: value.toLowerCase() } : rest;
  }
  const colors = { ...placement.colors };
  if (value) colors[part] = value.toLowerCase();
  else delete colors[part];
  const { colors: _previous, ...rest } = placement;
  const cleaned = cleanFurnitureColors(placement.item, colors);
  return cleaned ? { ...rest, colors: cleaned } : rest;
}
