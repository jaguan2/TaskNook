// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CommonRoomEntry from './CommonRoomEntry';
import { catalogImages, catalogModelRequest } from '../services/catalogModels';
import { COMMON_PLACES, createCommonSession, commonPropModelOptions, resolveCommonProps } from '../lib/commonRooms';

const jobs = vi.hoisted(() => []);
vi.mock('./CommonRoom', () => ({ default: ({ session }) => <div data-common-room={session.sceneId} /> }));
vi.mock('../services/catalogModels', async importOriginal => {
  const actual = await importOriginal();
  const { createCatalogImageCache } = await import('../services/catalogImageCache');
  return { ...actual, catalogImages: createCatalogImageCache(async () => ({
    render: options => new Promise((resolve, reject) => jobs.push({ options, resolve, reject })),
  }), 0) };
});
const image = () => ({ href: 'blob:prepared', dispose: vi.fn() });
const library = () => <CommonRoomEntry session={createCommonSession('grand-library')} />;
afterEach(async () => {
  cleanup();
  await act(async () => jobs.forEach(job => job.resolve(image())));
  jobs.length = 0;
});

it('prepares only this room, shares repeated images and updates real progress before mounting it', async () => {
  const { container } = render(<StrictMode>{library()}</StrictMode>);
  expect(screen.getByRole('status').textContent).toBe('Opening Grand Library…');
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  expect(container.querySelector('[data-common-room]')).toBeNull();
  await waitFor(() => expect(jobs.length).toBeGreaterThan(0));
  const roomJobs = [...jobs];
  expect(roomJobs.length).toBeLessThan(COMMON_PLACES['grand-library'].props.length);
  expect(new Set(roomJobs.map(job => JSON.stringify(job.options))).size).toBe(roomJobs.length);

  const unrelated = catalogModelRequest({ item: 'sofa', tint: '#010203' });
  const release = catalogImages.subscribe(unrelated, () => {});
  await waitFor(() => expect(jobs.length).toBe(roomJobs.length + 1));
  await act(async () => roomJobs[0].resolve(image()));
  const percent = Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'));
  expect(percent).toBeGreaterThan(0); expect(percent).toBeLessThan(100);
  await act(async () => roomJobs.slice(1).forEach(job => job.resolve(image())));
  expect(container.querySelector('[data-common-room="grand-library"]')).not.toBeNull();
  expect(container.querySelector('[data-room-loading]')).toBeNull();
  expect(catalogImages.status().loading).toBe(1); // An unrelated picker cannot block entry.
  release();
});

it('uses the fallback after failures and keeps an opened scene mounted during Retry models', async () => {
  const { container } = render(library());
  await waitFor(() => expect(jobs.length).toBeGreaterThan(0));
  const original = [...jobs];
  await act(async () => original.forEach(job => job.reject(Error('missing model'))));
  const scene = container.querySelector('[data-common-room]');
  expect(scene).not.toBeNull();
  act(() => catalogImages.retry());
  await waitFor(() => expect(jobs.length).toBe(original.length * 2));
  expect(container.querySelector('[data-common-room]')).toBe(scene);
  expect(container.querySelector('[data-room-loading]')).toBeNull();
  await act(async () => jobs.slice(original.length).forEach(job => job.resolve(image())));
  expect(catalogImages.status()).toEqual({ loading: 0, failed: 0 });
});

it('leaves a cancellable load without mounting late results and releases its image leases', async () => {
  const onCancel = vi.fn();
  const { container, unmount } = render(<CommonRoomEntry session={createCommonSession('grand-library')} onCancel={onCancel} />);
  fireEvent.click(screen.getByRole('button', { name: 'Return home' }));
  expect(onCancel).toHaveBeenCalledOnce();
  await waitFor(() => expect(jobs.length).toBeGreaterThan(0));
  unmount();
  const images = jobs.map(image);
  await act(async () => jobs.forEach((job, i) => job.resolve(images[i])));
  expect(container.querySelector('[data-common-room]')).toBeNull();
  images.forEach(frame => expect(frame.dispose).toHaveBeenCalledOnce());
  expect(catalogImages.status()).toEqual({ loading: 0, failed: 0 });
});

it('opens a fully cached visit immediately without a loading-screen flash', async () => {
  const requests = [...new Map(resolveCommonProps(COMMON_PLACES['grand-library'])
    .map(p => catalogModelRequest(commonPropModelOptions(p))).filter(Boolean).map(r => [r.id, r])).values()];
  const releases = requests.map(request => catalogImages.subscribe(request, () => {}));
  await waitFor(() => expect(jobs.length).toBe(requests.length));
  await act(async () => jobs.forEach(job => job.resolve(image())));
  const { container } = render(library());
  expect(container.querySelector('[data-common-room]')).not.toBeNull();
  expect(container.querySelector('[data-room-loading]')).toBeNull();
  releases.forEach(release => release());
});
