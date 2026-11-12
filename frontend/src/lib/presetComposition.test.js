import { describe, expect, it } from 'vitest';
import { COMMON_PLACES } from './commonRooms';
import { ISO_ITEMS, ISO_PRESETS, freeSeatSpot, isoDepth, isoPresetLayout, seatedPlacement, seatFor, surfaceFor } from './isoRoom';

describe('personal-room composition', () => {
  it('keeps furnished personal floors compact while preserving public-place capacities', () => {
    for (const [key, preset] of Object.entries(ISO_PRESETS)) {
      if (key === 'empty') continue;
      expect(preset.size.w * preset.size.d, key).toBeLessThanOrEqual(key === 'summer' ? 80 : 72);
      expect(preset.items.length, key).toBeLessThanOrEqual(20);
      expect(preset.items.filter(p => ISO_ITEMS[p.item].softSeat).length, key).toBeLessThanOrEqual(1);
    }
    expect(COMMON_PLACES['common-cottage'].seats).toHaveLength(6);
    expect(COMMON_PLACES['willow-pond'].seats).toHaveLength(6);
    expect(COMMON_PLACES['grand-library'].seats).toHaveLength(36);
    expect(COMMON_PLACES['grand-library']).toMatchObject({ w: 30, d: 20 });
  });

  it('makes the owner arrive on an intentional seat rather than a textile or stock pile', () => {
    for (const key of Object.keys(ISO_PRESETS).filter(key => key !== 'empty')) {
      const layout = isoPresetLayout(key), arrival = freeSeatSpot(layout.placements);
      expect(arrival, key).toBeTruthy();
      const seat = seatFor({ item: 'resident', ...arrival }, layout.placements);
      expect(seat?.soft, key).not.toBe(true);
      expect(['logstack', 'haybale'], key).not.toContain(seat.placement.item);
    }
    const winter = isoPresetLayout('winter');
    expect(seatFor({ item: 'resident', ...freeSeatSpot(winter.placements) }, winter.placements).placement.item).toBe('bench');
    const shop = isoPresetLayout('plantshop');
    const owner = { item: 'you', ...freeSeatSpot(shop.placements, 'you') };
    const sitter = seatedPlacement(owner, seatFor(owner, shop.placements));
    const pottingTable = shop.placements.find(p => p.item === 'diningtable');
    expect(sitter._depth).toBeGreaterThan(isoDepth(pottingTable));
  });

  it('supports tabletop accessories on actual furniture', () => {
    const tabletop = new Set(['computer', 'laptop', 'mug', 'bookstack', 'desklamp', 'tablelamp', 'till', 'pastrycase', 'fruitbowl', 'orchid', 'succulent', 'seedtray', 'wateringcan', 'ciderset', 'candle']);
    for (const [key, preset] of Object.entries(ISO_PRESETS)) {
      const items = preset.items.map((p, i) => ({ ...p, id: `piece-${i}` }));
      for (const p of items.filter(p => tabletop.has(p.item))) expect(surfaceFor(p, items), `${key}: ${p.item}`).toBeTruthy();
    }
  });

  it('reserves public-scale study halls for shared places', () => {
    const studio = ISO_PRESETS.hall;
    expect(studio.label).toBe('Study studio');
    expect(studio.items.filter(p => p.item === 'diningtable')).toHaveLength(1);
    expect(studio.items.filter(p => p.item === 'chair')).toHaveLength(2);
    expect(studio.items.some(p => ISO_ITEMS[p.item].persona)).toBe(false);
    expect(studio.items.some(p => p.item === 'piano')).toBe(false);
  });

  it('keeps default strangers out of personal retreats and leaves Empty deliberately empty', () => {
    for (const [key, preset] of Object.entries(ISO_PRESETS)) {
      const residents = preset.items.filter(p => ISO_ITEMS[p.item].persona);
      expect(residents.length, key).toBeLessThanOrEqual(['home', 'cafeteria'].includes(key) ? 1 : 0);
    }
    expect(ISO_PRESETS.empty.items).toEqual([]);
  });
});
