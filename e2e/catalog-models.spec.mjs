import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../prototypes/furniture/assets/manifest.json', import.meta.url)));
const actors = new Set(['you', 'resident', 'cat', 'dog', 'bunny']);

async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  });
}

async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}

test('the real Loft loads standalone GLBs and retains its customized resident', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().endsWith('.glb')) requests.push(request.url()); });
  await page.goto('/');
  const scene = page.locator('[data-iso-room-scene]');
  await expect(scene).toHaveAttribute('data-room-renderer', 'glb-composite');
  await expect(scene.locator('[data-catalog-model="bed"]')).toHaveAttribute('data-model-source', 'glb', { timeout: 60000 });
  await expect(scene.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(scene.locator('[data-model-state="error"]')).toHaveCount(0);
  expect(requests.some(url => /\/bed-[a-f0-9]+\.glb$/.test(url))).toBe(true);
  expect(requests.some(url => /\/sofa-[a-f0-9]+\.glb$/.test(url))).toBe(true);
  expect(requests.some(url => /\/desk-[a-f0-9]+\.glb$/.test(url))).toBe(true);
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  const toggle = page.locator('label').filter({ hasText: 'In the room' }).locator('input');
  await toggle.check();
  await page.getByRole('button', { name: /^Close/ }).click();
  await expect(scene.locator('[data-item="you"]')).toBeVisible();
  await expect(scene.locator('[data-item="you"] [data-catalog-model]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('loft-new-models.png') });
  await page.getByRole('button', { name: 'Start focusing', exact: true }).click();
  await expect(scene.locator('[data-item="you"] [data-arm-pose="keyboard"]')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('loft-focus-new-models.png') });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  expect(errors).toEqual([]);
});

