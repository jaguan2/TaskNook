import { expect, test } from '@playwright/test';

async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}

test('cabinet controls cycle all four GLB facings and preserve them through saves and reloads', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const registration = await request.post('/api/auth/register', { data: { username: `facings${Date.now()}`, password: 'facing-test-only' } });
  const { token } = await registration.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(value => {
    localStorage.setItem('tasknook.token', value);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  const initial = { placements: [], iso: { version: 2, w: 9, d: 8, placements: [
    { id: 'cabinet', item: 'wardrobe', gx: 1, gy: 1, rot: 2, tint: '#8baba0' },
    { id: 'shelf', item: 'bookcase', gx: 5, gy: 1, rot: 3 },
  ] } };
  expect((await request.put('/api/room', { headers, data: initial })).status()).toBe(200);
  await page.goto('/');
  const cabinet = page.locator('[data-placement-id="cabinet"] [data-catalog-model]');
  const shelf = page.locator('[data-placement-id="shelf"] [data-catalog-model]');
  await expect(cabinet).toHaveAttribute('data-model-facing', 'north');
  await expect(shelf).toHaveAttribute('data-model-facing', 'west');
  await ready(page);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  await cabinet.locator('[data-model-hit-shape]').click();
  const images = new Set();
  for (const [rot, facing] of [[3, 'west'], [0, 'south'], [1, 'east'], [2, 'north']]) {
    // A real focused control exercises the keyboard path and the store action.
    await page.locator('[data-rotate-item="cabinet"]').focus();
    await page.keyboard.press('Enter');
    await expect(cabinet).toHaveAttribute('data-model-facing', facing);
    await expect(page.locator('[data-facing-label="cabinet"]')).toHaveText(new RegExp(facing, 'i'));
    await ready(page);
    const fingerprint = await cabinet.locator('image').evaluate(async image => {
      const bytes = await (await fetch(image.getAttribute('href'))).arrayBuffer();
      return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].join(',');
    });
    images.add(fingerprint);
    await expect.poll(async () => {
      const saved = await (await request.get('/api/room', { headers })).json();
      return saved.iso.placements.find(p => p.id === 'cabinet').rot || 0;
    }).toBe(rot);
  }
  expect(images.size).toBe(4);
  await page.screenshot({ path: testInfo.outputPath('cabinet-four-facings.png') });
  await page.reload();
  await ready(page);
  await expect(cabinet).toHaveAttribute('data-model-facing', 'north');
  await expect(shelf).toHaveAttribute('data-model-facing', 'west');
});

test('bed and lounger models keep their occupants aligned at every facing', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const registration = await request.post('/api/auth/register', { data: { username: `lying${Date.now()}`, password: 'facing-test-only' } });
  const { token } = await registration.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(value => {
    localStorage.setItem('tasknook.token', value);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
  }, token);
  const placements = [];
  for (const [row, item] of ['bed', 'sunlounger', 'hammock'].entries()) for (const rot of [0, 1, 2, 3]) {
    const [w, d] = item === 'bed' ? [2, 2.8] : item === 'sunlounger' ? [1.6, .85] : [2.2, .9];
    const width = rot % 2 ? d : w, depth = rot % 2 ? w : d;
    const gx = 1 + rot * 3.5, gy = 1 + row * 5;
    placements.push({ id: `${item}-${rot}`, item, gx, gy, rot, tint: '#638eae' });
    placements.push({ id: `person-${item}-${rot}`, item: 'resident', gx: gx + (width - .8) / 2, gy: gy + (depth - .8) / 2 });
  }
  expect((await request.put('/api/room', { headers, data: { placements: [], iso: { version: 2, w: 15, d: 15, placements } } })).status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('[data-placement-id="bed-0"] [data-catalog-model]')).toHaveAttribute('data-model-source', 'glb', { timeout: 60000 });
  await ready(page);
  for (const item of ['bed', 'sunlounger', 'hammock']) for (const rot of [0, 1, 2, 3]) {
    const facing = item === 'bed' ? rot : rot ^ 1;
    const person = page.locator(`[data-placement-id="person-${item}-${rot}"]`);
    await expect(person.locator('[data-resident-pose="lying"]')).toHaveAttribute('data-lying-rise', item === 'sunlounger' ? '14' : '0');
    await expect(person.locator('[data-resident-pose="lying"]')).toHaveAttribute('data-lying-reversed', facing >= 2 ? 'true' : 'false');
    await expect(page.locator(`[data-placement-id="${item}-${rot}"] [data-catalog-model]`)).toHaveAttribute('data-model-facing', ['south', 'east', 'north', 'west'][facing]);
  }
  await page.screenshot({ path: testInfo.outputPath('lying-furniture-four-facings.png') });
});
