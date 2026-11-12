import { expect, test } from '@playwright/test';

test('compact presets keep the owner seated and survive saving and reload', async ({ page, request }) => {
  test.setTimeout(180000);
  const registration = await request.post('/api/auth/register', { data: {
    username: `presets${Date.now()}`, password: 'preset-test-only', displayName: 'Layout review',
  } });
  expect(registration.status()).toBe(201);
  const { token } = await registration.json();
  const headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript(value => {
    localStorage.setItem('tasknook.token', value);
    localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await page.locator('label').filter({ hasText: 'In the room' }).locator('input').check();
  await page.getByRole('button', { name: /^Close/ }).click();

  for (const [label, w, d] of [
    ['Shared home', 9, 8], ['Loft', 8, 6], ['Cozy study', 7, 6], ['Cozy cabin', 8, 6],
    ['Secret garden', 9, 7], ['Corner café', 7, 6], ['Plant shop', 9, 7],
    ['Reading room', 8, 6], ['Study studio', 8, 6], ['Terrace', 8, 6],
    ['Autumn yard', 8, 7], ['Winter yard', 8, 7], ['Holiday hearth', 8, 6], ['Poolside', 10, 8],
  ]) {
    await test.step(label, async () => {
      await page.getByRole('button', { name: 'Room', exact: true }).click();
      await page.getByTitle(`Use ${label}`, { exact: true }).click();
      await page.getByRole('button', { name: /^Close/ }).click();
      await expect.poll(async () => {
        const response = await request.get('/api/room', { headers });
        const { iso } = await response.json();
        return { w: iso?.w, d: iso?.d, owners: iso?.placements.filter(p => p.item === 'you').length };
      }).toEqual({ w, d, owners: 1 });
      await page.reload();
      const scene = page.locator('[data-iso-room-scene]');
      await expect(scene.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
      await expect(scene.locator('[data-model-state="error"]')).toHaveCount(0);
      await expect(scene.locator('[data-item="you"]')).toHaveCount(1);
      const pose = label === 'Poolside' ? '[data-resident-pose="lying"]' : '[data-seat-pose]';
      await expect(scene.locator(`[data-item="you"] ${pose}`)).toHaveCount(1);
    });
  }
  expect(errors).toEqual([]);
});
