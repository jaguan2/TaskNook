import { expect, test } from '@playwright/test';
import en from '../frontend/src/i18n/locales/en.js';

test.use({ actionTimeout: 15000 });
test.setTimeout(90000);
const iso = page => page.getByLabel('Isometric room scene', { exact: true });
const view = scene => scene.evaluate(svg => {
  const { x, y, width: w, height: h } = svg.viewBox.baseVal; return { x, y, w, h };
});
async function ready(page) {
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}
async function boot(page, request, classic = false) {
  const response = await request.post('/api/auth/register', { data: { username: `zoom${Date.now()}`, password: 'zoom-test-only' } });
  expect(response.status()).toBe(201);
  const { token } = await response.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(({ token, classic }) => {
    localStorage.setItem('tasknook.token', token);
    localStorage.setItem('tasknook.isoPreview', classic ? '0' : '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, { token, classic });
  await page.goto('/');
  await expect(classic ? page.getByLabel('Classic cottage scene', { exact: true }) : iso(page)).toBeVisible();
  await ready(page);
  return async () => (await (await request.get('/api/room', { headers })).json());
}
async function openRoom(page) {
  await page.locator('.dock-item').getByText('Room', { exact: true }).click();
  await expect(page.locator('.app-drawer')).toHaveCSS('opacity', '1');
}
async function closePanel(page) {
  await page.locator('.app-drawer').getByRole('button', { name: en.messages['drawer.close'], exact: true }).click();
  await expect(page.locator('.app-drawer')).toHaveCount(0);
}

test('Control zoom changes only the home room, shares wheel limits and persists its camera', async ({ page, request }, info) => {
  const saved = await boot(page, request), before = await saved();
  const hud = await page.locator('.hud-tasks').boundingBox();
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const draft = page.getByPlaceholder(en.messages['hud.newTask']);
  await draft.fill('Keep this unfinished task');
  await page.keyboard.press('Control+Equal');
  expect((await view(iso(page))).w).toBeCloseTo(640 / 1.12);
  await expect(draft).toHaveValue('Keep this unfinished task'); await expect(draft).toBeFocused();
  await page.keyboard.press('Control+Minus');
  expect((await view(iso(page))).w).toBeCloseTo(640);
  await page.keyboard.press('Control+Shift+Equal');
  await expect.poll(async () => JSON.parse(await page.evaluate(() => localStorage.getItem('tasknook.isoView')))?.w).toBeCloseTo(640 / 1.12);
  await page.screenshot({ path: info.outputPath('room-zoom-isometric.png') });
  await page.reload(); await ready(page);
  expect((await view(iso(page))).w).toBeCloseTo(640 / 1.12);
  await page.keyboard.press('Control+0');
  expect(await view(iso(page))).toEqual({ x: 0, y: 0, w: 640, h: 480 });
  await page.keyboard.press('Control+NumpadAdd');
  expect((await view(iso(page))).w).toBeCloseTo(640 / 1.12);
  await page.keyboard.press('Control+0');
  await iso(page).hover({ position: { x: 800, y: 600 } }); await page.mouse.wheel(0, -120);
  await expect.poll(async () => (await view(iso(page))).w).toBeCloseTo(640 / 1.12);
  for (let i = 0; i < 35; i++) await page.keyboard.press('Control+Equal');
  expect((await view(iso(page))).w).toBe(220);
  for (let i = 0; i < 45; i++) await page.keyboard.press('Control+Minus');
  expect((await view(iso(page))).w).toBe(1600);
  await page.keyboard.press('Control+0');
  expect(await page.locator('.hud-tasks').boundingBox()).toEqual(hud);
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(dpr);
  expect(await saved()).toEqual(before);
});

test('classic zoom leaves preset previews and decoration coordinates intact', async ({ page, request }, info) => {
  const saved = await boot(page, request, true);
  const scene = page.getByLabel('Classic cottage scene', { exact: true });
  const original = await view(scene), before = await saved();
  const hud = await page.locator('.hud-tasks').boundingBox();
  await openRoom(page);
  const preview = page.locator('.app-drawer .cottage-preview').first();
  const previewBefore = await preview.locator('svg').first().getAttribute('viewBox');
  await page.keyboard.press('Control+Equal');
  expect((await view(scene)).w).toBeCloseTo(original.w / 1.12);
  expect(await preview.locator('svg').first().getAttribute('viewBox')).toBe(previewBefore);
  await page.locator('.app-drawer').getByRole('button', { name: en.messages['room.decorate.start'], exact: true }).click();
  await closePanel(page);
  const chair = scene.getByRole('button', { name: 'Select Study chair', exact: true });
  await chair.click(); await chair.focus(); await page.keyboard.press('ArrowRight');
  const previousChair = before.placements.find(item => item.item === 'deskchair');
  await expect.poll(async () => (await saved()).placements.find(item => item.id === previousChair.id)?.x).toBe(previousChair.x + 4);
  await page.keyboard.press('Control+0'); expect(await view(scene)).toEqual(original);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+Equal');
  expect(await page.locator('.hud-tasks').boundingBox()).toEqual(hud);
  await page.screenshot({ path: info.outputPath('room-zoom-classic.png') });
});

test('common-room zoom is local to the visit and pauses behind a profile modal', async ({ page, request }, info) => {
  await boot(page, request);
  await page.keyboard.press('Control+Equal');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tasknook.isoView'))).not.toBeNull();
  const home = await page.evaluate(() => localStorage.getItem('tasknook.isoView'));
  await page.locator('.dock-item').getByText('Friends', { exact: true }).click();
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator('.app-drawer').getByRole('button').filter({ hasText: 'Grand Library' }).click();
  const scene = page.locator('[data-common-room="grand-library"] > svg');
  await expect(scene).toBeVisible({ timeout: 60000 }); await ready(page);
  const initial = await view(scene);
  await scene.locator('[data-common-profile-name]').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Control+Equal'); expect(await view(scene)).toEqual(initial);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Control+Equal');
  expect((await view(scene)).w).toBeCloseTo(initial.w / 1.12);
  await page.screenshot({ path: info.outputPath('room-zoom-library.png') });
  await page.keyboard.press('Control+0'); expect(await view(scene)).toEqual(initial);
  expect(await page.evaluate(() => localStorage.getItem('tasknook.isoView'))).toBe(home);
  await page.keyboard.press('Escape'); await expect(iso(page)).toBeVisible();
  expect((await view(iso(page))).w).toBeCloseTo(JSON.parse(home).w);
});
