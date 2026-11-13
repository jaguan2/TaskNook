import { expect, test } from '@playwright/test';
test.use({ actionTimeout: 10000 });

async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}
const model = (page, id) => page.locator(`[data-placement-id="${id}"] [data-catalog-model]`).first();
async function digest(node) {
  return node.locator('image').evaluate(async image => {
    const bytes = await (await fetch(image.getAttribute('href'))).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].join(',');
  });
}
async function select(page, id) {
  await page.locator(`[data-placement-id="${id}"]`).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`[data-resize-item="${id}"]`)).toBeVisible();
}
async function drag(page, id, dx, dy) {
  const [from, to] = await page.locator(`[data-resize-item="${id}"] circle`).evaluate((circle, { dx, dy }) => {
    const box = circle.getBBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
    return [new DOMPoint(x, y), new DOMPoint(x + (dx - dy) * 24, y + (dx + dy) * 12)]
      .map(p => { const q = p.matrixTransform(circle.getScreenCTM()); return { x: q.x, y: q.y }; });
  }, { dx, dy });
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}
async function setup(page, request, placements, wide = false) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const registration = await request.post('/api/auth/register', { data: { username: `sizing${Date.now()}`, password: 'resize-test-only' } });
  expect(registration.status()).toBe(201);
  const { token } = await registration.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(({ token, wide }) => {
    localStorage.setItem('tasknook.token', token);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
    if (wide) localStorage.setItem('tasknook.isoView', JSON.stringify({ x: -180, y: -80, w: 1000, h: 650 }));
  }, { token, wide });
  expect((await request.put('/api/room', { headers, data: {
    placements: [], iso: { version: 2, w: wide ? 16 : 8, d: wide ? 14 : 8, placements },
  } })).status()).toBe(200);
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  return async () => (await (await request.get('/api/room', { headers })).json()).iso.placements;
}

test('a wider sofa keeps its occupant and independent colour through every facing', async ({ page, request }, info) => {
  test.setTimeout(180000);
  const saved = await setup(page, request, [
    { id: 'sofa', item: 'sofa', gx: 1, gy: 1, tint: '#7799aa' },
    { id: 'sitter', item: 'resident', gx: 1.5, gy: 1 },
    { id: 'other', item: 'sofa', gx: 1, gy: 5, tint: '#7799aa' },
  ]);
  const before = await digest(model(page, 'other'));
  await select(page, 'sofa');
  await page.getByRole('button', { name: 'Size', exact: true }).click();
  await page.getByRole('button', { name: 'Drag resize handle', exact: true }).click();
  await drag(page, 'sofa', 1.5, .15);
  await expect(model(page, 'sofa')).toHaveAttribute('data-model-dimensions', '3.5x1');
  await expect.poll(async () => (await saved()).find(p => p.id === 'sofa').dimensions).toEqual({ w: 3.5, d: 1 });
  await ready(page);
  await page.screenshot({ path: info.outputPath('sofa-3.5x1.png') });
  for (const facing of ['east', 'north', 'west', 'south']) {
    await page.locator('[data-rotate-item="sofa"]').focus(); await page.keyboard.press('Enter');
    await expect(model(page, 'sofa')).toHaveAttribute('data-model-facing', facing);
    await expect(page.locator('[data-placement-id="sitter"] [data-seat-pose]')).toBeVisible();
    await ready(page);
  }
  await select(page, 'sofa');
  await page.getByRole('button', { name: 'Colours', exact: true }).click();
  await page.getByRole('textbox', { name: 'Finish colour hex' }).fill('#8b759f');
  await ready(page);
  expect(await digest(model(page, 'other'))).toBe(before);
  await expect.poll(async () => (await saved()).find(p => p.id === 'sofa').tint).toBe('#8b759f');
  await page.reload(); await ready(page);
  await expect(model(page, 'sofa')).toHaveAttribute('data-model-source', 'parametric');
  await expect(model(page, 'sofa')).toHaveAttribute('data-model-dimensions', '3.5x1');
});

