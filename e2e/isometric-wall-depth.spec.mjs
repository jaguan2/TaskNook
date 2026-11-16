import { expect, test } from '@playwright/test';
import en from '../frontend/src/i18n/locales/en.js';

test.use({ actionTimeout: 15000 });

const room = page => page.locator('[data-iso-room-scene]');
async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
}
async function boot(page, request, iso) {
  const response = await request.post('/api/auth/register', { data: { username: `walls${Date.now()}`, password: 'wall-test-only' } });
  expect(response.status()).toBe(201);
  const { token } = await response.json(), headers = { Authorization: `Bearer ${token}` };
  if (iso) expect((await request.put('/api/room', { headers, data: { placements: [], iso } })).ok()).toBe(true);
  await page.addInitScript(token => {
    localStorage.setItem('tasknook.token', token);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  await page.goto('/'); await expect(room(page)).toBeVisible(); await ready(page);
  return async () => (await (await request.get('/api/room', { headers })).json()).iso;
}
async function closePanel(page) {
  await page.locator('.app-drawer').getByRole('button', { name: en.messages['drawer.close'], exact: true }).click();
  await expect(page.locator('.app-drawer')).toHaveCount(0);
}
async function sectionsFit(scene) {
  const outside = await scene.locator('[data-wall-section]').evaluateAll(nodes => nodes.flatMap(node => {
    const box = node.getBoundingClientRect(), svg = node.ownerSVGElement.getBoundingClientRect();
    return box.left < svg.left - 1 || box.top < svg.top - 1 || box.right > svg.right + 1 || box.bottom > svg.bottom + 1 ? [node.dataset.wallSection] : [];
  }));
  expect(outside).toEqual([]);
}

test('the GLB rooms and preset previews have solid exterior sections with unchanged saved furniture', async ({ page, request }, info) => {
  test.setTimeout(240000);
  const saved = await boot(page, request);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const presets = [
    ['Loft', 'loft', 2, 'night'], ['Cozy study', 'cozy-study', 2, 'day'],
    ['Cozy cabin', 'cabin', 2, 'night', 'Snow'], ['Reading room', 'reading-room', 2, 'day'],
    ['Corner café', 'corner-cafe', 2, 'day'], ['Secret garden', 'garden', 0, 'day'],
    ['Terrace', 'terrace', 2, 'sunset'], ['Study studio', 'study-studio', 2, 'day'],
    ['Autumn yard', 'autumn-yard', 0, 'sunset'], ['Shared home', 'shared-home', 2, 'sunset'],
    ['Plant shop', 'plant-shop', 2, 'day'], ['Winter yard', 'winter-yard', 0, 'night', 'Snow'],
    ['Poolside', 'poolside', 2, 'day'], ['Holiday hearth', 'holiday-hearth', 2, 'night', 'Snow'],
  ];
  for (const [preset, key, count, period, weather = 'Clear'] of presets) {
    await page.locator('.dock-item').getByText('Room', { exact: true }).click();
    const panel = page.locator('.app-drawer'); await expect(panel).toHaveCSS('opacity', '1');
    const button = panel.getByTitle(`Use ${preset}`, { exact: true });
    if (count) await expect(button.locator('[data-wall-cap]')).toHaveCount(count);
    await button.click(); await closePanel(page); await ready(page);
    await page.locator('.dock-item').getByText('Weather', { exact: true }).click();
    await page.locator('.app-drawer').getByTitle(`${weather} ${period}`, { exact: true }).click();
    await closePanel(page);
    await expect(room(page).locator('[data-wall-cap]')).toHaveCount(count);
    await expect(room(page).locator('[data-wall-end]')).toHaveCount(count);
    await sectionsFit(room(page));
    const models = room(page).locator('[data-catalog-model]');
    expect(await models.count()).toBeGreaterThan(0);
    await expect(models.first()).toHaveAttribute('data-model-source', 'glb');
    await page.screenshot({ path: info.outputPath(`iso-wall-${key}.png`) });
    const before = await saved(); await page.reload(); await ready(page);
    expect(await saved()).toEqual(before);
  }
  await page.setViewportSize({ width: 600, height: 420 });
  await page.locator('.dock-item').getByText('Room', { exact: true }).click();
  await page.locator('.app-drawer').getByTitle('Use Loft', { exact: true }).click();
  await closePanel(page); await ready(page); await sectionsFit(room(page));
  await page.screenshot({ path: info.outputPath('iso-wall-compact.png') });
  expect(errors).toEqual([]);
});

test('asymmetric floor cutaways retain thick finished ends and wall mounts', async ({ page, request }, info) => {
  const saved = await boot(page, request, { w: 8, d: 7, env: 'room',
    mask: ['00011111', '00011111', '11111111', '11111111', '11111111', '11111111', '11111111'],
    placements: [{ id: 'wall-clock', item: 'wallclock', gx: 4, gy: 0, rot: 0 }, { id: 'chair', item: 'armchair', gx: 4, gy: 4, rot: 0, tint: '#a78bb7' }] });
  const before = await saved();
  expect(before.placements).toHaveLength(2);
  await expect(room(page).locator('[data-placement-id="wall-clock"] [data-catalog-model="wallclock"]')).toHaveAttribute('data-model-source', 'glb');
  await expect(room(page).locator('[data-exterior-wall="full"]')).toHaveCount(2);
  await expect(room(page).locator('[data-exterior-wall="cutaway"]')).toHaveCount(2);
  await expect(room(page).locator('[data-wall-cap]')).toHaveCount(4);
  await sectionsFit(room(page));
  await page.screenshot({ path: info.outputPath('iso-wall-shaped.png') });
  await page.reload(); await ready(page); expect(await saved()).toEqual(before);
});

test('indoor common places share the solid wall sections', async ({ page, request }, info) => {
  test.setTimeout(120000);
  await boot(page, request);
  for (const [name, key] of [['Common Cottage', 'common-cottage'], ['Grand Library', 'grand-library']]) {
    await page.locator('.dock-item').getByText('Friends', { exact: true }).click();
    await page.getByRole('button', { name: 'Places', exact: true }).click();
    await page.locator('.app-drawer').getByRole('button').filter({ hasText: name }).click();
    const scene = page.locator(`[data-common-room="${key}"]`);
    await expect(scene).toBeVisible({ timeout: 60000 }); await ready(page);
    await expect(scene.locator('[data-wall-cap]')).toHaveCount(2);
    await expect(scene.locator('[data-wall-end]')).toHaveCount(2);
    await sectionsFit(scene);
    await page.screenshot({ path: info.outputPath(`iso-wall-${key}.png`) });
    await page.goto('/'); await expect(room(page)).toBeVisible(); await ready(page);
  }
});
