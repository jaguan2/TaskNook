import { expect, test } from '@playwright/test';
import en from '../frontend/src/i18n/locales/en.js';

const marker = page => page.evaluate(() => JSON.parse(localStorage.getItem('tasknook.challenges')));
const xp = page => page.evaluate(() => JSON.parse(localStorage.getItem('tasknook.progression')).bonusXP);
const progress = async (page, id) => (await marker(page)).daily.find(goal => goal.id === id).progress;
const dock = (page, name) => page.locator('.dock-item').filter({ has: page.getByText(name, { exact: true }) });
const drawer = (page, name) => page.locator('.app-drawer').filter({ has: page.getByRole('heading', { name, exact: true }) });

async function boot(page, request, clock = false) {
  const time = new Date('2026-11-15T17:00:00Z');
  if (clock) await page.clock.install({ time }); else await page.clock.setFixedTime(time);
  const registered = await request.post('/api/auth/register', { data: { username: `smallgoals${Date.now()}`, password: 'challenges-test-only' } });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json();
  expect((await request.put('/api/room', { headers: { Authorization: `Bearer ${token}` }, data: {
    placements: [], iso: { w: 6, d: 6, walls: 'full', placements: [
      { id: 'desk', item: 'desk', gx: .7, gy: .2 },
      { id: 'chair', item: 'deskchair', gx: 1.4, gy: 1.3, rot: 2 },
      { id: 'books', item: 'bookcase', gx: 4.5, gy: .2 },
      { id: 'sofa', item: 'sofa', gx: 1.1, gy: 3, tint: '#8baba0' },
      { id: 'table', item: 'coffeetable', gx: 1.35, gy: 4.2 },
    ] },
  } })).ok()).toBe(true);
  await page.addInitScript(token => {
    localStorage.setItem('tasknook.token', token);
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  await page.goto('/');
  await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await expect(dock(page, 'Challenges')).toBeVisible();
}

async function addTask(page, name) {
  const input = page.getByPlaceholder(en.messages['hud.newTask'], { exact: true });
  await input.fill(name); await input.press('Enter');
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

test('turning challenges off hides even a pinned panel, preserves goals and stops progress until re-enabled', async ({ page, request }, info) => {
  await boot(page, request);
  await dock(page, 'Challenges').click();
  const panel = drawer(page, 'Challenges');
  await expect(panel).toHaveCSS('opacity', '1');
  for (const name of ['Message your friend', 'Go to a common room', 'Add a task', 'Study for 5 minutes']) {
    await expect(panel.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await page.screenshot({ path: info.outputPath('simple-challenges.png') });
  await panel.getByRole('tab', { name: 'My challenges' }).click();
  await panel.getByRole('button', { name: 'New challenge' }).click();
  await panel.getByLabel('Your goal').fill('Read a page');
  await panel.getByLabel(/^Target/).fill('3');
  await panel.getByLabel('Repeat').selectOption('ongoing');
  await panel.getByRole('button', { name: 'Add challenge', exact: true }).click();
  await panel.getByRole('button', { name: '+1 step', exact: true }).click();
  const saved = await marker(page);
  await panel.getByRole('button', { name: en.messages['drawer.pin'] }).click();
  await dock(page, 'Settings').click();
  const settings = drawer(page, 'Settings'), toggle = settings.getByRole('switch', { name: 'Challenges' });
  await toggle.uncheck();
  await expect(dock(page, 'Challenges')).toHaveCount(0);
  await expect(panel).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(settings).toHaveCSS('opacity', '1');
  await page.screenshot({ path: info.outputPath('challenges-off.png') });
  await settings.getByRole('button', { name: en.messages['drawer.close'] }).click();
  await addTask(page, 'Added with challenges off');
  expect(await marker(page)).toEqual(saved);
  await page.reload();
  await expect(dock(page, 'Challenges')).toHaveCount(0);
  await dock(page, 'Settings').click();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await settings.getByRole('button', { name: en.messages['drawer.close'] }).click();
  expect(await progress(page, 'plan-one-task')).toBe(0);
  expect((await marker(page)).custom[0].progress).toBe(1);
  const beforeXP = await xp(page);
  await addTask(page, 'Added after resuming challenges');
  await expect.poll(() => progress(page, 'plan-one-task')).toBe(1);
  await expect.poll(() => xp(page)).toBe(beforeXP + 10);
  await dock(page, 'Settings').click();
  await toggle.uncheck(); await toggle.check();
  expect(await xp(page)).toBe(beforeXP + 10);
});

test('a saved five-minute timer completes the short study goal, but starting it does not', async ({ page, request, browser }, info) => {
  await boot(page, request, true);
  await page.getByRole('button', { name: en.messages['timer.options'], exact: true }).click();
  await page.getByRole('button', { name: '5m', exact: true }).click();
  await page.getByRole('button', { name: en.messages['timer.options'], exact: true }).click();
  await page.getByRole('button', { name: en.messages['timer.startFocus'], exact: true }).click();
  expect(await progress(page, 'short-study')).toBe(0);
  await page.clock.fastForward(300_500);
  await expect.poll(() => progress(page, 'short-study')).toBe(5);
  // Playwright's clock applies to the whole context. Relaunch the saved device
  // state in a fresh context so presentation uses normal animation frames.
  const origin = new URL(page.url()).origin;
  const fresh = await browser.newContext({ baseURL: origin, storageState: await page.context().storageState(), viewport: page.viewportSize() });
  await page.close();
  try {
    const proof = await fresh.newPage();
    await proof.clock.setFixedTime(new Date('2026-11-15T17:06:00Z'));
    await proof.goto('/');
    await dock(proof, 'Challenges').click();
    const row = drawer(proof, 'Challenges').getByRole('heading', { name: 'Study for 5 minutes' }).locator('xpath=ancestor::li');
    await expect(drawer(proof, 'Challenges')).toHaveCSS('opacity', '1');
    await expect(row.getByText('Completed today', { exact: true })).toBeVisible();
    await row.scrollIntoViewIfNeeded();
    await proof.screenshot({ path: info.outputPath('short-study-complete.png') });
  } finally { await fresh.close(); }
});

test('a sent friend message and an accepted common-room entry complete their simple goals', async ({ page, request }) => {
  await boot(page, request);
  await dock(page, 'Friends').click();
  const friends = drawer(page, 'Friends');
  await friends.locator('[data-friend-card="luna"]').getByRole('button', { name: /Chat/ }).click();
  await friends.getByRole('textbox', { name: en.messages['chat.thread.type'] }).fill('Hello!');
  await friends.getByRole('button', { name: en.messages['chat.thread.send'], exact: true }).click();
  await expect.poll(() => progress(page, 'talk-to-friend')).toBe(1);
  await friends.getByRole('button', { name: en.messages['chat.thread.back'], exact: true }).click();
  await friends.getByRole('button', { name: 'Places', exact: true }).click();
  await friends.getByRole('button').filter({ hasText: 'Common Cottage' }).click();
  await expect.poll(() => progress(page, 'join-common-place')).toBe(1);
  await expect(page.locator('[data-common-room="common-cottage"]')).toBeVisible({ timeout: 60000 });
});

test.describe('compact touch window', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 720 } });
  test('the switch and short-timer preset remain reachable without horizontal overflow', async ({ page, request }, info) => {
    await boot(page, request);
    await dock(page, 'Settings').tap();
    const settings = drawer(page, 'Settings'), toggle = settings.getByRole('switch', { name: 'Challenges' });
    await toggle.uncheck(); await expect(dock(page, 'Challenges')).toHaveCount(0);
    await toggle.check();
    expect(await settings.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await settings.getByRole('button', { name: en.messages['drawer.close'] }).tap();
    await page.getByRole('button', { name: en.messages['timer.options'], exact: true }).tap();
    await page.getByRole('button', { name: '5m', exact: true }).tap();
    await page.getByRole('button', { name: en.messages['timer.options'], exact: true }).tap();
    await dock(page, 'Challenges').tap();
    const panel = drawer(page, 'Challenges');
    await expect(panel).toHaveCSS('opacity', '1');
    await panel.getByRole('heading', { name: 'Study for 5 minutes' }).scrollIntoViewIfNeeded();
    expect(await panel.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('simple-challenges-small.png') });
  });
});
