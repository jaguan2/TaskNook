import { describe, expect, it } from 'vitest';
import { cleanFurnitureColors, withFurnitureColor } from './furnitureColors';
import { catalogModelRequest } from '../services/catalogModels';
import { isoPresetLayout, validateIsoLayout } from './isoRoom';

describe('per-placement furniture colours', () => {
  it('bounds secondary colours to known parts and canonical hex values', () => {
    expect(cleanFurnitureColors('bed', { frame: '#AABBCC', sheets: 'red', pillows: '#112233', extra: '#445566' }))
      .toEqual({ frame: '#aabbcc', pillows: '#112233' });
    for (const value of [null, [], true, 'red', { frame: 123 }]) expect(cleanFurnitureColors('bed', value)).toBeUndefined();
    expect(cleanFurnitureColors('chair', { frame: '#aabbcc' })).toBeUndefined();
  });

  it('changes and resets one part without changing its neighbours or the source', () => {
    const bed = { id: 'bed', item: 'bed', tint: '#778899', colors: { frame: '#112233', pillows: '#445566' } };
    const before = JSON.stringify(bed);
    const changed = withFurnitureColor(bed, '#AABBCC', 'sheets');
    expect(changed).toMatchObject({ tint: '#778899', colors: { frame: '#112233', sheets: '#aabbcc', pillows: '#445566' } });
    expect(withFurnitureColor(changed, null, 'frame').colors).toEqual({ sheets: '#aabbcc', pillows: '#445566' });
    expect(withFurnitureColor(bed, null)).not.toHaveProperty('tint');
    expect(withFurnitureColor(bed, '#abcdef', 'unknown')).toBe(bed);
    expect(withFurnitureColor(bed, 'bad', 'frame')).toBe(bed);
    expect(JSON.stringify(bed)).toBe(before);
  });

  it('keeps existing blanket colours and secondary choices through layout validation', () => {
    const layout = isoPresetLayout('loft');
    const bed = layout.placements.find(p => p.item === 'bed');
    bed.colors = { frame: '#AABBCC', pillows: '#112233' };
    expect(validateIsoLayout(layout).placements.find(p => p.id === bed.id))
      .toMatchObject({ tint: bed.tint, colors: { frame: '#aabbcc', pillows: '#112233' } });
  });

  it('shares equivalent render requests and separates independently coloured materials', () => {
    const base = { item: 'bed', tint: '#778899' };
    const a = catalogModelRequest({ ...base, colors: { pillows: '#112233', frame: '#AABBCC' } });
    const b = catalogModelRequest({ ...base, colors: { frame: '#aabbcc', pillows: '#112233' } });
    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(catalogModelRequest({ ...base, colors: { frame: '#000000' } }).id);
    expect(catalogModelRequest({ ...base, part: 'duvet', colors: a.options.colors }).options.colors).toEqual(a.options.colors);
  });
});
