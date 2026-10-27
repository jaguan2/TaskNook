import { expect, test } from "@playwright/test";

async function createLayoutUser(page, request) {
  const username = `layout${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const response = await request.post("/api/auth/register", {
    data: { username, password: "layout-test-only", displayName: "Layout review" },
  });
  expect(response.status()).toBe(201);
  const { token } = await response.json();
  await page.addInitScript((value) => {
    localStorage.setItem("tasknook.token", value);
    localStorage.setItem("tasknook.motion", "reduced");
    localStorage.setItem("tasknook.music.on", "0");
    localStorage.setItem("tasknook.autoResumeMusic", "0");
    localStorage.setItem("tasknook.isoPreview", "1");
  }, token);
  return token;
}

function expectInsideViewport(box, { width, height }) {
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(height);
}

for (const rot of [0, 1]) {
  test(`tucked bedding keeps the bed's material, facing ${rot}`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const token = await createLayoutUser(page, request);
    const response = await request.put("/api/room", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        placements: [],
        iso: { w: 10, d: 7, placements: [
          { id: "plain-bed", item: "bed", gx: 1, gy: 1, rot },
          { id: "red-resident", item: "resident", gx: 1.5, gy: 1.5, tint: "#d25c56" },
          { id: "blue-bed", item: "bed", gx: 5, gy: 1, rot, tint: "#638eae" },
          { id: "other-resident", item: "resident", gx: 5.5, gy: 1.5, tint: "#8d65b5" },
        ] },
      },
    });
    expect(response.status()).toBe(200);
    await page.goto("/");
    await expect(page.locator('[data-placement-id="red-resident"] [data-bed-tuck-cover]')).toHaveCount(1);
    const paints = await page.evaluate(() => {
      const paint = (selector) => {
        const root = document.querySelector(selector);
        const duvet = [...root.querySelectorAll("[style]")].find((element) => element.style.fill.includes("#f2e9dd"));
        return getComputedStyle(duvet).fill;
      };
      return {
        plain: paint('[data-placement-id="plain-bed"]'),
        plainCover: paint('[data-placement-id="red-resident"] [data-bed-tuck-cover]'),
        blue: paint('[data-placement-id="blue-bed"]'),
        blueCover: paint('[data-placement-id="other-resident"] [data-bed-tuck-cover]'),
      };
    });
    expect(paints).toEqual({
      plain: "rgb(242, 233, 221)", plainCover: "rgb(242, 233, 221)",
      blue: "rgb(99, 142, 174)", blueCover: "rgb(99, 142, 174)",
    });
    await page.screenshot({ path: testInfo.outputPath("bedding.png") });
  });
}

for (const viewport of [
  { width: 320, height: 360 },
  { width: 390, height: 720 },
  { width: 540, height: 720 },
  { width: 900, height: 640 },
]) {
  test(`timer options remain usable at ${viewport.width}x${viewport.height}`, async ({ page, request }, testInfo) => {
    const token = await createLayoutUser(page, request);
    const taskName = "Plan a quiet study session";
    const task = await request.post("/api/tasks", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: taskName, duration: 25, priority: "medium" },
    });
    expect(task.status()).toBe(201);
    await page.setViewportSize({ width: 900, height: 640 });
    await page.goto("/");
    await page.getByRole("button", { name: taskName, exact: true }).click();
    await page.setViewportSize(viewport);
    const hud = page.locator(".focus-hud");
    await page.getByRole("button", { name: "Timer options", exact: true }).click();
    const chime = page.getByRole("slider", { name: "Timer chime volume" });
    const options = chime.locator("xpath=../..");
    expectInsideViewport(await options.boundingBox(), viewport);
    if (viewport.width >= 600) {
      const card = await hud.boundingBox();
      expect((await options.boundingBox()).x).toBeGreaterThanOrEqual(card.x + card.width);
    }

    await hud.getByRole("button", { name: "60m", exact: true }).click();
    await expect(hud.getByText("1:00:00", { exact: true })).toBeVisible();
    const chimeBox = await chime.boundingBox();
    expectInsideViewport(chimeBox, viewport);
    await chime.click({ position: { x: chimeBox.width - 2, y: chimeBox.height / 2 } });
    await expect(chime).toHaveValue("1");

    await hud.getByRole("button", { name: /Pomodoro off/ }).click();
    await hud.getByRole("button", { name: "10m", exact: true }).click();
    await hud.getByRole("button", { name: "×6", exact: true }).click();
    expectInsideViewport(await options.boundingBox(), viewport);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("tasknook.pomodoro"))))
      .toMatchObject({ enabled: true, breakMinutes: 10, rounds: 6 });
    await page.screenshot({ path: testInfo.outputPath("timer-options.png") });
  });
}
