import { expect, it, vi } from 'vitest';
import { createCatalogImageCache } from './catalogImageCache';

const request = id => ({ id, options: { key: id } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

it('shares work across repeated props and keeps an image alive until its last consumer leaves', async () => {
  const work = deferred(), dispose = vi.fn(), render = vi.fn(() => work.promise);
  const cache = createCatalogImageCache(async () => ({ render }), 0), entry = request('sofa');
  const releaseA = cache.subscribe(entry, vi.fn()), releaseB = cache.subscribe(entry, vi.fn());
  await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1));
  work.resolve({ href: 'blob:sofa', dispose });
  await vi.waitFor(() => expect(cache.snapshot(entry).status).toBe('ready'));
  releaseA(); expect(dispose).not.toHaveBeenCalled();
  releaseB(); expect(dispose).toHaveBeenCalledOnce();
  expect(cache.status()).toEqual({ loading: 0, failed: 0 });
});

it('releases abandoned asynchronous recolors and bounds unused rendered images', async () => {
  const work = deferred(), dispose = vi.fn();
  const cache = createCatalogImageCache(async () => ({ render: () => work.promise }), 0);
  const release = cache.subscribe(request('abandoned-blue'), vi.fn()); release();
  work.resolve({ dispose });
  await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
  expect(cache.status()).toEqual({ loading: 0, failed: 0 });
});

it('retries failed initialization without retaining a rejected renderer promise', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue({ render: async () => ({ dispose: vi.fn() }) });
  const cache = createCatalogImageCache(load, 0), entry = request('bed');
  const release = cache.subscribe(entry, vi.fn());
  await vi.waitFor(() => expect(cache.status().failed).toBe(1));
  cache.retry();
  await vi.waitFor(() => expect(cache.snapshot(entry).status).toBe('ready'));
  expect(load).toHaveBeenCalledTimes(2); release();
});

it('retrying one missing asset does not discard healthy models or duplicate renderer initialization', async () => {
  const render = vi.fn().mockImplementation(async ({ key }) => {
    if (key === 'missing' && render.mock.calls.filter(([options]) => options.key === key).length === 1) throw new Error('404');
    return { href: key, dispose: vi.fn() };
  });
  const load = vi.fn(async () => ({ render })), cache = createCatalogImageCache(load, 0);
  const healthy = request('healthy'), missing = request('missing');
  const a = cache.subscribe(healthy, vi.fn()), b = cache.subscribe(missing, vi.fn());
  await vi.waitFor(() => expect(cache.status()).toEqual({ loading: 0, failed: 1 }));
  const frame = cache.snapshot(healthy);
  cache.retry();
  await vi.waitFor(() => expect(cache.status()).toEqual({ loading: 0, failed: 0 }));
  expect(cache.snapshot(healthy)).toBe(frame); expect(load).toHaveBeenCalledOnce(); a(); b();
});
