import { useEffect, useRef, useState } from "react";
import { ISO_ITEMS, footOf, footprintFree, petTemper } from "./isoRoom";

export function overSoftSpot(placements, gx, gy, footprint) {
  return placements.some((placement) => {
    if (ISO_ITEMS[placement.item]?.layer !== -1) return false;
    const otherFoot = footOf(placement.item, placement.rot);
    return gx < placement.gx + otherFoot[0] &&
      placement.gx < gx + footprint[0] &&
      gy < placement.gy + otherFoot[1] &&
      placement.gy < gy + footprint[1];
  });
}

/** Visual-only pet motion. Stored placement coordinates remain untouched. */
export function usePetRoaming({ placements, size, editMode, reduceMotion, paused }) {
  const roaming = useRef({});
  const [, renderTick] = useState(0);

  useEffect(() => {
    if (editMode || reduceMotion || paused) {
      if (!paused) roaming.current = {};
      return undefined;
    }
    const interval = setInterval(() => {
      const wanderers = placements.filter((placement) => ISO_ITEMS[placement.item]?.roamer);
      if (!wanderers.length) return;
      const placement = wanderers[Math.floor(Math.random() * wanderers.length)];
      const saved = roaming.current[placement.id];
      const current = saved && saved.hx === placement.gx && saved.hy === placement.gy
        ? saved
        : { dx: 0, dy: 0 };
      const footprint = footOf(placement.item, placement.rot);
      const temper = petTemper(placement.temper);
      if (Math.random() > temper.chance) return;
      if (
        overSoftSpot(
          placements,
          placement.gx + current.dx,
          placement.gy + current.dy,
          footprint
        ) && Math.random() < temper.stay
      ) return;

      const next = {
        dx: Math.max(-temper.range, Math.min(temper.range, current.dx + (Math.random() * 2 - 1))),
        dy: Math.max(-temper.range, Math.min(temper.range, current.dy + (Math.random() * 2 - 1))),
      };
      const gx = placement.gx + next.dx;
      const gy = placement.gy + next.dy;
      if (!footprintFree(gx, gy, footprint, size)) return;
      const blocked = placements.some((other) => {
        if (other.id === placement.id) return false;
        const item = ISO_ITEMS[other.item];
        if (!item || item.wall || item.persona || item.roamer || item.layer === -1) return false;
        const otherFoot = footOf(other.item, other.rot);
        return gx < other.gx + otherFoot[0] && other.gx < gx + footprint[0] &&
          gy < other.gy + otherFoot[1] && other.gy < gy + footprint[1];
      });
      if (blocked) return;

      const dx = next.dx - current.dx;
      const dy = next.dy - current.dy;
      const screenDx = (dx - dy) * 24;
      const screenDy = (dx + dy) * 12;
      const facing = Math.hypot(screenDx, screenDy) < 2.5
        ? current.facing || "front"
        : Math.abs(screenDy) > Math.abs(screenDx) * 0.6
          ? screenDy < 0 ? "back" : "front"
          : "side";
      roaming.current = {
        ...roaming.current,
        [placement.id]: { ...next, facing, hx: placement.gx, hy: placement.gy },
      };
      renderTick((tick) => tick + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, [editMode, reduceMotion, paused, placements, size]);

  return (placement) => {
    const saved = !editMode && roaming.current[placement.id];
    return saved && saved.hx === placement.gx && saved.hy === placement.gy ? saved : null;
  };
}
