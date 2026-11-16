import { expect, test } from '@playwright/test';
import en from '../frontend/src/i18n/locales/en.js';

test.use({ actionTimeout: 15000 });
const hud = page => page.getByRole('region', { name: en.messages['hud.title'], exact: true });
async function boot(page, request, classic = true) {
  const registered = await request.post('/api/auth/register', { data: { username: `taskhud${Date.now()}`, password: 'hud-test-only' } });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json(), headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(({ token, classic }) => {
    localStorage.setItem('tasknook.token', token);
    localStorage.setItem('tasknook.isoPreview', classic ? '0' : '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, { token, classic });
  await page.goto('/'); await expect(hud(page)).toBeVisible();
  await expect(hud(page)).toHaveCSS('opacity', '1');
  return { headers };
}
async function add(page, name) {
  const input = hud(page).getByPlaceholder(en.messages['hud.newTask']);
  await input.fill(name); await input.press('Enter');
  await expect(hud(page).getByText(name, { exact: true })).toBeVisible();
}
async function height(page) { return (await hud(page).boundingBox()).height; }

test('the classic room to-do surface grows with tasks, then scrolls beneath its fixed controls', async ({ page, request }, info) => {
  const { headers } = await boot(page, request);
  await expect(page.getByLabel('Classic cottage scene', { exact: true })).toBeVisible();
  expect(await height(page)).toBeLessThan(180);
  await expect(hud(page)).toHaveCSS('backdrop-filter', 'blur(16px)');
  await add(page, 'Review this week’s study notes');
  const one = await height(page);
  await add(page, 'Water the plants and tidy the desk');
  await add(page, 'Read one chapter before lunch');
  expect(await height(page)).toBeGreaterThan(one + 30);
  const complete = hud(page).getByRole('button', { name: en.messages['hud.completeName'].replace('{name}', 'Review this week’s study notes'), exact: true });
  expect(await complete.evaluate(el => {
    const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
  await complete.click();
  await expect(hud(page).getByRole('button', { name: en.messages['hud.undoName'].replace('{name}', 'Review this week’s study notes'), exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('task-hud-classic-short.png') });
  for (let i = 1; i <= 28; i++) {
    expect((await request.post('/api/tasks', { headers, data: { name: `Study exercise ${i}`, duration: 25, priority: 'medium' } })).status()).toBe(201);
  }
  await page.reload(); await expect(hud(page)).toBeVisible();
  const list = hud(page).locator('[data-hud-task-list]');
  await expect.poll(() => list.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  const bounds = await hud(page).boundingBox();
  expect(bounds.height).toBeLessThanOrEqual(1000 * .72 + 1);
  const input = hud(page).getByPlaceholder(en.messages['hud.newTask']);
  const inputBefore = await input.boundingBox();
  await list.hover(); await page.mouse.wheel(0, 3000);
  await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(input).toBeVisible();
  expect((await input.boundingBox()).y).toBeCloseTo(inputBefore.y, 0);
  await page.screenshot({ path: info.outputPath('task-hud-classic-long.png') });
  await page.setViewportSize({ width: 600, height: 420 });
  await expect(hud(page)).toBeVisible();
  const small = await hud(page).boundingBox();
  expect(small.y + small.height).toBeLessThanOrEqual(420 - 80);
  await expect(input).toBeVisible();
  await page.screenshot({ path: info.outputPath('task-hud-small.png') });
  await page.setViewportSize({ width: 390, height: 720 });
  await expect(page.locator('.hud-tasks')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.hud-tasks')).toHaveCount(1);
  await page.locator('.dock-item').getByText('Tasks', { exact: true }).click();
  await expect(page.locator('.app-drawer').getByText('Read one chapter before lunch', { exact: true })).toBeVisible();
});

test('the same surface stays above isometric art and returns after closing a drawer', async ({ page, request }, info) => {
  await boot(page, request, false);
  await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await expect(page.locator('[data-model-state="error"]')).toHaveCount(0);
  await add(page, 'Plan a calm afternoon');
  await expect(hud(page)).toHaveCSS('backdrop-filter', 'blur(16px)');
  await page.screenshot({ path: info.outputPath('task-hud-isometric.png') });
  await page.locator('.dock-item').getByText('Room', { exact: true }).click();
  await expect(page.locator('.hud-tasks')).toBeHidden();
  await page.locator('.app-drawer').getByRole('button', { name: en.messages['drawer.close'], exact: true }).click();
  await expect(page.locator('.app-drawer')).toHaveCount(0);
  await expect(hud(page).getByText('Plan a calm afternoon', { exact: true })).toBeVisible();
});
