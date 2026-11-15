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
  const drawer = page.locator('.app-drawer');
  await expect(drawer).toHaveCSS('opacity', '1');
  await page.evaluate(() => document.fonts.ready);
  return drawer;
}
const triggerFor = (drawer, name) => drawer.getByRole('button', { name: `View ${name}'s profile` });
const profileFor = (page, name) => page.getByRole('dialog', { name: `About ${name}` });
const minutes = text => Number(/(\d+)h/.exec(text)?.[1] || 0) * 60 + Number(/(\d+)m/.exec(text)?.[1] || 0);

async function expectWindowCentered(page, popup) {
  const bounds = await popup.boundingBox();
  const viewport = page.viewportSize();
  expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(1);
  expect(Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2)).toBeLessThan(1);
}

test('the whole friend card opens a profile and its level meter spans the card', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('tasknook.friendship', JSON.stringify({ luna: 60, kai: 60 })));
  const drawer = await openFriends(page);
  const card = drawer.locator('[data-friend-card="luna"]');
  const box = await card.boundingBox(), trigger = await triggerFor(drawer, 'Luna').boundingBox();
  for (const key of ['x', 'y', 'width', 'height']) expect(Math.abs(box[key] - trigger[key])).toBeLessThan(1);
  const bar = card.getByRole('progressbar', { name: 'Luna friendship' });
  expect(Math.abs((await bar.boundingBox()).width - (box.width - 24))).toBeLessThan(2);
  await expect(bar).toHaveAttribute('data-friendship-level', '2');
  await expect(drawer.locator('[data-friend-card="kai"]').getByRole('progressbar')).toHaveAttribute('data-friendship-level', '3');
  await page.screenshot({ path: info.outputPath('friendship-cards-desktop.png') });
  const targets = [
    { x: box.x + 5, y: box.y + 5 },
    await bar.evaluate(node => { const r = node.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }),
    await card.locator('[title$="tasks complete"]').evaluate(node => { const r = node.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }),
    { x: box.x + box.width - 12, y: box.y + box.height - 12 },
  ];
  for (const { x, y } of targets) {
    await page.mouse.click(x, y);
    const popup = profileFor(page, 'Luna');
    await expect(popup).toBeVisible(); await expectWindowCentered(page, popup);
    await page.keyboard.press('Escape'); await expect(triggerFor(drawer, 'Luna')).toBeFocused();
  }
  await page.keyboard.press('Space');
  await expect(profileFor(page, 'Luna')).toBeVisible();
  await page.keyboard.press('Escape');
  await card.getByRole('button', { name: 'Remove friend' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Remove friend' })).toHaveText('sure?');
});

test('accepted chat advances a personal friendship level and keeps its points after reload', async ({ page }, info) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('tasknook.friendship')) localStorage.setItem('tasknook.friendship', JSON.stringify({ luna: 44, kai: 44 }));
  });
  const drawer = await openFriends(page);
  const kai = drawer.locator('[data-friend-card="kai"]');
  await expect(kai.getByRole('progressbar')).toHaveAttribute('data-friendship-level', '2');
  await kai.getByRole('button', { name: /Chat/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await drawer.getByRole('textbox', { name: en.messages['chat.thread.type'] }).fill('Hello!');
  await drawer.getByRole('button', { name: en.messages['chat.thread.send'], exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('tasknook.friendship')).kai)).toBe(46);
  await drawer.getByRole('button', { name: en.messages['chat.thread.back'], exact: true }).click();
  await expect(kai.getByRole('progressbar')).toHaveAttribute('data-friendship-level', '3');
  await expect(kai.getByText('1 / 105', { exact: true })).toBeVisible();
  await expect(drawer.locator('[data-friend-card="luna"]').getByRole('progressbar')).toHaveAttribute('data-friendship-level', '2');
  await page.screenshot({ path: info.outputPath('friendship-level-up.png') });
  await page.reload();
  await page.locator('.dock-item').getByText('Friends', { exact: true }).click();
  await expect(kai.getByRole('progressbar')).toHaveAttribute('data-friendship-level', '3');
  await triggerFor(drawer, 'Kai').click();
  await expect(profileFor(page, 'Kai').getByText('Connects quickly at first; a deep bond takes more time.')).toBeVisible();
});

