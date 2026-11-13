import { furnitureFacing } from '../lib/furnitureFacing';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { catalogImages, catalogModelRequest, CATALOG_MODELS } from '../services/catalogModels';
import IsoResizableFallback from './IsoResizableFallback';

export function hasCatalogModel(key) {
  return !!CATALOG_MODELS[key];
}

export default function IsoCatalogModel({ item, tint, decor, colors, dimensions, rot = 0, lit = true, part = 'whole', showLaptop = false, children }) {
  const request = useMemo(
    () => catalogModelRequest({ item, tint, decor, colors, dimensions, rot, lit, part, showLaptop }),
    [item, tint, decor, colors, dimensions, rot, lit, part, showLaptop],
  );
  const subscribe = useCallback(
    listener => request ? catalogImages.subscribe(request, listener) : () => {},
    [request],
  );
  const snapshot = useCallback(
    () => request ? catalogImages.snapshot(request) : catalogImages.serverSnapshot(),
    [request],
  );
  const frame = useSyncExternalStore(subscribe, snapshot, catalogImages.serverSnapshot);
  const [previousFrame, setPreviousFrame] = useState(null);
  const imageLease = useRef(null);

  useLayoutEffect(() => {
    if (!request) {
      imageLease.current?.release();
      imageLease.current = null;
      setPreviousFrame(null);
      return;
    }
    if (frame.image && imageLease.current?.id !== request.id) {
      // Keep the previous GLB visible while a recolor/turn renders, with a
      // real lease so its URL cannot be evicted before the replacement lands.
      const release = catalogImages.subscribe(request, () => {});
      imageLease.current?.release();
      imageLease.current = { id: request.id, release };
      setPreviousFrame({ item, part, image: frame.image });
    }
  }, [frame, request, item, part]);

  useEffect(() => () => {
    imageLease.current?.release();
    // Effect replay must acquire a fresh lease, even for the same request ID.
    imageLease.current = null;
  }, []);

  if (!request) return children;
  const previousImage = previousFrame?.item === item && previousFrame.part === part
    ? previousFrame.image
    : null;
  const image = frame.image || previousImage;
  return <g
    data-catalog-model={item}
    data-model-part={part}
    data-model-facing={furnitureFacing({ item, rot }).key}
    data-shelf-layout={request.options.decor?.layout || 'original'}
    data-model-color={request.options.color}
    data-model-state={frame.status}
    data-model-source={image ? image.source || 'glb' : 'svg-fallback'}
    data-model-dimensions={request.options.dimensions ? `${request.options.dimensions.w}x${request.options.dimensions.d}` : undefined}
    data-bed-tuck-cover={part === 'duvet' && image ? 'true' : undefined}
  >
    {image ? <>
      <image href={image.href} x={image.x} y={image.y} width={image.width} height={image.height} preserveAspectRatio="none" pointerEvents="none" />
      <path data-model-hit-shape d={image.hitPath} transform={`translate(${image.x},${image.y})`} fill="transparent" pointerEvents="all" />
    </> : request.options.dimensions && item !== 'bed'
      ? <g transform={rot % 2 ? 'scale(-1,1)' : undefined}><IsoResizableFallback item={item} dimensions={request.options.dimensions} decor={decor} rot={rot} /></g>
      : children}
  </g>;
}

export function CatalogModelStatus() {
  const status = useSyncExternalStore(catalogImages.subscribeStatus, catalogImages.status, catalogImages.status);
  if (!status.failed && !status.loading) return null;
  return <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-xl bg-night/95 px-4 py-2 text-xs text-cream shadow-soft" role={status.failed ? 'alert' : 'status'} data-catalog-status>
    {status.failed ? <>Some room models couldn’t load. Showing earlier artwork. <button className="pointer-events-auto underline" onClick={() => catalogImages.retry()}>Retry models</button></> : 'Loading room models…'}
  </div>;
}
