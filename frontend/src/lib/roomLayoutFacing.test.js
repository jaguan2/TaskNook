import { describe, expect, it } from 'vitest';
import { COMMON_PLACES } from './commonRooms';
import { ISO_PRESETS, footOf, newIsoPlacement, validateIsoLayout } from './isoRoom';
import { furnitureFacing, furnitureFacingRotation } from './furnitureFacing';

function center(item) {
  const [w, d] = footOf(item.item, item.rot);
  return { gx: item.gx + w / 2, gy: item.gy + d / 2 };
}

function faces(seat, target) {
  const a = center(seat), b = center(target), direction = furnitureFacing(seat);
  const dx = b.gx - a.gx, dy = b.gy - a.gy;
  const ahead = dx * direction.gx + dy * direction.gy;
  const across = Math.abs(dx * direction.gy - dy * direction.gx);
  expect(ahead, `${seat.item} must face ${target.item}`).toBeGreaterThan(0);
  expect(across, `${seat.item} must look toward its group`).toBeLessThanOrEqual(ahead + .3);
}

describe('authored room facing and upholstery', () => {
  it.each(['loft', 'cabin', 'holiday'])('%s groups its lounge seats around the coffee table', key => {
    const items = ISO_PRESETS[key].items, table = items.find(p => p.item === 'coffeetable');
    for (const seat of items.filter(p => ['sofa', 'armchair'].includes(p.item))) faces(seat, table);
  });

  it.each(['cafeteria', 'library', 'hall', 'terrace'])('%s points its dining seats at a table', key => {
    const items = ISO_PRESETS[key].items, tables = items.filter(p => ['diningtable', 'cafetable'].includes(p.item));
    for (const seat of items.filter(p => ['chair', 'woodstool'].includes(p.item))) {
      const a = center(seat);
      const closest = [...tables].sort((p, q) => {
        const b = center(p), c = center(q);
        return Math.hypot(a.gx - b.gx, a.gy - b.gy) - Math.hypot(a.gx - c.gx, a.gy - c.gy);
      })[0];
      faces(seat, closest);
    }
  });

  it('points pool loungers toward the water and keeps the serving table clear of the loungers', () => {
    const items = ISO_PRESETS.summer.items, pool = items.find(p => p.item === 'longpool');
    const table = items.find(p => p.item === 'cafetable');
    const loungers = items.filter(p => p.item === 'sunlounger');
    for (const seat of loungers) {
      faces(seat, pool);
      const a = center(seat), b = center(table);
      expect(Math.hypot(a.gx - b.gx, a.gy - b.gy)).toBeLessThan(2);
    }
    expect(new Set(loungers.map(p => p.tint)).size).toBe(1);
  });

  it('keeps Reading Room storage on its walls with the openings toward the room', () => {
    for (const shelf of ISO_PRESETS.library.items.filter(p => ['bookshelf', 'bookcase'].includes(p.item))) {
      expect(shelf.gx === 0 || shelf.gy === 0).toBe(true);
      expect(furnitureFacing(shelf).key).toBe(shelf.gx === 0 && shelf.gy > 0 ? 'east' : 'south');
    }
  });

  it('uses one default upholstery for each room’s couches and armchairs', () => {
    const rooms = [...Object.values(ISO_PRESETS).map(p => p.items), ...Object.values(COMMON_PLACES).map(p => p.props)];
    for (const items of rooms) {
      const seats = items.filter(p => ['sofa', 'armchair'].includes(p.item));
      if (seats.length > 1) expect(new Set(seats.map(p => p.tint)).size).toBe(1);
    }
  });

  it('gives newly added couches the room’s upholstery without changing existing items', () => {
    const existing = [{ id: 'couch', item: 'sofa', gx: 0, gy: 0, tint: '#7f9ec9' }];
    const before = JSON.stringify(existing);
    for (const item of ['sofa', 'armchair']) expect(newIsoPlacement(item, existing).tint).toBe('#7f9ec9');
    expect(newIsoPlacement('chair', existing).tint).toBeUndefined();
    expect(JSON.stringify(existing)).toBe(before);
  });

  it('keeps common-place occupants facing the same way as their physical seats', () => {
    for (const room of Object.values(COMMON_PLACES)) for (const seat of room.seats) {
      const support = room.props.find(p => p.id === seat.furniture);
      expect(seat.rot).toBe(furnitureFacingRotation(support.item, support.rot));
      expect(seat.facing).toBe(seat.rot >= 2 ? 'back' : 'front');
    }
    const room = COMMON_PLACES['common-cottage'];
    const table = room.props.find(p => p.id === 'nook-table');
    for (const seat of room.props.filter(p => p.id === 'nook-chair-left' || p.id === 'nook-chair-right')) faces(seat, table);
  });

  it('points Willow Pond’s side chairs at the patio table and library hearth seats toward the fire', () => {
    const pond = COMMON_PLACES['willow-pond'];
    const table = pond.props.find(p => p.id === 'patio-table');
    for (const seat of pond.props.filter(p => p.id === 'patio-chair-left' || p.id === 'patio-chair-right')) faces(seat, table);
    faces(pond.props.find(p => p.id === 'pond-bench'), pond.props.find(p => p.id === 'pond'));
    const library = COMMON_PLACES['grand-library'];
    const hearth = library.props.find(p => p.id === 'fireplace');
    for (const seat of library.props.filter(p => p.id === 'fireside-chair' || p.id === 'fireside-front-chair')) faces(seat, hearth);
  });

  it('preserves every authored facing when presets pass through save validation', () => {
    for (const preset of Object.values(ISO_PRESETS)) {
      const placements = preset.items.map((p, index) => ({ ...p, id: `item-${index}` }));
      const saved = validateIsoLayout({ ...preset.size, version: 2, placements });
      expect(saved.placements.map(p => p.rot || 0)).toEqual(placements.map(p => p.rot || 0));
    }
  });
});
