import { expect, test } from '@playwright/test';
test.use({ actionTimeout: 10000 });

async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}
const piece = (page, id) => page.locator(`[data-placement-id="${id}"]`);
async function select(page, id) {
  await piece(page, id).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-item-inspector]')).toBeVisible();
}
async function setup(page, request) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await request.post('/api/auth/register', { data: {
    username: `decorate${Date.now()}`, password: 'editor-test-only',
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
  expect((await request.put('/api/room', { headers, data: { placements: [], iso: {
    version: 2, w: 10, d: 10, placements: [
      { id: 'sofa', item: 'sofa', gx: 1, gy: 1, tint: '#7799aa', dimensions: { w: 2, d: 1 } },
      { id: 'blocker', item: 'wardrobe', gx: 5, gy: 1 },
      { id: 'bed', item: 'bed', gx: 1, gy: 6, dimensions: { w: 1, d: 2 } },
    ],
  } } })).status()).toBe(200);
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  const saved = async () => (await (await request.get('/api/room', { headers })).json()).iso.placements;
  const savedPiece = async id => (await saved()).find(p => p.id === id);
  return { saved, savedPiece };
}
async function closeCatalog(page) {
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
}

test('browse, recolour, resize, turn, copy and undo form one persisted editing workflow', async ({ page, request }, info) => {
  test.setTimeout(180000);
  const { saved, savedPiece } = await setup(page, request);
  const search = page.getByRole('searchbox');
  await expect(search).toBeVisible();
  await search.fill('armchair');
  await page.getByRole('button', { name: /Armchair/ }).click();
  await expect(search).toHaveCount(0);
  await expect(page.locator('[data-item-inspector]')).toContainText('Armchair');
  await expect.poll(async () => (await saved()).filter(p => p.item === 'armchair').length).toBe(1);
  await page.getByRole('toolbar', { name: 'Decorate mode' }).getByRole('button', { name: 'Furniture', exact: true }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('armchair');
  await closeCatalog(page);

  await select(page, 'sofa');
  await page.getByRole('button', { name: 'Turn right', exact: true }).click();
  await expect.poll(async () => (await savedPiece('sofa')).rot).toBe(3);
  await page.getByRole('button', { name: 'Turn left', exact: true }).click();
  await expect.poll(async () => (await savedPiece('sofa')).rot || 0).toBe(0);
  await piece(page, 'sofa').focus(); await page.keyboard.press('r');
  await expect.poll(async () => (await savedPiece('sofa')).rot).toBe(3);
  await page.keyboard.press('Shift+R');
  await expect.poll(async () => (await savedPiece('sofa')).rot || 0).toBe(0);

  await page.getByRole('button', { name: 'Colours', exact: true }).click();
  const hex = page.getByRole('textbox', { name: 'Finish colour hex' });
  await hex.fill('#aa8899');
  await expect.poll(async () => (await savedPiece('sofa')).tint).toBe('#aa8899');
  // Typing and text editing shortcuts must never rotate or delete furniture.
  await hex.press('ControlOrMeta+z');
  await hex.fill('#aa8899'); await hex.press('r'); await hex.press('Delete');
  expect((await savedPiece('sofa')).rot || 0).toBe(0);
  await page.getByRole('button', { name: 'Size', exact: true }).click();
  await page.getByRole('button', { name: 'Increase width', exact: true }).click();
  await expect.poll(async () => (await savedPiece('sofa')).dimensions).toEqual({ w: 2.5, d: 1 });
  await page.getByRole('button', { name: 'Undo room edit', exact: true }).click();
  await expect.poll(async () => (await savedPiece('sofa')).dimensions).toEqual({ w: 2, d: 1 });
  await page.getByRole('button', { name: 'Redo room edit', exact: true }).click();
  await expect.poll(async () => (await savedPiece('sofa')).dimensions).toEqual({ w: 2.5, d: 1 });
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect.poll(async () => (await saved()).filter(p => p.item === 'sofa').length).toBe(2);
  const copy = (await saved()).find(p => p.item === 'sofa' && p.id !== 'sofa');
  expect(copy).toMatchObject({ tint: '#aa8899', dimensions: { w: 2.5, d: 1 } });
  await piece(page, copy.id).focus(); await page.keyboard.press('Delete');
  await expect.poll(async () => !!(await savedPiece(copy.id))).toBe(false);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => !!(await savedPiece(copy.id))).toBe(true);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect.poll(async () => !!(await savedPiece(copy.id))).toBe(false);

  await select(page, 'bed');
  await page.getByRole('button', { name: 'Colours', exact: true }).click();
  await page.getByRole('combobox', { name: 'Furniture part', exact: true }).selectOption('pillows');
  await page.getByRole('textbox', { name: 'Pillows colour hex' }).fill('#e5a0b8');
  await expect.poll(async () => (await savedPiece('bed')).colors?.pillows).toBe('#e5a0b8');
  await ready(page);
  await page.screenshot({ path: info.outputPath('editor-colours.png') });
  await page.getByRole('toolbar', { name: 'Decorate mode' }).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('toolbar', { name: 'Decorate mode' })).toHaveCount(0);
  await page.reload(); await ready(page);
  expect((await savedPiece('sofa')).dimensions).toEqual({ w: 2.5, d: 1 });
  expect((await savedPiece('bed')).colors.pillows).toBe('#e5a0b8');
});

async function beginMove(page, id, dx, dy) {
  await select(page, id);
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  const [from, to] = await piece(page, id).locator('polygon').first().evaluate((node, delta) => {
    const box = node.getBBox(), matrix = node.getScreenCTM();
    const start = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
    const end = new DOMPoint(start.x + (delta.dx - delta.dy) * 24, start.y + (delta.dx + delta.dy) * 12);
    return [start, end].map(p => { const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
  }, { dx, dy });
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
}

test('drag previews save on release; Escape and blocked placement keep the original', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const { savedPiece } = await setup(page, request); await closeCatalog(page);
  await beginMove(page, 'sofa', 0, 2);
  await expect(page.getByRole('status').filter({ hasText: 'Release to place' })).toBeVisible();
  expect(await savedPiece('sofa')).toMatchObject({ gx: 1, gy: 1 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect(await savedPiece('sofa')).toMatchObject({ gx: 1, gy: 1 });
  await beginMove(page, 'sofa', 4, 0);
  await expect(page.getByRole('status').filter({ hasText: 'Blocked' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('editor-blocked.png') });
  await page.mouse.up();
  expect(await savedPiece('sofa')).toMatchObject({ gx: 1, gy: 1 });
  await beginMove(page, 'sofa', 0, 2);
  await page.mouse.up();
  await expect.poll(async () => (await savedPiece('sofa')).gy).toBe(3);
  await page.getByRole('button', { name: 'Undo room edit', exact: true }).click();
  await expect.poll(async () => (await savedPiece('sofa')).gy).toBe(1);
});

test('compact windows keep colour, size, move and finish controls reachable', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const { savedPiece } = await setup(page, request); await closeCatalog(page);
  for (const [width, height] of [[890, 650], [390, 720], [320, 360]]) {
    await page.setViewportSize({ width, height });
    await select(page, 'bed');
    await page.getByRole('button', { name: 'Colours', exact: true }).click();
    await page.getByRole('combobox', { name: 'Furniture part', exact: true }).selectOption('sheets');
    await page.getByRole('textbox', { name: 'Sheets colour hex' }).fill('#c8b8a8');
    await expect.poll(async () => (await savedPiece('bed')).colors?.sheets).toBe('#c8b8a8');
    await ready(page);
    await page.screenshot({ path: info.outputPath(`editor-colours-${width}x${height}.png`) });
    const inspector = await page.locator('[data-item-inspector]').boundingBox();
    const toolbar = await page.getByRole('toolbar', { name: 'Decorate mode' }).boundingBox();
    expect(inspector.y).toBeGreaterThanOrEqual(0);
    expect(inspector.y + inspector.height).toBeLessThanOrEqual(toolbar.y);
    await page.getByRole('button', { name: 'Size', exact: true }).click();
    await page.getByRole('button', { name: 'Drag resize handle', exact: true }).click();
    await expect(page.locator('[data-item-inspector]')).toHaveCount(0);
    await page.locator('[data-resize-item="bed"] circle').click({ trial: true, timeout: 5000 });
    await select(page, 'bed');
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.locator('[data-item-inspector]')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`editor-${width}x${height}.png`) });
    await page.getByRole('toolbar', { name: 'Decorate mode' }).getByRole('button', { name: 'Furniture', exact: true }).click();
    await expect(page.getByRole('searchbox')).toBeVisible();
    await closeCatalog(page);
  }
  await page.getByRole('toolbar', { name: 'Decorate mode' }).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('toolbar', { name: 'Decorate mode' })).toHaveCount(0);
});
