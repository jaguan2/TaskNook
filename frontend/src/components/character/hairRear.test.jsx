// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { HAIR_STYLES } from '../../lib/profile';
import { HairBack, HAIR_REGISTRY } from './hair';
import { HeadSkin } from './body';

afterEach(cleanup);
describe('rear hair and skull construction', () => {
  it('gives every catalog style authored rear artwork', () => {
    for (const { key } of HAIR_STYLES) expect(HAIR_REGISTRY[key].back, key).toBeTypeOf('function');
  });
  it('gives curtains clump texture and keeps clip IDs unique across residents', () => {
    const { container } = render(<svg><HairBack style="curtains" headY={-24} color="#8a8a94" /><HairBack style="curtains" headY={-24} color="#e7dcc7" /></svg>);
    expect(container.querySelectorAll('[data-hair-texture="clump-flow"]')).toHaveLength(2);
    const ids = [...container.querySelectorAll('clipPath')].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(container.querySelector('[data-hair-back="curtains"]').querySelector('circle')).toBeNull();
    expect(container.querySelector('filter')).toBeNull();
  });
  it('uses a shaped rear skull and a short-cut fallback for an unknown hairstyle', () => {
    const { container } = render(<svg><HeadSkin back headY={-24} skin="#d9a273" /><HairBack style="unknown" headY={-24} color="#8a8a94" /></svg>);
    expect(container.querySelector('[data-character-head="back"]')).toBeTruthy();
    expect(container.querySelector('circle')).toBeNull();
  });
});
