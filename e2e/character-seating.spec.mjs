import { expect, test } from '@playwright/test';

async function checkBootFit(root) {
  const pairs = await root.locator('[data-seated-leg]').evaluateAll(legs => legs.map(leg => {
    const shin = leg.querySelector('[data-seated-shin]'), shaft = leg.querySelector('[data-boot-shaft]');
    const covered = [4, 7].every(offset => {
      const at = shin.getPointAtLength(Math.max(0, shin.getTotalLength() - offset));
      const world = new DOMPoint(at.x, at.y).matrixTransform(shin.getCTM());
      return [...shaft.querySelectorAll('rect')].some(rect => rect.isPointInFill(world.matrixTransform(rect.getCTM().inverse())));
    });
    const foot = leg.querySelector('[data-boot-foot]'), box = foot.getBBox(), matrix = foot.getCTM();
    const points = [box.x, box.x + box.width].flatMap(x => [box.y, box.y + box.height].map(y => new DOMPoint(x, y).matrixTransform(matrix)));
    const min = Math.min(...points.map(p => p.x)), max = Math.max(...points.map(p => p.x));
    return { covered, centre: (min + max) / 2, width: max - min };
  }));
  expect(pairs).toHaveLength(2);
  expect(pairs.every(pair => pair.covered)).toBe(true);
  expect(Math.abs(pairs[0].centre - pairs[1].centre)).toBeGreaterThanOrEqual(Math.min(...pairs.map(pair => pair.width)) * .75);
}

test('crossed boots stay joined in the editor, save correctly and fit both lower chair models at every facing', async ({ page, request }, testInfo) => {
  test.setTimeout(90000);
  const registered = await request.post('/api/auth/register', { data: { username: `bootfit${Date.now()}`, password: 'boot-fit-only' } });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json(), headers = { Authorization: `Bearer ${token}` };
  const room = (item = 'chair', rot = 0) => ({ placements: [], iso: { w: 7, d: 6, walls: 'none', placements: [
    { id: 'support', item, gx: 2, gy: 2, rot }, { id: 'you', item: 'you', gx: 2, gy: 2 },
  ] } });
  expect((await request.put('/api/room', { headers, data: room() })).ok()).toBe(true);
  await page.addInitScript(token => {
    localStorage.setItem('tasknook.token', token); localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'reduced'); localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  await page.goto('/'); await page.getByRole('button', { name: 'Profile', exact: true }).click();
  const drawer = page.locator('.app-drawer');
  await drawer.getByRole('group', { name: 'Character looks' }).getByRole('button', { name: /Fall style girl/ }).click();
  await drawer.getByRole('tab', { name: 'Body', exact: true }).click();
  const preview = drawer.getByRole('img', { name: /^Seated view of your character/ });
  for (const [label, key] of [['Relaxed', 'relaxed'], ['Ankles crossed', 'ankles'], ['Cross-legged', 'crossed']]) {
    await drawer.getByRole('group', { name: 'Sitting style' }).getByText(label, { exact: true }).click();
    await expect(preview.locator('[data-seat-pose]')).toHaveAttribute('data-seat-pose', key);
    await checkBootFit(preview);
    await expect.poll(async () => (await (await request.get('/api/profile', { headers })).json()).character.seatPose).toBe(key);
  }
  await drawer.getByRole('group', { name: 'Sitting style' }).getByRole('button', { name: 'Ankles crossed', exact: true }).click();
  await expect(preview.locator('[data-seat-pose]')).toHaveAttribute('data-seat-pose', 'ankles');
  await expect(drawer).toHaveCSS('opacity', '1');
  await preview.screenshot({ path: testInfo.outputPath('seated-boot-editor.png') });
  await expect.poll(async () => (await (await request.get('/api/profile', { headers })).json()).character.seatPose).toBe('ankles');
  for (const item of ['chair', 'deskchair']) for (const rot of [0, 1, 2, 3]) {
    expect((await request.put('/api/room', { headers, data: room(item, rot) })).ok()).toBe(true);
    await page.reload();
    const person = page.locator('[data-placement-id="you"]');
    await expect(person.locator('[data-seat-pose]')).toHaveAttribute('data-seat-pose', 'ankles');
    await checkBootFit(person);
    await expect(page.locator('[data-model-state="loading"]')).toHaveCount(0, { timeout: 60000 });
    if (rot === 0) await page.screenshot({ path: testInfo.outputPath(`seated-boots-${item}.png`) });
  }
});
