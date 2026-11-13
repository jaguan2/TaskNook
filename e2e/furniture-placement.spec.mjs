import { expect, test } from '@playwright/test';
test.use({ actionTimeout: 10000 });
const piece = (page, id) => page.locator(`[data-placement-id="${id}"]`);
const model = (page, id) => piece(page, id).locator('[data-catalog-model]').first();
async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}
async function setup(page, request, placements) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const response = await request.post('/api/auth/register', { data: { username: `placement${Date.now()}`, password: 'placement-test-only' } });
  expect(response.status()).toBe(201);
  const { token } = await response.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(token => {
    localStorage.setItem('tasknook.token', token);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  expect((await request.put('/api/room', { headers, data: { placements: [], iso: { version: 2, w: 12, d: 10, placements } } })).status()).toBe(200);
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  return async () => (await (await request.get('/api/room', { headers })).json()).iso.placements;
}
async function select(page, id, clear = false) {
  await piece(page, id).focus(); await page.keyboard.press('Enter');
  if (clear) await page.getByRole('button', { name: 'Move', exact: true }).click();
}
async function dragPoints(node, dx, dy) {
  return node.evaluate((node, { dx, dy }) => {
    const box = node.getBBox(), matrix = node.getScreenCTM();
    const from = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
    return [from, new DOMPoint(from.x + (dx - dy) * 24, from.y + (dx + dy) * 12)]
      .map(p => { const q = p.matrixTransform(matrix); return { x: q.x, y: q.y }; });
  }, { dx, dy });
}
async function begin(page, from, to) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
}

test('turns refuse furniture collisions without entering history and work after clearing the obstruction', async ({ page, request }) => {
  const saved = await setup(page, request, [
    { id: 'sofa', item: 'sofa', gx: 1, gy: 1 }, { id: 'chair', item: 'chair', gx: 1, gy: 2.5 },
  ]);
  await select(page, 'sofa');
  await page.getByRole('button', { name: 'Turn left', exact: true }).click();
  await expect(page.getByText(/No room to turn that piece/)).toBeVisible();
  await expect(model(page, 'sofa')).toHaveAttribute('data-model-facing', 'south');
  expect((await saved()).find(p => p.id === 'sofa').rot).toBeUndefined();
  await expect(page.getByRole('button', { name: 'Undo room edit', exact: true })).toBeDisabled();
  await select(page, 'chair'); await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await select(page, 'sofa'); await page.getByRole('button', { name: 'Turn left', exact: true }).click();
  await expect.poll(async () => (await saved()).find(p => p.id === 'sofa').rot).toBe(1);
  await page.getByRole('button', { name: 'Undo room edit', exact: true }).click();
  await expect.poll(async () => (await saved()).find(p => p.id === 'sofa').rot || 0).toBe(0);
});

test('desk resizing stops before its props merge, and a refused step adds no undo entry', async ({ page, request }, info) => {
  const saved = await setup(page, request, [
    { id: 'desk', item: 'desk', gx: 2, gy: 2, dimensions: { w: 4, d: 2 } },
    { id: 'one', item: 'mug', gx: 4.5, gy: 2.5 }, { id: 'two', item: 'mug', gx: 5.5, gy: 2.5 },
  ]);
  await select(page, 'desk'); await page.getByRole('button', { name: 'Size', exact: true }).click();
  await page.getByRole('button', { name: 'Decrease width', exact: true }).click();
  await expect.poll(async () => (await saved()).find(p => p.id === 'desk').dimensions.w).toBe(3.5);
  const clear = await saved();
  await page.getByRole('button', { name: 'Decrease width', exact: true }).click();
  await expect(page.getByText(/That size is blocked — check the floor and items on top/)).toBeVisible();
  expect(await saved()).toEqual(clear);
  await page.getByRole('button', { name: 'Undo room edit', exact: true }).click();
  await expect.poll(async () => (await saved()).find(p => p.id === 'desk').dimensions.w).toBe(4);
  await select(page, 'desk', true);
  const [from, to] = await dragPoints(page.locator('[data-resize-corners="desk"] [data-resize-corner="front"] [data-resize-hit]'), -2, 0);
  await begin(page, from, to);
  await expect(page.locator('[data-resize-label="desk"]')).toHaveText('No space');
  await expect(model(page, 'desk')).toHaveAttribute('data-model-dimensions', '3.5x2');
  expect((await saved()).find(p => p.id === 'desk').dimensions.w).toBe(4);
  await page.mouse.up();
  await expect.poll(async () => (await saved()).find(p => p.id === 'desk').dimensions.w).toBe(3.5);
  const props = (await saved()).filter(p => p.item === 'mug');
  expect(props[0].gx).not.toBe(props[1].gx);
  await ready(page); await page.screenshot({ path: info.outputPath('separate-desk-props.png') });
  await page.reload(); await ready(page);
  expect((await saved()).filter(p => p.item === 'mug')).toEqual(props);
});

test('returning a move or corner resize to its press point leaves the original room and undo stack intact', async ({ page, request }) => {
  const saved = await setup(page, request, [
    { id: 'sofa', item: 'sofa', gx: 1, gy: 1 }, { id: 'bed', item: 'bed', gx: 6, gy: 4 },
  ]);
  const original = await saved();
  await select(page, 'sofa', true);
  // Pointer placement at the boundary retains the sofa's authored .85 depth.
  const [edgeFrom, edgeTo] = await dragPoints(piece(page, 'sofa').locator('polygon').first(), 0, 10);
  await begin(page, edgeFrom, edgeTo); await page.mouse.up();
  await expect.poll(async () => (await saved()).find(p => p.id === 'sofa').gy).toBe(9.15);
  const atEdge = await saved();
  await select(page, 'sofa', true);
  const [moveFrom, moveTo] = await dragPoints(piece(page, 'sofa').locator('polygon').first(), 0, -2);
  await begin(page, moveFrom, moveTo);
  await page.mouse.move(moveFrom.x, moveFrom.y, { steps: 1 }); await page.mouse.up();
  expect(await saved()).toEqual(atEdge);
  await page.getByRole('button', { name: 'Undo room edit', exact: true }).click();
  await expect.poll(saved).toEqual(original);
  expect(await saved()).toEqual(original);
  await expect(page.getByRole('button', { name: 'Undo room edit', exact: true })).toBeDisabled();
  await select(page, 'bed', true);
  const [resizeFrom, resizeTo] = await dragPoints(page.locator('[data-resize-corners="bed"] [data-resize-corner="front"] [data-resize-hit]'), 1, 0);
  await begin(page, resizeFrom, resizeTo);
  await expect(model(page, 'bed')).toHaveAttribute('data-model-source', 'parametric');
  await page.mouse.move(resizeFrom.x, resizeFrom.y, { steps: 1 }); await page.mouse.up();
  await expect(model(page, 'bed')).toHaveAttribute('data-model-source', 'glb');
  expect(await saved()).toEqual(original);
  await expect(page.getByRole('button', { name: 'Undo room edit', exact: true })).toBeDisabled();
});
