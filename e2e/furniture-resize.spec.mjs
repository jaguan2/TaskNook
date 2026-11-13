import { expect, test } from '@playwright/test';

async function setup(page, request, placements) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await request.post('/api/auth/register', { data: {
    username: `resize${Date.now()}`, password: 'resize-test-only',
  } });
  expect(response.status()).toBe(201);
  const { token } = await response.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(value => {
    localStorage.setItem('tasknook.token', value);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
    localStorage.setItem('tasknook.timeOfDay', 'day');
  }, token);
  expect((await request.put('/api/room', { headers, data: {
    placements: [], iso: { version: 2, w: 10, d: 10, placements },
  } })).status()).toBe(200);
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  await select(page);
  return async () => (await (await request.get('/api/room', { headers })).json()).iso.placements;
}

const model = page => page.locator('[data-placement-id="bed"] [data-catalog-model]').first();
const grip = page => page.locator('[data-resize-item="bed"]');
async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}
async function select(page) {
  await page.locator('[data-placement-id="bed"]').focus();
  await page.keyboard.press('Enter');
  await expect(grip(page)).toBeVisible();
}
async function beginDrag(page, dx, dy) {
  const points = await grip(page).locator('circle').evaluate((circle, delta) => {
    const box = circle.getBBox(), matrix = circle.getScreenCTM();
    const start = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
    const end = new DOMPoint(start.x + (delta.dx - delta.dy) * 24, start.y + (delta.dx + delta.dy) * 12);
    return [start, end].map(p => { const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
  }, { dx, dy });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 8 });
  return points;
}
async function digest(locator) {
  return locator.locator('image').evaluate(async node => {
    const bytes = await (await fetch(node.getAttribute('href'))).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].join(',');
  });
}

test('bed drag rebuilds its model, saves once on release, and keeps colours and sleeper at every facing', async ({ page, request }, info) => {
  test.setTimeout(180000);
  const colors = { frame: '#885533', sheets: '#d8b8a8', pillows: '#d891a9' };
  const saved = await setup(page, request, [
    { id: 'bed', item: 'bed', gx: 1, gy: 1, dimensions: { w: 1, d: 2 }, tint: '#506b9c', colors },
    { id: 'sleeper', item: 'resident', gx: 1, gy: 1.5 },
    { id: 'comparison', item: 'bed', gx: 6, gy: 1, tint: '#7799aa' },
  ]);
  await expect(model(page)).toHaveAttribute('data-model-source', 'parametric');
  await ready(page);
  const original = await digest(model(page));
  const comparison = page.locator('[data-placement-id="comparison"] [data-catalog-model]');
  const unchanged = await digest(comparison);
  await page.screenshot({ path: info.outputPath('bed-1x2.png') });
  await beginDrag(page, 1, 0);
  await expect(model(page)).toHaveAttribute('data-model-dimensions', '2x2');
  expect((await saved()).find(p => p.id === 'bed').dimensions).toEqual({ w: 1, d: 2 });
  await page.mouse.up();
  await expect.poll(async () => (await saved()).find(p => p.id === 'bed').dimensions).toEqual({ w: 2, d: 2 });
  await ready(page);
  expect(await digest(model(page))).not.toBe(original);
  await page.screenshot({ path: info.outputPath('bed-2x2.png') });

  // Half tiles work through the same focused control, without a pointer.
  await grip(page).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(model(page)).toHaveAttribute('data-model-dimensions', '2.5x2.5');
  await expect.poll(async () => (await saved()).find(p => p.id === 'bed').dimensions).toEqual({ w: 2.5, d: 2.5 });
  await beginDrag(page, 1.5, 1.5);
  await expect(model(page)).toHaveAttribute('data-model-dimensions', '4x4');
  await page.mouse.up();
  await expect.poll(async () => (await saved()).find(p => p.id === 'bed').dimensions).toEqual({ w: 4, d: 4 });
  await ready(page);
  for (const facing of ['east', 'north', 'west', 'south']) {
    await page.locator('[data-rotate-item="bed"]').focus();
    await page.keyboard.press('Enter');
    await expect(model(page)).toHaveAttribute('data-model-facing', facing);
    await expect(page.locator('[data-placement-id="sleeper"] [data-resident-pose="lying"]')).toBeVisible();
    await expect(page.locator('[data-model-part="duvet"]')).toHaveAttribute('data-model-dimensions', '4x4');
    await ready(page);
    await page.screenshot({ path: info.outputPath(`bed-4x4-${facing}.png`) });
  }
  await expect.poll(async () => (await saved()).find(p => p.id === 'bed').rot || 0).toBe(0);
  expect((await saved()).find(p => p.id === 'bed')).toMatchObject({ colors, tint: '#506b9c' });
  expect(await digest(comparison)).toBe(unchanged);
  expect((await saved()).filter(p => p.item === 'bed')).toHaveLength(2);
  await page.reload();
  await expect(model(page)).toHaveAttribute('data-model-dimensions', '4x4');
  await ready(page);
  expect(await digest(comparison)).toBe(unchanged);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  await select(page);
  await page.setViewportSize({ width: 390, height: 720 });
  await grip(page).focus();
  await page.keyboard.press('Home');
  await expect(model(page)).toHaveAttribute('data-model-source', 'glb', { timeout: 60000 });
  await expect.poll(async () => (await saved()).find(p => p.id === 'bed').dimensions).toBeUndefined();
  expect((await saved()).find(p => p.id === 'bed').colors).toEqual(colors);
  await ready(page);
  await page.screenshot({ path: info.outputPath('bed-original-small-window.png') });
  await page.setViewportSize({ width: 320, height: 360 });
  await page.getByRole('button', { name: 'Resize bed', exact: true }).click();
  await expect(page.locator('.room-tint-picker')).toHaveCount(0);
  await grip(page).locator('circle').click({ trial: true, timeout: 5000 });
  await page.screenshot({ path: info.outputPath('bed-original-compact-window.png') });
});

test('blocked sizes stop at clear floor and cancelled drags do not save', async ({ page, request }) => {
  const saved = await setup(page, request, [
    { id: 'bed', item: 'bed', gx: 1, gy: 1, dimensions: { w: 1, d: 2 } },
    { id: 'obstacle', item: 'wardrobe', gx: 3.5, gy: 1 },
  ]);
  const points = await beginDrag(page, 1, 0);
  await expect(model(page)).toHaveAttribute('data-model-dimensions', '2x2');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(model(page)).toHaveAttribute('data-model-dimensions', '1x2');
  expect((await saved()).find(p => p.id === 'bed').dimensions).toEqual({ w: 1, d: 2 });
  await select(page);
  await beginDrag(page, 1, 0);
  // Go beyond the wardrobe after reaching a valid preview size.
  await page.mouse.move(points[1].x + 100, points[1].y + 50);
  await expect(page.locator('[data-resize-label="bed"]')).toHaveText('No space');
  await expect(model(page)).toHaveAttribute('data-model-dimensions', '2x2');
  await page.mouse.up();
  await expect.poll(async () => (await saved()).find(p => p.id === 'bed').dimensions).toEqual({ w: 2, d: 2 });
  await page.reload();
  await expect(model(page)).toHaveAttribute('data-model-dimensions', '2x2');
  await ready(page);
});
