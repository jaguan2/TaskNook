import { expect, test } from "@playwright/test";

test("a resident dropped at a glowing seat's centre sits there and survives reload", async ({ page, request }) => {
  const registered = await request.post("/api/auth/register", {
    data: { username: `carry${Date.now()}`, password: "carry-test-only" },
  });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json();
  const headers = { Authorization: `Bearer ${token}` };
  await page.addInitScript((value) => {
    localStorage.setItem("tasknook.token", value);
    localStorage.setItem("tasknook.motion", "reduced");
    localStorage.setItem("tasknook.isoPreview", "1");
  }, token);
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  for (const [item, rot, expected] of [
    ["chair", 0, { gx: 4, gy: 3 }],
    ["sofa", 1, { gx: 4, gy: 3.5 }],
  ]) {
    const saved = await request.put("/api/room", {
      headers,
      data: { placements: [], iso: { w: 9, d: 7, placements: [
        { id: "me", item: "resident", gx: 1, gy: 4 },
        { id: "seat", item, gx: 4, gy: 3, rot },
      ] } },
    });
    expect(saved.status()).toBe(200);
    await page.goto("/");
    const resident = page.locator('[data-placement-id="me"]');
    await expect(resident).toBeVisible();
    await page.waitForLoadState("networkidle");
    const body = await resident.boundingBox();
    await page.mouse.move(body.x + body.width / 2, body.y + body.height * 0.2);
    await page.mouse.down();
    const glow = page.locator('polygon.room-breathe[fill="#ffe9b0"][stroke="#ffe9b0"]');
    await expect(glow).toHaveCount(1);
    const target = await glow.evaluate(element => {
      const box = element.getBBox();
      const point = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2)
        .matrixTransform(element.getScreenCTM());
      return { x: point.x, y: point.y };
    });
    await page.mouse.move(target.x, target.y, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => {
      const response = await request.get("/api/room", { headers });
      return (await response.json()).iso.placements.find(placement => placement.id === "me");
    }).toEqual({ id: "me", item: "resident", ...expected });
    await page.reload();
    await expect(page.locator('[data-placement-id="me"]')).toBeVisible();
    const response = await request.get("/api/room", { headers });
    expect((await response.json()).iso.placements.find(placement => placement.id === "me"))
      .toEqual({ id: "me", item: "resident", ...expected });
  }
  expect(errors).toEqual([]);
});

test('picking up a booted character from a seat keeps one connected pose through dragging and reduced motion', async ({ page, request }, testInfo) => {
  const registered = await request.post('/api/auth/register', {
    data: { username: `pickup${Date.now()}`, password: 'pickup-test-only' },
  });
  expect(registered.status()).toBe(201);
  const { token } = await registered.json(), headers = { Authorization: `Bearer ${token}` };
  await request.put('/api/room', { headers, data: { placements: [], iso: { w: 9, d: 7, walls: 'none', placements: [
    { id: 'you', item: 'you', gx: 2, gy: 2 },
    { id: 'start', item: 'chair', gx: 2, gy: 2 },
    { id: 'finish', item: 'chair', gx: 5, gy: 3 },
  ] } } });
  await page.addInitScript(token => {
    localStorage.setItem('tasknook.token', token); localStorage.setItem('tasknook.isoPreview', '1');
    localStorage.setItem('tasknook.motion', 'full'); localStorage.setItem('tasknook.music.on', '0');
    localStorage.setItem('tasknook.autoResumeMusic', '0');
  }, token);
  await page.goto('/');
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  const drawer = page.locator('.app-drawer');
  await drawer.getByRole('group', { name: 'Character looks' }).getByRole('button', { name: /Fall style girl/ }).click();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  const resident = page.locator('[data-placement-id="you"]');
  await expect(resident.locator('[data-seat-pose]')).toBeVisible();
  const box = await resident.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * .2);
  await page.mouse.down();
  const held = page.locator('[data-resident-pose="held"]');
  await expect(held).toHaveCount(1);
  await expect(resident).toHaveCount(0);
  await expect(held.locator('[data-held-leg]')).toHaveCount(2);
  await expect(held.locator('[data-seat-pose], .body-breathe, .gesture-look, .gesture-yawn, .leg-stride-a')).toHaveCount(0);
  const target = await page.locator('polygon.room-breathe[fill="#ffe9b0"][stroke="#ffe9b0"]').last().evaluate(element => {
    const box = element.getBBox(), point = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(element.getScreenCTM());
    return { x: point.x, y: point.y };
  });
  await page.mouse.move(target.x, target.y, { steps: 12 });
  const contacts = await held.locator('[data-held-leg]').evaluateAll(legs => legs.map(leg => {
    const shin = leg.querySelector('[data-leg-shin]'), shaft = leg.querySelector('[data-boot-shaft]');
    return [4, 7].every(offset => {
      const point = shin.getPointAtLength(shin.getTotalLength() - offset);
      const world = new DOMPoint(point.x, point.y).matrixTransform(shin.getCTM());
      return [...shaft.querySelectorAll('rect')].some(shape => shape.isPointInFill(world.matrixTransform(shape.getCTM().inverse())));
    });
  }));
  expect(contacts).toEqual([true, true]);
  expect(await held.evaluate(element => element.getAnimations({ subtree: true }).map(animation => animation.animationName))).toEqual(['resident-held']);
  await page.screenshot({ path: testInfo.outputPath('character-picked-up.png') });
  await page.evaluate(() => { document.documentElement.dataset.motion = 'reduced'; });
  await expect.poll(() => held.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await page.mouse.up();
  await expect(held).toHaveCount(0);
  await expect(resident.locator('[data-seat-pose]')).toBeVisible();
  await expect.poll(async () => (await (await request.get('/api/room', { headers })).json()).iso.placements.find(p => p.id === 'you'))
    .toMatchObject({ gx: 5, gy: 3 });
  await page.reload();
  await expect(resident.locator('[data-seat-pose]')).toBeVisible();
});
