import { memo, useLayoutEffect, useRef, useState } from "react";
import { floorPatch, floorPoints, project } from "../lib/iso";
import {
  ISO_ITEMS,
  cutsToMask,
  partitionPieces,
  seatFor,
  seatedPlacement,
  sortIso,
  sortIsoScene,
  stackedPlacement,
  surfaceFor,
  tileOn,
  wallModeOf,
  wallRuns,
} from "../lib/isoRoom";
import ExteriorWall from "./ExteriorWall";
import { ISO_SPRITES } from "./IsoItems";
import PartitionWall from "./PartitionWall";

const PREVIEW_FULL_WALL_H = 100;

// One catalog entry, drawn at postage-stamp size — the SAME sprite the scene
// will place. The iso picker used to show the catalog's emoji (🛏️ for a bed),
// which is exactly the piece of the app where you most want to see what you're
// about to get, and the only browser that didn't show it (the flat room's
// picker has drawn real sprites all along).
/**
 * One catalog sprite in the picker.
 *
 * memo'd because RoomPanel calls useStore(), so every store change re-rendered
 * all ~132 of these — and the panel is on screen whenever you're decorating,
 * since "Decorate" is toggled from inside it. Its props are a single string, so
 * the comparison is free and always correct.
 */
function IsoItemPreviewInner({ itemKey }) {
  const item = ISO_ITEMS[itemKey];
  const Sprite = ISO_SPRITES[itemKey];
  const gRef = useRef(null);
  const [box, setBox] = useState(null);

  // Measure, don't guess. Every sprite is drawn around its own origin with
  // wildly different extents — a wall clock hangs ~100px above the floor line,
  // a rug is flat around it, a tree is 128 tall — so no single hand-written
  // viewBox frames them all. getBBox is exact and runs once per item.
  useLayoutEffect(() => {
    const measured = gRef.current?.getBBox?.();
    if (measured && measured.width > 0 && measured.height > 0) setBox(measured);
  }, [itemKey]);

  if (!item || !Sprite) return null;
  const pad = 4;
  const viewBox = box
    ? `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`
    : "-40 -100 80 110"; // one frame's worth, before the measurement lands

  return (
    // No local <defs>: url(#lampPool) / url(#isoSky) / url(#isoShadow) resolve
    // document-wide to IsoRoom's, which is mounted behind this panel whenever
    // this section is visible (same trick as the flat room's ItemPreview).
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="h-9 w-9 shrink-0"
      aria-hidden="true"
    >
      <g ref={gRef}>
        <Sprite />
      </g>
    </svg>
  );
}

export const IsoItemPreview = memo(IsoItemPreviewInner);

// A preset button IS the room in miniature: the same sprites the scene
// renders, drawn over the preset's floor at postage-stamp size — emoji pills
// told you nothing about what you'd get (user feedback).
/**
 * A whole-room thumbnail for one preset.
 *
 * Also memo'd, and it earns it more than the item previews: each of the eleven
 * draws w×d floor polygons and resolves seating and stacking for ~15 placements.
 * `preset` is a module-level constant object, so the identity is stable.
 */
function IsoPresetPreviewInner({ preset }) {
  const { w, d } = preset.size;
  const mask = preset.size.cuts ? cutsToMask(preset.size.cuts, w, d) : preset.size.mask;
  const size = {
    w,
    d,
    ...(mask && { mask }),
    ...(preset.size.partitions && { partitions: preset.size.partitions }),
    ...(preset.size.arches && { arches: preset.size.arches }),
  };
  const shapedFloor = mask?.some((row) => row.includes("0"));
  const grass = preset.size.env === "garden";
  // Seat personas before sorting, exactly as the scene does — otherwise the
  // "Cozy study" thumbnail shows its resident standing *inside* the chair, and
  // the depth sort orders them from the wrong spot.
  const placed = preset.items.map((p, i) => ({ ...p, id: `pv${i}` }));
  const items = sortIso(
    placed.map((p) => {
      if (ISO_ITEMS[p.item]?.stacks) {
        // Same for things on tables, or the thumbnail shows the mug on the
        // floor beside the desk it's meant to be standing on.
        const on = surfaceFor(p, placed);
        return on ? { ...p, ...stackedPlacement(p, on) } : p;
      }
      if (!ISO_ITEMS[p.item]?.persona) return p;
      const seat = seatFor(p, placed);
      if (!seat) return p;
      return { ...p, ...seatedPlacement(p, seat) };
    })
  );
  const previewWallMode = wallModeOf(preset.size.env, preset.size.walls);
  const previewWallH =
    previewWallMode === "full" ? PREVIEW_FULL_WALL_H : previewWallMode === "low" ? 30 : 0;
  const shellRuns = previewWallH ? wallRuns(size) : [];
  const sceneLayers = sortIsoScene(items, partitionPieces(size));
  const wallColor = (plane) =>
    plane === "gy"
      ? preset.size.wallColors?.right || "rgb(var(--color-rose))"
      : preset.size.wallColors?.left || "rgb(var(--color-blush))";
  const previewItem = (p, key) => {
    const item = ISO_ITEMS[p.item];
    const Sprite = ISO_SPRITES[p.item];
    if (!item || !Sprite) return null;
    const at = project(p.gx, p.gy);
    const sprite = item.persona ? (
      <g transform={p._seat ? `translate(0, ${-p._seat})` : undefined}>
        <Sprite seated={!!p._seat} seatH={p._seat || 0} />
      </g>
    ) : (
      <Sprite
        rot={(p.rot || 0) % 2}
        back={(p.rot || 0) >= 2}
        variant={item.variants?.[p.tint]}
      />
    );
    return (
      <g
        key={key}
        transform={`translate(${at.x},${at.y})`}
        style={p.tint ? { "--tint": p.tint } : undefined}
      >
        {(p.rot || 0) % 2 ? <g transform="scale(-1,1)">{sprite}</g> : sprite}
      </g>
    );
  };
  const L = project(0, d);
  const R = project(w, 0);
  const F = project(w, d);
  return (
    <svg
      viewBox={`${L.x - 6} -118 ${R.x - L.x + 12} ${F.y + 132}`}
      className="h-24 w-full"
      aria-hidden="true"
    >
      {shellRuns.map((run, index) => (
        <ExteriorWall
          key={`shell-${index}`}
          run={run}
          height={previewWallH}
          fill={wallColor(run.plane)}
          compact
        />
      ))}
      {shapedFloor ? (
        Array.from({ length: d }, (_, ty) =>
          Array.from({ length: w }, (_, tx) =>
            tileOn(size, tx, ty) ? (
              <polygon
                key={`${tx}-${ty}`}
                points={floorPatch(tx, ty, 1, 1)}
                fill={grass ? "#3d6a50" : "rgb(var(--color-wine))"}
                opacity="0.8"
              />
            ) : null
          )
        )
      ) : (
        <polygon
          points={floorPoints(w, d)}
          fill={grass ? "#3d6a50" : "rgb(var(--color-wine))"}
          opacity="0.8"
        />
      )}
      {sceneLayers.map((layer) =>
        layer.kind === "partition"
          ? (
              <PartitionWall
                key={layer.key}
                run={layer.partition}
                // A drawn interior wall is architecture even in a low-wall or
                // open-air preset. Full rooms meet the preview's roof exactly.
                height={Math.max(previewWallH, PREVIEW_FULL_WALL_H)}
                fill={wallColor(layer.partition.plane)}
                compact
              />
            )
          : previewItem(layer.placement, layer.key)
      )}
    </svg>
  );
}

export const IsoPresetPreview = memo(IsoPresetPreviewInner);