test('friend facts survive reload and profile study totals agree with the weekly board', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const drawer = await openFriends(page);
  const row = triggerFor(drawer, 'Luna').locator('..');
  const rowBefore = await row.boundingBox();
  await triggerFor(drawer, 'Luna').click();
  const profile = profileFor(page, 'Luna');
  expect((await row.boundingBox()).height).toBe(rowBefore.height);
  const popupBounds = await profile.boundingBox();
  await expectWindowCentered(page, profile);
  // Padding clicks and a drag released outside must not act like backdrop taps.
  await page.mouse.click(popupBounds.x + 10, popupBounds.y + 10);
  await page.mouse.move(popupBounds.x + 10, popupBounds.y + 10);
  await page.mouse.down(); await page.mouse.move(4, 4); await page.mouse.up();
  await expect(profile).toBeVisible();
  expect(await profile.evaluate(dialog => dialog.matches(':modal'))).toBe(true);
  await expect(profile.getByText('October 12, 1997', { exact: true })).toBeVisible();
  await expect(profile.getByText('she/her', { exact: true })).toBeVisible();
  await expect(profile.getByText('September 18, 2023', { exact: true })).toBeVisible();
  const facts = await profile.locator('dl').first().innerText();
  const week = minutes(await profile.getByText('Focus this week', { exact: true }).locator('..').locator('dd').innerText());
  await profile.scrollIntoViewIfNeeded();
  await expect(drawer).toHaveCSS('opacity', '1');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath('friend-profile-desktop.png') });
  await page.mouse.click(4, 4);
  await expect(profile).toHaveCount(0);
  await expect(triggerFor(drawer, 'Luna')).toBeFocused();
  await drawer.getByRole('button', { name: 'Weekly', exact: true }).click();
  const ranking = drawer.getByRole('list', { name: 'Weekly study rankings' }).getByRole('listitem').filter({ hasText: 'Luna' });
  expect(minutes(await ranking.innerText())).toBe(week);
  await page.reload();
  await page.locator('.dock-item').getByText('Friends', { exact: true }).click();
  await triggerFor(drawer, 'Luna').click();
  expect(await profileFor(page, 'Luna').locator('dl').first().innerText()).toBe(facts);
  expect(errors).toEqual([]);
});

test('profile stays centered on the app window after moving the Friends HUD and resizing', async ({ page }) => {
  const drawer = await openFriends(page);
  const before = await drawer.boundingBox();
  const header = await drawer.locator('header').first().boundingBox();
  await page.mouse.move(header.x + 60, header.y + 30);
  await page.mouse.down();
  await page.mouse.move(header.x - 260, header.y + 50, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => before.x - (await drawer.boundingBox()).x).toBeGreaterThan(250);
  await triggerFor(drawer, 'Luna').click();
  const popup = profileFor(page, 'Luna');
  await expect(popup).toBeVisible();
  await expectWindowCentered(page, popup);
  expect(await popup.evaluate(node => node.parentElement === document.body)).toBe(true);
  await page.setViewportSize({ width: 1000, height: 700 });
  await expectWindowCentered(page, popup);
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(triggerFor(drawer, 'Luna')).toBeFocused();
});

