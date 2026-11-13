const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Property patches let undo preserve unrelated pet/character updates. Room
 * snapshots alone would roll those changes back along with a furniture edit. */
export function roomEditChanges(before, after) {
  const changes = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key !== 'placements' && !same(before[key], after[key])) changes.push({ key, before: before[key], after: after[key] });
  }
  const old = new Map(before.placements.map((p, index) => [p.id, { p, index }]));
  const next = new Map(after.placements.map((p, index) => [p.id, { p, index }]));
  for (const id of new Set([...old.keys(), ...next.keys()])) {
    const a = old.get(id), b = next.get(id);
    if (!a || !b) {
      changes.push({ id, before: a?.p, after: b?.p, beforeIndex: a?.index, afterIndex: b?.index });
      continue;
    }
    for (const key of new Set([...Object.keys(a.p), ...Object.keys(b.p)])) {
      if (!same(a.p[key], b.p[key])) changes.push({ id, key, before: a.p[key], after: b.p[key] });
    }
  }
  return changes;
}

export function mergeRoomEditChanges(first, last) {
  const merged = new Map(first.map(change => [JSON.stringify([change.id, change.key]), change]));
  for (const change of last) {
    const key = JSON.stringify([change.id, change.key]), previous = merged.get(key);
    merged.set(key, previous ? { ...previous, after: change.after, afterIndex: change.afterIndex } : change);
  }
  return [...merged.values()].filter(change => !same(change.before, change.after));
}

export function applyRoomEditChanges(room, changes, direction) {
  const next = { ...room, placements: [...room.placements] };
  for (const change of changes) {
    const value = change[direction];
    if (change.id == null) {
      if (value === undefined) delete next[change.key]; else next[change.key] = value;
      continue;
    }
    const index = next.placements.findIndex(p => p.id === change.id);
    if (change.key == null) {
      if (index >= 0) next.placements.splice(index, 1);
      if (value !== undefined) next.placements.splice(Math.min(change[`${direction}Index`] ?? next.placements.length, next.placements.length), 0, value);
    } else if (index >= 0) {
      const placement = { ...next.placements[index] };
      if (value === undefined) delete placement[change.key]; else placement[change.key] = value;
      next.placements[index] = placement;
    }
  }
  return next;
}
