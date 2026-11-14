import { expect, test } from '@playwright/test';

async function home(page) {
  await page.addInitScript(() => {
    localStorage.setItem('tasknook.motion', 'reduced');
    localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  });
  await page.goto('/');
  await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
  await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
}

async function join(page, name = 'Grand Library') {
  await expect(page.locator('.app-drawer')).toHaveCount(0);
  await page.locator('.dock-item').getByText('Friends', { exact: true }).click();
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator('.app-drawer').getByRole('button').filter({ hasText: name }).click();
}

function hold() {
  let release;
  return { hits: 0, promise: new Promise(resolve => { release = resolve; }), release: () => release() };
}

test('a cold library visit shows real progress, keeps the timer usable and reuses its warm images', async ({ page }, testInfo) => {
  const gate = hold(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/models/catalog/runner-*.glb', async route => { gate.hits++; await gate.promise; await route.continue(); });
  try {
    await home(page);
    const camera = await page.evaluate(() => localStorage.getItem('tasknook.isoView'));
    await page.getByRole('button', { name: 'Start focusing', exact: true }).click();
    await join(page);
    await expect.poll(() => gate.hits).toBeGreaterThan(0);
    const loading = page.locator('[data-room-loading]');
    await expect(loading).toBeVisible();
    await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Opening Grand Library' })).toBeVisible();
    await expect(page.locator('[data-common-room]')).toHaveCount(0);
    const progress = loading.getByRole('progressbar');
    await expect.poll(async () => Number(await progress.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    expect(Number(await progress.getAttribute('aria-valuenow'))).toBeLessThan(100);
    await page.screenshot({ path: testInfo.outputPath('library-loading.png') });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start focusing', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 720 });
    const bounds = await loading.getByRole('button', { name: 'Return home', exact: true }).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(720);
    await page.screenshot({ path: testInfo.outputPath('library-loading-small.png') });
    gate.release();
    await expect(loading).toHaveCount(0, { timeout: 60000 });
    await expect(page.locator('[data-common-room="grand-library"]')).toBeVisible();
    await expect(page.locator('[data-common-room] [data-model-state="loading"]')).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('[data-common-person="you"]').focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('group', { name: 'Common room seats' })).toBeVisible();
    await page.keyboard.press('Escape'); // Close the chooser first.
    await page.keyboard.press('Escape'); // Then return home.
    await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('tasknook.isoView'))).toBe(camera);
    await join(page);
    await expect(page.locator('[data-common-room="grand-library"]')).toBeVisible();
    await expect(loading).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally { gate.release(); }
});

test('Return home cancels a pending visit and another place opens while its old asset is still pending', async ({ page }) => {
  const gate = hold();
  await page.route('**/models/catalog/runner-*.glb', async route => { gate.hits++; await gate.promise; await route.continue(); });
  try {
    await home(page); await join(page);
    await expect.poll(() => gate.hits).toBeGreaterThan(0);
    await expect(page.locator('[data-room-loading]')).toBeVisible();
    await page.locator('[data-room-loading]').getByRole('button', { name: 'Return home' }).click();
    await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
    await expect(page.locator('[data-room-loading]')).toHaveCount(0);
    await join(page, 'Willow Pond');
    await expect(page.locator('[data-common-room="willow-pond"]')).toBeVisible({ timeout: 60000 });
    gate.release();
    await expect(page.locator('[data-common-room="grand-library"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
  } finally { gate.release(); }
});

test('missing library models finish with a working fallback and retry without remounting the visit', async ({ page }) => {
  let failures = 0;
  await page.route('**/models/catalog/runner-*.glb', route => { failures++; return route.fulfill({ status: 503, body: 'temporary outage' }); });
  await home(page); await join(page);
  await expect.poll(() => failures).toBeGreaterThan(0);
  const scene = page.locator('[data-common-room="grand-library"]');
  await expect(scene).toBeVisible({ timeout: 60000 });
  await expect(page.locator('[data-room-loading]')).toHaveCount(0);
  await expect(scene.locator('[data-catalog-model="runner"][data-model-state="error"]').first()).toBeVisible();
  await page.evaluate(() => { document.querySelector('[data-common-person="you"]').dataset.mountCheck = 'retained'; });
  await page.unroute('**/models/catalog/runner-*.glb');
  await page.getByRole('button', { name: 'Retry models', exact: true }).click();
  await expect(scene.locator('[data-model-state="error"]')).toHaveCount(0, { timeout: 60000 });
  await expect(scene.locator('[data-model-state="loading"]')).toHaveCount(0);
  await expect(page.locator('[data-room-loading]')).toHaveCount(0);
  await expect(page.locator('[data-common-person="you"]')).toHaveAttribute('data-mount-check', 'retained');
});

test('the lazy scene chunk has visible, cancellable loading feedback too', async ({ page }) => {
  const gate = hold();
  await page.route('**/assets/CommonRoomEntry-*.js', async route => { gate.hits++; await gate.promise; await route.continue(); });
  try {
    await home(page); await join(page);
    await expect.poll(() => gate.hits).toBeGreaterThan(0);
    const loading = page.locator('[data-room-loading]');
    await expect(loading).toBeVisible();
    await expect(loading.getByRole('progressbar')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-iso-room-scene]')).toBeVisible();
    gate.release();
    await expect(loading).toHaveCount(0);
  } finally { gate.release(); }
});