test('every prop in the live furniture picker uses its exported GLB', async ({ page }) => {
  test.setTimeout(180000);
  await setup(page);
  const glbs = new Set(), rendered = new Set(), errors = [], glbRequests = [];
  await page.addInitScript(() => {
    window.__catalogContexts = 0;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl2') window.__catalogContexts++;
      return original.call(this, type, ...args);
    };
  });
  page.on('request', request => {
    const key = /\/models\/catalog\/([a-z0-9]+)-[a-f0-9]+\.glb$/.exec(request.url())?.[1];
    if (key) { glbs.add(key); glbRequests.push(key); }
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('[data-iso-room-scene] [data-model-source="glb"]')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  const browse = page.getByRole('button', { name: /Browse by category/ });
  if (await browse.getAttribute('aria-expanded') !== 'true') await browse.click();
  for (const section of manifest.sections) {
    const label = section.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const heading = page.getByRole('button').filter({ has: page.locator('span').filter({ hasText: new RegExp(`^${label}$`) }) }).first();
    if (await heading.getAttribute('aria-expanded') !== 'true') await heading.click();
    await ready(page);
    for (const key of section.keys.filter(key => !actors.has(key))) {
      await expect(page.locator(`button [data-catalog-model="${key}"][data-model-source="glb"]`).first()).toBeVisible();
      rendered.add(key);
    }
    await heading.click();
  }
  expect(rendered.size).toBe(179);
  expect([...glbs].sort()).toEqual([...rendered].sort());
  expect(glbRequests).toHaveLength(179);
  expect(await page.evaluate(() => window.__catalogContexts)).toBe(1);
  expect(errors).toEqual([]);
});

test('a missing GLB reports its fallback and retries without breaking the other room models', async ({ page }) => {
  await setup(page);
  await page.route('**/models/catalog/sofa-*.glb', route => route.fulfill({ status: 503, body: 'temporary model outage' }));
  await page.goto('/');
  const sofa = page.locator('[data-iso-room-scene] [data-catalog-model="sofa"]');
  await expect(sofa).toHaveAttribute('data-model-state', 'error');
  await expect(page.getByText(/Some room models couldn’t load/)).toBeVisible();
  await expect(page.locator('[data-iso-room-scene] [data-catalog-model="bed"]')).toHaveAttribute('data-model-source', 'glb');
  await page.unroute('**/models/catalog/sofa-*.glb');
  await page.getByRole('button', { name: 'Retry models', exact: true }).click();
  await expect(sofa).toHaveAttribute('data-model-source', 'glb');
  await ready(page);
});

test('real model hit targets, recoloring and light switches preserve the saved room', async ({ page, request }) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const registered = await request.post('/api/auth/register', { data: { username: `modelcontrols${Date.now()}`, password: 'models-test-only' } });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(value => localStorage.setItem('tasknook.token', value), token);
  expect((await request.put('/api/room', { headers, data: { placements: [], iso: { w: 8, d: 7, placements: [
    { id: 'seat', item: 'armchair', gx: 1, gy: 1 },
    { id: 'lamp', item: 'fairylights', gx: 5, gy: 1 },
    { id: 'desk', item: 'desk', gx: 1, gy: 4 },
  ] } } })).status()).toBe(200);
  const accessoryRequests = [];
  page.on('request', message => { if (/\/laptop-[a-f0-9]+\.glb$/.test(message.url())) accessoryRequests.push(message.url()); });
  await page.goto('/');
  const lamp = page.locator('[data-placement-id="lamp"] [data-catalog-model]');
  await expect(lamp).toHaveAttribute('data-model-source', 'glb');
  await ready(page);
  expect(accessoryRequests).toHaveLength(1);
  const hash = async locator => page.evaluate(async selector => {
    const href = document.querySelector(selector).getAttribute('href');
    const bytes = await (await fetch(href)).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].join(',');
  }, locator);
  const lampBefore = await hash('[data-placement-id="lamp"] image');
  const lampHref = await lamp.locator('image').getAttribute('href');
  // A light string's bounding-box centre can be empty air. Click an actual
  // painted pixel using the same native pointer path as a person.
  const lightPoint = await lamp.locator('image').evaluate(image => {
    const path = image.parentElement.querySelector('[data-model-hit-shape]').getAttribute('d');
    const [, x, y, width, height] = /M(\d+) (\d+)h(\d+)v(\d+)/.exec(path).map(Number);
    const point = new DOMPoint(image.x.baseVal.value + x + width / 2, image.y.baseVal.value + y + height / 2).matrixTransform(image.getScreenCTM());
    return { x: point.x, y: point.y };
  });
  await page.mouse.click(lightPoint.x, lightPoint.y);
  await expect.poll(() => lamp.locator('image').getAttribute('href')).not.toBe(lampHref);
  await ready(page);
  expect(await hash('[data-placement-id="lamp"] image')).not.toBe(lampBefore);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  const seat = page.locator('[data-placement-id="seat"] [data-catalog-model]');
  await seat.locator('[data-model-hit-shape]').click();
  const before = await hash('[data-placement-id="seat"] image');
  await page.getByRole('button', { name: 'Colours', exact: true }).click();
  await page.getByPlaceholder('#rrggbb', { exact: true }).fill('#c78d65');
  await expect(seat).toHaveAttribute('data-model-color', '#c78d65');
  await expect(seat).toHaveAttribute('data-model-source', 'glb');
  await ready(page);
  expect(await hash('[data-placement-id="seat"] image')).not.toBe(before);
  await expect.poll(async () => {
    const saved = await request.get('/api/room', { headers });
    const values = (await saved.json()).iso.placements;
    return { tint: values.find(value => value.id === 'seat').tint, off: values.find(value => value.id === 'lamp').off };
  }).toEqual({ tint: '#c78d65', off: true });
  await page.reload();
  await expect(page.locator('[data-placement-id="seat"] [data-catalog-model]')).toHaveAttribute('data-model-color', '#c78d65');
  await ready(page);
});

for (const rotation of [0, 1, 2, 3]) {
  test(`GLB seating keeps resident contacts at saved rotation ${rotation}`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await setup(page);
    const registered = await request.post('/api/auth/register', { data: { username: `models${rotation}${Date.now()}`, password: 'models-test-only' } });
    expect(registered.status()).toBe(201);
    const { token } = await registered.json(), headers = { Authorization: `Bearer ${token}` };
    await page.addInitScript(value => localStorage.setItem('tasknook.token', value), token);
    const placements = [];
    for (const [index, key] of ['armchair', 'sofa', 'chair', 'deskchair', 'bench', 'beanbag', 'cushion'].entries()) {
      const spec = manifest.models[key], turn = key === 'beanbag' || key === 'cushion' ? rotation % 2 : rotation;
      const width = turn % 2 ? spec.depth : spec.width, depth = turn % 2 ? spec.width : spec.depth;
      const gx = 1 + (index % 3) * 4, gy = 1 + Math.floor(index / 3) * 4;
      placements.push({ id: `seat-${key}`, item: key, gx, gy, rot: turn });
      placements.push({ id: `person-${key}`, item: 'resident', gx: gx + (width - .8) / 2, gy: gy + (depth - .8) / 2 });
    }
    const saved = await request.put('/api/room', { headers, data: { placements: [], iso: { w: 14, d: 12, placements } } });
    expect(saved.status()).toBe(200);
    await page.goto('/');
    await expect(page.locator('[data-placement-id="seat-armchair"] [data-model-source="glb"]')).toBeVisible();
    await ready(page);
    for (const key of ['armchair', 'sofa', 'chair', 'deskchair', 'bench', 'beanbag', 'cushion']) {
      await expect(page.locator(`[data-placement-id="person-${key}"]`)).toBeVisible();
    }
    const stored = await request.get('/api/room', { headers });
    const rotationsExplicit = values => values.map(value => ({ ...value, rot: value.rot || 0 }));
    expect(rotationsExplicit((await stored.json()).iso.placements)).toEqual(rotationsExplicit(placements));
    await page.reload();
    await expect(page.locator('[data-placement-id="seat-armchair"] [data-model-source="glb"]')).toBeVisible();
    await ready(page);
    await page.screenshot({ path: testInfo.outputPath(`seating-${rotation}.png`) });
  });
}