test('keyboard closes details first and Chat and Visit remain independent actions', async ({ page }) => {
  const drawer = await openFriends(page);
  const luna = triggerFor(drawer, 'Luna'); await luna.focus(); await page.keyboard.press('Enter');
  const closeLuna = profileFor(page, 'Luna').getByRole('button', { name: "Close Luna's profile" });
  await expect(closeLuna).toBeFocused();
  for (const key of ['Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    // Native Tab navigation may reach browser chrome, but never another app
    // control behind the popup. WebView has no browser address-bar stop.
    expect(await page.evaluate(() => document.activeElement === document.body
      || Boolean(document.activeElement.closest('dialog:modal')))).toBe(true);
  }
  await closeLuna.focus();
  // Native modal inertness also prevents programmatic focus escaping to the row.
  await luna.evaluate(button => button.focus());
  await expect(closeLuna).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(profileFor(page, 'Luna')).toHaveCount(0);
  await expect(drawer).toBeVisible(); await expect(luna).toBeFocused();
  await triggerFor(drawer, 'Kai').click();
  await expect(profileFor(page, 'Luna')).toHaveCount(0);
  const kai = profileFor(page, 'Kai'); await expect(kai).toBeVisible();
  await kai.getByRole('button', { name: "Close Kai's profile" }).click();
  const kaiRow = triggerFor(drawer, 'Kai').locator('..');
  await kaiRow.getByRole('button', { name: /Chat/ }).click();
  await expect(drawer.getByRole('button', { name: en.messages['chat.thread.back'], exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: en.messages['chat.thread.back'], exact: true }).click();
  await expect(profileFor(page, 'Kai')).toHaveCount(0);
  await triggerFor(drawer, 'Kai').click();
  await kai.getByRole('button', { name: "Close Kai's profile" }).click();
  await kaiRow.getByRole('button', { name: /Visit/ }).click();
  await expect(page.getByRole('button', { name: /Return home from/ })).toBeVisible();
});

test('all common places open matching occupant profiles without changing seats, chat drafts or the home room', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const drawer = await openFriends(page);
  await triggerFor(drawer, 'Luna').click();
  const facts = await profileFor(page, 'Luna').locator('dl').first().innerText();
  await page.keyboard.press('Escape');
  const roomWrites = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/room' && request.method() !== 'GET') roomWrites.push(request.method());
  });
  const camera = await page.evaluate(() => localStorage.getItem('tasknook.isoView'));
  for (const [index, name] of ['Common Cottage', 'Grand Library', 'Willow Pond'].entries()) {
    if (index) await page.locator('.dock-item').getByText('Friends', { exact: true }).click();
    await drawer.getByRole('button', { name: 'Places', exact: true }).click();
    await drawer.getByRole('button').filter({ hasText: name }).click();
    const room = page.locator('[data-common-room]');
    await expect(room).toBeVisible({ timeout: 60000 });
    await expect(room.locator('[data-model-state="loading"]')).toHaveCount(0);
    const guest = room.locator('[data-common-person="you"]');
    const originalSeat = await guest.getAttribute('data-seat');
    const chat = page.locator('[data-common-room-chat]');
    if (!index) {
      await chat.getByRole('button', { name: /Room chat/ }).click();
      await page.getByRole('textbox', { name: 'Message the room' }).fill('Keep this draft');
    }
    const trigger = room.locator(index === 1 ? '[data-common-profile-name="luna"]' : '[data-common-person="luna"]');
    if (index === 2) { await trigger.focus(); await page.keyboard.press('Enter'); }
    else await trigger.click();
    const popup = page.getByRole('dialog', { name: 'About Luna' });
    await expect(popup).toBeVisible();
    await expectWindowCentered(page, popup);
    expect(await popup.locator('dl').first().innerText()).toBe(facts);
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(room).toBeVisible(); await expect(trigger).toBeFocused();
    await expect(guest).toHaveAttribute('data-seat', originalSeat);
    if (!index) {
      await expect(chat).toHaveAttribute('data-common-chat-open', 'true');
      await expect(page.getByRole('textbox', { name: 'Message the room' })).toHaveValue('Keep this draft');
      await chat.getByRole('button', { name: /Room chat/ }).click();
      // Pickup still belongs to your own character, with no profile on drop.
      const box = await guest.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * .2); await page.mouse.down();
      await expect(room.locator('[data-common-held="true"]')).toBeVisible();
      const target = await room.locator('[data-drop-seat="window-right"] ellipse').evaluate(node => {
        const point = new DOMPoint(0, 0).matrixTransform(node.getScreenCTM()); return { x: point.x, y: point.y };
      });
      await page.mouse.move(target.x, target.y, { steps: 8 }); await page.mouse.up();
      await expect(guest).toHaveAttribute('data-seat', 'window-right');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    if (index === 1) {
      await room.locator('[data-common-profile-name="ivy"]').click();
      const ivy = page.getByRole('dialog', { name: 'About Ivy' });
      await expect(ivy.getByText('@ivy', { exact: false })).toBeVisible();
      await expect(ivy.getByText('Birthday', { exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('common-room-profile.png') });
      await ivy.getByRole('button', { name: "Close Ivy's profile" }).click();
      await expect(room.locator('[data-common-profile-name="ivy"]')).toBeFocused();
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
  }
  expect(roomWrites).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('tasknook.isoView'))).toBe(camera);
});

