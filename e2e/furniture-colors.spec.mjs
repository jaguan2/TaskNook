import { expect, test } from '@playwright/test';

async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}

async function imageDigest(model) {
  return model.locator('image').evaluate(async node => {
    const bytes = await (await fetch(node.getAttribute('href'))).arrayBuffer();
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).join(',');
  });
}

async function clickPaintedItem(page, item) {
  const point = await item.locator('[data-model-hit-shape]').evaluate(node => {
    const box = node.getBBox(), matrix = node.getScreenCTM();
    const placement = node.closest('[data-placement-id]');
    for (let y = box.y + 2; y < box.y + box.height; y += 2) {
      for (let x = box.x + 2; x < box.x + box.width; x += 2) {
        if (!node.isPointInFill(new DOMPoint(x, y))) continue;
        const p = new DOMPoint(x, y).matrixTransform(matrix);
        // An occupied bed's foreground cover belongs to its sleeper. Use a
        // visible furniture pixel rather than clicking through that layer.
        if (document.elementFromPoint(p.x, p.y)?.closest('[data-placement-id]') !== placement) continue;
        return { x: p.x, y: p.y };
      }
    }
  });
  expect(point).toBeTruthy();
  await page.mouse.click(point.x, point.y);
}

test('one bed has independent saved material colours, including its sleeping cover', async ({ page, request }, testInfo) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const registration = await request.post('/api/auth/register', { data: {
    username: `colors${Date.now()}`, password: 'colour-test-only', displayName: 'Colour review',
  } });
  expect(registration.status()).toBe(201);
  const { token } = await registration.json();
  const headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(value => {
    localStorage.setItem('tasknook.token', value);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  const placements = [
    { id: 'one', item: 'bed', gx: .5, gy: .5, rot: 2, tint: '#7799aa' },
    { id: 'two', item: 'bed', gx: 4, gy: .5, tint: '#7799aa' },
    { id: 'chair', item: 'chair', gx: 2.5, gy: 4 },
    { id: 'sleeper', item: 'resident', gx: 1, gy: 1 },
  ];
  expect((await request.put('/api/room', { headers, data: { placements: [], iso: { w: 8, d: 7, placements } } })).status()).toBe(200);
  await page.goto('/');
  const model = id => page.locator(`[data-placement-id="${id}"] [data-catalog-model]`).first();
  await expect(model('one')).toHaveAttribute('data-model-source', 'glb');
  await ready(page);
  const originalBed = await imageDigest(model('two'));
  await clickPaintedItem(page, model('one'));
  const customizer = page.locator('.room-tint-picker');
  for (const [part, label, hex] of [
    ['frame', 'Frame', '#885533'], ['sheets', 'Sheets', '#d8b8a8'],
    ['pillows', 'Pillows', '#d891a9'], ['main', 'Blanket', '#506b9c'],
  ]) {
    const before = await imageDigest(model('one'));
    const cover = page.locator('[data-model-part="duvet"]');
    const coverBefore = await imageDigest(cover);
    await page.getByRole('combobox', { name: 'Furniture part' }).selectOption(part);
    await page.getByRole('textbox', { name: `${label} colour hex` }).fill(hex);
    await ready(page);
    expect(await imageDigest(model('one'))).not.toBe(before);
    expect(await imageDigest(model('two'))).toBe(originalBed);
    const coverAfter = await imageDigest(cover);
    if (part === 'main' || part === 'frame') expect(coverAfter).not.toBe(coverBefore);
    else expect(coverAfter).toBe(coverBefore);
  }
  const savedRoom = async () => (await (await request.get('/api/room', { headers })).json()).iso;
  await expect.poll(async () => (await savedRoom()).placements.find(p => p.id === 'one'))
    .toMatchObject({ tint: '#506b9c', colors: { frame: '#885533', sheets: '#d8b8a8', pillows: '#d891a9' } });
  expect((await savedRoom()).placements.filter(p => p.item === 'bed')).toHaveLength(2);
  await page.screenshot({ path: testInfo.outputPath('bed-material-colors.png') });
  await page.reload();
  await expect(model('one')).toHaveAttribute('data-model-source', 'glb');
  await ready(page);
  expect(await imageDigest(model('two'))).toBe(originalBed);

  // Keyboard access uses the same item customizer as a pointer click.
  await page.locator('[data-placement-id="one"]').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('combobox', { name: 'Furniture part' }).selectOption('pillows');
  await expect(page.getByRole('textbox', { name: 'Pillows colour hex' })).toHaveValue('#d891a9');
  await page.getByRole('button', { name: 'Reset pillows colour' }).click();
  await expect.poll(async () => (await savedRoom()).placements.find(p => p.id === 'one').colors)
    .toEqual({ frame: '#885533', sheets: '#d8b8a8' });
  await page.getByRole('button', { name: 'Close item customizer' }).click();

  await clickPaintedItem(page, model('chair'));
  const chairBefore = await imageDigest(model('chair'));
  await page.getByRole('textbox', { name: 'Finish colour hex' }).fill('#b385b8');
  await ready(page);
  expect(await imageDigest(model('chair'))).not.toBe(chairBefore);
  await expect.poll(async () => (await savedRoom()).placements.find(p => p.id === 'chair').tint).toBe('#b385b8');
  await page.getByRole('button', { name: 'Close item customizer' }).click();
  await expect(customizer).toHaveCount(0);

  // The occupied bed's foreground cover survives saving and reload as well.
  await page.reload();
  await expect(page.locator('[data-model-part="duvet"]')).toHaveAttribute('data-model-source', 'glb');
  await ready(page);
  await page.screenshot({ path: testInfo.outputPath('occupied-material-colors.png') });

  await page.setViewportSize({ width: 390, height: 720 });
  await page.locator('[data-placement-id="one"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Furniture part' })).toBeVisible();
  const bounds = await customizer.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(720);
  const reset = await page.getByRole('button', { name: 'Reset blanket colour' }).boundingBox();
  const close = await page.getByRole('button', { name: 'Close item customizer' }).boundingBox();
  expect(close.x).toBeGreaterThanOrEqual(reset.x + reset.width);
  await page.screenshot({ path: testInfo.outputPath('bed-colors-small-window.png') });
  await page.setViewportSize({ width: 320, height: 360 });
  const compact = await customizer.boundingBox();
  expect(compact.x).toBeGreaterThanOrEqual(0);
  expect(compact.x + compact.width).toBeLessThanOrEqual(320);
  expect(compact.y + compact.height).toBeLessThanOrEqual(360);
  await expect(page.getByRole('combobox', { name: 'Furniture part' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('bed-colors-compact-window.png') });
  // A box inside the viewport can still be covered by the timer/HUD.
  // Pointer actionability verifies the actual compact-window stacking order.
  await page.getByRole('button', { name: 'Close item customizer' }).click();
  await expect(customizer).toHaveCount(0);
});
