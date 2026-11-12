const pending = Object.freeze({ status: 'loading', image: null });

// Shared, bounded image leases. A mounted room/picker never loses its image to
// eviction; abandoned recolors and closed drawers release their object URLs.
export function createCatalogImageCache(loadRenderer, maxUnused = 48) {
  const entries = new Map();
  const statusListeners = new Set();
  let rendererPromise, status = { loading: 0, failed: 0 };
  const updateStatus = () => {
    const active = [...entries.values()].filter(entry => entry.listeners.size);
    const next = { loading: active.filter(entry => entry.state.status === 'loading').length,
      failed: active.filter(entry => entry.state.status === 'error').length };
    if (next.loading !== status.loading || next.failed !== status.failed) {
      status = next; statusListeners.forEach(listener => listener());
    }
  };
  // Only inactive entries may be evicted. In-flight work finishes or is
  // abandoned through the renderer's isNeeded callback before pruning.
  const prune = () => {
    const unused = [...entries.values()].filter(entry => !entry.listeners.size && (entry.state.status !== 'loading' || !entry.started));
    for (const entry of unused.slice(0, Math.max(0, unused.length - maxUnused))) {
      entry.state.image?.dispose(); entries.delete(entry.id);
    }
  };
  const getOrCreate = request => {
    if (!entries.has(request.id)) {
      entries.set(request.id, { ...request, listeners: new Set(), state: pending, started: false });
      prune();
      // A zero-sized warm cache may evict an uncommitted read; subscriptions
      // still receive their own entry and the shared stable pending snapshot.
      if (!entries.has(request.id)) return { ...request, listeners: new Set(), state: pending, started: false };
    }
    return entries.get(request.id);
  };
  const startRender = entry => {
    if (entry.started) return;
    entry.started = true;
    rendererPromise ||= Promise.resolve().then(loadRenderer).catch(error => { rendererPromise = null; throw error; });
    rendererPromise.then(renderer => renderer.render(entry.options, () => entry.listeners.size > 0)).then(image => {
      if (image) entry.state = { status: 'ready', image };
      else {
        entry.started = false;
        if (entry.listeners.size) startRender(entry);
        else entries.delete(entry.id);
      }
    }, error => { entry.state = { status: 'error', image: null, error }; }).then(() => {
      entry.listeners.forEach(listener => listener()); updateStatus(); prune();
    });
  };
  return {
    snapshot: request => getOrCreate(request).state,
    serverSnapshot: () => pending,
    subscribe(request, listener) {
      const entry = getOrCreate(request);
      // Touch insertion order on subscription, so an often reused room stays warm.
      entries.delete(entry.id); entries.set(entry.id, entry);
      entry.listeners.add(listener); startRender(entry); updateStatus();
      return () => { entry.listeners.delete(listener); updateStatus(); prune(); };
    },
    status: () => status,
    subscribeStatus(listener) { statusListeners.add(listener); return () => statusListeners.delete(listener); },
    retry() {
      for (const entry of entries.values()) if (entry.state.status === 'error' && entry.listeners.size) {
        entry.state = pending; entry.started = false; entry.listeners.forEach(listener => listener()); startRender(entry);
      }
      updateStatus();
    },
  };
}
