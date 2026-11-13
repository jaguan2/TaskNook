import { expect, test } from '@playwright/test';
test.use({ actionTimeout: 10000 });
const corners = { back: [0, 0], right: [1, 0], front: [1, 1], left: [0, 1] };
const grip = (page, id, corner) => page.locator(`[data-resize-corners="${id}"] [data-resize-corner="${corner}"]`);
const model = (page, id) => page.locator(`[data-placement-id="${id}"] [data-catalog-model]`).first();
async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}
async function setup(page, request, placements, wide = false) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const response = await request.post('/api/auth/register', { data: { username: `corners${Date.now()}`, password: 'corner-test-only' } });
  expect(response.status()).toBe(201);
  const { token } = await response.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(({ token, wide }) => {
    localStorage.setItem('tasknook.token', token);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
    if (wide) localStorage.setItem('tasknook.isoView', JSON.stringify({ x: -180, y: -80, w: 1000, h: 650 }));
  }, { token, wide });
  expect((await request.put('/api/room', { headers, data: { placements: [], iso: {
    version: 2, w: wide ? 18 : 10, d: wide ? 16 : 10, placements,
  } } })).status()).toBe(200);
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  return async id => (await (await request.get('/api/room', { headers })).json()).iso.placements.find(p => p.id === id);
}
async function select(page, id) {
  await page.locator(`[data-placement-id="${id}"]`).focus(); await page.keyboard.press('Enter');
  await expect(page.locator(`[data-resize-corners="${id}"]`)).toBeVisible();
  await page.getByRole('button', { name: 'Move', exact: true }).click();
}
async function points(page, id, corner, dx, dy) {
  return grip(page, id, corner).locator('[data-resize-hit]').evaluate((node, delta) => {
    const box = node.getBBox(), matrix = node.getScreenCTM();
    const start = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
    return [start, new DOMPoint(start.x + (delta.dx - delta.dy) * 24, start.y + (delta.dx + delta.dy) * 12)]
      .map(p => { const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
  }, { dx, dy });
}
async function begin(page, id, corner, dx, dy) {
  await select(page, id);
  const [from, to] = await points(page, id, corner, dx, dy);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  return [from, to];
}

test('every corner resizes at all four facings with a fixed opposite corner and one undo', async ({ page, request }, info) => {
  test.setTimeout(180000);
  const beds = [0, 1, 2, 3].map(rot => ({ id: `bed${rot}`, item: 'bed', rot,
    gx: rot % 2 ? 10 : 3, gy: rot >= 2 ? 10 : 3, dimensions: { w: 1, d: 2 }, tint: '#7799aa' }));
  const saved = await setup(page, request, beds, true);
  for (const bed of beds) for (const [corner, [x, y]] of Object.entries(corners)) {
    await begin(page, bed.id, corner, x ? .5 : -.5, y ? .5 : -.5);
    await expect(model(page, bed.id)).toHaveAttribute('data-model-dimensions', '1.5x2.5');
    expect(await saved(bed.id)).toMatchObject({ gx: bed.gx, gy: bed.gy, dimensions: bed.dimensions });
    await page.mouse.up();
    const expected = { gx: bed.gx - (x ? 0 : .5), gy: bed.gy - (y ? 0 : .5), dimensions: { w: 1.5, d: 2.5 }, tint: bed.tint };
    await expect.poll(() => saved(bed.id)).toMatchObject(expected);
    await page.getByRole('button', { name: 'Undo room edit', exact: true }).click();
    await expect.poll(() => saved(bed.id)).toMatchObject({ gx: bed.gx, gy: bed.gy, dimensions: bed.dimensions });
    await page.getByRole('button', { name: 'Redo room edit', exact: true }).click();
    await expect.poll(() => saved(bed.id)).toMatchObject(expected);
    await page.getByRole('button', { name: 'Undo room edit', exact: true }).click();
    await expect.poll(() => saved(bed.id)).toMatchObject({ gx: bed.gx, gy: bed.gy, dimensions: bed.dimensions });
  }
  await ready(page); await page.screenshot({ path: info.outputPath('corner-handles-four-facings.png') });
});

test('anchored drags cancel or stop at clear space and retain their origin after reload', async ({ page, request }) => {
  const bed = { id: 'bed', item: 'bed', gx: 3, gy: 3, dimensions: { w: 1, d: 2 } };
  const saved = await setup(page, request, [bed, { id: 'block', item: 'nightstand', gx: 1.5, gy: 3 }]);
  await begin(page, bed.id, 'back', 0, -.5);
  await expect(model(page, bed.id)).toHaveAttribute('data-model-dimensions', '1x2.5');
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect(await saved(bed.id)).toMatchObject({ gx: 3, gy: 3, dimensions: bed.dimensions });
  const [from, to] = await begin(page, bed.id, 'left', -.5, 0);
  await page.mouse.move(to.x + to.x - from.x, to.y + to.y - from.y, { steps: 8 });
  await expect(page.locator('[data-resize-label="bed"]')).toHaveText('No space');
  await expect(model(page, bed.id)).toHaveAttribute('data-model-dimensions', '1.5x2');
  expect(await saved(bed.id)).toMatchObject({ gx: 3, gy: 3, dimensions: bed.dimensions });
  await page.mouse.up();
  await expect.poll(() => saved(bed.id)).toMatchObject({ gx: 2.5, gy: 3, dimensions: { w: 1.5, d: 2 } });
  await page.reload(); await ready(page);
  await expect(model(page, bed.id)).toHaveAttribute('data-model-dimensions', '1.5x2');
  expect(await saved(bed.id)).toMatchObject({ gx: 2.5, gy: 3 });
});

test('all ground furniture families expose keyboard corners and wall mounts retain their own controls', async ({ page, request }) => {
  test.setTimeout(120000);
  const items = ['bed', 'sofa', 'desk', 'bookshelf', 'bookcase', 'shelf', 'ladder', 'plantshelf'];
  const pieces = items.map((item, i) => ({ id: item, item, gx: 2 + i % 4 * 4, gy: 3 + Math.floor(i / 4) * 6,
    dimensions: { w: 2, d: item === 'bed' ? 2 : 1 } }));
  const saved = await setup(page, request, [...pieces, { id: 'wall', item: 'wallshelf', gx: 2, gy: 0 }], true);
  for (const p of pieces) {
    await select(page, p.id); await grip(page, p.id, 'back').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => saved(p.id)).toMatchObject({ gx: p.gx - .5, gy: p.gy, dimensions: { w: 2.5, d: p.dimensions.d } });
  }
  await page.locator('[data-placement-id="wall"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-resize-corner]')).toHaveCount(0);
  await expect(page.locator('[data-resize-item="wall"]')).toBeVisible();
  await page.reload(); await ready(page);
  for (const p of pieces) expect(await saved(p.id)).toMatchObject({ gx: p.gx - .5, dimensions: { w: 2.5, d: p.dimensions.d } });
});

test('corner targets accept native touch drags in narrow windows', async ({ page, request }, info) => {
  const bed = { id: 'bed', item: 'bed', gx: 3, gy: 3, dimensions: { w: 1, d: 2 } };
  const saved = await setup(page, request, [bed]);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  for (const [width, height] of [[390, 720], [320, 360]]) {
    await page.setViewportSize({ width, height }); await select(page, bed.id);
    const [from, to] = await points(page, bed.id, 'front', .5, .5);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 4 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...to, id: 4 }] });
    await expect(model(page, bed.id)).toHaveAttribute('data-model-dimensions', '1.5x2.5');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => saved(bed.id)).toMatchObject({ gx: 3, gy: 3, dimensions: { w: 1.5, d: 2.5 } });
    await ready(page); await page.screenshot({ path: info.outputPath(`touch-corners-${width}.png`) });
    await page.getByRole('button', { name: 'Undo room edit', exact: true }).click();
    await expect.poll(() => saved(bed.id)).toMatchObject({ gx: 3, gy: 3, dimensions: bed.dimensions });
  }
  await cdp.detach();
});
