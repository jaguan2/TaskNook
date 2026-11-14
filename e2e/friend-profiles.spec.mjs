import { expect, test } from '@playwright/test';
import en from '../frontend/src/i18n/locales/en.js';
import es from '../frontend/src/i18n/locales/es.js';
import ja from '../frontend/src/i18n/locales/ja.js';

async function openFriends(page, language = 'en', messages = en.messages) {
  await page.clock.setFixedTime(new Date('2026-11-14T17:00:00Z'));
  await page.addInitScript(language => {
    localStorage.setItem('tasknook.language', language);
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, language);
  await page.goto('/');
  await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
  await page.locator('.dock-item').getByText(messages['panel.friends.title'], { exact: true }).click();
  return page.locator('.app-drawer');
}
const triggerFor = (drawer, name) => drawer.getByRole('button', { name: `View ${name}'s profile` });
const profileFor = (drawer, name) => drawer.getByRole('region', { name: `About ${name}` });
const minutes = text => Number(/(\d+)h/.exec(text)?.[1] || 0) * 60 + Number(/(\d+)m/.exec(text)?.[1] || 0);

test('friend facts survive reload and profile study totals agree with the weekly board', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const drawer = await openFriends(page);
  await triggerFor(drawer, 'Luna').click();
  const profile = profileFor(drawer, 'Luna');
  await expect(profile.getByText('October 12, 1997', { exact: true })).toBeVisible();
  await expect(profile.getByText('she/her', { exact: true })).toBeVisible();
  await expect(profile.getByText('September 18, 2023', { exact: true })).toBeVisible();
  const facts = await profile.locator('dl').first().innerText();
  const week = minutes(await profile.getByText('Focus this week', { exact: true }).locator('..').locator('dd').innerText());
  await profile.scrollIntoViewIfNeeded();
  await expect(drawer).toHaveCSS('opacity', '1');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath('friend-profile-desktop.png') });
  await drawer.getByRole('button', { name: 'Weekly', exact: true }).click();
  const ranking = drawer.getByRole('list', { name: 'Weekly study rankings' }).getByRole('listitem').filter({ hasText: 'Luna' });
  expect(minutes(await ranking.innerText())).toBe(week);
  await page.reload();
  await page.locator('.dock-item').getByText('Friends', { exact: true }).click();
  await triggerFor(drawer, 'Luna').click();
  expect(await profileFor(drawer, 'Luna').locator('dl').first().innerText()).toBe(facts);
  expect(errors).toEqual([]);
});

test('keyboard closes details first and Chat and Visit remain independent actions', async ({ page }) => {
  const drawer = await openFriends(page);
  const luna = triggerFor(drawer, 'Luna'); await luna.focus(); await page.keyboard.press('Enter');
  await expect(profileFor(drawer, 'Luna')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profileFor(drawer, 'Luna')).toHaveCount(0);
  await expect(drawer).toBeVisible(); await expect(luna).toBeFocused();
  await luna.click(); await triggerFor(drawer, 'Kai').click();
  await expect(profileFor(drawer, 'Luna')).toHaveCount(0);
  const kai = profileFor(drawer, 'Kai'); await expect(kai).toBeVisible();
  await kai.locator('..').getByRole('button', { name: /Chat/ }).click();
  await expect(drawer.getByRole('button', { name: en.messages['chat.thread.back'], exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: en.messages['chat.thread.back'], exact: true }).click();
  await expect(profileFor(drawer, 'Kai')).toBeVisible();
  await profileFor(drawer, 'Kai').locator('..').getByRole('button', { name: /Visit/ }).click();
  await expect(page.getByRole('button', { name: /Return home from/ })).toBeVisible();
});

test.describe('touch and compact windows', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 720 } });
  test('details wrap inside the drawer and can be closed at both sizes', async ({ page }, testInfo) => {
    const drawer = await openFriends(page);
    for (const viewport of [{ width: 390, height: 720 }, { width: 320, height: 360 }]) {
      await page.setViewportSize(viewport);
      await triggerFor(drawer, 'Luna').tap();
      const profile = profileFor(drawer, 'Luna'); await profile.scrollIntoViewIfNeeded();
      const bounds = await profile.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(await profile.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
      await expect(drawer).toHaveCSS('opacity', '1');
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: testInfo.outputPath(`friend-profile-${viewport.width}.png`) });
      await profile.getByRole('button', { name: "Close Luna's profile" }).tap();
      await expect(profile).toHaveCount(0);
    }
  });
});

for (const [language, messages] of [['es', es.messages], ['ja', ja.messages]]) {
  test(`${language} profiles use localized labels and dates without changing character facts`, async ({ page }) => {
    const drawer = await openFriends(page, language, messages);
    await drawer.getByRole('button', { name: messages['friends.profile.open'].replace('{name}', 'Luna') }).click();
    const profile = drawer.getByRole('region', { name: messages['friends.profile.title'].replace('{name}', 'Luna') });
    await expect(profile.getByText(messages['friends.profile.birthday'], { exact: true })).toBeVisible();
    await expect(profile.getByText(messages['friends.profile.gender.woman'], { exact: true })).toBeVisible();
    await expect(profile.getByText('she/her', { exact: true })).toBeVisible();
    await expect(profile).not.toContainText('October');
    await expect(profile).not.toContainText('friends.profile.');
  });
}
