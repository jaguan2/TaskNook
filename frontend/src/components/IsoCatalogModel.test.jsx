// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import IsoCatalogModel from './IsoCatalogModel';
import { catalogImages, catalogModelRequest } from '../services/catalogModels';

const jobs = vi.hoisted(() => []);
vi.mock('../services/catalogModels', async importOriginal => {
  const actual = await importOriginal();
  const { createCatalogImageCache } = await import('../services/catalogImageCache');
  return { ...actual, catalogImages: createCatalogImageCache(async () => ({
    render: options => new Promise(resolve => jobs.push({ options, resolve })),
  }), 0) };
});
afterEach(() => { cleanup(); jobs.length = 0; });

it('holds the previous model through a recolor, then releases each image exactly once', async () => {
  const oldImage = { href: 'blob:old', x: 0, y: -20, width: 30, height: 30, hitPath: 'M0 0h30v30h-30z', dispose: vi.fn() };
  const newImage = { ...oldImage, href: 'blob:new', dispose: vi.fn() };
  const { container, rerender, unmount } = render(<svg><IsoCatalogModel item="sofa" tint="#779988"><path data-legacy /></IsoCatalogModel></svg>);
  await waitFor(() => expect(jobs).toHaveLength(1));
  await act(async () => jobs[0].resolve(oldImage));
  expect(container.querySelector('image').getAttribute('href')).toBe('blob:old');
  rerender(<svg><IsoCatalogModel item="sofa" tint="#ccaa88"><path data-legacy /></IsoCatalogModel></svg>);
  await waitFor(() => expect(jobs).toHaveLength(2));
  expect(container.querySelector('image').getAttribute('href')).toBe('blob:old');
  expect(container.querySelector('[data-legacy]')).toBeNull();
  expect(oldImage.dispose).not.toHaveBeenCalled();
  await act(async () => jobs[1].resolve(newImage));
  expect(container.querySelector('image').getAttribute('href')).toBe('blob:new');
  expect(oldImage.dispose).toHaveBeenCalledOnce();
  unmount(); expect(newImage.dispose).toHaveBeenCalledOnce();
});

it('keeps a warm image leased when StrictMode replays mounting effects', async () => {
  const request = catalogModelRequest({ item: 'armchair', tint: '#779988' });
  const oldImage = { href: 'blob:warm', x: 0, y: -20, width: 30, height: 30, hitPath: 'M0 0h30v30h-30z', dispose: vi.fn() };
  const releaseWarm = catalogImages.subscribe(request, () => {});
  await waitFor(() => expect(jobs).toHaveLength(1));
  await act(async () => jobs[0].resolve(oldImage));
  const model = tint => <StrictMode><svg><IsoCatalogModel item="armchair" tint={tint}><path data-legacy /></IsoCatalogModel></svg></StrictMode>;
  const { container, rerender, unmount } = render(model('#779988'));
  releaseWarm();

  rerender(model('#ccaa88'));
  await waitFor(() => expect(jobs).toHaveLength(2));
  expect(container.querySelector('image').getAttribute('href')).toBe('blob:warm');
  expect(oldImage.dispose).not.toHaveBeenCalled();

  const newImage = { ...oldImage, href: 'blob:replacement', dispose: vi.fn() };
  await act(async () => jobs[1].resolve(newImage));
  expect(oldImage.dispose).toHaveBeenCalledOnce();
  unmount();
  expect(newImage.dispose).toHaveBeenCalledOnce();
});