test.describe('touch and compact windows', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 720 } });
  test('tapping the card meter opens the profile on a compact touch screen', async ({ page }, info) => {
    const drawer = await openFriends(page);
    const card = drawer.locator('[data-friend-card="luna"]');
    const point = await card.getByRole('progressbar').evaluate(node => {
      const r = node.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    expect(await drawer.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('friendship-cards-small.png') });
    await page.touchscreen.tap(point.x, point.y);
    await expect(profileFor(page, 'Luna')).toBeVisible();
    await profileFor(page, 'Luna').getByRole('button', { name: "Close Luna's profile" }).tap();
    await expect(triggerFor(drawer, 'Luna')).toBeFocused();
  });
  test('a common-room name opens the same popup by touch', async ({ page }, testInfo) => {
    const drawer = await openFriends(page);
    await drawer.getByRole('button', { name: 'Places', exact: true }).tap();
    await drawer.getByRole('button').filter({ hasText: 'Common Cottage' }).tap();
    const room = page.locator('[data-common-room="common-cottage"]');
    await expect(room).toBeVisible({ timeout: 60000 });
    const trigger = room.locator('[data-common-profile-name="luna"]');
    await trigger.tap();
    const popup = page.getByRole('dialog', { name: 'About Luna' });
    await expect(popup).toBeVisible();
    await expectWindowCentered(page, popup);
    const bounds = await popup.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath('common-room-profile-small.png') });
    await popup.getByRole('button', { name: "Close Luna's profile" }).tap();
    await expect(trigger).toBeFocused(); await expect(room).toBeVisible();
  });
  test('popup fits compact windows and keeps Close visible while its details scroll', async ({ page }, testInfo) => {
    const drawer = await openFriends(page);
    for (const viewport of [{ width: 390, height: 720 }, { width: 320, height: 360 }]) {
      await page.setViewportSize(viewport);
      await triggerFor(drawer, 'Luna').tap();
      const profile = profileFor(page, 'Luna'); await profile.scrollIntoViewIfNeeded();
      await expectWindowCentered(page, profile);
      const bounds = await profile.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      expect(await profile.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
      await profile.locator('.cozy-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
      const close = profile.getByRole('button', { name: "Close Luna's profile" });
      await expect(close).toBeInViewport();
      await expect(drawer).toHaveCSS('opacity', '1');
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: testInfo.outputPath(`friend-profile-${viewport.width}.png`) });
      if (viewport.width === 390) await close.tap();
      else await page.touchscreen.tap(4, 4);
      await expect(profile).toHaveCount(0);
    }
  });
});

for (const [language, messages] of [['es', es.messages], ['ja', ja.messages]]) {
  test(`${language} profiles use localized labels and dates without changing character facts`, async ({ page }) => {
    const drawer = await openFriends(page, language, messages);
    await drawer.getByRole('button', { name: messages['friends.profile.open'].replace('{name}', 'Luna') }).click();
    const profile = page.getByRole('dialog', { name: messages['friends.profile.title'].replace('{name}', 'Luna') });
    await expect(profile.getByText(messages['friends.profile.birthday'], { exact: true })).toBeVisible();
    await expect(profile.getByText(messages['friends.profile.gender.woman'], { exact: true })).toBeVisible();
    await expect(profile.getByText('she/her', { exact: true })).toBeVisible();
    await expect(profile).not.toContainText('October');
    await expect(profile).not.toContainText('friends.profile.');
  });
}
