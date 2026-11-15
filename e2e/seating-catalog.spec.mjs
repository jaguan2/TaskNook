import { expect, test } from '@playwright/test';

const OPTIONS = [['spindlechair', 'Spindle chair', '#9a704d'], ['foldingchair', 'Folding chair', '#ba9b80'],
  ['loungechair', 'Lounge chair', '#798a9b'], ['sofa', 'Sofa', '#8a9e8b']];
const ready = async page => {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
};

test('new chairs are real catalog options with saved colours and four facings alongside the low sofa', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const registered = await request.post('/api/auth/register', { data: { username: `seating${Date.now()}`, password: 'seating-test-only' } });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json(), headers = { Authorization: `Bearer ${token}` };
  const room = placements => ({ placements: [], iso: { w: 8, d: 7, walls: 'none', placements } });
  expect((await request.put('/api/room', { headers, data: room([]) })).ok()).toBe(true);
  const saved = async () => (await (await request.get('/api/room', { headers })).json()).iso.placements;
  await page.addInitScript(token => {
    localStorage.setItem('tasknook.token', token); localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced'); localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  await page.goto('/');
  for (const [key, label] of OPTIONS) {
    await page.getByRole('button', { name: 'Room', exact: true }).click();
    const drawer = page.locator('.app-drawer');
    await expect(drawer.getByRole('button', { name: /Decorate the room|Done decorating/ })).toBeVisible();
    const browse = drawer.getByRole('button', { name: /Browse by category/ });
    if (await browse.count() && await browse.getAttribute('aria-expanded') !== 'true') await browse.click();
    const section = drawer.getByRole('button').filter({ has: page.locator('span').filter({ hasText: /^Seating & beds$/ }) }).first();
    if (await section.getAttribute('aria-expanded') !== 'true') await section.click();
    const tile = drawer.getByTitle(`Add ${label}`, { exact: true });
    await expect(tile.locator(`[data-catalog-model="${key}"]`)).toHaveAttribute('data-model-source', 'glb');
    await tile.click();
    await expect(drawer).toHaveCount(0);
    await expect.poll(async () => (await saved()).filter(p => p.item === key).length).toBe(1);
  }
  // Arrange a readable review using the pieces just placed through the picker.
  const positions = [[1.5, 1.5], [4.5, 1.5], [1.5, 3.5], [4, 3.5]];
  const catalogPieces = await saved();
  const placements = OPTIONS.map(([item], index) => ({ ...catalogPieces.find(piece => piece.item === item), gx: positions[index][0], gy: positions[index][1] }));
  const ids = Object.fromEntries(placements.map(piece => [piece.item, piece.id]));
  placements.push({ id: 'you', item: 'you', gx: 4.4, gy: 3.7 });
  expect((await request.put('/api/room', { headers, data: room(placements) })).ok()).toBe(true);
  await page.reload(); await ready(page);
  await page.getByRole('button', { name: 'Room', exact: true }).click();
  await page.getByRole('button', { name: /Decorate the room/ }).click();
  await page.getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  for (const [key, , hex] of OPTIONS) {
    const id = ids[key], placement = page.locator(`[data-placement-id="${id}"]`);
    const model = placement.locator(`[data-catalog-model="${key}"]`).first();
    await placement.focus(); await page.keyboard.press('Enter');
    for (const facing of ['east', 'north', 'west', 'south']) {
      await page.locator(`[data-rotate-item="${id}"]`).focus(); await page.keyboard.press('Enter');
      await expect(model).toHaveAttribute('data-model-facing', facing); await ready(page);
    }
    await page.getByRole('button', { name: 'Colours', exact: true }).click();
    await page.getByRole('textbox', { name: 'Finish colour hex' }).fill(hex);
    await expect(model).toHaveAttribute('data-model-color', hex); await ready(page);
    await expect.poll(async () => (await saved()).find(p => p.id === id).tint).toBe(hex);
    await page.getByRole('button', { name: 'Deselect furniture', exact: true }).click();
  }
  await page.reload(); await ready(page);
  for (const [key, , hex] of OPTIONS) {
    const model = page.locator(`[data-placement-id="${ids[key]}"] [data-catalog-model="${key}"]`).first();
    await expect(model).toHaveAttribute('data-model-color', hex);
    await expect(model).toHaveAttribute('data-model-facing', 'south');
  }
  await expect(page.locator('[data-placement-id="you"] [data-seat-pose]')).toBeVisible();
  await page.screenshot({ path: info.outputPath('seating-options-in-room.png') });
});