test('desk resizing retains supported equipment and carries it through four turns', async ({ page, request }, info) => {
  test.setTimeout(180000);
  const saved = await setup(page, request, [
    { id: 'desk', item: 'desk', gx: 1, gy: 1, tint: '#9d8971' },
    { id: 'computer', item: 'computer', gx: 1.5, gy: 1 },
    { id: 'mug', item: 'mug', gx: 2.5, gy: 1.5, tint: '#9977aa' },
    { id: 'chair', item: 'deskchair', gx: 1.5, gy: 2.5, rot: 2 },
    { id: 'sitter', item: 'resident', gx: 1.5, gy: 2.5 },
  ]);
  await select(page, 'desk');
  await page.getByRole('button', { name: 'Size', exact: true }).click();
  await page.getByRole('button', { name: 'Drag resize handle', exact: true }).click();
  await drag(page, 'desk', 1.8, .3);
  await expect.poll(async () => (await saved()).find(p => p.id === 'desk').dimensions).toEqual({ w: 4, d: 1.5 });
  await ready(page);
  await page.screenshot({ path: info.outputPath('desk-4x1.5.png') });
  for (const [rot, facing] of [[1, 'east'], [2, 'north'], [3, 'west'], [0, 'south']]) {
    await page.locator('[data-rotate-item="desk"]').focus(); await page.keyboard.press('Enter');
    await expect(model(page, 'desk')).toHaveAttribute('data-model-facing', facing);
    await expect(model(page, 'computer')).toHaveAttribute('data-model-facing', facing);
    await ready(page);
    await expect.poll(async () => (await saved()).find(p => p.id === 'computer').rot || 0).toBe(rot);
  }
  expect((await saved()).find(p => p.id === 'mug').tint).toBe('#9977aa');
  await page.reload(); await ready(page);
  await expect(model(page, 'desk')).toHaveAttribute('data-model-dimensions', '4x1.5');
  await page.screenshot({ path: info.outputPath('desk-equipment-reloaded.png') });
});

test('all six shelf styles resize with saved decoration and still support changing contents', async ({ page, request }, info) => {
  test.setTimeout(240000);
  const shelves = [
    ['bookshelf', 1, 2, 0, 1.5, .7], ['bookcase', 6, 2, 1, 2, .6], ['shelf', 11, 2, 0, 1, .5],
    ['ladder', 1, 6, 0, .9, .5], ['plantshelf', 6, 6, 0, 1.5, .6], ['wallshelf', 1, 0, 0, 1.6, .3],
  ];
  const saved = await setup(page, request, shelves.map(([item, gx, gy, rot]) => ({ id: item, item, gx, gy, rot,
    tint: '#82917b', decor: { layout: 'mixed', bookColor: '#8975af' } })), true);
  for (const [item, , , rot, w, d] of shelves) {
    await select(page, item);
    const before = await digest(model(page, item));
    await page.getByRole('button', { name: 'Size', exact: true }).click();
    await page.getByRole('button', { name: 'Drag resize handle', exact: true }).click();
    await drag(page, item, rot % 2 ? 1 - d : 3.5 - w, rot % 2 ? 3.5 - w : 1 - d);
    await expect(model(page, item)).toHaveAttribute('data-model-dimensions', '3.5x1');
    await ready(page);
    expect(await digest(model(page, item))).not.toBe(before);
    await expect.poll(async () => (await saved()).find(p => p.id === item)).toMatchObject({ dimensions: { w: 3.5, d: 1 },
      decor: { layout: 'mixed', bookColor: '#8975af' }, tint: '#82917b' });
  }
  await page.screenshot({ path: info.outputPath('six-resized-shelves.png') });
  await select(page, 'bookcase');
  await page.getByRole('button', { name: 'Colours', exact: true }).click();
  await page.getByRole('combobox', { name: 'Shelf contents' }).selectOption('plants'); await ready(page);
  await expect.poll(async () => (await saved()).find(p => p.id === 'bookcase').decor.layout).toBe('plants');
  await page.locator('[data-resize-item="bookcase"]').focus(); await page.keyboard.press('Home');
  await expect(model(page, 'bookcase')).toHaveAttribute('data-model-source', 'glb', { timeout: 60000 });
  await expect.poll(async () => (await saved()).find(p => p.id === 'bookcase').dimensions).toBeUndefined();
  await page.reload(); await ready(page);
  for (const [item] of shelves.filter(([key]) => key !== 'bookcase')) {
    await expect(model(page, item)).toHaveAttribute('data-model-source', 'parametric');
    await expect(model(page, item)).toHaveAttribute('data-model-dimensions', '3.5x1');
  }
});
