import { furnitureFacing } from '../lib/furnitureFacing';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { catalogImages, catalogModelRequest, CATALOG_MODELS } from '../services/catalogModels';

export function hasCatalogModel(key) { return !!CATALOG_MODELS[key]; }

export default function IsoCatalogModel({ item, tint, decor, rot = 0, lit = true, part = 'whole', showLaptop = false, children }) {
  const request = useMemo(() => catalogModelRequest({ item, tint, decor, rot, lit, part, showLaptop }), [item, tint, decor, rot, lit, part, showLaptop]);
  const subscribe = useCallback(listener => request ? catalogImages.subscribe(request, listener) : () => {}, [request]);
  const snapshot = useCallback(() => request ? catalogImages.snapshot(request) : catalogImages.serverSnapshot(), [request]);
  const frame = useSyncExternalStore(subscribe, snapshot, catalogImages.serverSnapshot);
  const [held, setHeld] = useState(null);
  const lease = useRef(null);
  useLayoutEffect(() => {
    if (!request) {
      lease.current?.release(); lease.current = null; setHeld(null); return;
    }
    if (frame.image && lease.current?.id !== request?.id) {
      // Keep the previous GLB visible while a recolor/turn renders, with a
      // real lease so its URL cannot be evicted before the replacement lands.
      const release = catalogImages.subscribe(request, () => {});
      lease.current?.release();
      lease.current = { id: request.id, release };
      setHeld({ item, part, image: frame.image });
    }
  }, [frame, request, item, part]);
  useEffect(() => () => lease.current?.release(), []);
  if (!request) return children;
  const image = frame.image || (held?.item === item && held.part === part ? held.image : null);
  return <g data-catalog-model={item} data-model-part={part} data-model-facing={furnitureFacing({ item, rot }).key} data-shelf-layout={request.options.decor?.layout || "original"} data-model-color={request.options.color} data-model-state={frame.status} data-model-source={image ? 'glb' : 'svg-fallback'} data-bed-tuck-cover={part === 'duvet' && image ? 'true' : undefined}>
    {image ? <>
      <image href={image.href} x={image.x} y={image.y} width={image.width} height={image.height} preserveAspectRatio="none" pointerEvents="none" />
      <path data-model-hit-shape d={image.hitPath} transform={`translate(${image.x},${image.y})`} fill="transparent" pointerEvents="all" />
    </> : children}
  </g>;
}

export function CatalogModelStatus() {
  const status = useSyncExternalStore(catalogImages.subscribeStatus, catalogImages.status, catalogImages.status);
  if (!status.failed && !status.loading) return null;
  return <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-xl bg-night/95 px-4 py-2 text-xs text-cream shadow-soft" role={status.failed ? 'alert' : 'status'} data-catalog-status>
    {status.failed ? <>Some room models couldn’t load. Showing earlier artwork. <button className="pointer-events-auto underline" onClick={() => catalogImages.retry()}>Retry models</button></> : 'Loading room models…'}
  </div>;
}