test('clicking a shelf customizes its own contents, preserves panning, and survives reload', async ({ page, request }, testInfo) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const registered = await request.post('/api/auth/register', { data: { username: `shelf${Date.now()}`, password: 'shelves-test-only' } });
  const { token } = await registered.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(value => localStorage.setItem('tasknook.token', value), token);
  expect((await request.put('/api/room', { headers, data: { placements: [], iso: { w: 8, d: 7, placements: [
    { id: 'one', item: 'bookshelf', gx: 1, gy: 1 },
    { id: 'two', item: 'bookshelf', gx: 4, gy: 1 },
    { id: 'plant-rack', item: 'plantshelf', gx: 1, gy: 4 },
  ] } } })).status()).toBe(200);
  await page.goto('/');
  await ready(page);
  const shelf = page.locator('[data-placement-id="one"] [data-catalog-model]');
  const other = page.locator('[data-placement-id="two"] [data-catalog-model]');
  // Find a painted pixel: a shelf's transparent rectangular bounds include holes.
  const clickShelf = async () => {
    const target = shelf.locator('[data-model-hit-shape]');
    const point = await target.evaluate(node => {
      const box = node.getBBox(), matrix = node.getScreenCTM();
      for (let y = box.y + 2; y < box.y + box.height; y += 2) for (let x = box.x + 2; x < box.x + box.width; x += 2) {
        if (node.isPointInFill(new DOMPoint(x, y))) {
          const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x, y: p.y };
        }
      }
    });
    await page.mouse.click(point.x, point.y);
  };
  await clickShelf();
  await expect(page.getByRole('group', { name: 'Shelf decorations', exact: true })).toBeVisible();
  const originalOther = await other.locator('image').getAttribute('href');
  await page.getByLabel('Shelf contents', { exact: true }).selectOption('mixed');
  await page.getByRole('button', { name: 'Book colour #8a79b5', exact: true }).click();
  await ready(page);
  await expect(shelf).toHaveAttribute('data-shelf-layout', 'mixed');
  expect(await other.locator('image').getAttribute('href')).toBe(originalOther);
  await page.screenshot({ path: testInfo.outputPath('shelf-customization.png') });
  await expect.poll(async () => (await (await request.get('/api/room', { headers })).json()).iso.placements.find(p => p.id === 'one').decor).toEqual({ layout: 'mixed', bookColor: '#8a79b5' });
  await page.getByRole('button', { name: 'Close item customizer' }).click();
  await page.reload();
  await ready(page);
  await expect(shelf).toHaveAttribute('data-shelf-layout', 'mixed');
  await clickShelf();
  await expect(page.getByLabel('Shelf contents', { exact: true })).toHaveValue('mixed');
  await page.getByLabel('Shelf contents', { exact: true }).selectOption('empty');
  await ready(page);
  await expect(shelf).toHaveAttribute('data-shelf-layout', 'empty');
  await page.getByRole('button', { name: 'Reset decorations', exact: true }).click();
  await ready(page);
  await expect(shelf).toHaveAttribute('data-shelf-layout', 'original');
  await page.getByRole('button', { name: 'Close item customizer' }).click();
  const hit = await shelf.boundingBox();
  await page.mouse.move(hit.x + hit.width / 2, hit.y + hit.height / 2);
  await page.mouse.down(); await page.mouse.move(hit.x + hit.width / 2 + 40, hit.y + hit.height / 2, { steps: 5 }); await page.mouse.up();
  await expect(page.getByLabel('Shelf contents', { exact: true })).toHaveCount(0);
  for (const viewport of [{ width: 390, height: 720 }, { width: 320, height: 360 }]) {
    await page.setViewportSize(viewport);
    await page.locator('[data-placement-id="one"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Shelf contents', { exact: true })).toBeVisible();
    const box = await page.locator('.room-tint-picker').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await page.getByLabel('Shelf contents', { exact: true }).selectOption('plants');
    await ready(page);
    await expect(shelf).toHaveAttribute('data-shelf-layout', 'plants');
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Shelf contents', { exact: true })).toHaveCount(0);
  }
});
